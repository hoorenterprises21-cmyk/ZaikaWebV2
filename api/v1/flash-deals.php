<?php
/**
 * /api/v1/flash-deals.php — Flash deals CRUD + active listing
 */
require_once __DIR__ . '/../bootstrap.php';

$method = method();
$db     = db();

function fcol(PDO $db, string $col): bool {
    static $c = [];
    if (!isset($c[$col])) {
        try { $db->query("SELECT `$col` FROM `flash_deals` LIMIT 0"); $c[$col] = true; }
        catch (PDOException $e) { $c[$col] = false; }
    }
    return $c[$col];
}

switch ($method) {

    case 'GET': {
        $id = (int)($_GET['id'] ?? 0);
        $activeOnly = ($_GET['active'] ?? '0') === '1';

        if ($id) {
            $stmt = $db->prepare("SELECT fd.*, p.name AS product_name, p.image_url AS product_image FROM flash_deals fd JOIN products p ON p.id = fd.product_id WHERE fd.id = ?");
            $stmt->execute([$id]);
            $deal = $stmt->fetch();
            if (!$deal) json_response(['success' => false, 'message' => 'Deal not found'], 404);
            json_response(['success' => true, 'deal' => $deal]);
        }

        $where = [];
        $params = [];
        if ($activeOnly) {
            $where[] = "fd.is_active = 1 AND fd.start_time <= NOW() AND fd.end_time >= NOW()";
        }
        $whereSql = $where ? 'WHERE ' . implode(' AND ', $where) : '';

        $sql = "SELECT fd.*, p.name AS product_name, p.image_url AS product_image, p.price AS original_price
                FROM flash_deals fd
                JOIN products p ON p.id = fd.product_id
                $whereSql
                ORDER BY fd.end_time ASC";

        if ($activeOnly) {
            $stmt = $db->query($sql);
            json_response(['success' => true, 'deals' => $stmt->fetchAll()]);
        }

        require_admin();
        $res = paginate(
            "SELECT COUNT(*) FROM flash_deals fd $whereSql",
            $sql,
            $params
        );
        json_response(['success' => true] + $res);
    }

    case 'POST': {
        require_admin();
        $productId = (int)input('product_id', 0);
        $dealPrice = (float)input('deal_price', 0);
        $startTime = input('start_time', '');
        $endTime   = input('end_time', '');
        $maxQty    = (int)input('max_quantity', 0);

        if (!$productId || $dealPrice <= 0 || !$startTime || !$endTime) {
            json_response(['success' => false, 'message' => 'product_id, deal_price, start_time, end_time required'], 422);
        }

        // Get original price
        $stmt = $db->prepare("SELECT price FROM products WHERE id = ?");
        $stmt->execute([$productId]);
        $originalPrice = (float)($stmt->fetchColumn() ?? 0);

        $db->prepare("INSERT INTO flash_deals (product_id, deal_price, original_price, start_time, end_time, max_quantity) VALUES (?,?,?,?,?,?)")
           ->execute([$productId, $dealPrice, $originalPrice, $startTime, $endTime, $maxQty]);
        json_response(['success' => true, 'id' => (int)$db->lastInsertId()], 201);
    }

    case 'PUT':
    case 'PATCH': {
        require_admin();
        $id = (int)input('id', 0);
        if (!$id) json_response(['success' => false, 'message' => 'ID required'], 422);

        $set = []; $vals = [];
        $fields = ['product_id','deal_price','start_time','end_time','max_quantity','is_active'];
        foreach ($fields as $f) {
            $v = input($f);
            if ($v !== null) { $set[] = "$f = ?"; $vals[] = $v; }
        }
        if (!$set) json_response(['success' => true]);
        $vals[] = $id;
        $db->prepare("UPDATE flash_deals SET " . implode(', ', $set) . " WHERE id = ?")->execute($vals);
        json_response(['success' => true]);
    }

    case 'DELETE': {
        require_admin();
        $id = (int)input('id', 0);
        if (!$id) json_response(['success' => false, 'message' => 'ID required'], 422);
        $db->prepare("DELETE FROM flash_deals WHERE id = ?")->execute([$id]);
        json_response(['success' => true]);
    }

    default:
        json_response(['success' => false, 'message' => 'Method not allowed'], 405);
}
