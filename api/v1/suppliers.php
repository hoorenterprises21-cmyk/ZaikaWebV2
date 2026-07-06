<?php
/**
 * /api/v1/suppliers.php — Supplier CRUD
 */
require_once __DIR__ . '/../bootstrap.php';

$method = method();
$db     = db();

function scol(PDO $db, string $col): bool {
    static $c = [];
    if (!isset($c[$col])) {
        try { $db->query("SELECT `$col` FROM `suppliers` LIMIT 0"); $c[$col] = true; }
        catch (PDOException $e) { $c[$col] = false; }
    }
    return $c[$col];
}

switch ($method) {

    case 'GET': {
        require_admin();
        $id = (int)($_GET['id'] ?? 0);

        if ($id) {
            $stmt = $db->prepare("SELECT * FROM suppliers WHERE id = ?");
            $stmt->execute([$id]);
            $row = $stmt->fetch();
            if (!$row) json_response(['success' => false, 'message' => 'Supplier not found'], 404);
            json_response(['success' => true, 'supplier' => $row]);
        }

        $res = paginate(
            "SELECT COUNT(*) FROM suppliers WHERE 1=1",
            "SELECT * FROM suppliers ORDER BY name ASC",
            []
        );
        json_response(['success' => true] + $res);
    }

    case 'POST': {
        require_admin();
        $name = input('name', '');
        if (!$name) json_response(['success' => false, 'message' => 'name required'], 422);

        $cols = ['name']; $vals = [$name]; $marks = ['?'];
        $opts = [
            'contact_person' => input('contact_person') ?: null,
            'phone' => input('phone') ?: null,
            'email' => input('email') ?: null,
            'address' => input('address') ?: null,
            'is_active' => input('is_active', 1) ? 1 : 0,
        ];
        foreach ($opts as $col => $val) {
            if (scol($db, $col)) { $cols[] = $col; $vals[] = $val; $marks[] = '?'; }
        }
        $db->prepare("INSERT INTO suppliers (" . implode(',', $cols) . ") VALUES (" . implode(',', $marks) . ")")
           ->execute($vals);
        json_response(['success' => true, 'id' => (int)$db->lastInsertId()], 201);
    }

    case 'PUT':
    case 'PATCH': {
        require_admin();
        $id = (int)input('id', 0);
        if (!$id) json_response(['success' => false, 'message' => 'ID required'], 422);

        $set = []; $vals = [];
        $fields = ['name','contact_person','phone','email','address','is_active'];
        foreach ($fields as $f) {
            $v = input($f);
            if ($v !== null && scol($db, $f)) { $set[] = "$f = ?"; $vals[] = $v; }
        }
        if (!$set) json_response(['success' => true]);
        $vals[] = $id;
        $db->prepare("UPDATE suppliers SET " . implode(', ', $set) . " WHERE id = ?")->execute($vals);
        json_response(['success' => true]);
    }

    case 'DELETE': {
        require_admin();
        $id = (int)input('id', 0);
        if (!$id) json_response(['success' => false, 'message' => 'ID required'], 422);
        $db->prepare("DELETE FROM suppliers WHERE id = ?")->execute([$id]);
        json_response(['success' => true]);
    }

    default:
        json_response(['success' => false, 'message' => 'Method not allowed'], 405);
}
