<?php
/**
 * /api/v1/analytics.php — Analytics data for charts with date range filter
 */
require_once __DIR__ . '/../bootstrap.php';

$method = method();
$db     = db();

if ($method !== 'GET') json_response(['success' => false, 'message' => 'Method not allowed'], 405);
require_admin();

$chart    = $_GET['chart'] ?? 'revenue'; // revenue | orders | customers | products | profit
$range    = $_GET['range'] ?? '7d';     // 7d | 30d | 90d | 1y | custom
$start    = $_GET['start_date'] ?? '';
$end      = $_GET['end_date'] ?? '';

// Resolve date range
if ($range === 'custom' && $start && $end) {
    $startDate = date('Y-m-d', strtotime($start));
    $endDate   = date('Y-m-d', strtotime($end));
} else {
    $days = match ($range) {
        '30d' => 30,
        '90d' => 90,
        '1y'  => 365,
        default => 7,
    };
    $startDate = date('Y-m-d', strtotime("-$days days"));
    $endDate   = date('Y-m-d');
}

$data = [];
$labels = [];

switch ($chart) {
    case 'revenue': {
        $stmt = $db->prepare("SELECT DATE(created_at) AS d, COALESCE(SUM(total_amount),0) AS total FROM orders WHERE DATE(created_at) BETWEEN ? AND ? AND order_status <> 'cancelled' GROUP BY DATE(created_at) ORDER BY d ASC");
        $stmt->execute([$startDate, $endDate]);
        $rows = $stmt->fetchAll();
        $map = [];
        foreach ($rows as $r) $map[$r['d']] = (float)$r['total'];
        $current = new DateTime($startDate);
        $end = new DateTime($endDate);
        while ($current <= $end) {
            $d = $current->format('Y-m-d');
            $labels[] = $d;
            $data[] = $map[$d] ?? 0;
            $current->modify('+1 day');
        }
        break;
    }

    case 'orders': {
        $stmt = $db->prepare("SELECT DATE(created_at) AS d, COUNT(*) AS total FROM orders WHERE DATE(created_at) BETWEEN ? AND ? GROUP BY DATE(created_at) ORDER BY d ASC");
        $stmt->execute([$startDate, $endDate]);
        $rows = $stmt->fetchAll();
        $map = [];
        foreach ($rows as $r) $map[$r['d']] = (int)$r['total'];
        $current = new DateTime($startDate);
        $end = new DateTime($endDate);
        while ($current <= $end) {
            $d = $current->format('Y-m-d');
            $labels[] = $d;
            $data[] = $map[$d] ?? 0;
            $current->modify('+1 day');
        }
        break;
    }

    case 'customers': {
        $stmt = $db->prepare("SELECT DATE(created_at) AS d, COUNT(*) AS total FROM customers WHERE DATE(created_at) BETWEEN ? AND ? GROUP BY DATE(created_at) ORDER BY d ASC");
        $stmt->execute([$startDate, $endDate]);
        $rows = $stmt->fetchAll();
        $map = [];
        foreach ($rows as $r) $map[$r['d']] = (int)$r['total'];
        $current = new DateTime($startDate);
        $end = new DateTime($endDate);
        while ($current <= $end) {
            $d = $current->format('Y-m-d');
            $labels[] = $d;
            $data[] = $map[$d] ?? 0;
            $current->modify('+1 day');
        }
        break;
    }

    case 'products': {
        $stmt = $db->prepare("SELECT p.name, SUM(oi.quantity) AS total FROM order_items oi JOIN products p ON p.id = oi.product_id JOIN orders o ON o.id = oi.order_id WHERE DATE(o.created_at) BETWEEN ? AND ? AND o.order_status <> 'cancelled' GROUP BY oi.product_id ORDER BY total DESC LIMIT 10");
        $stmt->execute([$startDate, $endDate]);
        $rows = $stmt->fetchAll();
        foreach ($rows as $r) {
            $labels[] = $r['name'];
            $data[] = (int)$r['total'];
        }
        break;
    }

    case 'profit': {
        // Simplified profit = revenue - estimated COGS (10% of revenue as placeholder)
        $stmt = $db->prepare("SELECT DATE(created_at) AS d, COALESCE(SUM(total_amount),0) AS total FROM orders WHERE DATE(created_at) BETWEEN ? AND ? AND order_status = 'delivered' GROUP BY DATE(created_at) ORDER BY d ASC");
        $stmt->execute([$startDate, $endDate]);
        $rows = $stmt->fetchAll();
        $map = [];
        foreach ($rows as $r) $map[$r['d']] = (float)$r['total'];
        $current = new DateTime($startDate);
        $end = new DateTime($endDate);
        while ($current <= $end) {
            $d = $current->format('Y-m-d');
            $labels[] = $d;
            $revenue = $map[$d] ?? 0;
            $cogs = $revenue * 0.35; // 35% COGS estimate
            $data[] = round($revenue - $cogs, 2);
            $current->modify('+1 day');
        }
        break;
    }

    default:
        json_response(['success' => false, 'message' => 'Invalid chart type'], 422);
}

json_response([
    'success' => true,
    'chart' => $chart,
    'range' => $range,
    'start_date' => $startDate,
    'end_date' => $endDate,
    'labels' => $labels,
    'data' => $data,
]);
