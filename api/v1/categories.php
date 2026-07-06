<?php
/**
 * /api/v1/categories.php  –  safe against missing sort_order / slug columns
 */
require_once __DIR__ . '/../bootstrap.php';

$method = method();
$db     = db();

/** Check which columns actually exist in a table (cached per request). */
function col_exists(PDO $db, string $table, string $col): bool {
    static $cache = [];
    $key = "$table.$col";
    if (!isset($cache[$key])) {
        try {
            $db->query("SELECT `$col` FROM `$table` LIMIT 0");
            $cache[$key] = true;
        } catch (PDOException $e) {
            $cache[$key] = false;
        }
    }
    return $cache[$key];
}

switch ($method) {

    case 'GET': {
        $id = (int)($_GET['id'] ?? 0);
        if ($id) {
            $stmt = $db->prepare("SELECT * FROM categories WHERE id = ?");
            $stmt->execute([$id]);
            $cat = $stmt->fetch();
            if (!$cat) json_response(['success'=>false,'message'=>'Category not found'], 404);
            json_response(['success'=>true,'category'=>$cat]);
        }

        $onlyActive = ($_GET['all'] ?? '0') !== '1';

        // Build ORDER BY safely — only use sort_order if it exists
        $orderBy = col_exists($db, 'categories', 'sort_order')
            ? "ORDER BY sort_order ASC, id ASC"
            : "ORDER BY id ASC";

        $sql = "SELECT * FROM categories";
        if ($onlyActive) {
            $sql .= col_exists($db, 'categories', 'is_active')
                ? " WHERE is_active = 1"
                : "";
        }
        $sql .= " $orderBy";

        $rows = $db->query($sql)->fetchAll();
        foreach ($rows as &$row) {
            $cs = $db->prepare("SELECT COUNT(*) FROM products WHERE category_id = ?"
                . (col_exists($db, 'products', 'is_active') ? " AND is_active = 1" : ""));
            $cs->execute([$row['id']]);
            $row['product_count'] = (int)$cs->fetchColumn();
            if (isset($row['is_active'])) $row['is_active'] = (int)$row['is_active'];
        }
        json_response(['success'=>true,'categories'=>$rows]);
    }

    case 'POST': {
        require_admin();
        $name   = input('name', '');
        $desc   = input('description', '');
        $img    = input('image_url', '');
        $sort   = (int)input('sort_order', 0);
        $active = input('is_active', 1) ? 1 : 0;
        if ($name === '') json_response(['success'=>false,'message'=>'Name is required'], 422);
        $slug = unique_slug($db, 'categories', slugify($name));

        // Build INSERT with only existing columns
        $cols  = ['name', 'slug'];
        $vals  = [$name, $slug];
        $marks = ['?', '?'];
        if (col_exists($db, 'categories', 'description'))  { $cols[] = 'description';  $vals[] = $desc;   $marks[] = '?'; }
        if (col_exists($db, 'categories', 'image_url'))    { $cols[] = 'image_url';    $vals[] = $img;    $marks[] = '?'; }
        if (col_exists($db, 'categories', 'sort_order'))   { $cols[] = 'sort_order';   $vals[] = $sort;   $marks[] = '?'; }
        if (col_exists($db, 'categories', 'is_active'))    { $cols[] = 'is_active';    $vals[] = $active; $marks[] = '?'; }

        $sql = "INSERT INTO categories (" . implode(',', $cols) . ") VALUES (" . implode(',', $marks) . ")";
        $db->prepare($sql)->execute($vals);
        json_response(['success'=>true,'id'=>(int)$db->lastInsertId(),'slug'=>$slug], 201);
    }

    case 'PUT':
    case 'PATCH': {
        require_admin();
        $id = (int)input('id', 0);
        if (!$id) json_response(['success'=>false,'message'=>'ID required'], 422);
        $cur = $db->prepare("SELECT * FROM categories WHERE id = ?");
        $cur->execute([$id]);
        $existing = $cur->fetch();
        if (!$existing) json_response(['success'=>false,'message'=>'Category not found'], 404);

        $nameFinal = input('name') ?? $existing['name'];
        $slugFinal = (input('name') !== null && slugify($nameFinal) !== ($existing['slug'] ?? ''))
            ? unique_slug($db, 'categories', slugify($nameFinal), $id)
            : ($existing['slug'] ?? slugify($nameFinal));

        $set = ['name = ?', 'slug = ?'];
        $vals = [$nameFinal, $slugFinal];

        if (col_exists($db, 'categories', 'description')) {
            $set[] = 'description = ?';
            $vals[] = input('description') ?? ($existing['description'] ?? '');
        }
        if (col_exists($db, 'categories', 'image_url')) {
            $set[] = 'image_url = ?';
            $vals[] = input('image_url') ?? ($existing['image_url'] ?? '');
        }
        if (col_exists($db, 'categories', 'sort_order')) {
            $sort = input('sort_order') !== null ? (int)input('sort_order') : (int)($existing['sort_order'] ?? 0);
            $set[] = 'sort_order = ?'; $vals[] = $sort;
        }
        if (col_exists($db, 'categories', 'is_active')) {
            $active = input('is_active') !== null ? (input('is_active') ? 1 : 0) : (int)($existing['is_active'] ?? 1);
            $set[] = 'is_active = ?'; $vals[] = $active;
        }
        $vals[] = $id;
        $db->prepare("UPDATE categories SET " . implode(', ', $set) . " WHERE id = ?")->execute($vals);
        json_response(['success'=>true]);
    }

    case 'DELETE': {
        require_admin();
        $id = (int)input('id', 0);
        if (!$id) json_response(['success'=>false,'message'=>'ID required'], 422);
        $cnt = $db->prepare("SELECT COUNT(*) FROM products WHERE category_id = ?");
        $cnt->execute([$id]);
        if ((int)$cnt->fetchColumn() > 0) {
            json_response(['success'=>false,'message'=>'Cannot delete: category has products. Reassign them first.'], 409);
        }
        $db->prepare("DELETE FROM categories WHERE id = ?")->execute([$id]);
        json_response(['success'=>true]);
    }

    default:
        json_response(['success'=>false,'message'=>'Method not allowed'], 405);
}
