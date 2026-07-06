# SECURITY REPORT

## 1. JWT Secret — CRITICAL
**File:** `api/includes/jwt.php:9-16`
**Issue:** Fallback secret `CHANGE_ME_JWT_SECRET_IN_PRODUCTION_foodiehub_2026` hardcoded.
**Risk:** If `JWT_SECRET` env var is missing, all tokens are signed with a known secret — attacker can forge tokens.
**Fix:** Remove fallback. Return HTTP 500 if secret missing.

## 2. Password Hashing — OK
**File:** `api/v1/auth.php`
**Status:** Uses `password_hash()` with `PASSWORD_BCRYPT` and `password_verify()`. This is industry standard.

## 3. SQL Injection — OK
**Status:** All queries use PDO prepared statements with parameter binding. No string concatenation of user input into SQL.
**Note:** `paginate()` in `helpers.php:39` uses `LIMIT {$offset}, {$perPage}` — these are cast to `(int)` before interpolation, so safe.

## 4. XSS Protection — PARTIAL
**Frontend:** React auto-escades JSX content. No `dangerouslySetInnerHTML` found.
**Backend:** No HTML sanitization on stored input (reviews, product descriptions). Not critical since React escapes, but defense-in-depth recommended.
**Headers:** `X-Content-Type-Options: nosniff` set in `.htaccess` (good).

## 5. CSRF Protection — NOT NEEDED
**Architecture:** Uses JWT Bearer tokens, not cookies. CSRF is not applicable to Bearer token auth.

## 6. Input Validation — ADEQUATE
- Email validation: `filter_var(FILTER_VALIDATE_EMAIL)` — good
- Phone validation: regex length check — adequate
- Price/quantity: cast to `(float)`/`(int)` — safe
- File upload: not yet implemented (see Image Upload Audit)

## 7. CORS — OPEN
**File:** `api/includes/http.php:7`
**Issue:** `Access-Control-Allow-Origin: *` — allows any origin.
**Risk:** Any website can make API requests. For a restaurant ordering system, this is a moderate risk.
**Fix:** Restrict to known production domains (zaikalounge.com, www.zaikalounge.com). Keep `*` for development with TODO comment.

## 8. Security Headers — OK
**File:** `public_html/.htaccess:39-43`
**Status:** Already has:
- `X-Frame-Options: SAMEORIGIN`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`

## 9. Rate Limiting — MISSING
**Issue:** No rate limiting on login endpoints. Brute-force attacks possible.
**Fix:** Create `rate_limit.php` + `login_attempts` table. 5 attempts / 15 min lock. HTTP 429.

## 10. .htaccess Protection — OK
**File:** `api/.htaccess`
- Blocks direct access to config/includes folders
- Denies .env/.sql/.md files
- Good defense-in-depth

## 11. .env File — STALE ENTRIES
**File:** `.env:5-6`
**Issue:** Contains `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` — not used by any code, should be removed to avoid confusion.

## Summary of Required Fixes
| Priority | Issue | Fix |
|----------|-------|-----|
| CRITICAL | JWT fallback secret | Remove fallback, return 500 if missing |
| HIGH | No rate limiting | Create rate_limit.php + login_attempts table |
| MEDIUM | CORS open | Restrict to production domains |
| LOW | Stale .env entries | Remove Supabase vars |
