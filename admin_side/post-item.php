<?php 
include 'admin_auth.php'; 

// Fetch pending user submissions for the top table
$stmt = $pdo->prepare(
    "SELECT r.*, u.first_name, u.last_name, u.email 
     FROM item_reports r
     LEFT JOIN users u ON r.user_id = u.id
     WHERE r.report_status = 'pending' 
     ORDER BY r.created_at ASC"
);
$stmt->execute();
$pending_reports = $stmt->fetchAll(PDO::FETCH_ASSOC);
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Retrieve TUPV | Post & Pending Items</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <link rel="stylesheet" href="post-item.css">
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
            <li><a href="post-item.php" class="active"><i class="fa-solid fa-file-shield"></i> Post & Pending</a></li>
            <li><a href="reports.php"><i class="fa-solid fa-box-open"></i> Active Posts</a></li>
            <li style="margin-top: auto;"><a href="../logout.php" class="logout-link"><i class="fa-solid fa-arrow-right-from-bracket"></i> Log Out</a></li>
        </ul>
    </aside>

    <main class="main-content">
        <div class="page-header">
            <h2>Manage Items & Submissions</h2>
            <p>Review pending item reports from TUPV students or create new admin posts.</p>
        </div>

        <div class="table-container" style="margin-bottom: 40px;">
            <div class="container-header" style="display: flex; justify-content: space-between; align-items: center;">
                <h3><i class="fa-solid fa-list-check"></i> Pending User Submissions</h3>
                <span class="badge pending"><?php echo count($pending_reports); ?> Pending</span>
            </div>
            
            <div class="table-responsive">
                <table class="admin-table">
                    <thead>
                        <tr>
                            <th style="width: 40px;"><input type="checkbox" id="selectAllCheckbox" style="cursor: pointer;"></th>
                            <th style="width: 70px;">Image</th>
                            <th>Status</th>
                            <th>Item Details</th>
                            <th>Reporter</th>
                            <th>Submitted</th>
                            <th style="text-align: right;">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="reportsTableBody">
                        <?php if (empty($pending_reports)): ?>
                            <tr>
                                <td colspan="7" class="empty-state">
                                    <i class="fa-solid fa-check-double" style="font-size: 2rem; color: var(--success-green); margin-bottom: 12px; display: block;"></i>
                                    You're all caught up! No pending reports to review.
                                </td>
                            </tr>
                        <?php else: ?>
                            <?php foreach ($pending_reports as $report): ?>
                                <?php
                                    $reportId = $report['report_id'];
                                    $type = htmlspecialchars($report['report_type']);
                                    $category = htmlspecialchars($report['item_category']);
                                    $itemName = htmlspecialchars($report['item_name_specific'] ?? '');
                                    $desc = htmlspecialchars($report['item_description']);
                                    $location = htmlspecialchars($report['item_location']);
                                    $reporterName = htmlspecialchars(($report['first_name'] ?? '') . ' ' . ($report['last_name'] ?? ''));
                                    $reporterEmail = htmlspecialchars($report['email'] ?? '');
                                    $imagePath = htmlspecialchars($report['image_path'] ?? '');
                                    
                                    $dateStr = ''; $timeStr = '';
                                    if(!empty($report['item_datetime'])) {
                                        try {
                                            $dt = new DateTime($report['item_datetime']);
                                            $dateStr = $dt->format('Y-m-d');
                                            $timeStr = $dt->format('H:i');
                                        } catch(Exception $e){}
                                    }
                                ?>
                                <tr data-report-id="<?php echo $reportId; ?>"
                                    data-report-type="<?php echo $type; ?>"
                                    data-item-category="<?php echo $category; ?>"
                                    data-item-name-specific="<?php echo $itemName; ?>"
                                    data-item-description="<?php echo $desc; ?>"
                                    data-item-location="<?php echo $location; ?>"
                                    data-item-date="<?php echo $dateStr; ?>"
                                    data-item-time="<?php echo $timeStr; ?>"
                                    data-user-name="<?php echo $reporterName; ?>"
                                    data-user-email="<?php echo $reporterEmail; ?>"
                                    data-image-path="<?php echo $imagePath; ?>">
                                    
                                    <td><input type="checkbox" class="report-checkbox" value="<?php echo $reportId; ?>" style="cursor: pointer;"></td>
                                    <td>
                                        <?php if (!empty($imagePath)): ?>
                                            <img src="../<?php echo $imagePath; ?>" style="width: 48px; height: 48px; border-radius: 8px; object-fit: cover;" alt="Item">
                                        <?php else: ?>
                                            <div style="width: 48px; height: 48px; border-radius: 8px; background: var(--bg-body); display:flex; justify-content:center; align-items:center; color: var(--text-secondary); font-size: 0.7rem;">N/A</div>
                                        <?php endif; ?>
                                    </td>
                                    <td><span class="badge <?php echo strtolower($type); ?>"><?php echo ucfirst($type); ?></span></td>
                                    <td>
                                        <div class="item-primary-text"><?php echo $itemName ?: ucfirst($category); ?></div>
                                        <div class="item-secondary-text"><?php echo ucfirst($category); ?></div>
                                    </td>
                                    <td>
                                        <div class="item-primary-text"><?php echo $reporterName ?: 'Anonymous'; ?></div>
                                        <div class="item-secondary-text" style="font-size: 0.75rem;"><?php echo date('M d, Y', strtotime($report['created_at'])); ?></div>
                                    </td>
                                    <td><?php echo date('M d, Y h:i A', strtotime($report['created_at'])); ?></td>
                                    <td>
                                        <div class="action-buttons" style="justify-content: flex-end;">
                                            <button class="action-btn view-request-btn" title="Review & Publish"><i class="fa-solid fa-magnifying-glass"></i></button>
                                            <button class="action-btn delete-request-btn" title="Reject"><i class="fa-solid fa-xmark"></i></button>
                                        </div>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </tbody>
                </table>
            </div>
            
            <div class="batch-actions">
                <button id="batchPublishBtn" class="batch-btn success"><i class="fa-solid fa-check-double"></i> Publish Selected</button>
                <button id="batchRejectBtn" class="batch-btn danger"><i class="fa-solid fa-trash-can"></i> Reject Selected</button>
            </div>
        </div>

        <div class="form-container">
            <div class="container-header">
                <h3><i class="fa-solid fa-pen-to-square"></i> Create Admin Post</h3>
            </div>
            <form id="reportForm" class="admin-form" enctype="multipart/form-data">
                <input type="hidden" id="reportId" name="report_id">
                <input type="hidden" id="existingImagePath" name="existing_image_path">
                
                <div class="status-buttons">
                    <button type="button" id="lostItemBtn" class="status-button active" data-status="Lost">Lost Item</button>
                    <button type="button" id="foundItemBtn" class="status-button" data-status="Found">Found Item</button>
                </div>
                <input type="hidden" id="reportType" name="report_type" value="lost">

                <div class="content-grid">
                    <div class="side-details">
                        <div class="form-group">
                            <label>Item Image</label>
                            <div id="photo-uploader" class="photo-uploader">
                                <i class="fa-solid fa-cloud-arrow-up" style="font-size: 1.5rem;"></i>
                                <span>Upload Image</span>
                            </div>
                            <input type="file" id="photo-input" name="image" accept="image/*" style="display:none;">
                        </div>
                    </div>

                    <div class="main-details" style="display: flex; flex-direction: column; gap: 16px;">
                        <div class="form-group">
                            <label>Category</label>
                            <div class="select-wrapper">
                                <select id="category-select" name="item_category" required>
                                    <option value="" disabled selected>Select category...</option>
                                    <option value="electronics">Electronics & Gadgets</option>
                                    <option value="wallets">Wallets & IDs</option>
                                    <option value="keys">Keys</option>
                                    <option value="documents">Documents & Books</option>
                                    <option value="clothing">Clothing & Accessories</option>
                                    <option value="others">Others</option>
                                </select>
                            </div>
                        </div>

                        <div class="form-group">
                            <label>Specific Item Name</label>
                            <input type="text" id="itemName" name="item_name_specific" placeholder="e.g., iPhone 13 Pro Max, Blue TUP ID" required>
                        </div>

                        <div class="form-group">
                            <label>Location</label>
                            <input type="text" id="location" name="item_location" placeholder="e.g., Library 2nd Floor, CEA Building" required>
                        </div>

                        <div class="form-row-split">
                            <div class="form-group">
                                <label>Date</label>
                                <input type="date" id="date" name="item_date" required>
                            </div>
                            <div class="form-group">
                                <label>Time (Optional)</label>
                                <input type="time" id="time" name="item_time">
                            </div>
                        </div>

                        <div class="form-group">
                            <label>Description</label>
                            <textarea id="description" name="item_description" placeholder="Provide distinct features, colors, brands, etc." required></textarea>
                        </div>

                        <button type="submit" id="submitReport" class="submit-button" style="margin-top: 8px;">Publish Post</button>
                    </div>
                </div>
            </form>
        </div>

    </main>

    <div id="publishModal" class="modal">
        <div class="modal-content publish-modal-content">
            <button class="close-modal" data-close>&times;</button>
            <h3 style="text-align: left; margin-bottom: 16px;">Review & Publish</h3>
            
            <form id="publishForm">
                <input type="hidden" name="report_id" id="publishReportId">
                <input type="hidden" name="report_type" id="publishReportType">
                <input type="hidden" name="existing_image_path" id="publishExistingImage">
                
                <div class="submission-meta">
                    <div style="display: flex; justify-content: space-between;">
                        <span><i class="fa-solid fa-user"></i> <strong id="publishUserName"></strong></span>
                        <span id="publishStatusText" class="badge"></span>
                    </div>
                    <div><i class="fa-solid fa-envelope"></i> <span id="publishUserEmail"></span></div>
                </div>

                <div class="form-group" style="margin-bottom: 16px;">
                    <label>Image Provided</label>
                    <div id="publishImagePreview" class="image-preview-box"></div>
                </div>

                <div class="form-row-split" style="margin-bottom: 16px;">
                    <div class="form-group">
                        <label>Category</label>
                        <div class="select-wrapper">
                            <select id="publishCategory" name="item_category" required>
                                <option value="electronics">Electronics & Gadgets</option>
                                <option value="wallets">Wallets & IDs</option>
                                <option value="keys">Keys</option>
                                <option value="documents">Documents & Books</option>
                                <option value="clothing">Clothing & Accessories</option>
                                <option value="others">Others</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Item Name</label>
                        <input type="text" id="publishItemName" name="item_name_specific" required>
                    </div>
                </div>

                <div class="form-row-split" style="margin-bottom: 16px;">
                    <div class="form-group">
                        <label>Date Lost/Found</label>
                        <input type="date" id="publishDate" name="item_date" required>
                    </div>
                    <div class="form-group">
                        <label>Location</label>
                        <input type="text" id="publishLocation" name="item_location" required>
                    </div>
                </div>

                <div class="form-group" style="margin-bottom: 24px;">
                    <label>Description (Edit if necessary to remove sensitive info)</label>
                    <textarea id="publishDescription" name="item_description" required></textarea>
                </div>

                <div class="modal-actions">
                    <button type="button" class="modal-btn cancel-btn" id="publishCancelBtn">Cancel Review</button>
                    <button type="submit" class="modal-btn confirm-btn success-override" id="publishConfirmBtn">Approve & Publish</button>
                </div>
            </form>
        </div>
    </div>

    <div id="successModal" class="modal">
        <div class="modal-content text-center">
            <i class="fa-solid fa-circle-check success-icon"></i>
            <h3 id="success-title">Success!</h3>
            <p id="success-message" class="modal-subtitle">Action completed successfully.</p>
            <div class="modal-actions justify-center">
                <button class="modal-btn confirm-btn success-override" id="successOkBtn">Continue</button>
            </div>
        </div>
    </div>

    <script src="post-item.js?v=<?php echo time(); ?>"></script>
</body>
</html>