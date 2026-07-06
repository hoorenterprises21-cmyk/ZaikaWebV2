<?php
/**
 * /api/v1/inventory.php — Inventory items CRUD + transactions + stock alerts
 */
require_once __DIR__ . '/../bootstrap.php';

$method = method();
$db     = db();

function icol(PDO $db, string $col): bool {
    static $c = [];
    if (!isset($c[$col])) {
        try { $db->query("SELECT `$col` FROM `inventory_items` LIMIT 0"); $c[$col] = true; }
        catch (PDOException $e) { $c[$col] = false; }
    }
    return $c[$col];
}

function tcol(PDO $db, string $col): bool {
    static $c = [];
    if (!isset($c[$col])) {
        try { $db->query("SELECT `$col` FROM `inventory_transactions` LIMIT 0"); $c[$col] = true; }
        catch (PDOException $e) { $c[$col] = false; }
    }
    return $c[$col];
}

switch ($method) {

    case 'GET': {
        require_admin();
        $id = (int)($_GET['id'] ?? 0);
        $lowStock = ($_GET['low_stock'] ?? '0') === '1';
        $resource = $_GET['resource'] ?? '';

        if ($resource === 'transactions' && $id) {
            $stmt = $db->prepare("SELECT t.*, i.name AS item_name FROM inventory_transactions t JOIN inventory_items i ON i.id = t.item_id WHERE t.item_id = ? ORDER BY t.created_at DESC LIMIT 50");
            $stmt->execute([$id]);
            json_response(['success' => true, 'transactions' => $stmt->fetchAll()]);
        }

        if ($id) {
            $stmt = $db->prepare("SELECT i.*, s.name AS supplier_name FROM inventory_items i LEFT JOIN suppliers s ON s.id = i.supplier_id WHERE i.id = ?");
            $stmt->execute([$id]);
            $item = $stmt->fetch();
            if (!$item) json_response(['success' => false, 'message' => 'Item not found'], 404);
            json_response(['success' => true, 'item' => $item]);
        }

        $where = '1=1'; $params = [];
        if ($lowStock) {
            $where .= " AND current_stock <= min_stock_level AND min_stock_level > 0";
        }
        if ($category = $_GET['category'] ?? '') { $where .= " AND category = ?"; $params[] = $category; }

        $res = paginate(
            "SELECT COUNT(*) FROM inventory_items WHERE $where",
            "SELECT i.*, s.name AS supplier_name FROM inventory_items i LEFT JOIN suppliers s ON s.id = i.supplier_id WHERE $where ORDER BY i.name ASC",
            $params
        );
        json_response(['success' => true] + $res);
    }

    case 'POST': {
        require_admin();
        $resource = input('resource', '');

        if ($resource === 'transaction') {
            $itemId = (int)input('item_id', 0);
            $type   = input('type', '');
            $qty    = (float)input('quantity', 0);
            $notes  = input('notes', '');

            if (!$itemId || !in_array($type, ['in','out','adjustment','waste'], true) || $qty <= 0) {
                json_response(['success' => false, 'message' => 'item_id, type, quantity required'], 422);
            }

            $stmt = $db->prepare("SELECT current_stock, cost_per_unit FROM inventory_items WHERE id = ?");
            $stmt->execute([$itemId]);
            $item = $stmt->fetch();
            if (!$item) json_response(['success' => false, 'message' => 'Item not found'], 404);

            $currentStock = (float)$item['current_stock'];
            $newStock = $currentStock;
            if ($type === 'in') $newStock = $currentStock + $qty;
            elseif ($type === 'out') $newStock = max(0, $currentStock - $qty);
            elseif ($type === 'adjustment') $newStock = $qty;
            elseif ($type === 'waste') $newStock = max(0, $currentStock - $qty);

            $db->beginTransaction();
            try {
                $db->prepare("UPDATE inventory_items SET current_stock = ? WHERE id = ?")
                   ->execute([round($newStock, 2), $itemId]);

                $cols = ['item_id','type','quantity']; $vals = [$itemId, $type, $qty]; $marks = ['?','?','?'];
                if (tcol($db, 'unit_cost')) { $cols[] = 'unit_cost'; $vals[] = $item['cost_per_unit']; $marks[] = '?'; }
                if (tcol($db, 'notes')) { $cols[] = 'notes'; $vals[] = $notes; $marks[] = '?'; }
                if (tcol($db, 'created_by')) { $cols[] = 'created_by'; $vals[] = current_admin()['id'] ?? null; $marks[] = '?'; }

                $db->prepare("INSERT INTO inventory_transactions (" . implode(',', $cols) . ") VALUES (" . implode(',', $marks) . ")")
                   ->execute($vals);
                $db->commit();
                json_response(['success' => true, 'new_stock' => round($newStock, 2)]);
            } catch (Throwable $e) {
                $db->rollBack();
                json_response(['success' => false, 'message' => 'Transaction failed'], 500);
            }
        }

        // Create item
        $name = input('name', '');
        if (!$name) json_response(['success' => false, 'message' => 'name required'], 422);

        $cols = ['name']; $vals = [$name]; $marks = ['?'];
        $opts = [
            'category' => input('category') ?: null,
            'unit' => input('unit', 'kg'),
            'current_stock' => (float)input('current_stock', 0),
            'min_stock_level' => (float)input('min_stock_level', 0),
            'cost_per_unit' => (float)input('cost_per_unit', 0),
            'supplier_id' => input('supplier_id') ? (int)input('supplier_id') : null,
            'is_active' => input('is_active', 1) ? 1 : 0,
        ];
        foreach ($opts as $col => $val) {
            if (icol($db, $col)) { $cols[] = $col; $vals[] = $val; $marks[] = '?'; }
        }
        $db->prepare("INSERT INTO inventory_items (" . implode(',', $cols) . ") VALUES (" . implode(',', $marks) . ")")
           ->execute($vals);
        json_response(['success' => true, 'id' => (int)$db->lastInsertId()], 201);
    }

    case 'PUT':
    case 'PATCH': {
        require_admin();
        $id = (int)input('id', 0);
        if (!$id) json_response(['success' => false, 'message' => 'ID required'], 422);

        $set = []; $vals = [];
        $fields = ['name','category','unit','current_stock','min_stock_level','cost_per_unit','supplier_id','is_active'];
        foreach ($fields as $f) {
            $v = input($f);
            if ($v !== null && icol($db, $f)) { $set[] = "$f = ?"; $vals[] = $v; }
        }
        if (!$set) json_response(['success' => true]);
        $vals[] = $id;
        $db->prepare("UPDATE inventory_items SET " . implode(', ', $set) . " WHERE id = ?")->execute($vals);
        json_response(['success' => true]);
    }

    case 'DELETE': {
        require_admin();
        $id = (int)input('id', 0);
        if (!$id) json_response(['success' => false, 'message' => 'ID required'], 422);
        $db->prepare("DELETE FROM inventory_items WHERE id = ?")->execute([$id]);
        json_response(['success' => true]);
    }

    default:
        json_response(['success' => false, 'message' => 'Method not allowed'], 405);
}
