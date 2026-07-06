<?php
/**
 * /api/v1/settings.php
 */
require_once __DIR__ . '/../bootstrap.php';

function has_group_col(PDO $db): bool {
    static $has = null;
    if ($has === null) {
        try { $db->query("SELECT group_name FROM settings LIMIT 0"); $has = true; }
        catch (PDOException $e) { $has = false; }
    }
    return $has;
}

function public_settings_safe(): array {
    $groups = all_settings();
    $safe   = [];
    foreach (['general','contact','delivery','social'] as $g)
        foreach (($groups[$g] ?? []) as $k => $v) $safe[$k] = $v;
    foreach (($groups['payment'] ?? []) as $k => $v)
        if (str_starts_with($k, 'enable_')) $safe[$k] = $v;
    // V3 loyalty/referral public config
    foreach (['loyalty','referral','gamification'] as $g)
        foreach (($groups[$g] ?? []) as $k => $v) $safe[$k] = $v;
    return $safe;
}

$method = method();

switch ($method) {

    case 'GET': {
        $admin = current_admin();
        if ($admin && ($_GET['all'] ?? '0') === '1') {
            $groups = all_settings();
            // Mask secrets
            foreach (['razorpay_key_secret', 'stripe_secret_key'] as $secret) {
                foreach (array_keys($groups) as $g) {
                    if (!empty($groups[$g][$secret])) $groups[$g][$secret] = '********';
                }
            }
            json_response(['success' => true, 'settings' => $groups]);
        }
        json_response(['success' => true, 'settings' => public_settings_safe()]);
    }

    case 'PUT': {
        require_admin();

        // read_json_body() is cached — safe to call multiple times
        $payload = read_json_body();
        if (empty($payload)) {
            json_response(['success' => false, 'message' => 'Empty request body'], 422);
        }

        $db       = db();
        $hasGroup = has_group_col($db);

        // Flatten and upsert every key
        foreach ($payload as $group => $kvs) {
            if (!is_array($kvs)) continue;
            foreach ($kvs as $key => $value) {
                $key   = (string)$key;
                $value = (string)$value;

                // Never overwrite real secrets with masked placeholder
                if (in_array($key, ['razorpay_key_secret', 'stripe_secret_key'], true) && $value === '********') continue;

                if ($hasGroup) {
                    $db->prepare(
                        "INSERT INTO settings (setting_key, setting_value, group_name)
                         VALUES (?, ?, ?)
                         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), group_name = VALUES(group_name)"
                    )->execute([$key, $value, (string)$group]);
                } else {
                    $db->prepare(
                        "INSERT INTO settings (setting_key, setting_value)
                         VALUES (?, ?)
                         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)"
                    )->execute([$key, $value]);
                }
            }
        }

        json_response(['success' => true, 'message' => 'Settings saved']);
    }

    default:
        json_response(['success' => false, 'message' => 'Method not allowed'], 405);
}
