<?php
/**
 * /api/v1/employees.php — Employee CRUD + attendance summary
 */
require_once __DIR__ . '/../bootstrap.php';

$method = method();
$db     = db();

function ecol(PDO $db, string $col): bool {
    static $c = [];
    if (!isset($c[$col])) {
        try { $db->query("SELECT `$col` FROM `employees` LIMIT 0"); $c[$col] = true; }
        catch (PDOException $e) { $c[$col] = false; }
    }
    return $c[$col];
}

switch ($method) {

    case 'GET': {
        require_admin();
        $id = (int)($_GET['id'] ?? 0);

        if ($id) {
            $stmt = $db->prepare("SELECT * FROM employees WHERE id = ?");
            $stmt->execute([$id]);
            $emp = $stmt->fetch();
            if (!$emp) json_response(['success' => false, 'message' => 'Employee not found'], 404);

            // Attendance summary
            $present = 0; $absent = 0; $halfDay = 0;
            try {
                $stmt = $db->prepare("SELECT status, COUNT(*) AS c FROM attendance WHERE employee_id = ? AND date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) GROUP BY status");
                $stmt->execute([$id]);
                foreach ($stmt->fetchAll() as $r) {
                    if ($r['status'] === 'present') $present = (int)$r['c'];
                    if ($r['status'] === 'absent') $absent = (int)$r['c'];
                    if ($r['status'] === 'half_day') $halfDay = (int)$r['c'];
                }
            } catch (PDOException $e) {}
            $emp['attendance_summary'] = ['present' => $present, 'absent' => $absent, 'half_day' => $halfDay];
            json_response(['success' => true, 'employee' => $emp]);
        }

        $where = '1=1'; $params = [];
        if ($role = $_GET['role'] ?? '') { $where .= " AND role = ?"; $params[] = $role; }
        if (($active = $_GET['is_active'] ?? null) !== null) { $where .= " AND is_active = ?"; $params[] = $active ? 1 : 0; }

        $res = paginate(
            "SELECT COUNT(*) FROM employees WHERE $where",
            "SELECT * FROM employees WHERE $where ORDER BY name ASC",
            $params
        );
        json_response(['success' => true] + $res);
    }

    case 'POST': {
        require_admin();
        $name = input('name', '');
        if (!$name) json_response(['success' => false, 'message' => 'name required'], 422);

        $cols = ['name']; $vals = [$name]; $marks = ['?'];
        $opts = [
            'email' => input('email') ?: null,
            'phone' => input('phone') ?: null,
            'role' => input('role', 'other'),
            'salary' => (float)input('salary', 0),
            'joining_date' => input('joining_date') ?: null,
            'is_active' => input('is_active', 1) ? 1 : 0,
        ];
        foreach ($opts as $col => $val) {
            if (ecol($db, $col)) { $cols[] = $col; $vals[] = $val; $marks[] = '?'; }
        }
        $db->prepare("INSERT INTO employees (" . implode(',', $cols) . ") VALUES (" . implode(',', $marks) . ")")
           ->execute($vals);
        json_response(['success' => true, 'id' => (int)$db->lastInsertId()], 201);
    }

    case 'PUT':
    case 'PATCH': {
        require_admin();
        $id = (int)input('id', 0);
        if (!$id) json_response(['success' => false, 'message' => 'ID required'], 422);

        $set = []; $vals = [];
        $fields = ['name','email','phone','role','salary','joining_date','is_active'];
        foreach ($fields as $f) {
            $v = input($f);
            if ($v !== null && ecol($db, $f)) { $set[] = "$f = ?"; $vals[] = $v; }
        }
        if (!$set) json_response(['success' => true]);
        $vals[] = $id;
        $db->prepare("UPDATE employees SET " . implode(', ', $set) . " WHERE id = ?")->execute($vals);
        json_response(['success' => true]);
    }

    case 'DELETE': {
        require_admin();
        $id = (int)input('id', 0);
        if (!$id) json_response(['success' => false, 'message' => 'ID required'], 422);
        $db->prepare("DELETE FROM employees WHERE id = ?")->execute([$id]);
        json_response(['success' => true]);
    }

    default:
        json_response(['success' => false, 'message' => 'Method not allowed'], 405);
}
