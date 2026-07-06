<?php
/**
 * /api/v1/leave.php — Leave request CRUD + approval
 */
require_once __DIR__ . '/../bootstrap.php';

$method = method();
$db     = db();

function lrcol(PDO $db, string $col): bool {
    static $c = [];
    if (!isset($c[$col])) {
        try { $db->query("SELECT `$col` FROM `leave_requests` LIMIT 0"); $c[$col] = true; }
        catch (PDOException $e) { $c[$col] = false; }
    }
    return $c[$col];
}

switch ($method) {

    case 'GET': {
        require_admin();
        $id = (int)($_GET['id'] ?? 0);
        $employeeId = (int)($_GET['employee_id'] ?? 0);
        $status = $_GET['status'] ?? '';

        if ($id) {
            $stmt = $db->prepare("SELECT lr.*, e.name AS employee_name FROM leave_requests lr JOIN employees e ON e.id = lr.employee_id WHERE lr.id = ?");
            $stmt->execute([$id]);
            $row = $stmt->fetch();
            if (!$row) json_response(['success' => false, 'message' => 'Not found'], 404);
            json_response(['success' => true, 'leave' => $row]);
        }

        $where = '1=1'; $params = [];
        if ($employeeId) { $where .= " AND lr.employee_id = ?"; $params[] = $employeeId; }
        if ($status) { $where .= " AND lr.status = ?"; $params[] = $status; }

        $res = paginate(
            "SELECT COUNT(*) FROM leave_requests lr WHERE $where",
            "SELECT lr.*, e.name AS employee_name FROM leave_requests lr JOIN employees e ON e.id = lr.employee_id WHERE $where ORDER BY lr.created_at DESC",
            $params
        );
        json_response(['success' => true] + $res);
    }

    case 'POST': {
        require_admin();
        $employeeId = (int)input('employee_id', 0);
        $startDate  = input('start_date', '');
        $endDate    = input('end_date', '');
        $reason     = input('reason', '');

        if (!$employeeId || !$startDate || !$endDate) {
            json_response(['success' => false, 'message' => 'employee_id, start_date, end_date required'], 422);
        }

        $db->prepare("INSERT INTO leave_requests (employee_id, start_date, end_date, reason) VALUES (?,?,?,?)")
           ->execute([$employeeId, $startDate, $endDate, $reason]);
        json_response(['success' => true, 'id' => (int)$db->lastInsertId()], 201);
    }

    case 'PUT':
    case 'PATCH': {
        require_admin();
        $id = (int)input('id', 0);
        if (!$id) json_response(['success' => false, 'message' => 'ID required'], 422);

        $status = input('status', '');
        if (!in_array($status, ['pending','approved','rejected'], true)) {
            json_response(['success' => false, 'message' => 'status must be pending, approved, or rejected'], 422);
        }

        $admin = require_admin();
        $db->prepare("UPDATE leave_requests SET status = ?, approved_by = ? WHERE id = ?")
           ->execute([$status, $admin['id'], $id]);

        // If approved, create attendance records as leave
        if ($status === 'approved') {
            $stmt = $db->prepare("SELECT employee_id, start_date, end_date FROM leave_requests WHERE id = ?");
            $stmt->execute([$id]);
            $leave = $stmt->fetch();
            if ($leave) {
                $start = new DateTime($leave['start_date']);
                $end = new DateTime($leave['end_date']);
                while ($start <= $end) {
                    try {
                        $db->prepare("INSERT INTO attendance (employee_id, date, status) VALUES (?,?,?)")
                           ->execute([$leave['employee_id'], $start->format('Y-m-d'), 'leave']);
                    } catch (PDOException $e) { /* already exists */ }
                    $start->modify('+1 day');
                }
            }
        }

        json_response(['success' => true]);
    }

    case 'DELETE': {
        require_admin();
        $id = (int)input('id', 0);
        if (!$id) json_response(['success' => false, 'message' => 'ID required'], 422);
        $db->prepare("DELETE FROM leave_requests WHERE id = ?")->execute([$id]);
        json_response(['success' => true]);
    }

    default:
        json_response(['success' => false, 'message' => 'Method not allowed'], 405);
}
