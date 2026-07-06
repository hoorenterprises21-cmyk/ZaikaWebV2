<?php
/**
 * /api/v1/wishlist.php  –  safe column handling
 */
require_once __DIR__ . '/../bootstrap.php';

$method = method();
$db     = db();

switch ($method) {

    case 'GET': {
        $c = require_customer();
        try {
            // Build product SELECT with only present columns
            $pCols = "p.id, p.category_id, p.name, p.price, c.name AS category_name";
            foreach (['slug','description','image_url','discount_price','is_veg','is_featured',
                      'is_best_seller','preparation_time','rating','sort_order','stock_status','is_active'] as $col) {
                try { $db->query("SELECT `$col` FROM products LIMIT 0"); $pCols .= ", p.`$col`"; }
                catch (PDOException $e) {}
            }
            $stmt = $db->prepare(
                "SELECT $pCols FROM wishlist w
                 JOIN products p ON p.id = w.product_id
                 JOIN categories c ON c.id = p.category_id
                 WHERE w.customer_id = ?"
                . (in_array('is_active', explode(',', $pCols)) ? " AND p.is_active = 1" : "")
                . " ORDER BY w.id DESC"
            );
            $stmt->execute([$c['id']]);
            $rows = $stmt->fetchAll();
        } catch (PDOException $e) { $rows = []; }
        json_response(['success'=>true,'wishlist'=>$rows]);
    }

    case 'POST': {
        $c   = require_customer();
        $pid = (int)input('product_id', 0);
        if (!$pid) json_response(['success'=>false,'message'=>'product_id required'], 422);
        $exists = $db->prepare("SELECT id FROM products WHERE id = ?");
        $exists->execute([$pid]);
        if (!$exists->fetch()) json_response(['success'=>false,'message'=>'Product not found'], 404);
        try {
            $db->prepare("INSERT IGNORE INTO wishlist (customer_id, product_id) VALUES (?, ?)")
               ->execute([$c['id'], $pid]);
        } catch (PDOException $e) {
            json_response(['success'=>false,'message'=>'Could not add to wishlist'], 500);
        }
        json_response(['success'=>true,'in_wishlist'=>true]);
    }

    case 'DELETE': {
        $c   = require_customer();
        $pid = (int)input('product_id', 0);
        if (!$pid) json_response(['success'=>false,'message'=>'product_id required'], 422);
        $db->prepare("DELETE FROM wishlist WHERE customer_id = ? AND product_id = ?")
           ->execute([$c['id'], $pid]);
        json_response(['success'=>true,'in_wishlist'=>false]);
    }

    default:
        json_response(['success'=>false,'message'=>'Method not allowed'], 405);
}
