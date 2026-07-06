<?php
/**
 * Database connection (PDO + MySQL 8, Hostinger compatible)
 * Reads credentials from environment-config.php (one level up, not in web root)
 * Falls back to constants for shared hosting where env files are not supported.
 */

require_once __DIR__ . '/env.php';

function db(): PDO {
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }
    $host    = env('DB_HOST', 'localhost');
    $name    = env('DB_NAME', 'zaika_lounge');
    $user    = env('DB_USER', 'root');
    $pass    = env('DB_PASS', '');
    $charset = 'utf8mb4';

    $dsn = "mysql:host={$host};dbname={$name};charset={$charset}";
    $opts = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
        PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci",
    ];
    try {
        $pdo = new PDO($dsn, $user, $pass, $opts);
    } catch (PDOException $e) {
        http_response_code(500);
        header('Content-Type: application/json');
        echo json_encode([
            'success' => false,
            'message' => 'Database connection failed. Check credentials in api/config/env.php',
            'error'   => (env('APP_DEBUG', '0') === '1') ? $e->getMessage() : null,
        ]);
        exit;
    }
    return $pdo;
}
