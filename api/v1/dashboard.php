<?php
/**
 * /api/v1/dashboard.php  –  safe against missing columns / tables
 */
require_once __DIR__ . '/../bootstrap.php';
require_admin();

$db = db();

function safe_scalar(PDO $db, string $sql, array $p = []): string {
    try {
        $s = $db->prepare($sql);
        $s->execute($p);
        return (string)($s->fetchColumn() ?? '0');
    } catch (PDOException $e) {
        return '0';
    }
}

$today         = date('Y-m-d');
$totalOrders   = (int)safe_scalar($db, "SELECT COUNT(*) FROM orders WHERE order_status <> 'cancelled'");
$todayOrders   = (int)safe_scalar($db, "SELECT COUNT(*) FROM orders WHERE DATE(created_at) = ?", [$today]);
$totalRevenue  = (float)safe_scalar($db, "SELECT COALESCE(SUM(total_amount),0) FROM orders WHERE order_status <> 'cancelled'");
$collected     = (float)safe_scalar($db, "SELECT COALESCE(SUM(total_amount),0) FROM orders WHERE payment_status = 'paid' AND order_status = 'delivered'");
$pendingAmount = (float)safe_scalar($db, "SELECT COALESCE(SUM(total_amount),0) FROM orders WHERE payment_status = 'pending' AND order_status IN ('pending','confirmed','preparing','out_for_delivery')");
$customers     = (int)safe_scalar($db, "SELECT COUNT(*) FROM customers");
$products      = (int)safe_scalar($db, "SELECT COUNT(*) FROM products" . (col_exists_dash($db,'products','is_active') ? " WHERE is_active = 1" : ""));
$pendingReviews= (int)safe_scalar($db, "SELECT COUNT(*) FROM reviews" . (col_exists_dash($db,'reviews','is_approved') ? " WHERE is_approved = 0" : " WHERE 1=0"));
$pendingOrders = (int)safe_scalar($db, "SELECT COUNT(*) FROM orders WHERE order_status = 'pending'");
$delivered     = (int)safe_scalar($db, "SELECT COUNT(*) FROM orders WHERE order_status = 'delivered'");
$lowStockItems = (int)safe_scalar($db, "SELECT COUNT(*) FROM products WHERE stock_status = 'out_of_stock'");
$missingImages = (int)safe_scalar($db, "SELECT COUNT(*) FROM products WHERE COALESCE(image_url, '') = ''");
$activeZones   = (int)safe_scalar($db, "SELECT COUNT(*) FROM delivery_zones WHERE is_active = 1");

// V3 stats (graceful — tables may not exist until migration)
$totalEmployees   = (int)safe_scalar($db, "SELECT COUNT(*) FROM employees WHERE is_active = 1");
$lowInventory     = (int)safe_scalar($db, "SELECT COUNT(*) FROM inventory_items WHERE current_stock <= min_stock_level AND min_stock_level > 0 AND is_active = 1");
$pendingLeaves    = (int)safe_scalar($db, "SELECT COUNT(*) FROM leave_requests WHERE status = 'pending'");
$activeFlashDeals = (int)safe_scalar($db, "SELECT COUNT(*) FROM flash_deals WHERE is_active = 1 AND start_time <= NOW() AND end_time >= NOW()");
$walletLiability  = (float)safe_scalar($db, "SELECT COALESCE(SUM(wallet_balance),0) FROM customers");

$promoStats = [];
try {
    $promoStats = $db->query(
        "SELECT code, description, discount_type, discount_value, usage_limit, used_count, expires_at, is_active, is_public "
        . "FROM coupons ORDER BY is_active DESC, expires_at IS NULL, expires_at ASC, id DESC"
    )->fetchAll();
} catch (PDOException $e) {}

// Revenue chart – last 7 days (always include a full series so the graph renders)
$chart = [];
try {
    $rows = $db->query(
        "SELECT DATE(created_at) AS d, COALESCE(SUM(total_amount),0) AS total
         FROM orders
         WHERE created_at >= (CURDATE() - INTERVAL 6 DAY)
         GROUP BY DATE(created_at) ORDER BY d ASC"
    )->fetchAll();
    $series = [];
    foreach ($rows as $row) {
        $series[$row['d']] = (float)$row['total'];
    }
    for ($i = 6; $i >= 0; $i--) {
        $day = date('Y-m-d', strtotime("-$i days"));
        $chart[] = ['d' => $day, 'total' => $series[$day] ?? 0];
    }
} catch (PDOException $e) {}

// Top products
$topProducts = [];
try {
    $topProducts = $db->query(
        "SELECT p.name, " . (col_exists_dash($db,'products','image_url') ? "p.image_url, " : "'' AS image_url, ")
        . "SUM(oi.quantity) AS units_sold, SUM(oi.total_price) AS revenue
         FROM order_items oi
         JOIN products p ON p.id = oi.product_id
         JOIN orders o ON o.id = oi.order_id
         WHERE o.order_status <> 'cancelled'
         GROUP BY oi.product_id
         ORDER BY units_sold DESC LIMIT 5"
    )->fetchAll();
} catch (PDOException $e) {}

// Order status breakdown
$statusCounts = [];
try {
    $rows = $db->query("SELECT order_status, COUNT(*) AS c FROM orders GROUP BY order_status")->fetchAll();
    foreach ($rows as $r) $statusCounts[$r['order_status']] = (int)$r['c'];
} catch (PDOException $e) {}

$alerts = [];
if ($lowStockItems > 0) {
    $alerts[] = ['level' => 'warning', 'title' => 'Out-of-stock items', 'message' => "$lowStockItems product(s) are marked unavailable.", 'count' => $lowStockItems];
}
if ($missingImages > 0) {
    $alerts[] = ['level' => 'info', 'title' => 'Missing product images', 'message' => "$missingImages product(s) are missing an image.", 'count' => $missingImages];
}
if ($activeZones === 0) {
    $alerts[] = ['level' => 'warning', 'title' => 'No active delivery areas', 'message' => 'Create at least one service area so checkout can accept local orders.', 'count' => 0];
}
if ($pendingOrders > 0) {
    $alerts[] = ['level' => 'info', 'title' => 'Pending kitchen orders', 'message' => "$pendingOrders order(s) still need action.", 'count' => $pendingOrders];
}
if ($lowInventory > 0) {
    $alerts[] = ['level' => 'warning', 'title' => 'Low inventory', 'message' => "$lowInventory inventory item(s) are at or below minimum stock level.", 'count' => $lowInventory];
}
if ($pendingLeaves > 0) {
    $alerts[] = ['level' => 'info', 'title' => 'Pending leave requests', 'message' => "$pendingLeaves leave request(s) awaiting approval.", 'count' => $pendingLeaves];
}

json_response([
    'success' => true,
    'stats'   => [
        'total_orders'      => $totalOrders,
        'today_orders'      => $todayOrders,
        'pending_orders'    => $pendingOrders,
        'delivered_orders'  => $delivered,
        'total_revenue'     => $totalRevenue,
        'collected_amount'  => $collected,
        'pending_amount'    => $pendingAmount,
        'total_customers'   => $customers,
        'active_products'   => $products,
        'pending_reviews'   => $pendingReviews,
        'total_employees'   => $totalEmployees,
        'low_inventory'     => $lowInventory,
        'pending_leaves'    => $pendingLeaves,
        'active_flash_deals'=> $activeFlashDeals,
        'wallet_liability'  => $walletLiability,
    ],
    'coupon_insights'     => $promoStats,
    'revenue_chart'       => $chart,
    'top_products'        => $topProducts,
    'order_status_counts' => $statusCounts,
    'alerts'              => $alerts,
]);

/** Inline helper (cannot call functions from other files in dashboard context). */
function col_exists_dash(PDO $db, string $table, string $col): bool {
    try { $db->query("SELECT `$col` FROM `$table` LIMIT 0"); return true; }
    catch (PDOException $e) { return false; }
}
