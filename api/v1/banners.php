<?php
/**
 * /api/v1/banners.php  –  safe column handling
 */
require_once __DIR__ . '/../bootstrap.php';

$method = method();
$db     = db();

function bcol(PDO $db, string $col): bool {
    static $c = [];
    if (!isset($c[$col])) {
        try { $db->query("SELECT `$col` FROM `banners` LIMIT 0"); $c[$col] = true; }
        catch (PDOException $e) { $c[$col] = false; }
    }
    return $c[$col];
}

switch ($method) {

    case 'GET': {
        $id = (int)($_GET['id'] ?? 0);
        if ($id) {
            $stmt = $db->prepare("SELECT * FROM banners WHERE id = ?");
            $stmt->execute([$id]);
            $row = $stmt->fetch();
            if (!$row) json_response(['success'=>false,'message'=>'Banner not found'], 404);
            json_response(['success'=>true,'banner'=>$row]);
        }

        $isAdmin = current_admin() !== null && ($_GET['show_all'] ?? '0') === '1';
        $sql = "SELECT * FROM banners";
        $conditions = [];

        if (!$isAdmin) {
            if (bcol($db, 'is_active'))  $conditions[] = "is_active = 1";
            if (bcol($db, 'starts_at'))  $conditions[] = "(starts_at IS NULL OR starts_at <= NOW())";
            if (bcol($db, 'ends_at'))    $conditions[] = "(ends_at IS NULL OR ends_at >= NOW())";
        }
        if ($conditions) $sql .= " WHERE " . implode(' AND ', $conditions);

        // Safe ORDER BY
        $order = bcol($db, 'sort_order') ? "sort_order ASC, id DESC" : "id DESC";
        $sql .= " ORDER BY $order";

        $rows = $db->query($sql)->fetchAll();
        foreach ($rows as &$r) {
            if (isset($r['is_active'])) $r['is_active'] = (int)$r['is_active'];
        }
        json_response(['success'=>true,'banners'=>$rows]);
    }

    case 'POST': {
        require_admin();
        $title = input('title', '');
        $img   = input('image_url', '');
        if (!$title || !$img) json_response(['success'=>false,'message'=>'title and image_url required'], 422);

        $cols  = ['title','image_url'];
        $vals  = [$title, $img];
        $marks = ['?','?'];

        $optional = [
            'subtitle'   => input('subtitle', ''),
            'link_url'   => input('link_url', ''),
            'cta_text'   => input('cta_text', ''),
            'sort_order' => (int)input('sort_order', 0),
            'is_active'  => input('is_active', 1) ? 1 : 0,
            'starts_at'  => input('starts_at') ?: null,
            'ends_at'    => input('ends_at') ?: null,
        ];
        foreach ($optional as $col => $val) {
            if (bcol($db, $col)) { $cols[] = $col; $vals[] = $val; $marks[] = '?'; }
        }
        $db->prepare("INSERT INTO banners (" . implode(',', $cols) . ") VALUES (" . implode(',', $marks) . ")")
           ->execute($vals);
        json_response(['success'=>true,'id'=>(int)$db->lastInsertId()], 201);
    }

    case 'PUT': {
        require_admin();
        $id = (int)input('id', 0);
        if (!$id) json_response(['success'=>false,'message'=>'ID required'], 422);
        $cur = $db->prepare("SELECT * FROM banners WHERE id = ?");
        $cur->execute([$id]);
        if (!$cur->fetch()) json_response(['success'=>false,'message'=>'Banner not found'], 404);

        $set = []; $vals = [];
        $updatable = [
            'title','subtitle','image_url','link_url','cta_text','starts_at','ends_at',
        ];
        foreach ($updatable as $f) {
            if (bcol($db, $f)) {
                $v = input($f);
                if ($v !== null) { $set[] = "$f = ?"; $vals[] = $v === '' ? null : $v; }
            }
        }
        if (bcol($db, 'sort_order')) {
            $v = input('sort_order');
            if ($v !== null) { $set[] = "sort_order = ?"; $vals[] = (int)$v; }
        }
        if (bcol($db, 'is_active')) {
            $v = input('is_active');
            if ($v !== null) { $set[] = "is_active = ?"; $vals[] = $v ? 1 : 0; }
        }
        if (!$set) json_response(['success'=>true,'message'=>'Nothing to update']);
        $vals[] = $id;
        $db->prepare("UPDATE banners SET " . implode(', ', $set) . " WHERE id = ?")->execute($vals);
        json_response(['success'=>true]);
    }

    case 'DELETE': {
        require_admin();
        $id = (int)input('id', 0);
        if (!$id) json_response(['success'=>false,'message'=>'ID required'], 422);
        $db->prepare("DELETE FROM banners WHERE id = ?")->execute([$id]);
        json_response(['success'=>true]);
    }

    default:
        json_response(['success'=>false,'message'=>'Method not allowed'], 405);
}
