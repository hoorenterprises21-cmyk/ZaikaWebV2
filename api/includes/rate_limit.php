<?php
/**
 * Rate limiting for login endpoints.
 * 5 failed attempts → 15 minute lock.
 * Returns HTTP 429 when locked.
 *
 * Usage in auth.php:
 *   require_once __DIR__ . '/../includes/rate_limit.php';
 *   rate_limit_check($identifier);  // before login attempt
 *   rate_limit_log($identifier, $success);  // after login attempt
 */

require_once __DIR__ . '/http.php';

/**
 * Check if the identifier is rate-limited. If so, returns 429 and exits.
 * @param string $identifier — email or IP
 */
function rate_limit_check(string $identifier): void {
    $db = db();
    $window = 15 * 60; // 15 minutes
    $maxAttempts = 5;
    $since = date('Y-m-d H:i:s', time() - $window);

    try {
        $stmt = $db->prepare(
            "SELECT COUNT(*) FROM login_attempts
             WHERE identifier = ? AND success = 0 AND created_at >= ?"
        );
        $stmt->execute([$identifier, $since]);
        $failed = (int)$stmt->fetchColumn();

        if ($failed >= $maxAttempts) {
            $retry = $window; // seconds
            json_response([
                'success' => false,
                'message' => "Too many failed attempts. Please try again in {$window} minutes.",
                'retry_after' => $retry,
            ], 429);
        }
    } catch (PDOException $e) {
        // Table may not exist yet — fail open (allow login)
    }
}

/**
 * Log a login attempt result.
 * @param string $identifier — email or IP
 * @param bool $success — whether the login succeeded
 */
function rate_limit_log(string $identifier, bool $success): void {
    $db = db();
    $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';

    try {
        $stmt = $db->prepare(
            "INSERT INTO login_attempts (identifier, ip_address, success) VALUES (?, ?, ?)"
        );
        $stmt->execute([$identifier, $ip, $success ? 1 : 0]);
    } catch (PDOException $e) {
        // Table may not exist — silently skip
    }
}

/**
 * Clean old login attempts (call occasionally, non-blocking).
 */
function rate_limit_cleanup(): void {
    try {
        db()->exec("DELETE FROM login_attempts WHERE created_at < (NOW() - INTERVAL 24 HOUR)");
    } catch (PDOException $e) {}
}
