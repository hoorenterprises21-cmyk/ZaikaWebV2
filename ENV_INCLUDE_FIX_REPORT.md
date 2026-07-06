# Environment Include Fix Report

## Root cause
The runtime error was caused by an incorrect relative include path in [api/includes/jwt.php](api/includes/jwt.php).

The file was attempting to require:
- `__DIR__ . '/env.php'`

But the environment loader actually lives at:
- [api/config/env.php](api/config/env.php)

Because [api/includes/jwt.php](api/includes/jwt.php) is inside the [api/includes](api/includes) directory, it must go up one level to reach the config folder.

## Files affected
- Updated: [api/includes/jwt.php](api/includes/jwt.php)
- Reviewed but unchanged:
  - [api/config/env.php](api/config/env.php)
  - [api/bootstrap.php](api/bootstrap.php)
  - [api/config/database.php](api/config/database.php)

## Exact change made
Changed the include from:
- `require_once __DIR__ . '/env.php';`

To:
- `require_once __DIR__ . '/../config/env.php';`

## Verification
I searched the API directory for `env.php` references and confirmed the relevant include/require statements now point to the correct file:
- [api/bootstrap.php](api/bootstrap.php) includes [api/config/env.php](api/config/env.php)
- [api/includes/jwt.php](api/includes/jwt.php) now includes [api/config/env.php](api/config/env.php)
- [api/config/database.php](api/config/database.php) correctly references [api/config/env.php](api/config/env.php) from its own directory
