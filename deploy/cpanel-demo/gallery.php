<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    header('Allow: GET');
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$uploadDir = __DIR__ . '/uploads';
$types = ['image/png' => 'png', 'image/jpeg' => 'jpg', 'image/gif' => 'gif', 'image/webp' => 'webp'];
$files = is_dir($uploadDir) ? scandir($uploadDir) : false;
$images = [];

if ($files !== false) {
    $finfo = new finfo(FILEINFO_MIME_TYPE);
    foreach ($files as $file) {
        if (!preg_match('/\A[A-Za-z0-9_-][A-Za-z0-9_.-]{0,150}\.(?:jpe?g|png|gif|webp)\z/iD', $file)) {
            continue;
        }
        $path = $uploadDir . '/' . $file;
        if (!is_file($path) || is_link($path)) {
            continue;
        }
        $mime = $finfo->file($path);
        $details = @getimagesize($path);
        $extension = strtolower(pathinfo($file, PATHINFO_EXTENSION));
        if (!isset($types[$mime]) || $details === false || ($details['mime'] ?? '') !== $mime ||
            !in_array($extension, $mime === 'image/jpeg' ? ['jpg', 'jpeg'] : [$types[$mime]], true)) {
            continue;
        }
        $images[] = [
            'id' => $file,
            'mtime' => filemtime($path) ?: 0,
            'width' => $details[0],
            'height' => $details[1],
        ];
    }
}

usort($images, static function (array $a, array $b): int {
    return $b['mtime'] <=> $a['mtime'];
});

$items = [];
foreach ($images as $image) {
    $url = 'https://penman.uae.gift/uploads/' . rawurlencode($image['id']);
    $items[] = [
        'id' => $image['id'],
        'url' => $url,
        'thumbnailUrl' => $url,
        'title' => $image['id'],
        'width' => $image['width'],
        'height' => $image['height'],
    ];
}

echo json_encode(['items' => $items, 'nextCursor' => null], JSON_UNESCAPED_SLASHES);
