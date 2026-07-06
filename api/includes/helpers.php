<?php
/**
 * Shared utilities: slug, validation, pagination, settings cache.
 */

require_once __DIR__ . '/../config/database.php';

function slugify(string $text): string {
    $text = preg_replace('~[^\pL\d]+~u', '-', $text);
    $text = trim($text, '-');
    $text = iconv('UTF-8', 'ASCII//TRANSLIT', $text) ?: $text;
    $text = strtolower(preg_replace('~[^-a-z0-9]+~', '', $text));
    return $text === '' ? bin2hex(random_bytes(4)) : $text;
}

function table_has_column(PDO $db, string $table, string $col): bool {
    static $cache = [];
    $k = "$table.$col";
    if (!isset($cache[$k])) {
        try { $db->query("SELECT `$col` FROM `$table` LIMIT 0"); $cache[$k] = true; }
        catch (PDOException $e) { $cache[$k] = false; }
    }
    return $cache[$k];
}

function unique_slug(PDO $db, string $table, string $base, int $exceptId = 0): string {
    if (!table_has_column($db, $table, 'slug')) return $base;
    $slug = $base;
    $i = 1;
    while (true) {
        $sql = "SELECT id FROM `{$table}` WHERE slug = ?" . ($exceptId ? " AND id <> ?" : "");
        $stmt = $db->prepare($sql);
        if ($exceptId) $stmt->execute([$slug, $exceptId]);
        else $stmt->execute([$slug]);
        if (!$stmt->fetch()) return $slug;
        $slug = $base . '-' . (++$i);
    }
}

function paginate(string $countSql, string $dataSql, array $bindings): array {
    $db = db();
    $page = max(1, (int)($_GET['page'] ?? 1));
    $perPage = min(100, max(1, (int)($_GET['per_page'] ?? 20)));

    $countStmt = $db->prepare($countSql);
    $countStmt->execute($bindings);
    $total = (int)$countStmt->fetchColumn();

    $offset = ($page - 1) * $perPage;
    $dataStmt = $db->prepare($dataSql . " LIMIT {$offset}, {$perPage}");
    $dataStmt->execute($bindings);
    return [
        'data'       => $dataStmt->fetchAll(),
        'pagination' => [
            'page'       => $page,
            'per_page'   => $perPage,
            'total'      => $total,
            'total_pages' => (int)ceil($total / $perPage),
        ],
    ];
}

function is_valid_email(string $e): bool {
    return (bool)filter_var($e, FILTER_VALIDATE_EMAIL);
}

function is_valid_phone(string $p): bool {
    $p = preg_replace('/\D/', '', $p);
    return strlen($p) >= 10 && strlen($p) <= 15;
}

/** Cached settings getter (kv store). Returns null if missing. */
function setting(string $key, ?string $default = null): ?string {
    static $cache = null;
    if ($cache === null) {
        $cache = [];
        try {
            foreach (db()->query("SELECT setting_key, setting_value FROM settings") as $row) {
                $cache[$row['setting_key']] = $row['setting_value'];
            }
        } catch (Throwable $e) {
            // Settings table may not exist yet during install.
            $cache = [];
        }
    }
    return array_key_exists($key, $cache) ? $cache[$key] : $default;
}

/** Get all settings grouped. Falls back gracefully if group_name column is missing. */
function all_settings(): array {
    $db = db();
    // Detect whether group_name column exists
    $hasGroup = true;
    try { $db->query("SELECT group_name FROM settings LIMIT 0"); }
    catch (PDOException $e) { $hasGroup = false; }

    try {
        if ($hasGroup) {
            $rows = $db->query("SELECT setting_key, setting_value, group_name FROM settings ORDER BY id ASC")->fetchAll();
        } else {
            $rows = $db->query("SELECT setting_key, setting_value FROM settings ORDER BY id ASC")->fetchAll();
        }
    } catch (Throwable $e) {
        return [];
    }

    // Known group assignments for fallback when group_name column is missing
    $groupMap = [
        'restaurant_name'=>'general','restaurant_tagline'=>'general','logo_url'=>'general',
        'opening_hours'=>'general','footer_text'=>'general','primary_color'=>'general',
        'restaurant_is_closed'=>'general','restaurant_closed_message'=>'general',
        'contact_email'=>'contact','contact_phone'=>'contact','whatsapp_number'=>'contact','address'=>'contact',
        'default_delivery_charge'=>'delivery','free_delivery_threshold'=>'delivery','tax_percent'=>'delivery',
        'currency_code'=>'delivery','currency_symbol'=>'delivery','min_order_value'=>'delivery',
        'enable_razorpay'=>'payment','razorpay_key_id'=>'payment','razorpay_key_secret'=>'payment',
        'enable_upi'=>'payment','upi_id'=>'payment','upi_payee_name'=>'payment',
        'enable_stripe'=>'payment','stripe_publishable_key'=>'payment','stripe_secret_key'=>'payment',
        'enable_cod'=>'payment','enable_whatsapp_order'=>'payment',
        'facebook_url'=>'social','instagram_url'=>'social','twitter_url'=>'social',
        // V3 loyalty / referral / gamification
        'loyalty_point_value'=>'loyalty','loyalty_earn_rate'=>'loyalty','loyalty_min_redeem'=>'loyalty','enable_loyalty'=>'loyalty',
        'referral_referrer_reward'=>'referral','referral_referred_reward'=>'referral','enable_referral'=>'referral',
        'spin_win_enabled'=>'gamification','spin_win_daily_limit'=>'gamification','spin_win_coupon_discount'=>'gamification',
        'happy_hour_enabled'=>'gamification','flash_deals_enabled'=>'gamification',
    ];

    $groups = [];
    foreach ($rows as $r) {
        $g = $hasGroup ? ($r['group_name'] ?? 'general') : ($groupMap[$r['setting_key']] ?? 'general');
        $groups[$g][$r['setting_key']] = $r['setting_value'];
    }
    return $groups;
}

/** Update a single setting (upsert). */
function update_setting(string $key, string $value, string $group = 'general'): void {
    $stmt = db()->prepare(
        "INSERT INTO settings (setting_key, setting_value, group_name) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), group_name = VALUES(group_name)"
    );
    $stmt->execute([$key, $value, $group]);
}

/** Generate a unique order number like FH-20260622-XYZ. */
function generate_order_number(): string {
    $prefix = 'FH-' . date('Ymd') . '-';
    $num = strtoupper(bin2hex(random_bytes(4)));
    return $prefix . $num;
}
