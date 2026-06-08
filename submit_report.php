<?php
session_start();
header('Content-Type: application/json');

// --- Database Connection Details ---
// Replaced with db_connect.php inclusion below

// --- Security Check: User must be logged in ---
// It checks the session variables that your login.php creates.
if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'Error: You must be logged in to submit a report.']);
    exit;
}

// --- Get Data From the Form ---
$user_id = $_SESSION['user_id'];
$report_type = $_POST['report_type'] ?? ''; // This will be 'lost' or 'found'
$item_name = $_POST['item_name'] ?? ''; // <-- ✅ ADD THIS LINE
$category = $_POST['category'] ?? '';
$description = $_POST['description'] ?? '';
$date = $_POST['date'] ?? '';
$time = $_POST['time'] ?? '';
$location = $_POST['location'] ?? '';

// --- Validation ---
// --- Validation ---
if (empty($report_type) || empty($item_name) || empty($category) || empty($description) || empty($date) || empty($time) || empty($location)) { // <-- ✅ ADD $item_name
    echo json_encode(['success' => false, 'message' => 'Error: All fields are required.']);
    exit;
}

// Combine date and time into a single DATETIME format
$item_datetime = $date . ' ' . $time;

// --- Image Upload Handling ---
$image_path = null;
if (isset($_FILES['photo']) && $_FILES['photo']['error'] == 0) {
    
    // IMPORTANT: Create a folder named 'uploads' in your project directory
    $upload_dir = 'uploads/'; 
    
    // Create a unique filename to prevent overwriting
    $file_extension = pathinfo($_FILES['photo']['name'], PATHINFO_EXTENSION);
    $unique_filename = uniqid('item_', true) . '.' . $file_extension;
    $target_file = $upload_dir . $unique_filename;

    // Basic file validation
    $allowed_types = ['jpg', 'jpeg', 'png', 'gif'];
    if (!in_array(strtolower($file_extension), $allowed_types)) {
        echo json_encode(['success' => false, 'message' => 'Error: Invalid file type. Only JPG, JPEG, PNG, GIF allowed.']);
        exit;
    }
    
    // Move the file from the temporary location to your 'uploads/' folder
    if (move_uploaded_file($_FILES['photo']['tmp_name'], $target_file)) {
        $image_path = $target_file; // This is the text we save in the database
    } else {
        echo json_encode(['success' => false, 'message' => 'Error: Failed to move uploaded file.']);
        exit;
    }
}

// --- Save to Database ---
try {
    include 'db_connect.php';

    // This SQL matches the table you just created
    // This SQL matches the table you just created
$sql = "INSERT INTO item_reports 
            (user_id, report_type, item_category, item_name_specific, item_description, image_path, item_datetime, item_location, report_status) 
        VALUES 
            (?, ?, ?, ?, ?, ?, ?, ?, 'pending')"; // <-- ✅ ADDED item_name_specific
    
    $stmt = $pdo->prepare($sql);
    
    // Execute the query, passing in all the variables
    $stmt->execute([
        $user_id,
        $report_type,
        $category,
        $item_name,
        $description,
        $image_path,
        $item_datetime,
        $location
    ]);

    echo json_encode(['success' => true, 'message' => 'Report submitted successfully!']);

} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
?>