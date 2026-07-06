<?php
/**
 * /api/v1/referral.php — Referral code generation, application, stats
 */
require_once __DIR__ . '/../bootstrap.php';

$method = method();
$db     = db();

function rcol(PDO $db, string $col): bool {
    static $c = [];
    if (!isset($c[$col])) {
        try { $db->query("SELECT `$col` FROM `referrals` LIMIT 0"); $c[$col] = true; }
        catch (PDOException $e) { $c[$col] = false; }
    }
    return $c[$col];
}

function generate_referral_code(PDO $db): string {
    $prefix = 'ZL';
    while (true) {
        $code = $prefix . strtoupper(substr(bin2hex(random_bytes(4)), 0, 6));
        $stmt = $db->prepare("SELECT id FROM referrals WHERE referral_code = ? LIMIT 1");
        $stmt->execute([$code]);
        if (!$stmt->fetch()) return $code;
    }
}

switch ($method) {

    case 'GET': {
        $cust = current_customer();
        if (!$cust) json_response(['success' => false, 'message' => 'Authentication required'], 401);

        // Ensure customer has a referral code
        $stmt = $db->prepare("SELECT referral_code FROM customers WHERE id = ?");
        $stmt->execute([$cust['id']]);
        $myCode = $stmt->fetchColumn() ?: null;

        if (!$myCode && rcol($db, 'referral_code')) {
            $myCode = generate_referral_code($db);
            $db->prepare("UPDATE customers SET referral_code = ? WHERE id = ?")
               ->execute([$myCode, $cust['id']]);
            // Create referral record for referrer tracking
            $db->prepare("INSERT INTO referrals (referrer_customer_id, referral_code) VALUES (?,?)")
               ->execute([$cust['id'], $myCode]);
        }

        // Stats
        $successful = 0;
        $totalEarned = 0.00;
        try {
            $stmt = $db->prepare("SELECT COUNT(*) FROM referrals WHERE referrer_customer_id = ? AND referred_customer_id IS NOT NULL");
            $stmt->execute([$cust['id']]);
            $successful = (int)$stmt->fetchColumn();

            $stmt = $db->prepare("SELECT COALESCE(SUM(amount),0) FROM wallet_transactions WHERE customer_id = ? AND source = 'referral'");
            $stmt->execute([$cust['id']]);
            $totalEarned = (float)$stmt->fetchColumn();
        } catch (PDOException $e) {}

        json_response([
            'success' => true,
            'my_code' => $myCode,
            'successful_referrals' => $successful,
            'total_earned' => $totalEarned,
        ]);
    }

    case 'POST': {
        // Apply a referral code during signup or from account
        $cust = current_customer();
        if (!$cust) json_response(['success' => false, 'message' => 'Authentication required'], 401);

        $code = strtoupper(trim((string)input('code', '')));
        if (!$code) json_response(['success' => false, 'message' => 'Referral code required'], 422);

        // Find the referral record
        $stmt = $db->prepare("SELECT * FROM referrals WHERE referral_code = ? LIMIT 1");
        $stmt->execute([$code]);
        $referral = $stmt->fetch();
        if (!$referral) json_response(['success' => false, 'message' => 'Invalid referral code'], 404);

        // Can't refer yourself
        if ((int)$referral['referrer_customer_id'] === $cust['id']) {
            json_response(['success' => false, 'message' => 'Cannot use your own code'], 422);
        }

        // Already referred?
        if ($referral['referred_customer_id']) {
            json_response(['success' => false, 'message' => 'Code already used'], 422);
        }

        // Check if this customer already used a referral
        $stmt = $db->prepare("SELECT id FROM referrals WHERE referred_customer_id = ? LIMIT 1");
        $stmt->execute([$cust['id']]);
        if ($stmt->fetch()) {
            json_response(['success' => false, 'message' => 'You have already used a referral code'], 422);
        }

        $referrerReward = (float)setting('referral_referrer_reward', '50.00');
        $referredReward = (float)setting('referral_referred_reward', '25.00');

        $db->beginTransaction();
        try {
            // Mark referral as used
            $db->prepare("UPDATE referrals SET referred_customer_id = ?, reward_given = 1 WHERE id = ?")
               ->execute([$cust['id'], $referral['id']]);

            // Credit referrer
            $stmt = $db->prepare("SELECT wallet_balance FROM customers WHERE id = ?");
            $stmt->execute([$referral['referrer_customer_id']]);
            $refBal = (float)($stmt->fetchColumn() ?? 0);
            $newRefBal = $refBal + $referrerReward;
            $db->prepare("UPDATE customers SET wallet_balance = ? WHERE id = ?")
               ->execute([round($newRefBal, 2), $referral['referrer_customer_id']]);
            $db->prepare("INSERT INTO wallet_transactions (customer_id, type, amount, source, balance_after, description) VALUES (?,?,?,?,?,?)")
               ->execute([$referral['referrer_customer_id'], 'credit', $referrerReward, 'referral', round($newRefBal, 2), "Referral reward for {$cust['name']}"]);

            // Credit referred (new customer)
            $stmt = $db->prepare("SELECT wallet_balance FROM customers WHERE id = ?");
            $stmt->execute([$cust['id']]);
            $newBal = (float)($stmt->fetchColumn() ?? 0);
            $newNewBal = $newBal + $referredReward;
            $db->prepare("UPDATE customers SET wallet_balance = ? WHERE id = ?")
               ->execute([round($newNewBal, 2), $cust['id']]);
            $db->prepare("INSERT INTO wallet_transactions (customer_id, type, amount, source, balance_after, description) VALUES (?,?,?,?,?,?)")
               ->execute([$cust['id'], 'credit', $referredReward, 'referral', round($newNewBal, 2), "Welcome bonus for using referral code"]);

            $db->commit();
            json_response([
                'success' => true,
                'message' => "Referral applied! You received ₹$referredReward and your friend received ₹$referrerReward",
                'referrer_reward' => $referrerReward,
                'referred_reward' => $referredReward,
            ]);
        } catch (Throwable $e) {
            $db->rollBack();
            json_response(['success' => false, 'message' => 'Referral processing failed'], 500);
        }
    }

    default:
        json_response(['success' => false, 'message' => 'Method not allowed'], 405);
}
