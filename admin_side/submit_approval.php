<?php
// submit_approval.php
include 'admin_auth.php'; // Ensures only admin can run this & connects DB ($pdo)
header('Content-Type: application/json');

// --- Basic Input Validation ---
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Invalid request method.']);
    exit;
}

$report_id = $_POST['report_id'] ?? null;
$item_category = $_POST['item_category'] ?? null;
$item_description = $_POST['item_description'] ?? null;
$item_location = $_POST['item_location'] ?? null;
$item_date = $_POST['item_date'] ?? null;
$item_time = $_POST['item_time'] ?? null;
$existing_image_path = $_POST['existing_image_path'] ?? null;

if (!$report_id || !$item_category || !$item_description || !$item_location || !$item_date || !$item_time) {
    echo json_encode(['success' => false, 'message' => 'Missing required fields.']);
    exit;
}

$item_datetime = $item_date . ' ' . $item_time;

// --- Handle Image Upload (Optional New Image) ---
$image_path_to_save = $existing_image_path; 

if (isset($_FILES['new_photo']) && $_FILES['new_photo']['error'] == 0) {
    $upload_dir = '../uploads/'; 
    $file_extension = pathinfo($_FILES['new_photo']['name'], PATHINFO_EXTENSION);
    $unique_filename = 'item_' . uniqid() . '_' . time() . '.' . $file_extension;
    $target_file = $upload_dir . $unique_filename;
    $allowed_types = ['jpg', 'jpeg', 'png', 'gif'];
    
    if (!in_array(strtolower($file_extension), $allowed_types)) {
        echo json_encode(['success' => false, 'message' => 'Error: Invalid file type for new photo.']);
        exit;
    }
    
    if (move_uploaded_file($_FILES['new_photo']['tmp_name'], $target_file)) {
        $image_path_to_save = 'uploads/' . $unique_filename; 
        if ($existing_image_path && file_exists('../' . $existing_image_path)) {
             unlink('../' . $existing_image_path); 
        }
    } else {
        echo json_encode(['success' => false, 'message' => 'Error: Failed to move uploaded file.']);
        exit;
    }
}

// --- Update Database ---
try {
    // --- ✅ ADDED: Start transaction ---
    $pdo->beginTransaction();

    // --- ✅ ADDED: 1. Get user_id and item name for notification ---
    $stmt_info = $pdo->prepare("SELECT user_id, item_name_specific FROM item_reports WHERE report_id = ?");
    $stmt_info->execute([$report_id]);
    $report_info = $stmt_info->fetch(PDO::FETCH_ASSOC);

    // 2. Update the report
    $sql = "UPDATE item_reports SET 
                item_category = ?, 
                item_description = ?, 
                image_path = ?, 
                item_datetime = ?, 
                item_location = ?, 
                report_status = 'approved' 
            WHERE report_id = ?";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        $item_category,
        $item_description,
        $image_path_to_save,
        $item_datetime,
        $item_location,
        $report_id
    ]);

    $rows_affected = $stmt->rowCount();

    // 3. --- ✅ ADDED: Send notification if it was a user's post ---
    if ($rows_affected > 0 && $report_info && !empty($report_info['user_id'])) {
        
        // Use the item name from the form, or fall back to the one from the DB
        $item_name = htmlspecialchars($_POST['item_name_specific'] ?? $report_info['item_name_specific'] ?? $item_category);
        $message = "Good news! Your report for '$item_name' has been approved and published by an administrator.";
        
        // Insert into notifications table
        $sql_notify = "INSERT INTO notifications (user_id, report_id, message) VALUES (?, ?, ?)";
        $stmt_notify = $pdo->prepare($sql_notify);
        $stmt_notify->execute([
            $report_info['user_id'],
            $report_id,
            $message
        ]);
    }

    // --- ✅ ADDED: Commit transaction ---
    $pdo->commit();

    if ($rows_affected > 0) {
        echo json_encode(['success' => true, 'message' => 'Report approved and published successfully!']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Report not found or no changes made.']);
    }

} catch (PDOException $e) {
    // --- ✅ ADDED: Roll back on error ---
    $pdo->rollBack();
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
?>