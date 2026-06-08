<?php
session_start();
header('Content-Type: application/json');



$admin_email = 'lostandfoundadmin@gmail.com';
$admin_pass = 'admin12345'; // The plain-text password

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Invalid request method.']);
    exit;
}

$email = trim($_POST['email'] ?? '');
$plainPassword = $_POST['password'] ?? '';

if (empty($email) || empty($plainPassword)) {
    echo json_encode(['success' => false, 'message' => 'Email and password are required.']);
    exit;
}

// --- Hardcoded Admin Check ---
if ($email === $admin_email && $plainPassword === $admin_pass) {
    $_SESSION['user_id'] = 'admin_001'; 
    $_SESSION['user_email'] = $admin_email;
    $_SESSION['user_name'] = 'Site Administrator';
    $_SESSION['role'] = 'admin'; 
    $_SESSION['user_pfp'] = null; 
    
    echo json_encode([
        'success' => true, 
        'message' => 'Admin login successful! Redirecting...',
        'redirect' => 'admin_side/overview.php' 
    ]);
    exit; 
}


// --- Regular User Login Logic ---
try {

    include 'db_connect.php';   
    
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // MODIFICATION 1: Added 'is_verified' to the SELECT query
    $stmt = $pdo->prepare("SELECT id, first_name, last_name, email, password, profile_picture_path, role, is_verified FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if ($user && password_verify($plainPassword, $user['password'])) {
        
        // ==========================================
        // MODIFICATION 2: THE GATEKEEPER
        // Check if the account is verified before letting them in!
        // ==========================================
        if ($user['is_verified'] == 0) {
            echo json_encode([
                'success' => false, 
                'message' => 'Please verify your email address before logging in. Check your inbox for the link!'
            ]);
            exit; // Stop the script completely
        }
        // ==========================================

        // Check if a DB user is ALSO an admin
        if ($user['role'] === 'admin') {
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['user_email'] = $user['email'];
            $_SESSION['user_name'] = $user['first_name'] . ' ' . $user['last_name'];
            $_SESSION['role'] = 'admin';
            $_SESSION['user_pfp'] = $user['profile_picture_path'];
            
            echo json_encode([
                'success' => true, 
                'message' => 'Admin login successful! Redirecting...',
                'redirect' => 'admin_side/overview.php'
            ]);
            exit;
        }

        // Standard User Login
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['user_email'] = $user['email'];
        $_SESSION['user_name'] = $user['first_name'] . ' ' . $user['last_name'];
        $_SESSION['role'] = $user['role']; 
        $_SESSION['user_pfp'] = $user['profile_picture_path'];
        
        echo json_encode([
            'success' => true, 
            'message' => 'Login successful! Redirecting...',
            'redirect' => 'homepage.php' 
        ]);

    } else {
        echo json_encode(['success' => false, 'message' => 'Invalid email or password.']);
    }

} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Database error. Please try again later.']);
}
?>