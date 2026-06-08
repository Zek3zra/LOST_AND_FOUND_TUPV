<?php
// Includes admin auth to ensure only admins can access this
include 'admin_auth.php'; 
// REMOVED: include 'db_connect.php'; (This was the error)

// Set header to return JSON
header('Content-Type: application/json');

// Check if user_id is provided
if (!isset($_GET['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'User ID not specified.']);
    exit;
}

$user_id = $_GET['user_id'];

try {
    // Query for the user's most recent item report
    $stmt = $pdo->prepare(
        "SELECT item_name_specific, report_type, item_location, item_datetime
         FROM item_reports
         WHERE user_id = ?
         ORDER BY created_at DESC
         LIMIT 1"
    );
    $stmt->execute([$user_id]);
    $report = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($report) {
        // Report found, send it
        echo json_encode(['success' => true, 'report' => $report]);
    } else {
        // No report found for this user
        echo json_encode(['success' => false, 'message' => 'No reports found for this user.']);
    }

} catch (PDOException $e) {
    // Database error
    error_log("Failed to fetch user report: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Database error.']);
}