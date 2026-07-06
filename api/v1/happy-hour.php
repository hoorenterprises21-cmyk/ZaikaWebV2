<?php
/**
 * /api/v1/happy-hour.php — Happy hour schedule + current status
 */
require_once __DIR__ . '/../bootstrap.php';

$method = method();
$db     = db();

function hhcol(PDO $db, string $col): bool {
    static $c = [];
    if (!isset($c[$col])) {
        try { $db->query("SELECT `$col` FROM `happy_hours` LIMIT 0"); $c[$col] = true; }
        catch (PDOException $e) { $c[$col] = false; }
    }
    return $c[$col];
}

function get_current_happy_hour(PDO $db): ?array {
    try {
        $dayOfWeek = (int)date('w'); // 0=Sunday
        $now = date('H:i:s');
        $stmt = $db->prepare("SELECT * FROM happy_hours WHERE day_of_week = ? AND is_active = 1 AND start_time <= ? AND end_time >= ? LIMIT 1");
        $stmt->execute([$dayOfWeek, $now, $now]);
        $row = $stmt->fetch();
        return $row ?: null;
    } catch (PDOException $e) {
        return null;
    }
}

switch ($method) {

    case 'GET': {
        $id = (int)($_GET['id'] ?? 0);
        $status = ($_GET['status'] ?? '0') === '1';

        if ($status) {
            $hh = get_current_happy_hour($db);
            json_response([
                'success' => true,
                'active' => $hh !== null,
                'happy_hour' => $hh,
                'next_hh' => null, // Could calculate next
            ]);
        }

        if ($id) {
            $stmt = $db->prepare("SELECT * FROM happy_hours WHERE id = ?");
            $stmt->execute([$id]);
            $row = $stmt->fetch();
            if (!$row) json_response(['success' => false, 'message' => 'Not found'], 404);
            json_response(['success' => true, 'happy_hour' => $row]);
        }

        require_admin();
        $stmt = $db->query("SELECT * FROM happy_hours ORDER BY day_of_week, start_time");
        json_response(['success' => true, 'happy_hours' => $stmt->fetchAll()]);
    }

    case 'POST': {
        require_admin();
        $dayOfWeek = (int)input('day_of_week', 0);
        $startTime = input('start_time', '');
        $endTime   = input('end_time', '');
        $discountPercent = (float)input('discount_percent', 0);
        $discountFlat    = (float)input('discount_flat', 0);
        $productIds      = input('product_ids') ?: null;

        if ($dayOfWeek < 0 || $dayOfWeek > 6 || !$startTime || !$endTime) {
            json_response(['success' => false, 'message' => 'day_of_week (0-6), start_time, end_time required'], 422);
        }

        $db->prepare("INSERT INTO happy_hours (day_of_week, start_time, end_time, discount_percent, discount_flat, product_ids) VALUES (?,?,?,?,?,?)")
           ->execute([$dayOfWeek, $startTime, $endTime, $discountPercent, $discountFlat, $productIds]);
        json_response(['success' => true, 'id' => (int)$db->lastInsertId()], 201);
    }

    case 'PUT':
    case 'PATCH': {
        require_admin();
        $id = (int)input('id', 0);
        if (!$id) json_response(['success' => false, 'message' => 'ID required'], 422);

        $set = []; $vals = [];
        $fields = ['day_of_week','start_time','end_time','discount_percent','discount_flat','product_ids','is_active'];
        foreach ($fields as $f) {
            $v = input($f);
            if ($v !== null) { $set[] = "$f = ?"; $vals[] = $v; }
        }
        if (!$set) json_response(['success' => true]);
        $vals[] = $id;
        $db->prepare("UPDATE happy_hours SET " . implode(', ', $set) . " WHERE id = ?")->execute($vals);
        json_response(['success' => true]);
    }

    case 'DELETE': {
        require_admin();
        $id = (int)input('id', 0);
        if (!$id) json_response(['success' => false, 'message' => 'ID required'], 422);
        $db->prepare("DELETE FROM happy_hours WHERE id = ?")->execute([$id]);
        json_response(['success' => true]);
    }

    default:
        json_response(['success' => false, 'message' => 'Method not allowed'], 405);
}
