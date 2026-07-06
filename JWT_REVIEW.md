# JWT REVIEW

## Current Implementation: `api/includes/jwt.php`

### 1. `jwt_secret()` — Lines 9-18

```php
function jwt_secret(): string {
    $s = env('JWT_SECRET', '');
    if ($s === '') {
        http_response_code(500);
        header('Content-Type: application/json');
        echo json_encode([
            'success' => false,
            'message' => 'Server configuration error: JWT_SECRET is not set. Define it in api/config/env.local.php'
        ]);
        exit;
    }
    return $s;
}
```

**Behavior:**
- Reads `JWT_SECRET` from environment via `env()` helper
- If empty string → returns HTTP 500 with JSON error and exits
- No fallback, no default, no hardcoded secret

**Verification: NO HARDCODED FALLBACK SECRET EXISTS.**

The previous implementation had:
```php
// REMOVED — no longer in the codebase
if ($s === '') {
    $s = 'CHANGE_ME_JWT_SECRET_IN_PRODUCTION_foodiehub_2026';
}
```

This was removed in the security fix. The function now hard-fails instead of silently using a known secret.

---

### 2. `jwt_encode()` — Lines 20-31

```php
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
```

**Payload format:**
```json
{
  "type": "customer",       // or "admin"
  "sub": 42,                // user ID
  "email": "user@example.com",
  "name": "User Name",
  "role": "super_admin",    // admin tokens only
  "iat": 1719148200,        // issued at (unix timestamp)
  "exp": 1719753000         // expiry (iat + 604800 = 7 days)
}
```

**JWT structure:** `header.payload.signature` (base64url-encoded, dot-separated)

**Algorithm:** HS256 (HMAC-SHA256) — symmetric, uses `jwt_secret()` as the key

**TTL:** 604800 seconds = 7 days (default parameter)

---

### 3. `jwt_decode()` — Lines 33-46

```php
function jwt_decode(string $token): ?array {
    $parts = explode('.', $token);
    if (count($parts) !== 3) return null;
    [$h, $p, $s] = $parts;

    $url = static fn (string $s): string => str_pad(
        strtr($s, '-_', '+/'),
        strlen($s) % 4 === 0 ? strlen($s) : strlen($s) + (4 - strlen($s) % 4),
        '=', STR_PAD_RIGHT
    );

    $expected = rtrim(strtr(base64_encode(hash_hmac('sha256', "{$h}.{$p}", jwt_secret(), true)), '+/', '-_'), '=');
    if (!hash_equals($expected, $s)) return null;

    $json = json_decode(base64_decode(strtr($p, '-_', '+/')), true);
    if (!is_array($json)) return null;
    if (isset($json['exp']) && time() > (int)$json['exp']) return null;
    return $json;
}
```

**Security features:**
1. **Signature verification:** `hash_equals()` — constant-time comparison, prevents timing attacks
2. **Expiry check:** `time() > (int)$json['exp']` → returns `null` if expired
3. **Structure validation:** Must have exactly 3 dot-separated parts
4. **Payload validation:** `json_decode` must return an array

**Returns:** `null` on any failure (invalid signature, expired, malformed), or the payload array on success.

---

## Verification Checklist

### No hardcoded fallback secret — CONFIRMED
- `jwt_secret()` reads only from `env('JWT_SECRET', '')`
- If empty → HTTP 500 + exit
- No fallback string anywhere in the file
- Grep for `CHANGE_ME` returns zero results

### JWT payload format unchanged — CONFIRMED
- `jwt_encode()` adds `iat` and `exp` to the payload array
- Caller provides `type`, `sub`, `email`, `name`, and optionally `role`
- No changes to the payload structure were made in the fix
- The fix only changed `jwt_secret()`, not `jwt_encode()` or `jwt_decode()`

### Existing tokens remain compatible — CONFIRMED
- The signing algorithm (HS256) is unchanged
- The payload structure is unchanged
- The base64url encoding is unchanged
- The TTL default (604800 = 7 days) is unchanged
- **Tokens signed with the same `JWT_SECRET` will continue to validate correctly**
- **Tokens signed with the OLD fallback secret will FAIL** if `JWT_SECRET` is now properly set to a different value — this is the intended security behavior (invalidating tokens that were signed with a known-public secret)

### Token compatibility matrix

| Scenario | Old token valid? | New token valid? |
|----------|-----------------|-----------------|
| `JWT_SECRET` set to same value before and after fix | Yes | Yes |
| `JWT_SECRET` was missing (old fallback used) → now set to real secret | No (different signing key) | Yes |
| `JWT_SECRET` was set → now missing | N/A (500 error on all auth) | N/A (500 error on all auth) |
| `JWT_SECRET` unchanged, token not expired | Yes | Yes |
| `JWT_SECRET` unchanged, token expired | No (expiry check) | No (expiry check) |

---

## Call Sites

| File | Function | Context |
|------|----------|---------|
| `api/v1/auth.php:46` | `jwt_encode()` | Customer registration |
| `api/v1/auth.php:65` | `jwt_encode()` | Customer login |
| `api/v1/auth.php:83` | `jwt_encode()` | Admin login |
| `api/includes/auth.php:13` | `jwt_decode()` | `require_customer()` |
| `api/includes/auth.php:28` | `jwt_decode()` | `require_admin()` |
| `api/includes/auth.php:44` | `jwt_decode()` | `current_admin()` |
| `api/includes/auth.php:55` | `jwt_decode()` | `current_customer()` |

All call sites use the same `jwt_encode()` / `jwt_decode()` pair. No direct `jwt_secret()` calls outside of these functions.
