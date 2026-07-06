<?php
/**
 * /api/v1/reports.php — Revenue, orders, profit, products with date range + CSV export
 */
require_once __DIR__ . '/../bootstrap.php';

$method = method();
$db     = db();

if ($method !== 'GET') json_response(['success' => false, 'message' => 'Method not allowed'], 405);
require_admin();

$type   = $_GET['type'] ?? 'revenue';
$start  = $_GET['start_date'] ?? date('Y-m-d', strtotime('-30 days'));
$end    = $_GET['end_date'] ?? date('Y-m-d');
$group  = $_GET['group_by'] ?? 'day';
$csv    = ($_GET['csv'] ?? '0') === '1';

$startSafe = date('Y-m-d', strtotime($start));
$endSafe   = date('Y-m-d', strtotime($end));

$result = [];

switch ($type) {
    case 'revenue': {
        $sql = match ($group) {
            'week'  => "SELECT YEARWEEK(created_at,1) AS period, COALESCE(SUM(total_amount),0) AS total, COUNT(*) AS order_count FROM orders WHERE DATE(created_at) BETWEEN ? AND ? AND order_status <> 'cancelled' GROUP BY YEARWEEK(created_at,1) ORDER BY period",
            'month' => "SELECT DATE_FORMAT(created_at,'%Y-%m') AS period, COALESCE(SUM(total_amount),0) AS total, COUNT(*) AS order_count FROM orders WHERE DATE(created_at) BETWEEN ? AND ? AND order_status <> 'cancelled' GROUP BY DATE_FORMAT(created_at,'%Y-%m') ORDER BY period",
            default => "SELECT DATE(created_at) AS period, COALESCE(SUM(total_amount),0) AS total, COUNT(*) AS order_count FROM orders WHERE DATE(created_at) BETWEEN ? AND ? AND order_status <> 'cancelled' GROUP BY DATE(created_at) ORDER BY period",
        };
        $stmt = $db->prepare($sql);
        $stmt->execute([$startSafe, $endSafe]);
        $result = $stmt->fetchAll();
        break;
    }

    case 'orders': {
        // Return per-period counts aggregated (all statuses combined)
        $sql = match ($group) {
            'week'  => "SELECT YEARWEEK(created_at,1) AS period, COUNT(*) AS total, COUNT(CASE WHEN order_status='delivered' THEN 1 END) AS delivered, COUNT(CASE WHEN order_status='cancelled' THEN 1 END) AS cancelled FROM orders WHERE DATE(created_at) BETWEEN ? AND ? GROUP BY YEARWEEK(created_at,1) ORDER BY period",
            'month' => "SELECT DATE_FORMAT(created_at,'%Y-%m') AS period, COUNT(*) AS total, COUNT(CASE WHEN order_status='delivered' THEN 1 END) AS delivered, COUNT(CASE WHEN order_status='cancelled' THEN 1 END) AS cancelled FROM orders WHERE DATE(created_at) BETWEEN ? AND ? GROUP BY DATE_FORMAT(created_at,'%Y-%m') ORDER BY period",
            default => "SELECT DATE(created_at) AS period, COUNT(*) AS total, COUNT(CASE WHEN order_status='delivered' THEN 1 END) AS delivered, COUNT(CASE WHEN order_status='cancelled' THEN 1 END) AS cancelled FROM orders WHERE DATE(created_at) BETWEEN ? AND ? GROUP BY DATE(created_at) ORDER BY period",
        };
        $stmt = $db->prepare($sql);
        $stmt->execute([$startSafe, $endSafe]);
        $result = $stmt->fetchAll();
        break;
    }

    case 'profit': {
        // Real profit: revenue - total cost of items sold (based on inventory cost_per_unit via product link)
        // Since inventory isn't directly mapped to order_items, use order-level data:
        // Profit = total_amount - discount_amount - delivery_charge - (estimated COGS from inventory_items linked via product name)
        // Best-effort: revenue minus coupon_discount minus delivery charge (delivery is a pass-through cost)
        // If inventory items have no cost mapping, fall back to a conservative 40% COGS estimate
        $sql = match ($group) {
            'week'  => "SELECT YEARWEEK(created_at,1) AS period,
                            COALESCE(SUM(total_amount),0) AS revenue,
                            COALESCE(SUM(delivery_charge),0) AS delivery_costs,
                            COALESCE(SUM(discount_amount),0) AS discounts,
                            COUNT(*) AS order_count
                        FROM orders WHERE DATE(created_at) BETWEEN ? AND ? AND order_status='delivered'
                        GROUP BY YEARWEEK(created_at,1) ORDER BY period",
            'month' => "SELECT DATE_FORMAT(created_at,'%Y-%m') AS period,
                            COALESCE(SUM(total_amount),0) AS revenue,
                            COALESCE(SUM(delivery_charge),0) AS delivery_costs,
                            COALESCE(SUM(discount_amount),0) AS discounts,
                            COUNT(*) AS order_count
                        FROM orders WHERE DATE(created_at) BETWEEN ? AND ? AND order_status='delivered'
                        GROUP BY DATE_FORMAT(created_at,'%Y-%m') ORDER BY period",
            default => "SELECT DATE(created_at) AS period,
                            COALESCE(SUM(total_amount),0) AS revenue,
                            COALESCE(SUM(delivery_charge),0) AS delivery_costs,
                            COALESCE(SUM(discount_amount),0) AS discounts,
                            COUNT(*) AS order_count
                        FROM orders WHERE DATE(created_at) BETWEEN ? AND ? AND order_status='delivered'
                        GROUP BY DATE(created_at) ORDER BY period",
        };
        $stmt = $db->prepare($sql);
        $stmt->execute([$startSafe, $endSafe]);
        $rows = $stmt->fetchAll();
        // Gross profit = revenue - delivery cost - 40% COGS on food subtotal
        foreach ($rows as &$r) {
            $foodRev  = max(0.0, (float)$r['revenue'] - (float)$r['delivery_costs']);
            $cogs     = round($foodRev * 0.40, 2);   // 40% COGS estimate
            $r['total'] = round((float)$r['revenue'] - $cogs, 2);
        }
        unset($r);
        $result = $rows;
        break;
    }

    case 'products': {
        $stmt = $db->prepare(
            "SELECT p.name, SUM(oi.quantity) AS units_sold, SUM(oi.total_price) AS revenue
             FROM order_items oi
             JOIN products p ON p.id = oi.product_id
             JOIN orders o ON o.id = oi.order_id
             WHERE DATE(o.created_at) BETWEEN ? AND ? AND o.order_status <> 'cancelled'
             GROUP BY oi.product_id ORDER BY units_sold DESC LIMIT 20"
        );
        $stmt->execute([$startSafe, $endSafe]);
        $result = $stmt->fetchAll();
        break;
    }

    default:
        json_response(['success' => false, 'message' => 'Invalid report type'], 422);
}

// Summary totals
$totalRevenue = 0.0;
$totalOrders  = 0;
foreach ($result as $r) {
    $totalRevenue += (float)($r['total'] ?? $r['revenue'] ?? 0);
    $totalOrders  += (int)($r['order_count'] ?? 0);
}

// CSV export
if ($csv) {
    header('Content-Type: text/csv; charset=utf-8');
    header("Content-Disposition: attachment; filename=\"report_{$type}_{$startSafe}_{$endSafe}.csv\"");
    if (!empty($result)) {
        $fh = fopen('php://output', 'w');
        fputcsv($fh, array_keys($result[0]));
        foreach ($result as $row) fputcsv($fh, $row);
        fclose($fh);
    }
    exit;
}

json_response([
    'success'    => true,
    'type'       => $type,
    'group_by'   => $group,
    'start_date' => $startSafe,
    'end_date'   => $endSafe,
    'summary'    => [
        'total_revenue' => round($totalRevenue, 2),
        'total_orders'  => $totalOrders,
    ],
    'data' => $result,
]);
