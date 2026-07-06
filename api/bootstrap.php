<?php
/**
 * Common bootstrap included by every v1 endpoint.
 * Order matters: preflight -> DB -> helpers -> auth.
 */
require_once __DIR__ . '/config/env.php';
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/includes/http.php';
require_once __DIR__ . '/includes/helpers.php';
require_once __DIR__ . '/includes/auth.php';

handle_preflight();
