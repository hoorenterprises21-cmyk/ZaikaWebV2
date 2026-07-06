<?php
/**
 * /api/v1/spin-win.php — Spin & Win wheel configuration + spin logic
 */
require_once __DIR__ . '/../bootstrap.php';

$method = method();
$db     = db();

function swcol(PDO $db, string $col): bool {
    static $c = [];
    if (!isset($c[$col])) {
        try { $db->query("SELECT `$col` FROM `spin_win_rewards` LIMIT 0"); $c[$col] = true; }
        catch (PDOException $e) { $c[$col] = false; }
    }
    return $c[$col];
}

function weighted_random_choice(array $items): array {
    $totalWeight = array_sum(array_column($items, 'probability_weight'));
    $rand = mt_rand(1, $totalWeight);
    $current = 0;
    foreach ($items as $item) {
        $current += (int)$item['probability_weight'];
        if ($rand <= $current) return $item;
    }
    return $items[array_key_last($items)];
}

function generate_coupon_code(): string {
    return 'SPIN' . strtoupper(substr(bin2hex(random_bytes(3)), 0, 6));
}

switch ($method) {

    case 'GET': {
        $admin = current_admin();
        $cust  = current_customer();

        if ($admin && ($_GET['admin'] ?? '0') === '1') {
            $stmt = $db->query("SELECT * FROM spin_win_rewards ORDER BY id ASC");
            json_response(['success' => true, 'rewards' => $stmt->fetchAll()]);
        }

        // Public: get active wheel segments
        $stmt = $db->query("SELECT id, label, reward_type, reward_value, probability_weight FROM spin_win_rewards WHERE is_active = 1 ORDER BY id ASC");
        $rewards = $stmt->fetchAll();

        // Check if customer can spin today
        $canSpin = true;
        $nextSpin = null;
        if ($cust) {
            $stmt = $db->prepare("SELECT created_at FROM wallet_transactions WHERE customer_id = ? AND source = 'spin_win' AND DATE(created_at) = CURDATE() LIMIT 1");
            $stmt->execute([$cust['id']]);
            if ($stmt->fetch()) {
                $canSpin = false;
                $nextSpin = date('Y-m-d 00:00:00', strtotime('+1 day'));
            }
        }

        json_response([
            'success' => true,
            'rewards' => $rewards,
            'can_spin' => $canSpin,
            'next_spin_at' => $nextSpin,
            'daily_limit' => 1,
        ]);
    }

    case 'POST': {
        $cust = current_customer();
        if (!$cust) json_response(['success' => false, 'message' => 'Authentication required'], 401);

        // Check daily limit
        $stmt = $db->prepare("SELECT id FROM wallet_transactions WHERE customer_id = ? AND source = 'spin_win' AND DATE(created_at) = CURDATE() LIMIT 1");
        $stmt->execute([$cust['id']]);
        if ($stmt->fetch()) {
            json_response(['success' => false, 'message' => 'Daily spin limit reached. Come back tomorrow!'], 429);
        }

        // Get active rewards
        $stmt = $db->query("SELECT * FROM spin_win_rewards WHERE is_active = 1");
        $rewards = $stmt->fetchAll();
        if (!$rewards) json_response(['success' => false, 'message' => 'No active rewards'], 500);

        $won = weighted_random_choice($rewards);
        $rewardType = $won['reward_type'];
        $rewardValue = $won['reward_value'];

        $db->beginTransaction();
        try {
            $result = ['reward' => $won];

            switch ($rewardType) {
                case 'points':
                    $points = (int)$rewardValue;
                    $stmt = $db->prepare("SELECT loyalty_points_total FROM customers WHERE id = ?");
                    $stmt->execute([$cust['id']]);
                    $current = (int)($stmt->fetchColumn() ?? 0);
                    $newTotal = $current + $points;
                    $db->prepare("UPDATE customers SET loyalty_points_total = ? WHERE id = ?")
                       ->execute([$newTotal, $cust['id']]);
                    $db->prepare("INSERT INTO loyalty_points (customer_id, points, type, source, description) VALUES (?,?,?,?,?)")
                       ->execute([$cust['id'], $points, 'earn', 'spin_win', "Spin & Win: {$won['label']}"]);
                    $result['points_earned'] = $points;
                    break;

                case 'wallet':
                    $amount = (float)$rewardValue;
                    $stmt = $db->prepare("SELECT wallet_balance FROM customers WHERE id = ?");
                    $stmt->execute([$cust['id']]);
                    $bal = (float)($stmt->fetchColumn() ?? 0);
                    $newBal = $bal + $amount;
                    $db->prepare("UPDATE customers SET wallet_balance = ? WHERE id = ?")
                       ->execute([round($newBal, 2), $cust['id']]);
                    $db->prepare("INSERT INTO wallet_transactions (customer_id, type, amount, source, balance_after, description) VALUES (?,?,?,?,?,?)")
                       ->execute([$cust['id'], 'credit', $amount, 'spin_win', round($newBal, 2), "Spin & Win: {$won['label']}"]);
                    $result['wallet_credit'] = $amount;
                    break;

                case 'coupon':
                    $code = generate_coupon_code();
                    $discountValue = (float)setting('spin_win_coupon_discount', '10');
                    $db->prepare("INSERT INTO coupons (code, description, discount_type, discount_value, min_order_value, usage_limit, is_active, is_public, customer_id) VALUES (?,?,?,?,?,?,?,?,?)")
                       ->execute([$code, 'Spin & Win reward', 'percentage', $discountValue, 0, 1, 1, 0, $cust['id']]);
                    $result['coupon_code'] = $code;
                    $result['coupon_discount'] = $discountValue;
                    break;

                case 'free_delivery':
                    $code = 'FREEDEL' . strtoupper(substr(bin2hex(random_bytes(2)), 0, 4));
                    $db->prepare("INSERT INTO coupons (code, description, discount_type, discount_value, min_order_value, usage_limit, is_active, is_public, customer_id) VALUES (?,?,?,?,?,?,?,?,?)")
                       ->execute([$code, 'Free delivery from Spin & Win', 'flat', 0, 0, 1, 1, 0, $cust['id']]);
                    $result['coupon_code'] = $code;
                    $result['free_delivery'] = true;
                    break;

                case 'none':
                default:
                    // Better luck next time — just record the spin
                    $db->prepare("INSERT INTO wallet_transactions (customer_id, type, amount, source, balance_after, description) VALUES (?,?,?,?,?,?)")
                       ->execute([$cust['id'], 'credit', 0, 'spin_win', 0, "Spin & Win: {$won['label']}"]);
                    break;
            }

            $db->commit();
            json_response(['success' => true] + $result);
        } catch (Throwable $e) {
            $db->rollBack();
            json_response(['success' => false, 'message' => 'Spin processing failed'], 500);
        }
    }

    case 'PUT':
    case 'PATCH': {
        require_admin();
        $id = (int)input('id', 0);
        if (!$id) json_response(['success' => false, 'message' => 'ID required'], 422);

        $set = []; $vals = [];
        $fields = ['label','reward_type','reward_value','probability_weight','is_active'];
        foreach ($fields as $f) {
            $v = input($f);
            if ($v !== null) { $set[] = "$f = ?"; $vals[] = $v; }
        }
        if (!$set) json_response(['success' => true]);
        $vals[] = $id;
        $db->prepare("UPDATE spin_win_rewards SET " . implode(', ', $set) . " WHERE id = ?")->execute($vals);
        json_response(['success' => true]);
    }

    default:
        json_response(['success' => false, 'message' => 'Method not allowed'], 405);
}
