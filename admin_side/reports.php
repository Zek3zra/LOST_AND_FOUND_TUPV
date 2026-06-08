<?php 
include 'admin_auth.php'; 

// Fetch all items that are either approved or matched
$stmt = $pdo->prepare(
    "SELECT r.*, u.first_name, u.last_name 
     FROM item_reports r
     LEFT JOIN users u ON r.user_id = u.id
     WHERE r.report_status IN ('approved', 'matched') 
     ORDER BY r.created_at DESC"
);
$stmt->execute();
$all_items = $stmt->fetchAll(PDO::FETCH_ASSOC);
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>Retrieve TUPV | Manage Reports</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <link rel="stylesheet" href="reports.css" />
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
            <li><a href="users.php"><i class="fa-solid fa-users"></i> Manage Users</a></li>
            <li><a href="post-item.php"><i class="fa-solid fa-file-shield"></i> Pending Reports</a></li>
            <li><a href="reports.php" class="active"><i class="fa-solid fa-box-open"></i> Active Posts</a></li>
            <li style="margin-top: auto;"><a href="../logout.php" class="logout-link"><i class="fa-solid fa-arrow-right-from-bracket"></i> Log Out</a></li>
        </ul>
    </aside>

    <main class="main-content">
        <div class="page-header">
            <h2>Active Item Reports</h2>
            <p>Manage and track all approved and matched items across the campus.</p>
        </div>

        <div class="reports-controls">
            <div class="tab-buttons">
                <button class="tab-btn active" data-tab="all">All Items</button>
                <button class="tab-btn" data-tab="lost">Lost Items</button>
                <button class="tab-btn" data-tab="found">Found Items</button>
                <button class="tab-btn" data-tab="matches">Matches</button>
            </div>

            <div class="sorting-menu">
                <span class="sort-label"><i class="fa-solid fa-arrow-down-a-z"></i> Sort by:</span>
                <button class="sorting-btn active" data-sort="default">Recent</button>
                <button class="sorting-btn" data-sort="name">Name</button>
                <button class="sorting-btn" data-sort="date">Date</button>
            </div>
        </div>

        <div id="itemsContainer" class="items-grid">
            <?php if (empty($all_items)): ?>
                <div class="empty-state">
                    <i class="fa-solid fa-box-open" style="font-size: 3rem; margin-bottom: 16px; color: var(--border-light);"></i>
                    <p>No active items found.</p>
                </div>
            <?php else: ?>
                <?php foreach ($all_items as $item): ?>
                    <?php
                    // Basic variables
                    $report_id = $item['report_id'];
                    $user_id = $item['user_id'];
                    $full_description = htmlspecialchars($item['item_description']);
                    $location = htmlspecialchars($item['item_location']);
                    $item_name = htmlspecialchars($item['item_name_specific'] ?? $item['item_category']);
                    
                    // Logic for display status and card title
                    $display_status = htmlspecialchars(ucfirst($item['report_status']));
                    $card_title = htmlspecialchars(ucfirst($item['report_type']));
                    $data_category = htmlspecialchars($item['report_type']);

                    if ($item['report_status'] === 'matched') {
                        $display_status = 'Matched!';
                        $card_title = 'Matched!';
                        $data_category = 'matches'; 
                    }
                    
                    // Logic for reporter name
                    $reporter_name = 'Admin Post';
                    if (!empty($item['first_name'])) {
                        $reporter_name = htmlspecialchars($item['first_name'] . ' ' . $item['last_name']);
                    }
                    
                    // Logic for date and time
                    $date = ''; $time = '';
                    if (!empty($item['item_datetime'])) {
                        try {
                            $datetime = new DateTime($item['item_datetime']);
                            $date = $datetime->format('Y-m-d');
                            $time = $datetime->format('h:i A');
                        } catch (Exception $e) {}
                    }
                    
                    // Logic for image
                    $image = htmlspecialchars($item['image_path']);
                    $image_src = (!empty($image) && file_exists('../' . $image)) ? '../' . $image : 'https://placehold.co/300x200/f8fafc/94a3b8?text=No+Image';
                    ?>
                
                <div class="item-card" 
                     data-category="<?php echo $data_category; ?>" 
                     data-name="<?php echo $item_name; ?>" 
                     data-date="<?php echo $date; ?>"
                     data-report-id="<?php echo $report_id; ?>"
                     data-user-id="<?php echo $user_id; ?>"
                     data-status="<?php echo $display_status; ?>" 
                     data-time="<?php echo $time; ?>"
                     data-description="<?php echo $full_description; ?>"
                     data-image="<?php echo $image_src; ?>"
                     data-location="<?php echo $location; ?>"
                     data-reporter="<?php echo $reporter_name; ?>">

                    <div class="card-image-wrapper">
                        <img src="<?php echo $image_src; ?>" class="item-image" alt="<?php echo $item_name; ?>" />
                        <span class="badge position-absolute <?php echo strtolower($card_title) === 'matched!' ? 'matched' : strtolower($card_title); ?>"><?php echo $card_title; ?></span>
                    </div>
                    
                    <div class="card-body">
                        <div class="item-header">
                            <h3 class="item-title"><?php echo $item_name; ?></h3>
                            <div class="item-date"><i class="fa-regular fa-calendar"></i> <?php echo $date; ?></div>
                        </div>
                        <p class="item-desc"><?php echo substr($full_description, 0, 80) . (strlen($full_description) > 80 ? '...' : ''); ?></p>
                        
                        <div class="item-actions">
                            <button class="action-btn-text btn-details" title="See Details"><i class="fa-solid fa-circle-info"></i> Details</button>
                            
                            <?php if ($item['report_status'] === 'approved'): ?>
                                <?php if ($item['report_type'] === 'found'): ?>
                                    <button class="action-btn-text btn-mark success" data-action="mark-retrieved"><i class="fa-solid fa-check"></i> Mark Retrieved</button>
                                <?php else: // 'lost' ?>
                                    <button class="action-btn-text btn-mark success" data-action="mark-found"><i class="fa-solid fa-check"></i> Mark Found</button>
                                <?php endif; ?>
                                
                            <?php elseif ($item['report_status'] === 'matched'): ?>
                                <button class="action-btn-text disabled" disabled><i class="fa-solid fa-check-double"></i> Claimed</button>
                            <?php endif; ?>
                        </div>
                    </div>
                </div>
                <?php endforeach; ?>
            <?php endif; ?>
        </div>
    </main>

    <div id="viewDetailsModal" class="modal" style="display:none;">
        <div class="modal-content">
            <button class="close-modal" data-close>&times;</button>
            <h3>Report Details</h3>
            <div class="modal-summary">
                 <div class="summary-image-container">
                     <img id="modal-image" src="" alt="Item Image">
                 </div>
                 <div class="summary-details">
                    <p><strong>Status:</strong> <span class="badge" id="modal-status"></span></p>
                    <p><strong>Item Name:</strong> <span id="modal-item"></span></p>
                    <p><strong>Category:</strong> <span id="modal-category"></span></p>
                    <p><strong>Location:</strong> <span id="modal-location"></span></p>
                    <p><strong>Date:</strong> <span id="modal-date"></span></p>
                    <p><strong>Time:</strong> <span id="modal-time"></span></p>
                    <p><strong>Reporter:</strong> <span id="modal-reporter"></span></p>
                    <div style="margin-top: 12px;">
                        <strong>Description:</strong>
                        <p id="modal-description" style="margin-top: 4px; background: var(--bg-body); padding: 12px; border-radius: 8px; border: 1px solid var(--border-light);"></p>
                    </div>
                 </div>
            </div>
            <div class="modal-actions justify-center">
                <button class="modal-btn confirm-btn" data-close>Close</button>
            </div>
        </div>
    </div>

    <script src="reports.js?v=<?php echo time(); ?>"></script>
</body>
</html>