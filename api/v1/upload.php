<?php
/**
 * /api/v1/upload.php — Image upload endpoint
 * Accepts multipart/form-data, saves to uploads/ directory.
 * Admin only.
 */
require_once __DIR__ . '/../bootstrap.php';

require_admin();

$method = method();
if ($method !== 'POST') {
    json_response(['success' => false, 'message' => 'POST only'], 405);
}

if (!isset($_FILES['file'])) {
    json_response(['success' => false, 'message' => 'No file uploaded'], 422);
}

$file = $_FILES['file'];

// Validate upload error
if ($file['error'] !== UPLOAD_ERR_OK) {
    $messages = [
        UPLOAD_ERR_INI_SIZE   => 'File exceeds server limit',
        UPLOAD_ERR_FORM_SIZE  => 'File exceeds form limit',
        UPLOAD_ERR_PARTIAL    => 'File was partially uploaded',
        UPLOAD_ERR_NO_FILE    => 'No file was uploaded',
        UPLOAD_ERR_NO_TMP_DIR => 'Server missing temp directory',
        UPLOAD_ERR_CANT_WRITE => 'Server failed to write file',
        UPLOAD_ERR_EXTENSION  => 'File type not allowed',
    ];
    json_response(['success' => false, 'message' => $messages[$file['error']] ?? 'Upload failed'], 400);
}

// Validate size (5MB max)
$maxSize = 5 * 1024 * 1024;
if ($file['size'] > $maxSize) {
    json_response(['success' => false, 'message' => 'File too large. Maximum 5MB.'], 422);
}

// Validate MIME type using finfo (not just extension)
$allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mime = finfo_file($finfo, $file['tmp_name']);
finfo_close($finfo);

if (!in_array($mime, $allowedTypes, true)) {
    json_response(['success' => false, 'message' => 'Invalid file type. Allowed: JPG, PNG, WebP, GIF.'], 422);
}

// Generate safe filename
$ext = match ($mime) {
    'image/jpeg' => 'jpg',
    'image/png'  => 'png',
    'image/webp' => 'webp',
    'image/gif'  => 'gif',
    default      => 'img',
};
$safeName = 'upload_' . date('Ymd_His') . '_' . bin2hex(random_bytes(6)) . '.' . $ext;

// Determine upload directory (at web root, same level as api/)
$uploadDir = dirname(__DIR__, 2) . '/uploads/';
$docRoot = realpath($_SERVER['DOCUMENT_ROOT'] ?? '');
$projectRoot = realpath(dirname(__DIR__, 2));
$basePath = '';

if ($docRoot && $projectRoot && strpos($projectRoot, $docRoot) === 0) {
    $basePath = str_replace($docRoot, '', $projectRoot);
    $basePath = '/' . ltrim($basePath, '/');
} else {
    $scriptName = $_SERVER['REQUEST_URI'] ?? ($_SERVER['SCRIPT_NAME'] ?? '/api/v1/upload.php');
    $scriptName = '/' . ltrim($scriptName, '/');
    if (preg_match('#/api/v1/upload\.php$#', $scriptName)) {
        $basePath = preg_replace('#/api/v1/upload\.php$#', '', $scriptName);
    } else {
        $basePath = preg_replace('#/[^/]+$#', '', $scriptName);
    }
}
$basePath = $basePath === '' ? '' : rtrim($basePath, '/');
$scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$host = $_SERVER['HTTP_HOST'] ?? 'localhost';
$uploadUrl = $scheme . '://' . $host . $basePath . '/uploads/' . $safeName;

// Create directory if not exists
if (!is_dir($uploadDir)) {
    @mkdir($uploadDir, 0755, true);
}
if (!is_writable($uploadDir)) {
    json_response(['success' => false, 'message' => 'Upload directory is not writable. Create uploads/ with 755 permission.'], 500);
}

// Move file
if (!move_uploaded_file($file['tmp_name'], $uploadDir . $safeName)) {
    json_response(['success' => false, 'message' => 'Failed to save file.'], 500);
}

// Log to uploads table (optional, non-blocking)
try {
    $admin = current_admin();
    db()->prepare(
        "INSERT INTO uploads (filename, original_name, mime_type, file_size, uploaded_by)
         VALUES (?, ?, ?, ?, ?)"
    )->execute([
        $safeName,
        $file['name'],
        $mime,
        $file['size'],
        $admin['id'] ?? null,
    ]);
} catch (PDOException $e) {}

json_response([
    'success' => true,
    'url'     => $uploadUrl,
    'filename' => $safeName,
], 201);
