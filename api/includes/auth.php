<?php
/**
 * Auth helpers: customer & admin session resolution from JWT.
 */

require_once __DIR__ . '/jwt.php';
require_once __DIR__ . '/http.php';

/** Require a logged-in customer; returns customer row from token, else 401. */
function require_customer(): array {
    $token = bearer_token();
    if (!$token) json_response(['success'=>false,'message'=>'Authentication required'], 401);
    $payload = jwt_decode($token);
    if (!$payload || ($payload['type'] ?? '') !== 'customer') {
        json_response(['success'=>false,'message'=>'Invalid or expired token'], 401);
    }
    return [
        'id'    => (int)($payload['sub'] ?? 0),
        'name'  => $payload['name'] ?? '',
        'email' => $payload['email'] ?? '',
    ];
}

/** Require an authenticated admin. Returns admin row from token, else 401. */
function require_admin(): array {
    $token = bearer_token();
    if (!$token) json_response(['success'=>false,'message'=>'Admin authentication required'], 401);
    $payload = jwt_decode($token);
    if (!$payload || ($payload['type'] ?? '') !== 'admin') {
        json_response(['success'=>false,'message'=>'Admin privileges required'], 401);
    }
    return [
        'id'    => (int)($payload['sub'] ?? 0),
        'name'  => $payload['name'] ?? '',
        'email' => $payload['email'] ?? '',
        'role'  => $payload['role'] ?? 'staff',
    ];
}

/** Optional admin (used for public endpoints that may reveal more to admins). */
function current_admin(): ?array {
    $token = bearer_token();
    if (!$token) return null;
    $payload = jwt_decode($token);
    if (!$payload || ($payload['type'] ?? '') !== 'admin') return null;
    return [
        'id'   => (int)($payload['sub'] ?? 0),
        'role' => $payload['role'] ?? 'staff',
    ];
}

function current_customer(): ?array {
    $token = bearer_token();
    if (!$token) return null;
    $payload = jwt_decode($token);
    if (!$payload || ($payload['type'] ?? '') !== 'customer') return null;
    return [
        'id'   => (int)($payload['sub'] ?? 0),
        'name' => $payload['name'] ?? '',
    ];
}
