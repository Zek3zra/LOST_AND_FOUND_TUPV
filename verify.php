<?php
session_start();

$status = 'error';
$message = 'Invalid or missing verification token.';

if (isset($_GET['token'])) {
    $token = $_GET['token'];

    try {
        include 'db_connect.php';

        // Find the user with this token who is NOT verified yet
        $stmt = $pdo->prepare("SELECT id FROM users WHERE verification_token = ? AND is_verified = 0");
        $stmt->execute([$token]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($user) {
            // Update the user: set as verified and clear the token
            $update_stmt = $pdo->prepare("UPDATE users SET is_verified = 1, verification_token = NULL WHERE id = ?");
            $update_stmt->execute([$user['id']]);

            $status = 'success';
            $message = 'Your email has been successfully verified! You can now log in to your account.';
        } else {
            // Token is wrong, or user is already verified
            $status = 'warning';
            $message = 'This link is invalid or your account has already been verified.';
        }
    } catch (PDOException $e) {
        $status = 'error';
        $message = 'A database error occurred. Please try again later.';
    }
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>RETRIEVE | Email Verification</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <style>
        :root {
            --bg-body: #f8fafc;
            --bg-surface: #ffffff;
            --text-primary: #0f172a;
            --text-secondary: #475569;
            --border-light: #e2e8f0;
            --primary-blue: #1E3A8A; 
            --primary-blue-hover: #1E40AF;
            --success-green: #10b981;
            --warning-orange: #f59e0b;
            --danger-red: #ef4444;
        }

        body {
            background-color: var(--bg-body);
            font-family: 'Inter', sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
        }

        .verify-card {
            background-color: var(--bg-surface);
            padding: 40px;
            border-radius: 20px;
            box-shadow: 0 25px 50px -12px rgba(30, 58, 138, 0.1);
            border: 1px solid var(--border-light);
            text-align: center;
            max-width: 400px;
            width: 90%;
        }

        .icon-circle {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            display: flex;
            justify-content: center;
            align-items: center;
            margin: 0 auto 24px auto;
            font-size: 2.5rem;
        }

        .icon-circle.success { background-color: rgba(16, 185, 129, 0.1); color: var(--success-green); }
        .icon-circle.warning { background-color: rgba(245, 158, 11, 0.1); color: var(--warning-orange); }
        .icon-circle.error { background-color: rgba(239, 68, 68, 0.1); color: var(--danger-red); }

        h2 { color: var(--text-primary); margin-bottom: 12px; font-weight: 700; }
        p { color: var(--text-secondary); line-height: 1.5; margin-bottom: 32px; font-size: 0.95rem; }

        .login-btn {
            display: inline-block;
            background-color: var(--primary-blue);
            color: #ffffff;
            text-decoration: none;
            padding: 14px 28px;
            border-radius: 10px;
            font-weight: 600;
            transition: all 0.2s ease;
            width: 100%;
            box-sizing: border-box;
        }

        .login-btn:hover { background-color: var(--primary-blue-hover); transform: translateY(-2px); }
    </style>
</head>
<body>

    <div class="verify-card">
        <?php if ($status === 'success'): ?>
            <div class="icon-circle success"><i class="fa-solid fa-check"></i></div>
            <h2>Verification Successful!</h2>
            <p><?php echo $message; ?></p>
            <a href="login.html" class="login-btn">Go to Login</a>
            
        <?php elseif ($status === 'warning'): ?>
            <div class="icon-circle warning"><i class="fa-solid fa-triangle-exclamation"></i></div>
            <h2>Link Expired</h2>
            <p><?php echo $message; ?></p>
            <a href="login.html" class="login-btn">Go to Login</a>
            
        <?php else: ?>
            <div class="icon-circle error"><i class="fa-solid fa-xmark"></i></div>
            <h2>Verification Failed</h2>
            <p><?php echo $message; ?></p>
            <a href="register.html" class="login-btn">Back to Registration</a>
        <?php endif; ?>
    </div>

</body>
</html>