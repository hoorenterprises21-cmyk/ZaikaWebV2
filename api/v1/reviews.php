<?php
/**
 * /api/v1/reviews.php  –  safe column handling
 */
require_once __DIR__ . '/../bootstrap.php';

$method = method();
$db     = db();

function rcol(PDO $db, string $col): bool {
    static $c = [];
    if (!isset($c[$col])) {
        try { $db->query("SELECT `$col` FROM `reviews` LIMIT 0"); $c[$col] = true; }
        catch (PDOException $e) { $c[$col] = false; }
    }
    return $c[$col];
}

switch ($method) {

    case 'GET': {
        $productId = (int)($_GET['product_id'] ?? 0);
        if ($productId) {
            $isApprovedCol = rcol($db, 'is_approved');
            $commentCol    = rcol($db, 'comment');
            $sql = "SELECT r.id, r.product_id, r.customer_id, r.rating, r.created_at, c.name AS customer_name"
                 . ($commentCol    ? ", r.comment"     : "")
                 . ($isApprovedCol ? ""                : "")
                 . " FROM reviews r JOIN customers c ON c.id = r.customer_id WHERE r.product_id = ?";
            if ($isApprovedCol) $sql .= " AND r.is_approved = 1";
            $sql .= " ORDER BY r.created_at DESC";
            $stmt = $db->prepare($sql);
            $stmt->execute([$productId]);
            json_response(['success'=>true,'reviews'=>$stmt->fetchAll()]);
        }

        $id = (int)($_GET['id'] ?? 0);
        if ($id) {
            $stmt = $db->prepare("SELECT * FROM reviews WHERE id = ?");
            $stmt->execute([$id]);
            $row = $stmt->fetch();
            if (!$row) json_response(['success'=>false,'message'=>'Review not found'], 404);
            json_response(['success'=>true,'review'=>$row]);
        }

        require_admin();
        $page    = max(1, (int)($_GET['page'] ?? 1));
        $perPage = min(100, max(1, (int)($_GET['per_page'] ?? 20)));
        $offset  = ($page - 1) * $perPage;

        $filter = $_GET['filter'] ?? '';
        $where  = '';
        if ($filter === 'pending'  && rcol($db, 'is_approved')) $where = " WHERE r.is_approved = 0";
        if ($filter === 'approved' && rcol($db, 'is_approved')) $where = " WHERE r.is_approved = 1";

        $selectExtra = (rcol($db, 'comment') ? ", r.comment" : "")
                     . (rcol($db, 'is_approved') ? ", r.is_approved" : "");
        $dataSql = "SELECT r.id, r.product_id, r.customer_id, r.rating, r.created_at,
                           c.name AS customer_name, p.name AS product_name
                           $selectExtra
                    FROM reviews r
                    JOIN customers c ON c.id = r.customer_id
                    JOIN products  p ON p.id = r.product_id
                    $where ORDER BY r.created_at DESC LIMIT $offset, $perPage";
        $countSql = "SELECT COUNT(*) FROM reviews r$where";

        $total = (int)$db->query($countSql)->fetchColumn();
        $data  = $db->query($dataSql)->fetchAll();

        json_response([
            'success' => true,
            'data'    => $data,
            'pagination' => [
                'page'        => $page,
                'per_page'    => $perPage,
                'total'       => $total,
                'total_pages' => (int)ceil($total / $perPage),
            ],
        ]);
    }

    case 'POST': {
        $c         = require_customer();
        $productId = (int)input('product_id', 0);
        $orderId   = (int)input('order_id', 0);
        $rating    = (int)input('rating', 5);
        $comment   = input('comment', '');
        if (!$productId) json_response(['success'=>false,'message'=>'product_id required'], 422);
        if ($rating < 1 || $rating > 5) json_response(['success'=>false,'message'=>'rating must be 1-5'], 422);

        // Allow reviews once the customer has an order for the product that is confirmed or delivered
        try {
            $check = $db->prepare(
                "SELECT oi.id FROM order_items oi
                 JOIN orders o ON o.id = oi.order_id
                 WHERE oi.product_id = ? AND o.customer_id = ? AND o.order_status IN ('delivered','out_for_delivery','preparing','confirmed')
                 LIMIT 1"
            );
            $check->execute([$productId, $c['id']]);
            if (!$check->fetch())
                json_response(['success'=>false,'message'=>'You can only review products from a confirmed or delivered order'], 403);
        } catch (PDOException $e) {
            // order_items table may not have the join columns yet, skip check
        }

        // Prevent duplicate review
        $dup = $db->prepare("SELECT id FROM reviews WHERE customer_id = ? AND product_id = ?");
        $dup->execute([$c['id'], $productId]);
        if ($dup->fetch()) json_response(['success'=>false,'message'=>'You already reviewed this product'], 409);

        $approved = (setting('auto_approve_reviews', '0') === '1') ? 1 : 0;

        $cols  = ['product_id','customer_id','rating'];
        $vals  = [$productId, $c['id'], $rating];
        $marks = ['?','?','?'];
        if (rcol($db, 'order_id'))    { $cols[] = 'order_id';    $vals[] = $orderId ?: null; $marks[] = '?'; }
        if (rcol($db, 'comment'))     { $cols[] = 'comment';     $vals[] = $comment;          $marks[] = '?'; }
        if (rcol($db, 'is_approved')) { $cols[] = 'is_approved'; $vals[] = $approved;          $marks[] = '?'; }

        $db->prepare("INSERT INTO reviews (" . implode(',', $cols) . ") VALUES (" . implode(',', $marks) . ")")
           ->execute($vals);
        json_response(['success'=>true,'id'=>(int)$db->lastInsertId(),'is_approved'=>$approved], 201);
    }

    case 'PUT':
    case 'PATCH': {
        require_admin();
        $id       = (int)input('id', 0);
        $decision = input('decision', '');
        if (!$id) json_response(['success'=>false,'message'=>'ID required'], 422);
        if (!rcol($db, 'is_approved'))
            json_response(['success'=>false,'message'=>'is_approved column not yet in DB — run alter_tables.sql'], 500);
        if ($decision === 'approve') {
            $db->prepare("UPDATE reviews SET is_approved = 1 WHERE id = ?")->execute([$id]);
        } elseif ($decision === 'reject') {
            $db->prepare("UPDATE reviews SET is_approved = 0 WHERE id = ?")->execute([$id]);
        } else {
            json_response(['success'=>false,'message'=>'decision must be approve|reject'], 422);
        }
        json_response(['success'=>true]);
    }

    case 'DELETE': {
        require_admin();
        $id = (int)input('id', 0);
        if (!$id) json_response(['success'=>false,'message'=>'ID required'], 422);
        $db->prepare("DELETE FROM reviews WHERE id = ?")->execute([$id]);
        json_response(['success'=>true]);
    }

    default:
        json_response(['success'=>false,'message'=>'Method not allowed'], 405);
}
