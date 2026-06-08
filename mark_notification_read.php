<?php
session_start();
include 'db_connect.php'; 
header('Content-Type: application/json');

// Only logged-in users can do this
if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'Not authorized.']);
    exit;
}

$user_id = $_SESSION['user_id'];
$notif_id = $_POST['notification_id'] ?? null;

if (empty($notif_id)) {
    echo json_encode(['success' => false, 'message' => 'Missing notification ID.']);
    exit;
}

try {
    // Mark a specific notification as read
    $sql = "UPDATE notifications SET is_read = 1 WHERE notification_id = ? AND user_id = ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$notif_id, $user_id]);

    if ($stmt->rowCount() > 0) {
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Notification not found or already read.']);
    }

} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Database error.']);
}
?>