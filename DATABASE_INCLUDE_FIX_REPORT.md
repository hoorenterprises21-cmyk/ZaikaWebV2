# Database Include Fix Report

## Root cause
The PHP runtime error was caused by an incorrect relative include path in [api/includes/helpers.php](api/includes/helpers.php).

The file attempted to load:
- `__DIR__ . '/database.php'`

But the actual database bootstrap file exists at:
- [api/config/database.php](api/config/database.php)

Because the helper file lives in [api/includes](api/includes), it must reference the parent directory to reach the config folder.

## Correct path
The correct include path is:
- `__DIR__ . '/../config/database.php'`

## Files affected
- Updated: [api/includes/helpers.php](api/includes/helpers.php)
- Reviewed but unchanged:
  - [api/config/database.php](api/config/database.php)
  - [api/bootstrap.php](api/bootstrap.php)

## Verification
I verified the include references in the PHP codebase:
- [api/bootstrap.php](api/bootstrap.php) correctly includes [api/config/database.php](api/config/database.php)
- [api/includes/helpers.php](api/includes/helpers.php) now points to the same corrected location

No other PHP files were changed.
