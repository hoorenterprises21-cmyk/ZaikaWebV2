<?php
/**
 * /api/v1/attendance.php — Attendance CRUD + monthly report
 */
require_once __DIR__ . '/../bootstrap.php';

$method = method();
$db     = db();

function acol(PDO $db, string $col): bool {
    static $c = [];
    if (!isset($c[$col])) {
        try { $db->query("SELECT `$col` FROM `attendance` LIMIT 0"); $c[$col] = true; }
        catch (PDOException $e) { $c[$col] = false; }
    }
    return $c[$col];
}

switch ($method) {

    case 'GET': {
        require_admin();
        $employeeId = (int)($_GET['employee_id'] ?? 0);
        $month      = $_GET['month'] ?? date('Y-m'); // YYYY-MM
        $date       = $_GET['date'] ?? '';

        if ($date && $employeeId) {
            $stmt = $db->prepare("SELECT * FROM attendance WHERE employee_id = ? AND date = ?");
            $stmt->execute([$employeeId, $date]);
            json_response(['success' => true, 'attendance' => $stmt->fetch()]);
        }

        if ($employeeId && $month) {
            $stmt = $db->prepare("SELECT * FROM attendance WHERE employee_id = ? AND DATE_FORMAT(date, '%Y-%m') = ? ORDER BY date DESC");
            $stmt->execute([$employeeId, $month]);
            $records = $stmt->fetchAll();

            $summary = ['present' => 0, 'absent' => 0, 'half_day' => 0, 'leave' => 0];
            foreach ($records as $r) {
                if (isset($summary[$r['status']])) $summary[$r['status']]++;
            }
            json_response(['success' => true, 'records' => $records, 'summary' => $summary]);
        }

        if ($month) {
            $stmt = $db->prepare("SELECT a.*, e.name AS employee_name FROM attendance a JOIN employees e ON e.id = a.employee_id WHERE DATE_FORMAT(a.date, '%Y-%m') = ? ORDER BY a.date DESC, e.name ASC");
            $stmt->execute([$month]);
            json_response(['success' => true, 'records' => $stmt->fetchAll()]);
        }

        json_response(['success' => false, 'message' => 'employee_id or month required'], 422);
    }

    case 'POST': {
        require_admin();
        $employeeId = (int)input('employee_id', 0);
        $date       = input('date', '');
        $status     = input('status', '');

        if (!$employeeId || !$date || !in_array($status, ['present','absent','half_day','leave'], true)) {
            json_response(['success' => false, 'message' => 'employee_id, date, status required'], 422);
        }

        $cols = ['employee_id','date','status']; $vals = [$employeeId, $date, $status]; $marks = ['?','?','?'];
        $opts = ['check_in' => input('check_in') ?: null, 'check_out' => input('check_out') ?: null, 'notes' => input('notes') ?: null];
        foreach ($opts as $col => $val) {
            if (acol($db, $col)) { $cols[] = $col; $vals[] = $val; $marks[] = '?'; }
        }

        try {
            $db->prepare("INSERT INTO attendance (" . implode(',', $cols) . ") VALUES (" . implode(',', $marks) . ")")
               ->execute($vals);
        } catch (PDOException $e) {
            if ($e->getCode() == 23000) {
                json_response(['success' => false, 'message' => 'Attendance already recorded for this date'], 409);
            }
            throw $e;
        }
        json_response(['success' => true, 'id' => (int)$db->lastInsertId()], 201);
    }

    case 'PUT':
    case 'PATCH': {
        require_admin();
        $id = (int)input('id', 0);
        if (!$id) json_response(['success' => false, 'message' => 'ID required'], 422);

        $set = []; $vals = [];
        $fields = ['status','check_in','check_out','notes'];
        foreach ($fields as $f) {
            $v = input($f);
            if ($v !== null && acol($db, $f)) { $set[] = "$f = ?"; $vals[] = $v; }
        }
        if (!$set) json_response(['success' => true]);
        $vals[] = $id;
        $db->prepare("UPDATE attendance SET " . implode(', ', $set) . " WHERE id = ?")->execute($vals);
        json_response(['success' => true]);
    }

    case 'DELETE': {
        require_admin();
        $id = (int)input('id', 0);
        if (!$id) json_response(['success' => false, 'message' => 'ID required'], 422);
        $db->prepare("DELETE FROM attendance WHERE id = ?")->execute([$id]);
        json_response(['success' => true]);
    }

    default:
        json_response(['success' => false, 'message' => 'Method not allowed'], 405);
}
