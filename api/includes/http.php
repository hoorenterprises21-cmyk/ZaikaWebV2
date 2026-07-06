<?php
/**
 * HTTP helpers: CORS, JSON I/O, request parsing.
 */

function cors_headers(): void {
    // TODO: In production, replace '*' with specific origins:
    //   https://zaikalounge.in
    //   https://www.zaikalounge.in
    // For now, allow all origins (development + shared hosting compatibility).
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Client-Info, Apikey');
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: SAMEORIGIN');
    header('Referrer-Policy: strict-origin-when-cross-origin');
    header('Content-Type: application/json; charset=utf-8');
}

function handle_preflight(): void {
    cors_headers();
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
        http_response_code(200);
        exit;
    }
}

function json_response($data, int $code = 200): void {
    http_response_code($code);
    cors_headers();
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function read_json_body(): array {
    static $cache = null;
    if ($cache === null) {
        $raw   = file_get_contents('php://input');
        $data  = ($raw !== '' && $raw !== false) ? json_decode($raw, true) : null;
        $cache = is_array($data) ? $data : [];
    }
    return $cache;
}

function input(string $key, $default = null) {
    $v = $_GET[$key] ?? $_POST[$key] ?? null;
    if ($v === null) {
        $v = read_json_body()[$key] ?? null;
    }
    return ($v === null || $v === '') ? $default : $v;
}

function method(): string {
    return strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
}

function bearer_token(): ?string {
    $hdr = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if ($hdr === '' && function_exists('getallheaders')) {
        $all = getallheaders();
        $hdr = $all['Authorization'] ?? $all['authorization'] ?? '';
    }
    if (stripos($hdr, 'Bearer ') === 0) {
        return trim(substr($hdr, 7));
    }
    return null;
}
