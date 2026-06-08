<?php
// batch_action.php
include 'admin_auth.php'; // Security and DB connection ($pdo is available)
header('Content-Type: application/json'); // Send back JSON

// --- Get Inputs ---
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Invalid request method.']);
    exit;
}

$action = $_POST['action'] ?? null; // 'publish' or 'reject'
$report_ids = $_POST['report_ids'] ?? []; // Array of IDs from JS

// --- Validate Inputs ---
if (empty($action) || !in_array($action, ['publish', 'reject'])) {
    echo json_encode(['success' => false, 'message' => 'Invalid action specified.']);
    exit;
}
if (empty($report_ids) || !is_array($report_ids)) {
    echo json_encode(['success' => false, 'message' => 'No report IDs provided.']);
    exit;
}
$sanitized_ids = [];
foreach ($report_ids as $id) {
    if (filter_var($id, FILTER_VALIDATE_INT)) {
        $sanitized_ids[] = (int)$id;
    }
}
if (empty($sanitized_ids)) {
    echo json_encode(['success' => false, 'message' => 'Invalid report IDs provided.']);
    exit;
}

// --- Determine New Status Based on Action ---
$new_status = '';
$action_verb = '';
if ($action === 'publish') {
    $new_status = 'approved';
    $action_verb = 'published';
} elseif ($action === 'reject') {
    $new_status = 'rejected';
    $action_verb = 'rejected';
}

// --- Update Database ---
try {
    $pdo->beginTransaction();

    $placeholders = implode(',', array_fill(0, count($sanitized_ids), '?'));
    
    // --- ✅ MODIFIED: 1. Get info for all notifications (publish OR reject) ---
    $reports_to_notify = [];
    $sql_info = "SELECT user_id, report_id, item_category, item_name_specific 
                 FROM item_reports 
                 WHERE report_id IN ($placeholders) AND user_id IS NOT NULL";
    $stmt_info = $pdo->prepare($sql_info);
    $stmt_info->execute($sanitized_ids);
    $reports_to_notify = $stmt_info->fetchAll(PDO::FETCH_ASSOC);

    // 2. Update all the reports
    $sql_update = "UPDATE item_reports SET report_status = ? WHERE report_id IN ($placeholders)";
    $stmt_update = $pdo->prepare($sql_update);
    $params_update = array_merge([$new_status], $sanitized_ids);
    $stmt_update->execute($params_update);
    $affected_rows = $stmt_update->rowCount();

    // 3. --- ✅ MODIFIED: Create all notifications in one query ---
    if (!empty($reports_to_notify)) {
        $sql_notify = "INSERT INTO notifications (user_id, report_id, message) VALUES ";
        $params_notify = [];
        $notification_rows = [];

        foreach ($reports_to_notify as $report) {
            $item_name = htmlspecialchars($report['item_name_specific'] ?? $report['item_category']);
            $message = '';
            
            // Set message based on action
            if ($action === 'publish') {
                $message = "Good news! Your report for '$item_name' has been approved and published by an administrator.";
            } elseif ($action === 'reject') {
                $message = "We're sorry, but your report for '$item_name' has been rejected by an administrator.";
            }

            $notification_rows[] = "(?, ?, ?)";
            $params_notify[] = $report['user_id'];
            $params_notify[] = $report['report_id'];
            $params_notify[] = $message;
        }
        
        // Only run the query if we actually have notifications to send
        if (!empty($notification_rows)) {
            $sql_notify .= implode(',', $notification_rows);
            $stmt_notify = $pdo->prepare($sql_notify);
            $stmt_notify->execute($params_notify);
        }
    }

    $pdo->commit();

    if ($affected_rows > 0) {
        echo json_encode(['success' => true, 'message' => "$affected_rows report(s) successfully $action_verb!"]);
    } else {
        echo json_encode(['success' => false, 'message' => 'No reports were updated. They might have already been processed.']);
    }

} catch (PDOException $e) {
    $pdo->rollBack();
    error_log("Batch action error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'A database error occurred during the batch update.']);
}
?>