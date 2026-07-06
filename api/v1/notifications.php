<?php
/**
 * /api/v1/notifications.php — Notifications CRUD for customers + admin broadcast
 */
require_once __DIR__ . '/../bootstrap.php';

$method = method();
$db     = db();

function ncol(PDO $db, string $col): bool {
    static $c = [];
    if (!isset($c[$col])) {
        try { $db->query("SELECT `$col` FROM `notifications` LIMIT 0"); $c[$col] = true; }
        catch (PDOException $e) { $c[$col] = false; }
    }
    return $c[$col];
}

switch ($method) {

    case 'GET': {
        $cust = current_customer();
        $admin = current_admin();

        if ($cust) {
            $unreadOnly = ($_GET['unread'] ?? '0') === '1';
            $where = "user_type = 'customer' AND user_id = ?";
            $params = [$cust['id']];
            if ($unreadOnly) { $where .= " AND is_read = 0"; }

            $countSql = "SELECT COUNT(*) FROM notifications WHERE $where";
            $dataSql  = "SELECT * FROM notifications WHERE $where ORDER BY created_at DESC";
            $res = paginate($countSql, $dataSql, $params);

            $unreadCount = 0;
            try {
                $stmt = $db->prepare("SELECT COUNT(*) FROM notifications WHERE user_type = 'customer' AND user_id = ? AND is_read = 0");
                $stmt->execute([$cust['id']]);
                $unreadCount = (int)$stmt->fetchColumn();
            } catch (PDOException $e) {}

            json_response(['success' => true, 'unread_count' => $unreadCount] + $res);
        }

        if ($admin) {
            $res = paginate(
                "SELECT COUNT(*) FROM notifications WHERE user_type = 'admin'",
                "SELECT * FROM notifications WHERE user_type = 'admin' ORDER BY created_at DESC",
                []
            );
            json_response(['success' => true] + $res);
        }

        json_response(['success' => false, 'message' => 'Authentication required'], 401);
    }

    case 'POST': {
        // Admin broadcast or system notification
        require_admin();
        $userType = input('user_type', 'customer');
        $userId   = (int)input('user_id', 0);
        $title    = input('title', '');
        $message  = input('message', '');
        $type     = input('type', 'system');
        $dataJson = input('data_json') ?: null;

        if (!$title) json_response(['success' => false, 'message' => 'title required'], 422);

        // Broadcast to all customers
        if ($userType === 'customer' && $userId === 0) {
            $stmt = $db->query("SELECT id FROM customers WHERE is_active = 1");
            $customers = $stmt->fetchAll();
            foreach ($customers as $c) {
                $db->prepare("INSERT INTO notifications (user_type, user_id, title, message, type, data_json) VALUES (?,?,?,?,?,?)")
                   ->execute(['customer', $c['id'], $title, $message, $type, $dataJson]);
            }
            json_response(['success' => true, 'sent_count' => count($customers)]);
        }

        $db->prepare("INSERT INTO notifications (user_type, user_id, title, message, type, data_json) VALUES (?,?,?,?,?,?)")
           ->execute([$userType, $userId, $title, $message, $type, $dataJson]);
        json_response(['success' => true, 'id' => (int)$db->lastInsertId()], 201);
    }

    case 'PUT':
    case 'PATCH': {
        $cust = current_customer();
        $admin = current_admin();

        // Mark as read
        $id = (int)input('id', 0);
        $markAll = input('mark_all_read', false);

        if ($cust) {
            if ($markAll) {
                $db->prepare("UPDATE notifications SET is_read = 1 WHERE user_type = 'customer' AND user_id = ?")
                   ->execute([$cust['id']]);
                json_response(['success' => true]);
            }
            if ($id) {
                $db->prepare("UPDATE notifications SET is_read = 1 WHERE id = ? AND user_type = 'customer' AND user_id = ?")
                   ->execute([$id, $cust['id']]);
                json_response(['success' => true]);
            }
        }

        if ($admin && $id) {
            $db->prepare("UPDATE notifications SET is_read = 1 WHERE id = ?")
               ->execute([$id]);
            json_response(['success' => true]);
        }

        json_response(['success' => false, 'message' => 'Authentication required'], 401);
    }

    case 'DELETE': {
        require_admin();
        $id = (int)input('id', 0);
        if (!$id) json_response(['success' => false, 'message' => 'ID required'], 422);
        $db->prepare("DELETE FROM notifications WHERE id = ?")->execute([$id]);
        json_response(['success' => true]);
    }

    default:
        json_response(['success' => false, 'message' => 'Method not allowed'], 405);
}
