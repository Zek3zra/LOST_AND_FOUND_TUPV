<?php
session_start();
header('Content-Type: application/json');

// 1. Check if user is logged in
if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'User not authenticated.']);
    exit;
}

// 2. Include database connection
// Make sure this path is correct relative to delete_account.php
include 'db_connect.php'; 

$user_id = $_SESSION['user_id'];

// 3. Begin a transaction
try {
    $pdo->beginTransaction();

    // 4. Delete the user from the users table
    // Because your database uses "ON DELETE CASCADE",
    // the database will automatically delete all matching records
    // from "item_reports" and "notifications" for this user.
    
    // We use "id" as the column name, based on your lost_and_found.sql file
    $stmt = $pdo->prepare("DELETE FROM users WHERE id = ?");
    $stmt->execute([$user_id]);

    // 5. Commit the transaction
    $pdo->commit();

    // 6. Destroy the user's session data
    session_unset();
    session_destroy();

    // 7. Return a success response
    echo json_encode(['success' => true]);

} catch (Exception $e) {
    // 8. If any error occurred, roll back all database changes
    $pdo->rollBack();
    
    // Log the detailed error for yourself (server-side)
    error_log('Delete account error for user ' . $user_id . ': ' . $e.getMessage()); 
    
    // Send a generic error message to the user
    echo json_encode(['success' => false, 'message' => 'A database error occurred. Could not delete account.']);
}

exit;
?>

