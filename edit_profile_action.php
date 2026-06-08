<?php
session_start();
require 'db_connect.php'; // Make sure this points to your database connection file

// Check if user is logged in
if (!isset($_SESSION['user_id'])) {
    header("Location: login.html");
    exit;
}

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $user_id = $_SESSION['user_id'];
    
    // Get and sanitize the inputs
    $first_name = trim($_POST['first_name']);
    $last_name = trim($_POST['last_name']);
    $contact_number = trim($_POST['contact_number']);
    $course_section = trim($_POST['course_section']);
    $address = trim($_POST['address']);

    try {
        // Update the database
        $stmt = $pdo->prepare("UPDATE users SET first_name = ?, last_name = ?, contact_number = ?, course_section = ?, address = ? WHERE id = ?");
        $stmt->execute([$first_name, $last_name, $contact_number, $course_section, $address, $user_id]);

        // Update the session variable for the display name so it updates immediately
        $_SESSION['user_name'] = $first_name . ' ' . $last_name;

        // Redirect back to profile with a success message
        header("Location: profile.php?update=success");
        exit;

    } catch (PDOException $e) {
        // Log the error and redirect back with an error message
        error_log("Profile Update Error: " . $e->getMessage());
        header("Location: profile.php?update=error");
        exit;
    }
} else {
    // If someone tries to access this file directly without submitting the form
    header("Location: profile.php");
    exit;
}
?>