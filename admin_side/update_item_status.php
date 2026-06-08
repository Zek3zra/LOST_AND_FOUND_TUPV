<?php
// update_item_status.php
include 'admin_auth.php'; // Security and DB connection ($pdo)
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Invalid request method.']);
    exit;
}

$report_id = $_POST['report_id'] ?? null;
$user_id = $_POST['user_id'] ?? null; // The ID of the user who posted the item
$action = $_POST['action'] ?? null; // e.g., 'mark-retrieved' or 'mark-found'

if (empty($report_id) || empty($action)) {
    echo json_encode(['success' => false, 'message' => 'Missing required data.']);
    exit;
}

try {
    $pdo->beginTransaction();

    // 1. Update the item's status to 'matched'
    $sql_update = "UPDATE item_reports SET report_status = 'matched' WHERE report_id = ?";
    $stmt_update = $pdo->prepare($sql_update);
    $stmt_update->execute([$report_id]);

    $notification_sent = false;

    // 2. Check if the item was posted by a registered user (not an admin)
    if (!empty($user_id) && is_numeric($user_id)) {
        
        // Determine the correct notification message
        $message = '';
        if ($action == 'mark-retrieved') {
            $message = 'Your FOUND item report has been marked as "Retrieved" by the owner.';
        } else if ($action == 'mark-found') {
            $message = 'Good news! Your LOST item report has been marked as "Found".';
        }

        if (!empty($message)) {
            // 3. Insert a notification for that user
            $sql_notify = "INSERT INTO notifications (user_id, report_id, message) VALUES (?, ?, ?)";
            $stmt_notify = $pdo->prepare($sql_notify);
            $stmt_notify->execute([$user_id, $report_id, $message]);
            $notification_sent = true;
        }
    }

    // If all queries were successful, commit the changes
    $pdo->commit();

    echo json_encode([
        'success' => true, 
        'message' => 'Item status updated to Matched!',
        'notification_sent' => $notification_sent
    ]);

} catch (PDOException $e) {
    $pdo->rollBack(); // Undo changes on error
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
?>