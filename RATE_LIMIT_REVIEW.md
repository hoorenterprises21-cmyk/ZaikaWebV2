# RATE LIMIT REVIEW

## Where Rate Limiting Was Added

### File: `api/v1/auth.php`

Rate limiting is included via a `require_once` at the top of `auth.php`:

```php
// auth.php:8
require_once __DIR__ . '/../includes/rate_limit.php';
```

Rate limiting functions are called in exactly **two places** — the customer login handler and the admin login handler.

---

## 1. Customer Login — CONFIRMED

**Location:** `auth.php:50-68` (case 'login')

```php
case 'login': {
    $email = input('email', '');
    $pass  = input('password', '');
    if (!is_valid_email($email) || $pass === '') {
        json_response(['success'=>false,'message'=>'Email and password required'], 422);
    }
    rate_limit_check($email);          // ← CHECK: before DB query
    $stmt = db()->prepare("SELECT id, name, email, phone, avatar_url, password_hash, is_active FROM customers WHERE email = ?");
    $stmt->execute([$email]);
    $u = $stmt->fetch();
    if (!$u || !password_verify($pass, $u['password_hash']) || !$u['is_active']) {
        rate_limit_log($email, false); // ← LOG: on failure
        json_response(['success'=>false,'message'=>'Invalid email or password'], 401);
    }
    rate_limit_log($email, true);      // ← LOG: on success
    $token = jwt_encode(['type'=>'customer','sub'=>(int)$u['id'],'email'=>$u['email'],'name'=>$u['name']]);
    db()->prepare("UPDATE customers SET last_login_at = NOW() WHERE id = ?")->execute([$u['id']]);
    unset($u['password_hash'], $u['is_active']);
    json_response(['success'=>true,'token'=>$token,'customer'=>$u]);
}
```

**Flow:**
1. `rate_limit_check($email)` — counts failed attempts in last 15 min; if >= 5, returns HTTP 429 and exits
2. Query customer from DB
3. If password fails → `rate_limit_log($email, false)` — records failed attempt
4. If password succeeds → `rate_limit_log($email, true)` — records successful attempt

---

## 2. Admin Login — CONFIRMED

**Location:** `auth.php:71-95` (case 'admin_login')

```php
case 'admin_login': {
    $email = input('email', '');
    $pass  = input('password', '');
    rate_limit_check($email);          // ← CHECK: before DB query
    $stmt  = db()->prepare("SELECT id, name, email, role, password_hash, is_active FROM admin_users WHERE email = ?");
    $stmt->execute([$email]);
    $u = $stmt->fetch();
    if (!$u || !password_verify($pass, $u['password_hash']) || !$u['is_active']) {
        rate_limit_log($email, false); // ← LOG: on failure
        json_response(['success'=>false,'message'=>'Invalid admin credentials'], 401);
    }
    rate_limit_log($email, true);      // ← LOG: on success
    $token = jwt_encode(['type'=>'admin','sub'=>(int)$u['id'],'email'=>$u['email'],'name'=>$u['name'],'role'=>$u['role']]);
    db()->prepare("UPDATE admin_users SET last_login_at = NOW() WHERE id = ?")->execute([$u['id']]);
    json_response([...]);
}
```

**Flow:** Identical to customer login — check before query, log on success/failure.

---

## 3. NOT Added To — CONFIRMED

### `require_customer()` — NOT RATE LIMITED

**File:** `api/includes/auth.php:10-22`

```php
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
```

**No `rate_limit_check()` or `rate_limit_log()` calls.** This function only decodes a JWT — no login attempt, no password verification. Rate limiting here would block legitimate API calls from users with valid tokens.

### `require_admin()` — NOT RATE LIMITED

**File:** `api/includes/auth.php:25-38`

```php
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
```

**No rate limiting calls.** Same reasoning — this validates an existing JWT, not a login attempt.

### `current_admin()` — NOT RATE LIMITED

**File:** `api/includes/auth.php:41-50`

```php
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
```

**No rate limiting.** This is an optional auth check (returns null, doesn't 401).

### `current_customer()` — NOT RATE LIMITED

**File:** `api/includes/auth.php:52-61`

```php
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
```

**No rate limiting.** Optional auth check.

### JWT validation (`jwt_decode()`) — NOT RATE LIMITED

**File:** `api/includes/jwt.php:33-46`

```php
function jwt_decode(string $token): ?array {
    $parts = explode('.', $token);
    if (count($parts) !== 3) return null;
    [$h, $p, $s] = $parts;
    $expected = rtrim(strtr(base64_encode(hash_hmac('sha256', "{$h}.{$p}", jwt_secret(), true)), '+/', '-_'), '=');
    if (!hash_equals($expected, $s)) return null;
    $json = json_decode(base64_decode(strtr($p, '-_', '+/')), true);
    if (!is_array($json)) return null;
    if (isset($json['exp']) && time() > (int)$json['exp']) return null;
    return $json;
}
```

**No rate limiting.** This is a pure function that decodes and validates a JWT signature. It's called by `require_customer()`, `require_admin()`, `current_admin()`, and `current_customer()`. Adding rate limiting here would block every authenticated API request.

### Middleware / bootstrap — NOT RATE LIMITED

**File:** `api/bootstrap.php`

```php
<?php
require_once __DIR__ . '/config/env.php';
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/includes/helpers.php';
require_once __DIR__ . '/includes/http.php';
require_once __DIR__ . '/includes/jwt.php';
require_once __DIR__ . '/includes/auth.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}
```

**No rate limiting.** Bootstrap loads dependencies and handles CORS preflight. It does not include `rate_limit.php` — that file is only loaded by `auth.php`.

---

## Rate Limiting Implementation Details

**File:** `api/includes/rate_limit.php`

| Function | Purpose | Called From |
|----------|---------|-------------|
| `rate_limit_check($identifier)` | Counts failed attempts in 15-min window; if >= 5, returns HTTP 429 and exits | `auth.php` login + admin_login |
| `rate_limit_log($identifier, $success)` | Inserts a row into `login_attempts` table | `auth.php` login + admin_login |
| `rate_limit_cleanup()` | Deletes attempts older than 24 hours | Not called (available for cron) |

**Parameters:**
- Window: 15 minutes (900 seconds)
- Max failed attempts: 5
- Lockout response: HTTP 429 with `retry_after` field
- Fail-open: If `login_attempts` table doesn't exist, `PDOException` is caught and login proceeds (no lockout)

**Identifier:** Uses the email address submitted in the login form. This means:
- 5 failed attempts for `user@example.com` locks that email
- A different email can still attempt login
- An attacker would need to rotate emails to bypass (combined with the 5-attempt limit, this is adequate for a restaurant platform)

---

## Summary

| Location | Rate Limited? | Reason |
|----------|--------------|--------|
| Customer login (`auth.php` case 'login') | YES | Password verification — brute force target |
| Admin login (`auth.php` case 'admin_login') | YES | Password verification — brute force target |
| `require_customer()` | NO | JWT validation only — no password check |
| `require_admin()` | NO | JWT validation only — no password check |
| `current_admin()` | NO | Optional JWT check — returns null, no 401 |
| `current_customer()` | NO | Optional JWT check — returns null, no 401 |
| `jwt_decode()` | NO | Pure function — signature verification, not login |
| `bootstrap.php` | NO | Dependency loader + CORS preflight |
| Customer registration | NO | Not a brute force target (creates new account) |

**Rate limiting is correctly scoped to login endpoints only — where password verification occurs and brute force attacks are possible.**
