<?php
// submit_admin_post.php
include 'admin_auth.php'; // Security and DB connection ($pdo)
header('Content-Type: application/json');

// --- Basic Input Validation ---
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Invalid request method.']);
    exit;
}

// Get common form data (using names from post-item.php form)
$report_id = $_POST['report_id'] ?? null; // If this exists, we are editing
$report_type = $_POST['report_type'] ?? 'lost'; 
$item_category = $_POST['item_category'] ?? null;
$item_name_specific = $_POST['item_name_specific'] ?? null; // Added specific name field
$item_description = $_POST['item_description'] ?? null;
$item_location = $_POST['item_location'] ?? null;
$item_date = $_POST['item_date'] ?? null;
$item_time = $_POST['item_time'] ?? null;
$existing_image_path = $_POST['existing_image_path'] ?? null; // Only present when editing

// Use category as fallback if specific name is empty
if (empty($item_name_specific)) {
    $item_name_specific = $item_category; 
}

// Check required fields
if (!$item_category || !$item_name_specific || !$item_description || !$item_location || !$item_date || !$item_time) {
    echo json_encode(['success' => false, 'message' => 'Missing required fields.']);
    exit;
}

// Combine date and time
$item_datetime = $item_date . ' ' . $item_time;

// --- Handle Image Upload (using name="photo" from main form) ---
$image_path_to_save = $existing_image_path; 

// Check if a *new* file was uploaded with the name 'photo'
if (isset($_FILES['photo']) && $_FILES['photo']['error'] == 0) {
    $upload_dir = '../uploads/'; // Go UP one level

    $file_extension = pathinfo($_FILES['photo']['name'], PATHINFO_EXTENSION);
    $unique_filename = 'item_' . uniqid() . '_' . time() . '.' . $file_extension;
    $target_file = $upload_dir . $unique_filename;

    $allowed_types = ['jpg', 'jpeg', 'png', 'gif'];
    if (!in_array(strtolower($file_extension), $allowed_types)) {
        echo json_encode(['success' => false, 'message' => 'Error: Invalid file type uploaded.']);
        exit;
    }

    if (move_uploaded_file($_FILES['photo']['tmp_name'], $target_file)) {
        $image_path_to_save = 'uploads/' . $unique_filename; // Relative path from root
        // If editing and uploaded a new image, delete the old one
        if ($report_id && $existing_image_path && file_exists('../' . $existing_image_path)) {
             @unlink('../' . $existing_image_path); // Use @ to suppress warning if file not found
        }
    } else {
        echo json_encode(['success' => false, 'message' => 'Error: Failed to move uploaded file. Check permissions.']);
        exit;
    }
}

// --- Save to Database ---
try {
    if ($report_id) {
        // --- UPDATE Existing Post ---
        $sql = "UPDATE item_reports SET 
                    report_type = ?, 
                    item_category = ?, 
                    item_name_specific = ?, /* Added */
                    item_description = ?, 
                    image_path = ?, 
                    item_datetime = ?, 
                    item_location = ?,
                    report_status = 'approved' /* Keep/Set approved */
                WHERE report_id = ?";

        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            $report_type,
            $item_category,
            $item_name_specific,
            $item_description,
            $image_path_to_save,
            $item_datetime,
            $item_location,
            $report_id
        ]);
        $message = 'Post updated successfully!';

    } else {
        // --- INSERT New Post ---
       // --- INSERT New Post ---
        $admin_user_id = $_SESSION['user_id']; 

        // We MUST also set 'created_at', which exists but was missing
        $sql = "INSERT INTO item_reports 
                    (user_id, report_type, item_category, item_name_specific, item_description, image_path, item_datetime, item_location, report_status, created_at) 
                VALUES 
                    (?, ?, ?, ?, ?, ?, ?, ?, 'approved', NOW())"; // Auto-approved and set created_at

        $stmt = $pdo->prepare($sql);
        $stmt->execute([
           null,  //
            $report_type,
            $item_category,
            $item_name_specific,
            $item_description,
            $image_path_to_save,
            $item_datetime,
            $item_location
        ]);
        $message = 'New post created and published successfully!';
    }

    // Check if operation likely succeeded (INSERT always affects 1+, UPDATE might affect 0 if no change)
    if ($stmt->rowCount() > 0 || !$report_id) { 
        echo json_encode(['success' => true, 'message' => $message]);
    } else {
        // Likely an UPDATE where no data actually changed
        echo json_encode(['success' => true, 'message' => 'Post submitted, but no changes were detected.']); // Changed success to true
    }

} catch (PDOException $e) {
     error_log("Database error in submit_admin_post.php: " . $e->getMessage()); // Log error
     // TEMPORARY DEBUG: Show the real error message
     echo json_encode(['success' => false, 'message' => 'Database Error: ' . $e->getMessage()]);
}
?>