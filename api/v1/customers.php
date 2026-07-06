<?php
/**
 * /api/v1/customers.php  - admin customer management + own profile / addresses
 */
require_once __DIR__ . '/../bootstrap.php';

$method = method();
$db     = db();

switch ($method) {

    case 'GET': {
        $id = (int)($_GET['id'] ?? 0);
        if ($id) {
            require_admin();
            // Build safe column list for V3 fields
            $custCols = "id, name, email, phone, avatar_url, is_active, created_at, last_login_at";
            foreach (['wallet_balance','loyalty_points_total','referral_code','date_of_birth'] as $c3) {
                try { $db->query("SELECT `$c3` FROM customers LIMIT 0"); $custCols .= ", $c3"; }
                catch (PDOException $e) {}
            }
            $stmt = $db->prepare("SELECT $custCols FROM customers WHERE id = ?");
            $stmt->execute([$id]);
            $row = $stmt->fetch() or json_response(['success'=>false,'message'=>'Customer not found'], 404);
            // stats
            $orderCount = $db->prepare("SELECT COUNT(*) FROM orders WHERE customer_id = ?");
            $orderCount->execute([$id]);
            $row['orders_count'] = (int)$orderCount->fetchColumn();
            $spent = $db->prepare("SELECT COALESCE(SUM(total_amount),0) FROM orders WHERE customer_id = ? AND order_status = 'delivered'");
            $spent->execute([$id]);
            $row['total_spent'] = (float)$spent->fetchColumn();
            // Referral count
            try {
                $refStmt = $db->prepare("SELECT COUNT(*) FROM referrals WHERE referrer_customer_id = ? AND referred_customer_id IS NOT NULL");
                $refStmt->execute([$id]);
                $row['referral_count'] = (int)$refStmt->fetchColumn();
            } catch (PDOException $e) { $row['referral_count'] = 0; }
            json_response(['success'=>true,'customer'=>$row]);
        }

        // own addresses
        if (($_GET['addresses'] ?? '0') === '1') {
            $c = require_customer();
            $stmt = $db->prepare("SELECT * FROM addresses WHERE customer_id = ? ORDER BY is_default DESC, id DESC");
            $stmt->execute([$c['id']]);
            json_response(['success'=>true,'addresses'=>$stmt->fetchAll()]);
        }

        require_admin();
        $search = $_GET['search'] ?? '';
        $where = '1=1';
        $params = [];
        if ($search) {
            $where = "(name LIKE ? OR email LIKE ? OR phone LIKE ?)";
            $params = ["%$search%","%$search%","%$search%"];
        }
        $countSql = "SELECT COUNT(*) FROM customers WHERE {$where}";
        $custListCols = "id, name, email, phone, avatar_url, is_active, created_at, last_login_at";
        foreach (['wallet_balance','loyalty_points_total','referral_code'] as $c3) {
            try { $db->query("SELECT `$c3` FROM customers LIMIT 0"); $custListCols .= ", $c3"; }
            catch (PDOException $e) {}
        }
        $dataSql  = "SELECT $custListCols FROM customers WHERE {$where} ORDER BY id DESC";
        $res = paginate($countSql, $dataSql, $params);
        json_response(['success'=>true] + $res);
    }

    case 'POST': {
        // Add new address for current customer
        $c = require_customer();
        $fullName = input('full_name', $c['name']);
        $phone    = input('phone', '');
        $line     = input('address_line', '');
        $pincode  = input('pincode', '');
        $city     = input('city', '');
        if (!$phone || !$line || !$pincode || !$city) {
            json_response(['success'=>false,'message'=>'phone, address_line, city and pincode required'], 422);
        }
        $stmt = $db->prepare(
            "INSERT INTO addresses (customer_id, label, full_name, phone, address_line, landmark, city, state, pincode, latitude, longitude, is_default)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?)"
        );
        $isDefault = input('is_default', 0) ? 1 : 0;
        $stmt->execute([
            $c['id'], input('label',''), $fullName, $phone, $line, input('landmark',''),
            $city, input('state',''), $pincode,
            input('latitude') ?: null, input('longitude') ?: null, $isDefault
        ]);
        if ($isDefault) {
            $db->prepare("UPDATE addresses SET is_default = 0 WHERE customer_id = ? AND id <> ?")
                ->execute([$c['id'], $db->lastInsertId()]);
        }
        json_response(['success'=>true,'id'=>(int)$db->lastInsertId()], 201);
    }

    case 'PUT':
    case 'PATCH': {
        $cust = current_customer();
        $admin = current_admin();
        if (!$cust && !$admin) json_response(['success'=>false,'message'=>'Authentication required'], 401);

        // own profile update
        if (input('name') !== null || input('phone') !== null) {
            $cid = $cust['id'] ?? (int)input('id', 0);
            if ($admin && !$cust) {
                // admin toggle active / update name
                if (input('is_active') !== null) {
                    $db->prepare("UPDATE customers SET is_active = ? WHERE id = ?")
                        ->execute([input('is_active') ? 1 : 0, $cid]);
                }
            }
            if ($cust) {
                $db->prepare("UPDATE customers SET name = ?, phone = ?, avatar_url = ? WHERE id = ?")
                    ->execute([
                        input('name', $cust['name']),
                        input('phone',''),
                        input('avatar_url',''),
                        $cust['id']
                    ]);
            }
            json_response(['success'=>true]);
        }

        // address update
        $addressId = (int)input('id', 0);
        if (!$addressId) json_response(['success'=>false,'message'=>'ID required'], 422);
        $cur = $db->prepare("SELECT * FROM addresses WHERE id = ?");
        $cur->execute([$addressId]);
        $existing = $cur->fetch();
        if (!$existing) json_response(['success'=>false,'message'=>'Address not found'], 404);
        if (!$admin && $existing['customer_id'] !== $cust['id']) {
            json_response(['success'=>false,'message'=>'Not allowed'], 403);
        }
        $fields = ['label','full_name','phone','address_line','landmark','city','state','pincode'];
        $set = [];
        $vals = [];
        foreach ($fields as $f) {
            $v = input($f);
            if ($v !== null) { $set[] = "{$f} = ?"; $vals[] = $v; }
        }
        if (input('is_default') !== null) {
            $isDefault = input('is_default') ? 1 : 0;
            $set[] = "is_default = ?";
            $vals[] = $isDefault;
        }
        if (!$set) json_response(['success'=>true,'message'=>'Nothing to update']);
        $vals[] = $addressId;
        $db->prepare("UPDATE addresses SET " . implode(', ', $set) . " WHERE id = ?")->execute($vals);
        if (input('is_default') && input('is_default') === true) {
            $db->prepare("UPDATE addresses SET is_default = 0 WHERE customer_id = ? AND id <> ?")
                ->execute([$existing['customer_id'], $addressId]);
        }
        json_response(['success'=>true]);
    }

    case 'DELETE': {
        // customers can delete their own addresses; admins can delete customers
        $addressId = (int)input('address_id', 0);
        if ($addressId) {
            $cust = require_customer();
            $cur = $db->prepare("SELECT customer_id FROM addresses WHERE id = ?");
            $cur->execute([$addressId]);
            $existing = $cur->fetch();
            if (!$existing) json_response(['success'=>false,'message'=>'Address not found'], 404);
            if ($existing['customer_id'] !== $cust['id'] && !current_admin()) {
                json_response(['success'=>false,'message'=>'Not allowed'], 403);
            }
            $db->prepare("DELETE FROM addresses WHERE id = ?")->execute([$addressId]);
            json_response(['success'=>true]);
        }
        require_admin();
        $id = (int)input('id', 0);
        if (!$id) json_response(['success'=>false,'message'=>'ID required'], 422);
        $db->prepare("DELETE FROM customers WHERE id = ?")->execute([$id]);
        json_response(['success'=>true]);
    }

    default:
        json_response(['success'=>false,'message'=>'Method not allowed'], 405);
}
