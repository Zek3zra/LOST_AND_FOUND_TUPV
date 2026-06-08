<?php
// upload_pfp.php
session_start();
header('Content-Type: application/json');

// --- Database Connection Details ---
// Replaced with db_connect.php inclusion below

// --- Security Check: User must be logged in ---
if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'Error: Not authorized.']);
    exit;
}

$user_id = $_SESSION['user_id'];

// --- File Upload Handling ---
$image_path = null;
if (isset($_FILES['pfp']) && $_FILES['pfp']['error'] == 0) {
    
    $upload_dir = 'uploads/'; // Using the same uploads folder
    
    // Create a unique filename for the profile picture
    $file_extension = pathinfo($_FILES['pfp']['name'], PATHINFO_EXTENSION);
    $unique_filename = 'pfp_' . $user_id . '_' . time() . '.' . $file_extension;
    $target_file = $upload_dir . $unique_filename;

    // Basic file validation
    $allowed_types = ['jpg', 'jpeg', 'png', 'gif'];
    if (!in_array(strtolower($file_extension), $allowed_types)) {
        echo json_encode(['success' => false, 'message' => 'Error: Invalid file type.']);
        exit;
    }
    
    // Move the file
    if (move_uploaded_file($_FILES['pfp']['tmp_name'], $target_file)) {
        $image_path = $target_file; 
    } else {
        echo json_encode(['success' => false, 'message' => 'Error: Failed to move file.']);
        exit;
    }
} else {
    echo json_encode(['success' => false, 'message' => 'Error: No file uploaded.']);
    exit;
}

// --- Update Database ---
try {
    include 'db_connect.php';

    // Update the user's row with the new path
    $sql = "UPDATE users SET profile_picture_path = ? WHERE id = ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$image_path, $user_id]);

    // --- IMPORTANT: Update the session variable immediately ---
    $_SESSION['user_pfp'] = $image_path;

    echo json_encode([
        'success' => true, 
        'message' => 'Profile picture updated!',
        'new_path' => $image_path // Send the new path back to the frontend
    ]);

} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
?>