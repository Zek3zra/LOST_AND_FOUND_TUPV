<?php
header('Content-Type: application/json');
$host = 'localhost';
$db   = 'your_database_name';  // ← CHANGE THIS
$user = 'root';
$pass = '';

$input = json_decode(file_get_contents('php://input'), true);

if (!$input || !isset($input['type']) || !in_array($input['type'], ['lost', 'found'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid type']);
    exit;
}

try {
    $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $stmt = $pdo->prepare("
        INSERT INTO items (type, title, description, location, date_posted)
        VALUES (?, ?, ?, ?, ?)
    ");

    $stmt->execute([
        $input['type'],
        $input['title'],
        $input['description'],
        $input['location'] ?? null,
        $input['date_posted']
    ]);

    echo json_encode(['success' => true]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database error']);
}
?>