<?php
/**
 * TestPass API Handler v18
 * Secure API proxy — rate limiting, CSRF check, JSON responses
 */

// ── Security Headers ──────────────────────────────────────────────────────────
header("Content-Type: application/json; charset=utf-8");
header("X-Content-Type-Options: nosniff");
header("X-Frame-Options: DENY");
header("Cache-Control: no-store, no-cache, must-revalidate");
header("Pragma: no-cache");
header("Access-Control-Allow-Origin: " . ($_SERVER['HTTP_HOST'] ?? 'self'));
header("Vary: Origin");

// ── Helpers ───────────────────────────────────────────────────────────────────
function jsonOk($data) {
    echo json_encode(['success' => true, 'data' => $data], JSON_UNESCAPED_UNICODE);
    exit;
}

function jsonError($msg, $code = 400) {
    http_response_code($code);
    echo json_encode(['success' => false, 'message' => $msg], JSON_UNESCAPED_UNICODE);
    exit;
}

function getClientIp() {
    foreach (['HTTP_CF_CONNECTING_IP','HTTP_X_FORWARDED_FOR','REMOTE_ADDR'] as $k) {
        if (!empty($_SERVER[$k])) {
            return trim(explode(',', $_SERVER[$k])[0]);
        }
    }
    return '0.0.0.0';
}

// ── Validate request is from our app ─────────────────────────────────────────
function validateRequest() {
    // Must be XHR from our app
    $xrw = $_SERVER['HTTP_X_REQUESTED_WITH'] ?? '';
    if ($xrw !== 'TestPass-App') {
        jsonError('Unauthorized request', 403);
    }

    // User-Agent must exist
    $ua = $_SERVER['HTTP_USER_AGENT'] ?? '';
    if (empty(trim($ua))) {
        jsonError('Forbidden', 403);
    }

    // Referer must be same origin
    $referer = $_SERVER['HTTP_REFERER'] ?? '';
    $host    = $_SERVER['HTTP_HOST']    ?? '';
    if (!empty($referer) && !empty($host)) {
        $refHost = parse_url($referer, PHP_URL_HOST);
        if ($refHost && $refHost !== $host) {
            jsonError('Cross-origin request blocked', 403);
        }
    }
}

// ── Simple rate limiting (file-based) ─────────────────────────────────────────
function rateLimit($key, $maxReq = 60, $windowSec = 60) {
    $dir  = sys_get_temp_dir() . '/tp_rl/';
    if (!is_dir($dir)) @mkdir($dir, 0700, true);
    $file = $dir . md5($key) . '.json';
    $now  = time();

    $data = ['count' => 0, 'window_start' => $now];
    if (file_exists($file)) {
        $raw = @file_get_contents($file);
        if ($raw) $data = json_decode($raw, true) ?: $data;
    }

    if ($now - $data['window_start'] >= $windowSec) {
        $data = ['count' => 0, 'window_start' => $now];
    }

    $data['count']++;
    @file_put_contents($file, json_encode($data), LOCK_EX);

    if ($data['count'] > $maxReq) {
        header('Retry-After: ' . $windowSec);
        jsonError('Too many requests. Thodi der baad try karo.', 429);
    }
}

// ── Load config ───────────────────────────────────────────────────────────────
$configFile = __DIR__ . '/../includes/config.php';
if (!file_exists($configFile)) {
    jsonError('Server configuration missing. config.php setup karo.', 500);
}
require_once $configFile;

// ── Validate & Rate Limit ─────────────────────────────────────────────────────
validateRequest();
$ip = getClientIp();
rateLimit($ip, 120, 60); // 120 req/min per IP

// ── Route parsing ─────────────────────────────────────────────────────────────
$uri    = $_SERVER['REQUEST_URI'] ?? '/';
$uri    = strtok($uri, '?');
$uri    = rtrim($uri, '/');
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

// Remove /api prefix
$path = preg_replace('#^/api#', '', $uri);
$segs = array_values(array_filter(explode('/', $path)));

// ── Upstream API proxy helper ─────────────────────────────────────────────────
function upstreamGet($url, $extraHeaders = []) {
    $headers = array_merge([
        'Accept: application/json',
        'User-Agent: TestPass/18 (+https://testpass.app)',
    ], $extraHeaders);

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 12,
        CURLOPT_HTTPHEADER     => $headers,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_MAXREDIRS      => 3,
    ]);
    $resp = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err  = curl_error($ch);
    curl_close($ch);

    if ($err) throw new Exception("Upstream error: $err");
    if ($code >= 400) throw new Exception("Upstream returned HTTP $code");

    $json = json_decode($resp, true);
    if ($json === null) throw new Exception("Invalid JSON from upstream");
    return $json;
}

function upstreamPost($url, $payload, $extraHeaders = []) {
    $headers = array_merge([
        'Content-Type: application/json',
        'Accept: application/json',
        'User-Agent: TestPass/18 (+https://testpass.app)',
    ], $extraHeaders);

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 15,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => json_encode($payload),
        CURLOPT_HTTPHEADER     => $headers,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_MAXREDIRS      => 2,
    ]);
    $resp = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err  = curl_error($ch);
    curl_close($ch);

    if ($err) throw new Exception("Upstream error: $err");
    $json = json_decode($resp, true);
    if ($json === null) throw new Exception("Invalid JSON from upstream");
    return ['code' => $code, 'data' => $json];
}

// ── Image Proxy ───────────────────────────────────────────────────────────────
if ($path === '/img-proxy') {
    $rawUrl = $_GET['url'] ?? '';
    if (empty($rawUrl)) {
        http_response_code(400); exit('Bad request');
    }
    $url = filter_var($rawUrl, FILTER_VALIDATE_URL);
    if (!$url) { http_response_code(400); exit('Invalid URL'); }
    // Only allow https images from known CDNs
    $allowedHosts = defined('ALLOWED_IMG_HOSTS') ? ALLOWED_IMG_HOSTS : [];
    $host = parse_url($url, PHP_URL_HOST);
    if (!empty($allowedHosts) && !in_array($host, $allowedHosts, true)) {
        http_response_code(403); exit('Host not allowed');
    }

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 8,
        CURLOPT_REFERER        => '',
        CURLOPT_SSL_VERIFYPEER => true,
    ]);
    $imgData = curl_exec($ch);
    $mime    = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
    $code    = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if (!$imgData || $code >= 400) { http_response_code(502); exit; }

    header("Content-Type: " . ($mime ?: 'image/jpeg'));
    header("Cache-Control: public, max-age=86400");
    header("X-Content-Type-Options: nosniff");
    echo $imgData;
    exit;
}

// ── Route: Stats ──────────────────────────────────────────────────────────────
if ($path === '/stats' && $method === 'GET') {
    try {
        $upstream = UPSTREAM_BASE . '/api/stats';
        $json     = upstreamGet($upstream, defined('UPSTREAM_AUTH') ? ['Authorization: Bearer ' . UPSTREAM_AUTH] : []);
        jsonOk($json['data'] ?? $json);
    } catch (Exception $e) {
        // Return minimal fallback stats
        jsonOk(['total_tests' => null, 'total_categories' => null]);
    }
}

// ── Route: Exam Categories ────────────────────────────────────────────────────
if ($path === '/exam-categories' && $method === 'GET') {
    $search   = trim($_GET['search'] ?? '');
    $upstream = UPSTREAM_BASE . '/api/exam-categories' . ($search ? '?search=' . urlencode($search) : '');
    try {
        $json = upstreamGet($upstream, defined('UPSTREAM_AUTH') ? ['Authorization: Bearer ' . UPSTREAM_AUTH] : []);
        jsonOk($json['data'] ?? $json);
    } catch (Exception $e) {
        jsonError('Categories load nahi hui: ' . $e->getMessage(), 502);
    }
}

// ── Route: Test Series for a Category ────────────────────────────────────────
if (count($segs) === 3 && $segs[0] === 'exam-categories' && $segs[2] === 'test-series' && $method === 'GET') {
    $examId   = preg_replace('/[^a-z0-9_\-]/i', '', $segs[1]);
    $upstream = UPSTREAM_BASE . "/api/exam-categories/{$examId}/test-series";
    try {
        $json = upstreamGet($upstream, defined('UPSTREAM_AUTH') ? ['Authorization: Bearer ' . UPSTREAM_AUTH] : []);
        jsonOk($json['data'] ?? $json);
    } catch (Exception $e) {
        jsonError('Test series load nahi hui: ' . $e->getMessage(), 502);
    }
}

// ── Route: Subjects for a Series ─────────────────────────────────────────────
if (count($segs) === 3 && $segs[0] === 'test-series' && $segs[2] === 'subjects' && $method === 'GET') {
    $seriesId = preg_replace('/[^a-z0-9_\-]/i', '', $segs[1]);
    $upstream = UPSTREAM_BASE . "/api/test-series/{$seriesId}/subjects";
    try {
        $json = upstreamGet($upstream, defined('UPSTREAM_AUTH') ? ['Authorization: Bearer ' . UPSTREAM_AUTH] : []);
        jsonOk($json['data'] ?? $json);
    } catch (Exception $e) {
        jsonError('Subjects load nahi hue: ' . $e->getMessage(), 502);
    }
}

// ── Route: Tests for a Subject ────────────────────────────────────────────────
if (count($segs) === 5 && $segs[0] === 'test-series' && $segs[2] === 'subjects' && $segs[4] === 'tests' && $method === 'GET') {
    $seriesId  = preg_replace('/[^a-z0-9_\-]/i', '', $segs[1]);
    $subjectId = preg_replace('/[^a-z0-9_\-]/i', '', $segs[3]);
    $upstream  = UPSTREAM_BASE . "/api/test-series/{$seriesId}/subjects/{$subjectId}/tests";
    try {
        $json = upstreamGet($upstream, defined('UPSTREAM_AUTH') ? ['Authorization: Bearer ' . UPSTREAM_AUTH] : []);
        jsonOk($json['data'] ?? $json);
    } catch (Exception $e) {
        jsonError('Tests load nahi hue: ' . $e->getMessage(), 502);
    }
}

// ── Route: Test Paper ─────────────────────────────────────────────────────────
if (count($segs) === 3 && $segs[0] === 'tests' && $segs[2] === 'paper' && $method === 'GET') {
    $testId   = preg_replace('/[^a-z0-9_\-]/i', '', $segs[1]);
    $lang     = in_array($_GET['lang'] ?? '', ['english','hindi']) ? $_GET['lang'] : 'english';
    $upstream = UPSTREAM_BASE . "/api/tests/{$testId}/paper?lang={$lang}";
    try {
        $json = upstreamGet($upstream, defined('UPSTREAM_AUTH') ? ['Authorization: Bearer ' . UPSTREAM_AUTH] : []);
        jsonOk($json['data'] ?? $json);
    } catch (Exception $e) {
        jsonError('Paper load nahi hua: ' . $e->getMessage(), 502);
    }
}

// ── Route: Submit Test ────────────────────────────────────────────────────────
if (count($segs) === 3 && $segs[0] === 'tests' && $segs[2] === 'submit' && $method === 'POST') {
    rateLimit($ip . ':submit', 30, 60); // tighter limit for submits
    $testId  = preg_replace('/[^a-z0-9_\-]/i', '', $segs[1]);
    $body    = json_decode(file_get_contents('php://input'), true);
    if (!$body || !isset($body['answers'])) {
        jsonError('Invalid submit payload', 400);
    }
    $upstream = UPSTREAM_BASE . "/api/tests/{$testId}/submit";
    try {
        $result = upstreamPost($upstream, $body, defined('UPSTREAM_AUTH') ? ['Authorization: Bearer ' . UPSTREAM_AUTH] : []);
        if ($result['code'] >= 400) {
            jsonError($result['data']['message'] ?? 'Submit failed', $result['code']);
        }
        jsonOk($result['data']['data'] ?? $result['data']);
    } catch (Exception $e) {
        jsonError('Submit nahi hua: ' . $e->getMessage(), 502);
    }
}

// ── Route: Free Tests ─────────────────────────────────────────────────────────
if ($path === '/free-tests' && $method === 'GET') {
    $upstream = UPSTREAM_BASE . '/api/free-tests';
    try {
        $json = upstreamGet($upstream, defined('UPSTREAM_AUTH') ? ['Authorization: Bearer ' . UPSTREAM_AUTH] : []);
        jsonOk($json['data'] ?? $json);
    } catch (Exception $e) {
        jsonOk([]); // Graceful fallback
    }
}

// ── 404 Fallback ──────────────────────────────────────────────────────────────
jsonError('API endpoint nahi mila: ' . htmlspecialchars($path), 404);
