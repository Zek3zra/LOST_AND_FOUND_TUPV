<?php 
include 'admin_auth.php'; 

// Fetch all users from the database
try {
    $stmt = $pdo->query("SELECT id, first_name, last_name, email, role FROM users ORDER BY last_name ASC, first_name ASC");
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    $users = [];
    error_log("Failed to fetch users: " . $e->getMessage());
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>Retrieve TUPV | Manage Users</title>
    
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <link rel="stylesheet" href="users.css" />
</head>
<body>

    <header class="admin-header">
        <div class="header-left">
            <button class="hamburger" id="hamburger"><i class="fa-solid fa-bars"></i></button>
            <div class="header-title">Retrieve TUPV Admin</div>
        </div>
        <div class="admin-profile">
            <span><?php echo htmlspecialchars($_SESSION['user_name'] ?? 'Admin'); ?></span>
            <div class="admin-avatar"><i class="fa-solid fa-user-shield"></i></div>
        </div>
    </header>

    <aside class="admin-sidebar" id="sidebar">
        <ul class="nav-links">
            <li><a href="overview.php"><i class="fa-solid fa-chart-line"></i> Dashboard</a></li>
            <li><a href="users.php" class="active"><i class="fa-solid fa-users"></i> Manage Users</a></li>
            <li><a href="post-item.php"><i class="fa-solid fa-file-shield"></i> Pending Reports</a></li>
            <li><a href="reports.php"><i class="fa-solid fa-box-open"></i> Active Posts</a></li>
            <li style="margin-top: auto;"><a href="../logout.php" class="logout-link"><i class="fa-solid fa-arrow-right-from-bracket"></i> Log Out</a></li>
        </ul>
    </aside>

    <main class="main-content">
        <div class="page-header">
            <h2>Manage Users</h2>
            <p>View registered accounts and manage administrative access.</p>
        </div>

        <div class="table-container">
            <div class="table-header">
                <h3><i class="fa-solid fa-user-group" style="margin-right: 8px;"></i> Registered Accounts</h3>
                <div class="search-wrapper">
                    <i class="fa-solid fa-magnifying-glass"></i>
                    <input type="text" id="searchInput" placeholder="Search users...">
                </div>
            </div>
            
            <div class="table-responsive">
                <table class="admin-table">
                    <thead>
                        <tr>
                            <th>User Info</th>
                            <th>Email Address</th>
                            <th>Role / Status</th>
                            <th style="text-align: right;">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="userTableBody">
                        <?php if (empty($users)): ?>
                            <tr>
                                <td colspan="4" class="empty-state">No users found.</td>
                            </tr>
                        <?php else: ?>
                            <?php foreach ($users as $user): 
                                $full_name = htmlspecialchars($user['first_name'] . ' ' . $user['last_name']);
                                $status_text = htmlspecialchars(ucfirst($user['role']));
                                $is_admin = $user['role'] === 'admin';
                            ?>
                                <tr 
                                    data-user-id="<?php echo $user['id']; ?>" 
                                    data-name="<?php echo $full_name; ?>"
                                    data-email="<?php echo htmlspecialchars($user['email']); ?>" 
                                    data-status="<?php echo $status_text; ?>"
                                >
                                    <td>
                                        <div class="item-primary-text"><?php echo $full_name; ?></div>
                                        <div class="item-secondary-text">ID: #<?php echo str_pad($user['id'], 4, '0', STR_PAD_LEFT); ?></div>
                                    </td>
                                    <td><?php echo htmlspecialchars($user['email']); ?></td>
                                    <td>
                                        <span class="badge <?php echo $is_admin ? 'admin' : 'user'; ?>">
                                            <?php echo $status_text; ?>
                                        </span>
                                    </td>
                                    <td>
                                        <div class="action-buttons" style="justify-content: flex-end;">
                                            <button class="action-btn view-btn" title="View Latest Report"><i class="fa-solid fa-file-invoice"></i></button>
                                            <button class="action-btn delete-btn" title="Delete User"><i class="fa-solid fa-trash-can"></i></button>
                                        </div>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </tbody>
                </table>
            </div>
        </div>
    </main>

    <div id="viewUserModal" class="modal" style="display:none;">
        <div class="modal-content">
            <button class="close-modal" data-close>&times;</button>
            <h3>User's Latest Report</h3>
            <div class="user-details" id="modal-user-details">
                </div>
            <div class="modal-actions justify-center">
                <button class="modal-btn confirm-btn" data-close>Close</button>
            </div>
        </div>
    </div>
    
    <div id="deleteUserModal" class="modal" style="display:none;">
         <div class="modal-content text-center">
            <button class="close-modal" data-close>&times;</button>
            <div class="danger-icon"><i class="fa-solid fa-triangle-exclamation"></i></div>
            <h3>Confirm Deletion</h3>
            <p class="modal-subtitle">Are you sure you want to delete <strong id="deleteUserName" style="color:var(--text-primary);">this user</strong>? This action will permanently remove them and all their associated reports.</p>
             <div class="modal-actions justify-center">
                <button class="modal-btn cancel-btn" data-close>Cancel</button>
                <button class="modal-btn confirm-btn danger-override" id="confirm-delete-btn">Yes, Delete</button>
            </div>
        </div>
    </div>

    <script src="users.js?v=<?php echo time(); ?>"></script>    
</body>
</html>