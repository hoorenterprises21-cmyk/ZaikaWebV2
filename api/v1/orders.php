<?php
/**
 * /api/v1/orders.php  –  safe column handling + graceful degradation
 */
require_once __DIR__ . '/../bootstrap.php';

$method = method();
$db     = db();

function ocol(PDO $db, string $table, string $col): bool {
    static $c = [];
    $k = "$table.$col";
    if (!isset($c[$k])) {
        try { $db->query("SELECT `$col` FROM `$table` LIMIT 0"); $c[$k] = true; }
        catch (PDOException $e) { $c[$k] = false; }
    }
    return $c[$k];
}

/** Build totals server-side; never trusts client-submitted totals. */
function recompute_totals(PDO $db, array $items, ?string $couponCode, array $address): array {
    $subtotal     = 0.0;
    $payloadItems = [];

    foreach ($items as $it) {
        $pid = (int)($it['product_id'] ?? 0);
        $qty = max(1, (int)($it['quantity'] ?? 0));
        if ($pid <= 0 || $qty <= 0) continue;

        $cols = "id, name, price";
        if (ocol($db, 'products', 'image_url'))      $cols .= ", image_url";
        if (ocol($db, 'products', 'discount_price'))  $cols .= ", discount_price";
        if (ocol($db, 'products', 'stock_status'))    $cols .= ", stock_status";
        if (ocol($db, 'products', 'is_active'))       $cols .= ", is_active";

        $stmt = $db->prepare("SELECT $cols FROM products WHERE id = ?");
        $stmt->execute([$pid]);
        $p = $stmt->fetch();
        if (!$p) continue;
        if (isset($p['is_active'])    && !$p['is_active'])            continue;
        if (isset($p['stock_status']) && $p['stock_status'] === 'out_of_stock') continue;

        $unit = (isset($p['discount_price']) && $p['discount_price'] !== null && (float)$p['discount_price'] > 0)
            ? (float)$p['discount_price']
            : (float)$p['price'];
        $lineTotal = round($unit * $qty, 2);
        $subtotal += $lineTotal;
        $payloadItems[] = [
            'product_id'    => (int)$p['id'],
            'product_name'  => $p['name'],
            'product_image' => $p['image_url'] ?? null,
            'quantity'      => $qty,
            'unit_price'    => $unit,
            'total_price'   => $lineTotal,
        ];
    }
    if (!$payloadItems) json_response(['success'=>false,'message'=>'Cart has no valid items'], 422);

    // Delivery charge
    $defaultCharge  = (float)setting('default_delivery_charge', '40.00');
    $freeThreshold  = (float)setting('free_delivery_threshold', '499.00');
    $deliveryCharge = $defaultCharge;
    $zoneMinOrder   = 0.0;
    try {
        $zoneStmt = $db->prepare("SELECT delivery_charge, min_order_value FROM delivery_zones WHERE pincode = ? AND is_active = 1 LIMIT 1");
        $zoneStmt->execute([$address['pincode']]);
        $zone = $zoneStmt->fetch();
        if ($zone) {
            $deliveryCharge = (float)$zone['delivery_charge'];
            $zoneMinOrder   = (float)$zone['min_order_value'];
        }
    } catch (PDOException $e) {}
    if ($subtotal >= $freeThreshold) $deliveryCharge = 0.0;
    $effectiveMinOrder = max((float)setting('min_order_value', '0'), $zoneMinOrder);

    // Tax
    $tax = round($subtotal * ((float)setting('tax_percent', '5.00')) / 100.0, 2);

    // Happy Hour discount
    $hhDiscount = 0.0;
    try {
        $dayOfWeek = (int)date('w');
        $now = date('H:i:s');
        $hhStmt = $db->prepare("SELECT discount_percent, discount_flat, product_ids FROM happy_hours WHERE day_of_week = ? AND is_active = 1 AND start_time <= ? AND end_time >= ? LIMIT 1");
        $hhStmt->execute([$dayOfWeek, $now, $now]);
        $hh = $hhStmt->fetch();
        if ($hh) {
            $hhProductIds = $hh['product_ids'] ? json_decode($hh['product_ids'], true) : null;
            $hhPercent = (float)$hh['discount_percent'];
            $hhFlat    = (float)$hh['discount_flat'];
            foreach ($payloadItems as &$it) {
                $applies = !$hhProductIds || in_array($it['product_id'], $hhProductIds, true);
                if ($applies) {
                    if ($hhPercent > 0) {
                        $hhItemDiscount = round($it['unit_price'] * $hhPercent / 100, 2);
                        $it['unit_price'] = round($it['unit_price'] - $hhItemDiscount, 2);
                        $it['total_price'] = round($it['unit_price'] * $it['quantity'], 2);
                        $hhDiscount += $hhItemDiscount * $it['quantity'];
                    } elseif ($hhFlat > 0) {
                        $it['unit_price'] = max(0, round($it['unit_price'] - $hhFlat, 2));
                        $it['total_price'] = round($it['unit_price'] * $it['quantity'], 2);
                        $hhDiscount += $hhFlat * $it['quantity'];
                    }
                }
            }
            unset($it);
            $subtotal = array_sum(array_column($payloadItems, 'total_price'));
        }
    } catch (PDOException $e) {}

    // Flash deals — enforce max_quantity
    $flashDiscount = 0.0;
    try {
        foreach ($payloadItems as &$it) {
            $fdStmt = $db->prepare("SELECT id, deal_price, max_quantity, sold_count FROM flash_deals WHERE product_id = ? AND is_active = 1 AND start_time <= NOW() AND end_time >= NOW() LIMIT 1");
            $fdStmt->execute([$it['product_id']]);
            $fd = $fdStmt->fetch();
            if ($fd) {
                $maxQty = (int)$fd['max_quantity'];
                $soldQty = (int)$fd['sold_count'];
                // Enforce max quantity if set
                if ($maxQty > 0 && ($soldQty + $it['quantity']) > $maxQty) {
                    $available = max(0, $maxQty - $soldQty);
                    if ($available <= 0) continue; // deal sold out
                    $it['quantity'] = $available;
                    $it['total_price'] = round($it['unit_price'] * $available, 2);
                }
                $dealPrice = (float)$fd['deal_price'];
                $flashDiscount += ($it['unit_price'] - $dealPrice) * $it['quantity'];
                $it['flash_deal_id'] = (int)$fd['id'];
                $it['unit_price']  = $dealPrice;
                $it['total_price'] = round($dealPrice * $it['quantity'], 2);
            }
        }
        unset($it);
        $subtotal = array_sum(array_column($payloadItems, 'total_price'));
    } catch (PDOException $e) {}

    // Coupon
    $discount  = 0.0;
    $couponOk  = false;
    if ($couponCode) {
        try {
            $cstmt = $db->prepare("SELECT * FROM coupons WHERE code = ? AND is_active = 1");
            $cstmt->execute([$couponCode]);
            $coupon = $cstmt->fetch();
            if ($coupon) {
                $nowTs = time();
                $sOk   = !($coupon['starts_at'] ?? null)  || strtotime($coupon['starts_at']) <= $nowTs;
                $eOk   = !($coupon['expires_at'] ?? null)  || strtotime($coupon['expires_at']) >= $nowTs;
                $uOk   = !($coupon['usage_limit'] ?? 0)   || (int)$coupon['used_count'] < (int)$coupon['usage_limit'];
                $mOk   = $subtotal >= (float)($coupon['min_order_value'] ?? 0);
                $customerMatch = true;
                if (!empty($coupon['customer_id']) || !empty($coupon['customer_email']) || !empty($coupon['customer_phone'])) {
                    $customer = $address['customer'] ?? null;
                    $customerMatch = false;
                    if ($customer) {
                        if (!empty($coupon['customer_id']) && (int)$coupon['customer_id'] === (int)$customer['id']) $customerMatch = true;
                        if (!$customerMatch && !empty($coupon['customer_email']) && strtolower((string)$coupon['customer_email']) === strtolower((string)$customer['email'])) $customerMatch = true;
                        if (!$customerMatch && !empty($coupon['customer_phone']) && (string)$coupon['customer_phone'] === (string)$customer['phone']) $customerMatch = true;
                    }
                }
                if ($sOk && $eOk && $uOk && $mOk && $customerMatch) {
                    $couponOk = true;
                    $raw = ($coupon['discount_type'] ?? 'flat') === 'percentage'
                        ? $subtotal * (float)$coupon['discount_value'] / 100.0
                        : (float)$coupon['discount_value'];
                    if ($coupon['max_discount'] !== null) $raw = min($raw, (float)$coupon['max_discount']);
                    $discount = round($raw, 2);
                }
            }
        } catch (PDOException $e) {}
    }

    return [
        'items'               => $payloadItems,
        'subtotal'            => $subtotal,
        'delivery_charge'     => $deliveryCharge,
        'tax_amount'          => $tax,
        'discount_amount'     => $discount,
        'happy_hour_discount' => round($hhDiscount, 2),
        'flash_deal_discount' => round($flashDiscount, 2),
        'total_amount'        => max(0.0, $subtotal + $deliveryCharge + $tax - $discount),
        'coupon_ok'           => $couponOk,
    ];
}

switch ($method) {

    case 'GET': {
        $id    = (int)($_GET['id'] ?? 0);
        $cust  = current_customer();
        $admin = current_admin();

        if ($id) {
            if (!$cust && !$admin) json_response(['success'=>false,'message'=>'Authentication required'], 401);
            $sql    = "SELECT * FROM orders WHERE id = ?";
            $params = [$id];
            if ($cust && !$admin) { $sql .= " AND customer_id = ?"; $params[] = $cust['id']; }
            $stmt = $db->prepare($sql);
            $stmt->execute($params);
            $order = $stmt->fetch();
            if (!$order) json_response(['success'=>false,'message'=>'Order not found'], 404);

            try {
                $cols  = "id, order_id, product_id, quantity";
                $iCols = ['product_name','product_image','unit_price','total_price','happy_hour_discount'];
                foreach ($iCols as $c2)
                    if (ocol($db, 'order_items', $c2)) $cols .= ", $c2";
                $ist = $db->prepare("SELECT $cols FROM order_items WHERE order_id = ?");
                $ist->execute([$id]);
                $order['items'] = $ist->fetchAll();
            } catch (PDOException $e) { $order['items'] = []; }
            json_response(['success'=>true,'order'=>$order]);
        }

        if (!$cust && !$admin) json_response(['success'=>false,'message'=>'Authentication required'], 401);

        $where = []; $params = [];
        if ($cust && !$admin) { $where[] = "customer_id = ?"; $params[] = $cust['id']; }
        if ($status = $_GET['status'] ?? '') {
            $where[] = "order_status = ?"; $params[] = $status;
        }
        $whereSql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';
        $countSql = "SELECT COUNT(*) FROM orders $whereSql";
        $dataSql  = "SELECT * FROM orders $whereSql ORDER BY created_at DESC, id DESC";
        $res = paginate($countSql, $dataSql, $params);
        json_response(['success'=>true] + $res);
    }

    case 'POST': {
        $cust = require_customer();
        $items = input('items', []);
        if (!is_array($items) || !$items) json_response(['success'=>false,'message'=>'Cart cannot be empty'], 422);

        $pm = input('payment_method', 'cod');
        if (!in_array($pm, ['cod','upi','razorpay','stripe','whatsapp'], true))
            json_response(['success'=>false,'message'=>'Invalid payment method'], 422);

        $address = [
            'name'     => input('delivery_name', $cust['name']),
            'phone'    => input('delivery_phone', ''),
            'address'  => input('delivery_address', ''),
            'landmark' => input('delivery_landmark', ''),
            'pincode'  => input('delivery_pincode', ''),
        ];
        if (!$address['phone'] || !$address['address'] || !$address['pincode'])
            json_response(['success'=>false,'message'=>'Delivery phone, address and pincode are required'], 422);

        $couponCode   = input('coupon_code') ?: null;
        $useWallet    = input('use_wallet', false);
        $redeemPoints = (int)input('redeem_points', 0);

        $address['customer'] = $cust;
        $totals = recompute_totals($db, $items, $couponCode, $address);

        $minOrder = (float)setting('min_order_value', '0');
        if ($totals['subtotal'] < $minOrder)
            json_response(['success'=>false,'message'=>"Minimum order value is ₹$minOrder"], 422);

        $activeZoneCount = 0;
        try {
            $zoneCheck = $db->prepare("SELECT id FROM delivery_zones WHERE is_active = 1");
            $zoneCheck->execute();
            $activeZoneCount = $zoneCheck->rowCount();
            if ($activeZoneCount > 0) {
                $zoneMatch = $db->prepare("SELECT id FROM delivery_zones WHERE pincode = ? AND is_active = 1 LIMIT 1");
                $zoneMatch->execute([$address['pincode']]);
                if (!$zoneMatch->fetch())
                    json_response(['success'=>false,'message'=>'Delivery is currently available only for active service areas.'], 422);
            }
        } catch (PDOException $e) {}

        $orderNumber = generate_order_number();
        $orderId     = null;

        try {
            $db->beginTransaction();

            // Build INSERT using named column map — avoids fragile positional index
            $colMap = [
                'order_number'    => $orderNumber,
                'customer_id'     => $cust['id'],
                'delivery_name'   => $address['name'],
                'delivery_phone'  => $address['phone'],
                'delivery_address'=> $address['address'],
                'delivery_pincode'=> $address['pincode'],
                'subtotal'        => $totals['subtotal'],
                'delivery_charge' => $totals['delivery_charge'],
                'tax_amount'      => $totals['tax_amount'],
                'discount_amount' => $totals['discount_amount'],
                'total_amount'    => $totals['total_amount'], // will be overwritten after wallet/loyalty
                'payment_method'  => $pm,
                'payment_status'  => 'pending',
                'order_status'    => 'pending',
            ];

            // Optional standard columns
            $optionals = [
                'address_id'        => input('address_id') ?: null,
                'delivery_landmark' => $address['landmark'],
                'coupon_code'       => $couponCode,
                'notes'             => input('notes', ''),
                'placed_at'         => date('Y-m-d H:i:s'),
            ];
            foreach ($optionals as $col => $val) {
                if (ocol($db, 'orders', $col)) $colMap[$col] = $val;
            }

            // Wallet discount
            $walletDiscount = 0.0;
            if ($useWallet) {
                try {
                    $stmt = $db->prepare("SELECT wallet_balance FROM customers WHERE id = ?");
                    $stmt->execute([$cust['id']]);
                    $walletBal = (float)($stmt->fetchColumn() ?? 0);
                    $walletDiscount = min($walletBal, $totals['total_amount']);
                    if ($walletDiscount > 0) {
                        $newBal = round($walletBal - $walletDiscount, 2);
                        $db->prepare("UPDATE customers SET wallet_balance = ? WHERE id = ?")->execute([$newBal, $cust['id']]);
                        $db->prepare("INSERT INTO wallet_transactions (customer_id, type, amount, source, balance_after, description) VALUES (?,?,?,?,?,?)")
                           ->execute([$cust['id'], 'debit', $walletDiscount, 'order', $newBal, "Order $orderNumber"]);
                    }
                } catch (PDOException $e) {}
            }

            // Loyalty points redemption
            $loyaltyRedeemed = 0;
            $loyaltyDiscount = 0.0;
            if ($redeemPoints > 0) {
                try {
                    $stmt = $db->prepare("SELECT loyalty_points_total FROM customers WHERE id = ?");
                    $stmt->execute([$cust['id']]);
                    $currentPoints = (int)($stmt->fetchColumn() ?? 0);
                    $minRedeem = (int)setting('loyalty_min_redeem', '100');
                    if ($currentPoints >= $redeemPoints && $redeemPoints >= $minRedeem) {
                        $pointValue     = (float)setting('loyalty_point_value', '1.00');
                        $loyaltyDiscount = round($redeemPoints * $pointValue, 2);
                        $newPoints       = $currentPoints - $redeemPoints;
                        $db->prepare("UPDATE customers SET loyalty_points_total = ? WHERE id = ?")->execute([$newPoints, $cust['id']]);
                        $db->prepare("INSERT INTO loyalty_points (customer_id, points, type, source, description) VALUES (?,?,?,?,?)")
                           ->execute([$cust['id'], $redeemPoints, 'redeem', 'order', "Order $orderNumber"]);
                        $loyaltyRedeemed = $redeemPoints;
                    }
                } catch (PDOException $e) {}
            }

            // Final total after all discounts
            $finalTotal = max(0.0, $totals['total_amount'] - $walletDiscount - $loyaltyDiscount);
            $colMap['total_amount'] = round($finalTotal, 2); // correct named key update — no fragile index

            // V3 discount columns
            if (ocol($db, 'orders', 'wallet_discount'))          $colMap['wallet_discount']          = round($walletDiscount, 2);
            if (ocol($db, 'orders', 'loyalty_points_redeemed'))  $colMap['loyalty_points_redeemed']  = $loyaltyRedeemed;
            if (ocol($db, 'orders', 'happy_hour_discount'))      $colMap['happy_hour_discount']      = $totals['happy_hour_discount'];
            if (ocol($db, 'orders', 'flash_deal_discount'))      $colMap['flash_deal_discount']      = $totals['flash_deal_discount'];

            $oCols  = array_keys($colMap);
            $oVals  = array_values($colMap);
            $oMarks = array_fill(0, count($oCols), '?');
            $db->prepare("INSERT INTO orders (" . implode(',', $oCols) . ") VALUES (" . implode(',', $oMarks) . ")")
               ->execute($oVals);
            $orderId = (int)$db->lastInsertId();

            // Loyalty points earned (on final paid amount)
            $loyaltyEarnRate = (float)setting('loyalty_earn_rate', '1');
            $loyaltyEarned   = (int)floor($totals['subtotal'] / 100 * $loyaltyEarnRate);
            if ($loyaltyEarned > 0) {
                try {
                    if (ocol($db, 'orders', 'loyalty_points_earned'))
                        $db->prepare("UPDATE orders SET loyalty_points_earned = ? WHERE id = ?")->execute([$loyaltyEarned, $orderId]);
                    $stmt = $db->prepare("SELECT loyalty_points_total FROM customers WHERE id = ?");
                    $stmt->execute([$cust['id']]);
                    $currentPts = (int)($stmt->fetchColumn() ?? 0);
                    $db->prepare("UPDATE customers SET loyalty_points_total = ? WHERE id = ?")->execute([$currentPts + $loyaltyEarned, $cust['id']]);
                    $db->prepare("INSERT INTO loyalty_points (customer_id, points, type, source, source_id, description) VALUES (?,?,?,?,?,?)")
                       ->execute([$cust['id'], $loyaltyEarned, 'earn', 'order', $orderId, "Order $orderNumber"]);
                } catch (PDOException $e) {}
            }

            // Insert order items
            $iBase   = "INSERT INTO order_items (order_id, product_id, quantity";
            $iFields = [];
            foreach (['product_name','product_image','unit_price','total_price','happy_hour_discount'] as $f)
                if (ocol($db, 'order_items', $f)) $iFields[] = $f;
            $iSql  = $iBase . ($iFields ? ', ' . implode(',', $iFields) : '') . ") VALUES (?,?,?"
                   . ($iFields ? str_repeat(',?', count($iFields)) : '') . ")";
            $iStmt = $db->prepare($iSql);

            foreach ($totals['items'] as $it) {
                $row = [$orderId, $it['product_id'], $it['quantity']];
                foreach ($iFields as $f) $row[] = $it[$f] ?? null;
                $iStmt->execute($row);
            }

            // Increment flash deal sold_count
            try {
                foreach ($totals['items'] as $it) {
                    if (!empty($it['flash_deal_id']))
                        $db->prepare("UPDATE flash_deals SET sold_count = sold_count + ? WHERE id = ?")->execute([$it['quantity'], $it['flash_deal_id']]);
                }
            } catch (PDOException $e) {}

            // Coupon usage
            if ($couponCode && $totals['coupon_ok']) {
                try { $db->prepare("UPDATE coupons SET used_count = used_count + 1 WHERE code = ?")->execute([$couponCode]); }
                catch (PDOException $e) {}
            }

            // Payment log — use finalTotal (the amount actually charged)
            try {
                $pCols  = ['order_id','customer_id','payment_method','amount','status'];
                $pVals  = [$orderId, $cust['id'], $pm, round($finalTotal, 2), 'initiated'];
                $pMarks = ['?','?','?','?','?'];
                if (ocol($db, 'payments', 'gateway'))  { $pCols[] = 'gateway';  $pVals[] = $pm;                          $pMarks[] = '?'; }
                if (ocol($db, 'payments', 'currency')) { $pCols[] = 'currency'; $pVals[] = setting('currency_code','INR'); $pMarks[] = '?'; }
                $db->prepare("INSERT INTO payments (" . implode(',', $pCols) . ") VALUES (" . implode(',', $pMarks) . ")")
                   ->execute($pVals);
            } catch (PDOException $e) {}

            // Order notification to customer
            try {
                $db->prepare("INSERT INTO notifications (user_type, user_id, title, message, type) VALUES ('customer',?,?,?,'order')")
                   ->execute([$cust['id'], "Order $orderNumber placed!", "Your order has been placed and is being processed."]);
            } catch (PDOException $e) {}

            $db->commit();
        } catch (Throwable $e) {
            if ($db->inTransaction()) $db->rollBack();
            json_response(['success'=>false,'message'=>'Could not place order. Please try again.',
                          'debug' => env('APP_DEBUG','0') === '1' ? $e->getMessage() : null], 500);
        }

        $order = $db->query("SELECT * FROM orders WHERE id = $orderId")->fetch();
        if ($order) {
            foreach (['wallet_discount','loyalty_points_redeemed','loyalty_points_earned','happy_hour_discount','flash_deal_discount'] as $v3col)
                if (!isset($order[$v3col])) $order[$v3col] = 0;
        }
        try {
            $ist = $db->prepare("SELECT * FROM order_items WHERE order_id = ?");
            $ist->execute([$orderId]);
            $order['items'] = $ist->fetchAll();
        } catch (PDOException $e) { $order['items'] = []; }
        json_response(['success'=>true,'order'=>$order], 201);
    }

    case 'PUT':
    case 'PATCH': {
        $admin = current_admin();
        $cust  = current_customer();

        // Customer self-cancellation
        if ($cust && !$admin) {
            $id = (int)input('id', 0);
            if (!$id) json_response(['success'=>false,'message'=>'ID required'], 422);
            $stmt = $db->prepare("SELECT * FROM orders WHERE id = ? AND customer_id = ?");
            $stmt->execute([$id, $cust['id']]);
            $order = $stmt->fetch();
            if (!$order) json_response(['success'=>false,'message'=>'Order not found'], 404);
            if (!in_array($order['order_status'], ['pending', 'confirmed'], true))
                json_response(['success'=>false,'message'=>'Order can only be cancelled when pending or confirmed'], 422);

            $updateCols = ["order_status = 'cancelled'", "payment_status = 'refunded'"];
            $updateVals = [];
            if (ocol($db, 'orders', 'cancelled_at')) { $updateCols[] = "cancelled_at = NOW()"; }

            try {
                $db->beginTransaction();
                $db->prepare("UPDATE orders SET " . implode(', ', $updateCols) . " WHERE id = ?")->execute(array_merge($updateVals, [$id]));

                // Refund paid amounts to wallet (wallet + loyalty discounts used)
                $refundAmt = 0.0;
                if (ocol($db, 'orders', 'wallet_discount') && (float)($order['wallet_discount'] ?? 0) > 0) {
                    $refundAmt += (float)$order['wallet_discount'];
                }
                if ($refundAmt > 0) {
                    try {
                        $stmt = $db->prepare("SELECT wallet_balance FROM customers WHERE id = ?");
                        $stmt->execute([$cust['id']]);
                        $curBal  = (float)($stmt->fetchColumn() ?? 0);
                        $newBal  = round($curBal + $refundAmt, 2);
                        $db->prepare("UPDATE customers SET wallet_balance = ? WHERE id = ?")->execute([$newBal, $cust['id']]);
                        $db->prepare("INSERT INTO wallet_transactions (customer_id, type, amount, source, balance_after, description) VALUES (?,?,?,?,?,?)")
                           ->execute([$cust['id'], 'credit', $refundAmt, 'refund', $newBal, "Refund for cancelled order {$order['order_number']}"]);
                    } catch (PDOException $e) {}
                }

                // Reverse loyalty points earned (if any)
                if (ocol($db, 'orders', 'loyalty_points_earned') && (int)($order['loyalty_points_earned'] ?? 0) > 0) {
                    $pts = (int)$order['loyalty_points_earned'];
                    try {
                        $db->prepare("UPDATE customers SET loyalty_points_total = GREATEST(0, loyalty_points_total - ?) WHERE id = ?")->execute([$pts, $cust['id']]);
                        $db->prepare("INSERT INTO loyalty_points (customer_id, points, type, source, source_id, description) VALUES (?,?,?,?,?,?)")
                           ->execute([$cust['id'], $pts, 'redeem', 'cancellation', $id, "Points reversed for cancelled order {$order['order_number']}"]);
                    } catch (PDOException $e) {}
                }

                // Notification
                try {
                    $db->prepare("INSERT INTO notifications (user_type, user_id, title, message, type) VALUES ('customer',?,?,?,'order')")
                       ->execute([$cust['id'], "Order {$order['order_number']} cancelled", "Your order has been cancelled" . ($refundAmt > 0 ? " and ₹$refundAmt refunded to your wallet." : ".")]);
                } catch (PDOException $e) {}

                $db->commit();
            } catch (Throwable $e) {
                if ($db->inTransaction()) $db->rollBack();
                json_response(['success'=>false,'message'=>'Could not cancel order'], 500);
            }
            json_response(['success'=>true,'refund_amount'=>$refundAmt]);
        }

        require_admin();
        $id = (int)input('id', 0);
        if (!$id) json_response(['success'=>false,'message'=>'ID required'], 422);

        $set = []; $vals = [];
        $allowed    = ['pending','confirmed','preparing','out_for_delivery','delivered','cancelled'];
        $allowedPay = ['pending','paid','failed','refunded'];

        $curStmt = $db->prepare("SELECT payment_method, order_number, customer_id, wallet_discount, loyalty_points_earned FROM orders WHERE id = ?");
        $curStmt->execute([$id]);
        $currentOrder = $curStmt->fetch();
        if (!$currentOrder) json_response(['success'=>false,'message'=>'Order not found'], 404);

        $os = input('order_status', '');
        if (in_array($os, $allowed, true)) {
            $set[] = "order_status = ?"; $vals[] = $os;
            if ($os === 'confirmed' && ocol($db,'orders','confirmed_at')) $set[] = "confirmed_at = COALESCE(confirmed_at, NOW())";
            if ($os === 'delivered' && ocol($db,'orders','delivered_at')) $set[] = "delivered_at = COALESCE(delivered_at, NOW())";
            if ($os === 'cancelled' && ocol($db,'orders','cancelled_at')) $set[] = "cancelled_at = COALESCE(cancelled_at, NOW())";

            // Admin cancels → refund wallet discount
            if ($os === 'cancelled' && ocol($db,'orders','wallet_discount') && (float)($currentOrder['wallet_discount'] ?? 0) > 0) {
                $refundAmt = (float)$currentOrder['wallet_discount'];
                $custId    = (int)$currentOrder['customer_id'];
                try {
                    $stmt = $db->prepare("SELECT wallet_balance FROM customers WHERE id = ?");
                    $stmt->execute([$custId]);
                    $curBal = (float)($stmt->fetchColumn() ?? 0);
                    $newBal = round($curBal + $refundAmt, 2);
                    $db->prepare("UPDATE customers SET wallet_balance = ? WHERE id = ?")->execute([$newBal, $custId]);
                    $db->prepare("INSERT INTO wallet_transactions (customer_id, type, amount, source, balance_after, description) VALUES (?,?,?,?,?,?)")
                       ->execute([$custId, 'credit', $refundAmt, 'refund', $newBal, "Refund for order {$currentOrder['order_number']}"]);
                } catch (PDOException $e) {}
            }
        }

        $ps = input('payment_status', '');
        if ($os === 'delivered' && ($currentOrder['payment_method'] ?? '') === 'cod' && $ps === '') $ps = 'paid';
        if (in_array($ps, $allowedPay, true)) { $set[] = "payment_status = ?"; $vals[] = $ps; }

        $txnId = input('transaction_id', '');
        if ($txnId !== '' && ocol($db,'orders','transaction_id')) { $set[] = "transaction_id = ?"; $vals[] = $txnId; }
        if (($bn = input('delivery_boy_name')) !== null  && ocol($db,'orders','delivery_boy_name'))  { $set[] = "delivery_boy_name = ?";  $vals[] = $bn; }
        if (($bp = input('delivery_boy_phone')) !== null && ocol($db,'orders','delivery_boy_phone')) { $set[] = "delivery_boy_phone = ?"; $vals[] = $bp; }
        if (!$set) json_response(['success'=>false,'message'=>'Nothing to update'], 422);

        $vals[] = $id;
        $db->prepare("UPDATE orders SET " . implode(', ', $set) . " WHERE id = ?")->execute($vals);
        json_response(['success'=>true]);
    }

    case 'DELETE': {
        require_admin();
        $id = (int)input('id', 0);
        if (!$id) json_response(['success'=>false,'message'=>'ID required'], 422);
        $db->prepare("DELETE FROM orders WHERE id = ?")->execute([$id]);
        json_response(['success'=>true]);
    }

    default:
        json_response(['success'=>false,'message'=>'Method not allowed'], 405);
}
