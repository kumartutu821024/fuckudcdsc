<?php
/**
 * TestPass Configuration
 * Rename this file to config.php and fill in your values.
 * ⚠️ NEVER commit this file to version control.
 */

// ── Upstream API (your backend / existing API server) ─────────────────────────
// Example: 'https://thestudyspark.site' or 'http://localhost:3000'
define('UPSTREAM_BASE', 'https://testpass.examsaathi.site');

// Optional: Bearer token for upstream API authentication
// define('UPSTREAM_AUTH', 'your_token_here');

// ── Allowed image hosts (for the /api/img-proxy endpoint) ─────────────────────
// Add CDN / image hostnames that you allow proxying from.
// Leave empty array to allow all (not recommended for production).
define('ALLOWED_IMG_HOSTS', [
    // 'cdn.example.com',
    // 'images.yourdomain.com',
]);

// ── App Settings ──────────────────────────────────────────────────────────────
define('APP_NAME',    'TestPass');
define('APP_VERSION', '18');
define('APP_ENV',     getenv('APP_ENV') ?: 'production'); // 'development' | 'production'
