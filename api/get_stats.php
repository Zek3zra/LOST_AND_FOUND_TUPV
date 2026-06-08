<?php
header('Content-Type: application/json');
$host = 'localhost';
$db   = 'your_database_name';  // ← CHANGE THIS
$user = 'root';
$pass = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $found = $pdo->query("SELECT COUNT(*) FROM items WHERE type = 'found'")->fetchColumn();
    $lost = $pdo->query("SELECT COUNT(*) FROM items WHERE type = 'lost'")->fetchColumn();

    echo json_encode(['found' => (int)$found, 'lost' => (int)$lost]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>