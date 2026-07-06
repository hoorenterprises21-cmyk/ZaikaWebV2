<?php
/**
 * /api/v1/loyalty.php — Loyalty points: balance, history, redemption
 */
require_once __DIR__ . '/../bootstrap.php';

$method = method();
$db     = db();

function lcol(PDO $db, string $col): bool {
    static $c = [];
    if (!isset($c[$col])) {
        try { $db->query("SELECT `$col` FROM `loyalty_points` LIMIT 0"); $c[$col] = true; }
        catch (PDOException $e) { $c[$col] = false; }
    }
    return $c[$col];
}

switch ($method) {

    case 'GET': {
        $cust = current_customer();
        if (!$cust) json_response(['success' => false, 'message' => 'Authentication required'], 401);

        $points = 0;
        try {
            $stmt = $db->prepare("SELECT loyalty_points_total FROM customers WHERE id = ?");
            $stmt->execute([$cust['id']]);
            $points = (int)($stmt->fetchColumn() ?? 0);
        } catch (PDOException $e) {}

        $history = [];
        try {
            $stmt = $db->prepare("SELECT * FROM loyalty_points WHERE customer_id = ? ORDER BY created_at DESC LIMIT 50");
            $stmt->execute([$cust['id']]);
            $history = $stmt->fetchAll();
        } catch (PDOException $e) {}

        // Points value config (1 point = ₹X)
        $pointValue = (float)setting('loyalty_point_value', '1.00');
        $minRedeem  = (int)setting('loyalty_min_redeem', '100');

        json_response([
            'success' => true,
            'points' => $points,
            'point_value' => $pointValue,
            'min_redeem_points' => $minRedeem,
            'wallet_value' => round($points * $pointValue, 2),
            'history' => $history,
        ]);
    }

    case 'POST': {
        // Admin: manual credit/debit OR customer: redeem points
        $admin = current_admin();
        $cust  = current_customer();

        if ($admin) {
            // Admin manual adjustment
            $customerId = (int)input('customer_id', 0);
            $points     = (int)input('points', 0);
            $type       = input('type', '');
            $source     = input('source', 'manual');
            $description = input('description', '');

            if (!$customerId || !in_array($type, ['earn', 'redeem'], true) || $points <= 0) {
                json_response(['success' => false, 'message' => 'customer_id, type, and points required'], 422);
            }

            $stmt = $db->prepare("SELECT loyalty_points_total FROM customers WHERE id = ?");
            $stmt->execute([$customerId]);
            $current = (int)($stmt->fetchColumn() ?? 0);

            if ($type === 'redeem' && $current < $points) {
                json_response(['success' => false, 'message' => 'Insufficient points'], 422);
            }

            $newTotal = $type === 'earn' ? $current + $points : $current - $points;

            $db->beginTransaction();
            try {
                $db->prepare("UPDATE customers SET loyalty_points_total = ? WHERE id = ?")
                   ->execute([$newTotal, $customerId]);
                $db->prepare("INSERT INTO loyalty_points (customer_id, points, type, source, description) VALUES (?,?,?,?,?)")
                   ->execute([$customerId, $points, $type, $source, $description]);
                $db->commit();
                json_response(['success' => true, 'points' => $newTotal]);
            } catch (Throwable $e) {
                $db->rollBack();
                json_response(['success' => false, 'message' => 'Transaction failed'], 500);
            }
        }

        if ($cust) {
            // Customer redeem points
            $pointsToRedeem = (int)input('points', 0);
            $minRedeem = (int)setting('loyalty_min_redeem', '100');

            if ($pointsToRedeem < $minRedeem) {
                json_response(['success' => false, 'message' => "Minimum $minRedeem points required to redeem"], 422);
            }

            $stmt = $db->prepare("SELECT loyalty_points_total FROM customers WHERE id = ?");
            $stmt->execute([$cust['id']]);
            $current = (int)($stmt->fetchColumn() ?? 0);

            if ($current < $pointsToRedeem) {
                json_response(['success' => false, 'message' => 'Insufficient points'], 422);
            }

            $pointValue = (float)setting('loyalty_point_value', '1.00');
            $walletCredit = round($pointsToRedeem * $pointValue, 2);
            $newPoints = $current - $pointsToRedeem;

            $db->beginTransaction();
            try {
                // Deduct points
                $db->prepare("UPDATE customers SET loyalty_points_total = ? WHERE id = ?")
                   ->execute([$newPoints, $cust['id']]);
                $db->prepare("INSERT INTO loyalty_points (customer_id, points, type, source, description) VALUES (?,?,?,?,?)")
                   ->execute([$cust['id'], $pointsToRedeem, 'redeem', 'manual', "Redeemed for ₹$walletCredit wallet credit"]);

                // Credit wallet
                $stmt = $db->prepare("SELECT wallet_balance FROM customers WHERE id = ?");
                $stmt->execute([$cust['id']]);
                $walletBal = (float)($stmt->fetchColumn() ?? 0);
                $newWallet = $walletBal + $walletCredit;
                $db->prepare("UPDATE customers SET wallet_balance = ? WHERE id = ?")
                   ->execute([round($newWallet, 2), $cust['id']]);
                $db->prepare("INSERT INTO wallet_transactions (customer_id, type, amount, source, balance_after, description) VALUES (?,?,?,?,?,?)")
                   ->execute([$cust['id'], 'credit', $walletCredit, 'loyalty', round($newWallet, 2), "Loyalty redemption: $pointsToRedeem points"]);

                $db->commit();
                json_response(['success' => true, 'points' => $newPoints, 'wallet_credit' => $walletCredit]);
            } catch (Throwable $e) {
                $db->rollBack();
                json_response(['success' => false, 'message' => 'Redemption failed'], 500);
            }
        }

        json_response(['success' => false, 'message' => 'Authentication required'], 401);
    }

    default:
        json_response(['success' => false, 'message' => 'Method not allowed'], 405);
}
