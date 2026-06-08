<?php
// delete_post.php
include 'admin_auth.php'; // Security and DB connection ($pdo)
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Invalid request method.']);
    exit;
}

$report_id = $_POST['report_id'] ?? null;

if (empty($report_id) || !is_numeric($report_id)) {
    echo json_encode(['success' => false, 'message' => 'Invalid Report ID.']);
    exit;
}

try {
    // We will change the status to 'archived' or 'deleted' instead of
    // permanently deleting the row, as this is safer.
    // Let's use 'archived'.
    
    $sql = "UPDATE item_reports SET report_status = 'archived' WHERE report_id = ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$report_id]);

    if ($stmt->rowCount() > 0) {
        echo json_encode(['success' => true, 'message' => 'Post archived successfully.']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Post not found or already processed.']);
    }

} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
?>