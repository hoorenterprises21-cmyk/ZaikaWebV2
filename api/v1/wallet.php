<?php
/**
 * /api/v1/wallet.php — Customer wallet: balance + transactions
 */
require_once __DIR__ . '/../bootstrap.php';

$method = method();
$db     = db();

function wcol(PDO $db, string $col): bool {
    static $c = [];
    if (!isset($c[$col])) {
        try { $db->query("SELECT `$col` FROM `wallet_transactions` LIMIT 0"); $c[$col] = true; }
        catch (PDOException $e) { $c[$col] = false; }
    }
    return $c[$col];
}

switch ($method) {

    case 'GET': {
        $cust = current_customer();
        if (!$cust) json_response(['success' => false, 'message' => 'Authentication required'], 401);

        // Get current balance
        $balance = 0.00;
        try {
            $stmt = $db->prepare("SELECT wallet_balance FROM customers WHERE id = ?");
            $stmt->execute([$cust['id']]);
            $balance = (float)($stmt->fetchColumn() ?? 0);
        } catch (PDOException $e) {}

        // Transaction history
        $transactions = [];
        try {
            $stmt = $db->prepare("SELECT * FROM wallet_transactions WHERE customer_id = ? ORDER BY created_at DESC LIMIT 50");
            $stmt->execute([$cust['id']]);
            $transactions = $stmt->fetchAll();
        } catch (PDOException $e) {}

        json_response([
            'success' => true,
            'balance' => $balance,
            'transactions' => $transactions,
        ]);
    }

    case 'POST': {
        // Admin only: manual credit/debit
        require_admin();
        $customerId = (int)input('customer_id', 0);
        $type       = input('type', '');
        $amount     = (float)input('amount', 0);
        $source     = input('source', 'manual');
        $description = input('description', '');

        if (!$customerId || !in_array($type, ['credit', 'debit'], true) || $amount <= 0) {
            json_response(['success' => false, 'message' => 'customer_id, type (credit/debit), and amount required'], 422);
        }

        // Get current balance
        $stmt = $db->prepare("SELECT wallet_balance FROM customers WHERE id = ?");
        $stmt->execute([$customerId]);
        $currentBalance = (float)($stmt->fetchColumn() ?? 0);

        if ($type === 'debit' && $currentBalance < $amount) {
            json_response(['success' => false, 'message' => 'Insufficient wallet balance'], 422);
        }

        $newBalance = $type === 'credit' ? $currentBalance + $amount : $currentBalance - $amount;

        $db->beginTransaction();
        try {
            // Update customer balance
            $db->prepare("UPDATE customers SET wallet_balance = ? WHERE id = ?")
               ->execute([round($newBalance, 2), $customerId]);

            // Record transaction
            $db->prepare("INSERT INTO wallet_transactions (customer_id, type, amount, source, balance_after, description) VALUES (?,?,?,?,?,?)")
               ->execute([$customerId, $type, $amount, $source, round($newBalance, 2), $description]);

            $db->commit();
            json_response(['success' => true, 'balance' => round($newBalance, 2)]);
        } catch (Throwable $e) {
            $db->rollBack();
            json_response(['success' => false, 'message' => 'Transaction failed'], 500);
        }
    }

    default:
        json_response(['success' => false, 'message' => 'Method not allowed'], 405);
}
