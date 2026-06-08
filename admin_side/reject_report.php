<?php
// reject_report.php
include 'admin_auth.php'; // Security and DB connection ($pdo is available)
header('Content-Type: application/json'); // Send back JSON

// --- Basic Input Validation ---
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Invalid request method.']);
    exit;
}

$report_id = $_POST['report_id'] ?? null;

if (!$report_id || !is_numeric($report_id)) {
    echo json_encode(['success' => false, 'message' => 'Missing or invalid report ID.']);
    exit;
}

// --- Update Database ---
try {
    // --- ✅ ADDED: Start a transaction ---
    $pdo->beginTransaction();

    // --- ✅ ADDED: First, get the report's details for the notification ---
    $stmt_info = $pdo->prepare("SELECT user_id, item_category, item_name_specific FROM item_reports WHERE report_id = ?");
    $stmt_info->execute([$report_id]);
    $report_info = $stmt_info->fetch(PDO::FETCH_ASSOC);

    // 1. Update the report status to 'rejected'
    $sql = "UPDATE item_reports SET report_status = 'rejected' WHERE report_id = ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$report_id]);

    $rows_affected = $stmt->rowCount();

    // 2. --- ✅ ADDED: Send notification if it was a user's post ---
    if ($rows_affected > 0 && $report_info && !empty($report_info['user_id'])) {
        
        // Create the notification message
        $item_name = htmlspecialchars($report_info['item_name_specific'] ?? $report_info['item_category']);
        $message = "We're sorry, but your report for '$item_name' has been rejected by an administrator.";
        
        // Insert into notifications table
        $sql_notify = "INSERT INTO notifications (user_id, report_id, message) VALUES (?, ?, ?)";
        $stmt_notify = $pdo->prepare($sql_notify);
        $stmt_notify->execute([
            $report_info['user_id'],
            $report_id,
            $message
        ]);
    }

    // --- ✅ ADDED: Commit the transaction ---
    $pdo->commit();

    if ($rows_affected > 0) {
        echo json_encode(['success' => true, 'message' => 'Report rejected successfully!']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Report not found or already processed.']);
    }

} catch (PDOException $e) {
    // --- ✅ ADDED: Roll back on error ---
    $pdo->rollBack();
    error_log("Database error in reject_report.php: " . $e->getMessage()); 
    echo json_encode(['success' => false, 'message' => 'Database error occurred. Please check logs.']);
}
?>