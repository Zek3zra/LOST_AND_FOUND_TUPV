<?php
// Includes admin auth to ensure only admins can access this
include 'admin_auth.php';
// REMOVED: include 'db_connect.php'; (This was the error)

// Set header to return JSON
header('Content-Type: application/json');

// We expect a POST request with the user_id
if ($_SERVER['REQUEST_METHOD'] !== 'POST' || !isset($_POST['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'Invalid request.']);
    exit;
}

$user_id = $_POST['user_id'];

try {
    // Because of 'ON DELETE CASCADE' in your SQL,
    // we only need to delete the user. The database
    // will automatically delete their associated
    // item_reports and notifications.
    
    $stmt = $pdo->prepare("DELETE FROM users WHERE id = ?");
    $stmt->execute([$user_id]);

    // Check if the delete was successful
    if ($stmt->rowCount() > 0) {
        echo json_encode(['success' => true]);
    } else {
        // This could happen if the user was already deleted
        echo json_encode(['success' => false, 'message' => 'User not found or already deleted.']);
    }

} catch (PDOException $e) {
    error_log("Failed to delete user: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Database error. Could not delete user.']);
}