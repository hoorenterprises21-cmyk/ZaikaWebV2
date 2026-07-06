<?php
/**
 * JWT helper - HS256, no external library (pure PHP, Hostinger-safe).
 * Implements encode() / decode() for stateless auth.
 */

require_once __DIR__ . '/../config/env.php';

function jwt_secret(): string {
    $s = env('JWT_SECRET', '');
    if ($s === '') {
        http_response_code(500);
        header('Content-Type: application/json');
        echo json_encode(['success' => false, 'message' => 'Server configuration error: JWT_SECRET is not set. Define it in api/config/env.local.php']);
        exit;
    }
    return $s;
}

function jwt_encode(array $payload, int $ttl = 604800): string {
    $header = ['typ' => 'JWT', 'alg' => 'HS256'];
    $payload['iat'] = time();
    $payload['exp'] = time() + $ttl;

    $b64  = static fn (string $s): string => rtrim(strtr(base64_encode($s), '+/', '-_'), '=');
    $h    = $b64(json_encode($header));
    $p    = $b64(json_encode($payload));
    $sig  = hash_hmac('sha256', "{$h}.{$p}", jwt_secret(), true);
    $s    = rtrim(strtr(base64_encode($sig), '+/', '-_'), '=');
    return "{$h}.{$p}.{$s}";
}

function jwt_decode(string $token): ?array {
    $parts = explode('.', $token);
    if (count($parts) !== 3) return null;
    [$h, $p, $s] = $parts;
    $url  = static fn (string $s): string => str_pad(strtr($s, '-_', '+/'), strlen($s) % 4 === 0 ? strlen($s) : strlen($s) + (4 - strlen($s) % 4), '=', STR_PAD_RIGHT);

    $expected = rtrim(strtr(base64_encode(hash_hmac('sha256', "{$h}.{$p}", jwt_secret(), true)), '+/', '-_'), '=');
    if (!hash_equals($expected, $s)) return null;

    $json = json_decode(base64_decode(strtr($p, '-_', '+/')), true);
    if (!is_array($json)) return null;
    if (isset($json['exp']) && time() > (int)$json['exp']) return null;
    return $json;
}
