<?php
include 'admin_auth.php';

// Fetch statistics
$totalStmt = $pdo->query("SELECT COUNT(*) FROM item_reports WHERE report_status = 'approved'");
$totalItems = $totalStmt->fetchColumn();
$lostStmt = $pdo->query("SELECT COUNT(*) FROM item_reports WHERE report_status = 'approved' AND report_type = 'lost'");
$totalLost = $lostStmt->fetchColumn();
$foundStmt = $pdo->query("SELECT COUNT(*) FROM item_reports WHERE report_status = 'approved' AND report_type = 'found'");
$totalFound = $foundStmt->fetchColumn();
$matchedStmt = $pdo->query("SELECT COUNT(*) FROM item_reports WHERE report_status = 'matched'"); // Use 'matched' status
$totalMatched = $matchedStmt->fetchColumn();
$pendingStmt = $pdo->query("SELECT COUNT(*) FROM item_reports WHERE report_status = 'pending'");
$totalPending = $pendingStmt->fetchColumn();

$totalNeverClaimed = $totalItems - $totalMatched;

// Fetch 5 Recent Approved Posts
$recentStmt = $pdo->prepare(
    "SELECT report_id, report_type, item_category, item_name_specific, item_description, image_path, item_location, item_datetime 
     FROM item_reports
     WHERE report_status = 'approved' 
     ORDER BY created_at DESC 
     LIMIT 5"
);
$recentStmt->execute();
$recentPosts = $recentStmt->fetchAll(PDO::FETCH_ASSOC);
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Retrieve TUPV | Admin Dashboard</title>
    
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <link rel="stylesheet" href="overview.css"> </head>
<body>

    <header class="admin-header">
        <div class="header-left">
            <button class="hamburger" id="hamburger"><i class="fa-solid fa-bars"></i></button>
            <div class="header-title">Retrieve TUPV Admin</div>
        </div>
        <div class="admin-profile">
            <span><?php echo htmlspecialchars($_SESSION['user_name']); ?></span>
            <div class="admin-avatar"><i class="fa-solid fa-user-shield"></i></div>
        </div>
    </header>

    <aside class="admin-sidebar" id="sidebar">
        <ul class="nav-links">
            <li><a href="overview.php" class="active"><i class="fa-solid fa-chart-line"></i> Dashboard</a></li>
            <li><a href="users.php"><i class="fa-solid fa-users"></i> Manage Users</a></li>
            <li><a href="post-item.php"><i class="fa-solid fa-file-shield"></i> Pending Reports</a></li>
            <li><a href="reports.php"><i class="fa-solid fa-box-open"></i> Active Posts</a></li>
            <li style="margin-top: auto;"><a href="../logout.php" class="logout-link"><i class="fa-solid fa-arrow-right-from-bracket"></i> Log Out</a></li>
        </ul>
    </aside>

    <main class="main-content">
        <div class="page-header">
            <h2>Dashboard Overview</h2>
            <p>Welcome back! Here's a snapshot of the TUPV Retrieve system.</p>
        </div>

        <div class="dashboard-stats">
            <div class="stat-card">
                <div class="stat-icon total"><i class="fa-solid fa-clipboard-list"></i></div>
                <div class="stat-info"><h3>Active Reports</h3><p><?php echo $totalItems; ?></p></div>
            </div>
            <div class="stat-card">
                <div class="stat-icon lost"><i class="fa-solid fa-triangle-exclamation"></i></div>
                <div class="stat-info"><h3>Lost Items</h3><p><?php echo $totalLost; ?></p></div>
            </div>
            <div class="stat-card">
                <div class="stat-icon found"><i class="fa-solid fa-hand-holding-heart"></i></div>
                <div class="stat-info"><h3>Found Items</h3><p><?php echo $totalFound; ?></p></div>
            </div>
            <div class="stat-card">
                <div class="stat-icon matched"><i class="fa-solid fa-check-double"></i></div>
                <div class="stat-info"><h3>Items Reclaimed</h3><p><?php echo $totalMatched; ?></p></div>
            </div>
        </div>

        <div class="table-container">
            <div class="table-header">
                <h3>Recently Approved Reports</h3>
                <a href="reports.php" style="color: var(--primary-blue); font-size: 0.9rem; font-weight: 600; text-decoration: none;">View All &rarr;</a>
            </div>
            <div style="overflow-x: auto;">
                <table class="admin-table">
                    <thead>
                        <tr>
                            <th>Image</th>
                            <th>Type</th>
                            <th>Item Details</th>
                            <th>Location</th>
                            <th>Reported On</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php if (empty($recentPosts)): ?>
                            <tr><td colspan="6" style="text-align: center; color: var(--text-secondary); padding: 40px;">No recent approved posts found.</td></tr>
                        <?php else: ?>
                            <?php foreach ($recentPosts as $post): ?>
                                <tr>
                                    <td>
                                        <?php if (!empty($post['image_path'])): ?>
                                            <img src="../<?php echo htmlspecialchars($post['image_path']); ?>" alt="Item" class="table-img">
                                        <?php else: ?>
                                            <div class="table-img" style="display:flex; justify-content:center; align-items:center; color:#94a3b8; font-size:0.8rem;">N/A</div>
                                        <?php endif; ?>
                                    </td>
                                    <td><span class="badge <?php echo strtolower($post['report_type']); ?>"><?php echo htmlspecialchars($post['report_type']); ?></span></td>
                                    <td>
                                        <div style="font-weight: 600;"><?php echo htmlspecialchars($post['item_name_specific'] ?: $post['item_category']); ?></div>
                                        <div style="font-size: 0.8rem; color: var(--text-secondary);"><?php echo htmlspecialchars($post['item_category']); ?></div>
                                    </td>
                                    <td><?php echo htmlspecialchars($post['item_location']); ?></td>
                                    <td><?php echo (new DateTime($post['item_datetime']))->format('M d, Y h:i A'); ?></td>
                                    <td>
                                        <div class="action-buttons">
                                            <button class="action-btn view-btn" title="View Details" onclick='viewDetails(<?php echo json_encode($post); ?>)'><i class="fa-solid fa-eye"></i></button>
                                            <button class="action-btn delete-btn" title="Archive Post" onclick='confirmDelete(<?php echo htmlspecialchars($post['report_id']); ?>)'><i class="fa-solid fa-trash-can"></i></button>
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

    <div id="viewDetailsModal" class="modal-overlay">
         <div class="modal-content">
            <button class="close-modal" data-close>&times;</button>
            <h3>Report Details</h3>
            <div style="margin-bottom: 24px;">
                <p style="margin-bottom: 8px;"><strong>Status:</strong> <span class="badge" id="modal-status" style="margin-left:8px;"></span></p>
                <p style="margin-bottom: 8px;"><strong>Item:</strong> <span id="modal-item"></span></p>
                <p style="margin-bottom: 8px;"><strong>Category:</strong> <span id="modal-category"></span></p>
                <p style="margin-bottom: 8px;"><strong>Location:</strong> <span id="modal-location"></span></p>
                <p style="margin-bottom: 8px;"><strong>Date & Time:</strong> <span id="modal-datetime"></span></p>
                <p style="margin-bottom: 8px;"><strong>Description:</strong></p>
                <p id="modal-description" style="background: var(--bg-body); padding: 12px; border-radius: 8px; border: 1px solid var(--border-light); font-size: 0.95rem; color: var(--text-secondary); line-height: 1.5;"></p>
             </div>
            <div class="modal-actions">
                <button class="modal-btn confirm-btn" data-close>Close</button>
            </div>
        </div>
    </div>
    
    <div id="deleteConfirmationModal" class="modal-overlay">
         <div class="modal-content" style="text-align: center;">
            <button class="close-modal" data-close>&times;</button>
            <div style="font-size: 3rem; color: var(--danger-red); margin-bottom: 16px;"><i class="fa-solid fa-triangle-exclamation"></i></div>
            <h3>Confirm Deletion</h3>
            <p style="color: var(--text-secondary); margin-bottom: 24px;">Are you sure you want to archive this post? It will be removed from the public feed.</p>
             <div class="modal-actions" style="justify-content: center;">
                <button class="modal-btn cancel-btn" data-close>Cancel</button>
                <button class="modal-btn delete-btn" id="confirm-delete-btn">Yes, Archive</button>
            </div>
        </div>
    </div>

    <script src="overview.js"></script>
</body>
</html>