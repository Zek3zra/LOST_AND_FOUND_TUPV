<?php
session_start();

// If the user is not logged in, redirect to the login page
if (!isset($_SESSION['user_id'])) {
    header("Location: login.html");
    exit;
}

// Get user data from session variables set by your login.php
$user_name = htmlspecialchars($_SESSION['user_name'] ?? 'Username');
$user_email = htmlspecialchars($_SESSION['user_email'] ?? 'user@example.com');
$user_pfp = $_SESSION['user_pfp'] ?? null;  
?>

<?php
// 1. Include your database connection
include 'db_connect.php'; 

// 2. Get the user ID from the session
$user_id = $_SESSION['user_id'];

// 3. Fetch all notifications for this user, newest first
$notif_stmt = $pdo->prepare(
    "SELECT * FROM notifications 
     WHERE user_id = ? 
     ORDER BY created_at DESC"
);
$notif_stmt->execute([$user_id]);
$notifications = $notif_stmt->fetchAll(PDO::FETCH_ASSOC);

// 4. Get a count of *unread* notifications
$unread_count = 0;
foreach ($notifications as $notif) {
    if (!$notif['is_read']) {
        $unread_count++;
    }
}

// 5. Fetch additional user details for the profile display
$user_stmt = $pdo->prepare("SELECT first_name, last_name, contact_number, course_section, address FROM users WHERE id = ?");
$user_stmt->execute([$user_id]);
$user_data = $user_stmt->fetch(PDO::FETCH_ASSOC);

$first_name = htmlspecialchars($user_data['first_name'] ?? '');
$last_name = htmlspecialchars($user_data['last_name'] ?? '');
$contact = htmlspecialchars($user_data['contact_number'] ?? 'Not provided');
$section = htmlspecialchars($user_data['course_section'] ?? 'Not provided');
$address = htmlspecialchars($user_data['address'] ?? 'Not provided');
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>RETRIEVE | TUPV Profile</title>
    
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap" rel="stylesheet">
    
    <link rel="stylesheet" href="landing.css"> 
    <link rel="stylesheet" href="header.css">
    <link rel="stylesheet" href="footer.css">
    <link rel="stylesheet" href="homepage.css">
    <link rel="stylesheet" href="profile.css?v=<?php echo time(); ?>">
</head>
<body>

    <header class="main-header">
        <nav class="main-nav">
            <div class="logoContainer">
                <a href="landing.html" class="logoLink"> 
                    <img src="images/logo.png" alt="TUPV Retrieve Logo" class="logoImg">
                    <div class="headerText">
                        <span class="universityName">Retrieve TUPV</span>
                        <span class="universityMotto" id="current-date-time">Loading date...</span>
                    </div>
                </a>
            </div>
            
            <div class="navigationItems">
                <div class="navItem"><a href="homepage.php">Home</a></div>
                <div class="navItem"><a href="#" id="about-link">About</a></div>
                <div class="navItem"><a href="#" id="contact-link">Contact</a></div>
            </div>
        </nav>
    </header>
    
    <div class="page-wrapper">
        <aside class="sidebar collapsed" id="desktop-sidebar">
            <button class="sidebar-toggle" id="sidebar-toggle">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
            </button>
            <nav class="sidebar-nav">
                <a href="homepage.php">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="sidebar-icon"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                    <span>Dashboard</span>
                </a>
                <a href="reportlost.php">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="sidebar-icon"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
                    <span>Report Lost Item</span>
                </a>
                <a href="reportfound.php">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="sidebar-icon"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
                    <span>Report Found Item</span>
                </a>
                <a href="profile.php" class="active">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="sidebar-icon"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                    <span>Profile</span>
                </a>
            </nav>
        </aside>

        <div class="app-container" id="app-container">
            
            <nav class="mobile-nav">
                 <a href="reportlost.php" class="nav-icon" title="Lost Items">
                    <img src="images/reportlost.png" alt="Lost Items">
                </a>
                <a href="reportfound.php" class="nav-icon" title="Found Items">
                     <img src="images/reportfound.png" alt="Found Items">
                </a>
                <a href="homepage.php" class="nav-icon" title="Home">
                    <img src="images/home.png" alt="Home">
                </a>
                <a href="profile.php" class="nav-icon active" title="Profile">
                    <img src="images/user.png" alt="Profile">
                </a>
            </nav>

            <div class="main-content">
                <div class="profile-container">
                    
                    <div class="profile-tabs">
                        <button class="tab-btn active" data-tab="profile">Account Settings</button>
                        <button class="tab-btn" data-tab="notifications">
                            Notifications 
                            <?php if ($unread_count > 0): ?>
                                <span class="notif-badge"><?php echo $unread_count; ?></span>
                            <?php endif; ?>
                        </button>
                    </div>

                    <div class="tab-content active" id="profile-tab">
                        <div class="profile-header-card">
                            <div class="profile-picture" id="profile-picture-container" title="Change profile picture">
                                <?php if ($user_pfp): ?>
                                    <img src="<?php echo htmlspecialchars($user_pfp); ?>" alt="Profile Picture">
                                <?php else: ?>
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                                <?php endif; ?>
                            </div>
                            <input type="file" id="pfp-input" name="pfp" accept="image/*" style="display: none;">
                            
                            <div class="profile-header-info">
                                <span class="username"><?php echo $user_name; ?></span>
                                <div class="user-email-card">
                                    <span><?php echo $user_email; ?></span>
                                </div>
                                
                                <div class="user-details-card">
                                    <p><strong>Section:</strong> <?php echo $section; ?></p>
                                    <p><strong>Contact:</strong> <?php echo $contact; ?></p>
                                    <p><strong>Address:</strong> <?php echo $address; ?></p>
                                </div>

                                <div class="action-buttons">
                                    <button class="action-btn" id="contact-admin-btn">Contact Administrator</button>
                                    <button class="action-btn" id="edit-profile-btn">Edit Profile</button>
                                    <button class="action-btn" id="change-password-btn">Change Password</button>
                                    <a href="logout.php" class="action-btn" id="logout-btn">Log Out</a>
                                    <button class="action-btn" id="delete-account-btn">Delete Account</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="tab-content" id="notifications-tab">
                        <div class="notifications-list">
                            <?php if (empty($notifications)): ?>
                                <div class="no-notifs">
                                    <p>You have no notifications yet.</p>
                                </div>
                            <?php else: ?>
                                <?php foreach ($notifications as $notif): ?>
                                   <div class="notification-item <?php echo $notif['is_read'] ? 'read' : 'unread'; ?>" data-notif-id="<?php echo $notif['notification_id']; ?>">
                                        <div class="notif-icon">
                                            <?php if ($notif['is_read']): ?>
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"></path></svg>
                                            <?php else: ?>
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                                            <?php endif; ?>
                                        </div>
                                        <div class="notif-content">
                                            <p><?php echo htmlspecialchars($notif['message']); ?></p>
                                            <span class="notif-date"><?php echo date('F j, Y, g:i a', strtotime($notif['created_at'])); ?></span>
                                        </div>
                                    </div>
                                <?php endforeach; ?>
                            <?php endif; ?>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
            
    <footer>
        <div class="footer-row">
            <div class="footer-col">
                <h3 class="foot_logo_text">Retrieve | TUP Visayas</h3>
                <p>Your trusted campus partner in finding what's lost. We create a community of trust and support for all TUPV students and faculty.</p>
            </div>
            
            <div class="footer-col">
                <h3>Quick Links</h3>
                <ul>
                    <li><a id="footer-about-link">About Us</a></li>
                    <li><a id="footer-how-it-works-link">How It Works</a></li>
                    <li><a id="footer-faq-link">FAQ</a></li>
                </ul>
            </div>
            
            <div class="footer-col">
                <h3>Contact & Legal</h3>
                <ul>
                    <li><a id="footer-contact-link">Contact Us</a></li>
                    <li><a id="footer-privacy-link">Privacy Policy</a></li>
                    <li><a id="footer-terms-link">Terms of Service</a></li>
                </ul>
            </div>

            <div class="footer-col">
                <h3>Stay Connected</h3>
                <p>Follow us on social media for system updates and important TUPV announcements.</p>
                <div class="social-icons">
                    <a href="https://www.facebook.com/" target="_blank"><i class="fa-brands fa-facebook-f"></i></a>
                    <a href="https://x.com/" target="_blank"><i class="fa-brands fa-twitter"></i></a>
                    <a href="https://www.instagram.com/" target="_blank"><i class="fa-brands fa-instagram"></i></a>
                </div>
            </div>
        </div>
        <hr>
        <p class="copyright">&copy; 2025 Retrieve. All rights reserved. | Technological University of the Philippines Visayas</p>
    </footer>
    
    <div id="about-modal" class="modal-overlay">
        <div class="modal-content">
            <button class="close-modal">&times;</button>
            <h2>About Retrieve TUPV</h2>
            <p>Retrieve is a modern solution specifically built for the Technological University of the Philippines Visayas campus. Our platform connects people who have lost items with those who have found them, fostering a community of trust.</p>
        </div>
    </div>

    <div id="how-it-works-modal" class="modal-overlay">
        <div class="modal-content">
            <button class="close-modal">&times;</button>
            <h2>How It Works</h2>
            <p>Post details about your lost or found item securely. Our system catalogues the entry, and you can wait for TUPV administrative approval to finalize the match safely and transparently.</p>
        </div>
    </div>

    <div id="faq-modal" class="modal-overlay">
        <div class="modal-content">
            <button class="close-modal">&times;</button>
            <h2>Frequently Asked Questions</h2>
            <div class="faq-item">
                <h4>How do I report an item on campus?</h4>
                <p>Click on the "Report Lost Item" or "Report Found Item" button on your dashboard to securely fill out the necessary details.</p>
            </div>
            <div class="faq-item">
                <h4>What happens after I submit a report?</h4>
                <p>Your report is sent to a TUPV administrator for review. Once verified, it will be visible on the public feed to help facilitate a match.</p>
            </div>
        </div>
    </div>

    <div id="footer-contact-modal" class="modal-overlay">
        <div class="modal-content">
            <button class="close-modal">&times;</button>
            <h2>Contact TUPV Admin</h2>
            <p><strong>Email:</strong> support@retrieve.tupv.edu.ph</p>
            <p><strong>Phone:</strong> +63 994 300 8493</p>
        </div>
    </div>

    <div id="privacy-modal" class="modal-overlay">
        <div class="modal-content">
            <button class="close-modal">&times;</button>
            <h2>Privacy Policy</h2>
            <p>Your privacy is important to us. We only collect personal information when we truly need it to provide a service to you, collecting it by fair and lawful means.</p>
            <p>We do not share any personally identifying information publicly or with third-parties, except when required to by law or to facilitate a secure item return on campus.</p>
        </div>
    </div>

    <div id="terms-modal" class="modal-overlay">
        <div class="modal-content">
            <button class="close-modal">&times;</button>
            <h2>Terms of Service</h2>
            <p>By accessing this website, you are agreeing to be bound by these terms of service and agree that you are responsible for compliance with TUPV rules and local laws.</p>
            <p>You may not use the materials for any commercial purpose, or attempt to reverse engineer any software contained on the platform.</p>
        </div>
    </div>
    
    <div id="contact-admin-modal" class="modal-overlay">
        <div class="modal-content">
            <button class="close-modal">&times;</button>
            <h2>Contact Administrator</h2>
            <p>For urgent support regarding an item or your account, reach out to TUPV Admin:</p>
            <p><strong>Email:</strong> admin@retrieve.tupv.edu.ph</p>
            <p><strong>Phone:</strong> +63 994 300 8493</p>
        </div>
    </div>

    <div id="edit-profile-modal" class="modal-overlay">
        <div class="modal-content">
            <button class="close-modal">&times;</button>
            <h2>Edit Profile</h2>
            <form class="modal-form" action="edit_profile_action.php" method="POST">
                <div class="form-group">
                    <label>First Name</label>
                    <input type="text" name="first_name" class="form-input" value="<?php echo $first_name; ?>" required>
                </div>
                <div class="form-group">
                    <label>Last Name</label>
                    <input type="text" name="last_name" class="form-input" value="<?php echo $last_name; ?>" required>
                </div>
                <div class="form-group">
                    <label>Contact Number</label>
                    <input type="text" name="contact_number" class="form-input" value="<?php echo $contact !== 'Not provided' ? $contact : ''; ?>" required>
                </div>
                <div class="form-group">
                    <label>Course & Section</label>
                    <input type="text" name="course_section" class="form-input" value="<?php echo $section !== 'Not provided' ? $section : ''; ?>" required>
                </div>
                <div class="form-group">
                    <label>Address</label>
                    <input type="text" name="address" class="form-input" value="<?php echo $address !== 'Not provided' ? $address : ''; ?>" required>
                </div>
                <div class="modal-actions">
                    <button type="button" class="modal-btn cancel-btn form-cancel-btn">Cancel</button>
                    <button type="submit" class="modal-btn save-btn">Save Changes</button>
                </div>
            </form>
        </div>
    </div>

    <div id="change-password-modal" class="modal-overlay">
        <div class="modal-content">
            <button class="close-modal">&times;</button>
            <h2>Change Password</h2>
            <form class="modal-form" action="change_password_action.php" method="POST">
                <div class="form-group">
                    <label>Current Password</label>
                    <input type="password" name="current_password" class="form-input" required>
                </div>
                <div class="form-group">
                    <label>New Password</label>
                    <input type="password" name="new_password" class="form-input" required>
                </div>
                <div class="form-group">
                    <label>Confirm New Password</label>
                    <input type="password" name="confirm_password" class="form-input" required>
                </div>
                <div class="modal-actions">
                    <button type="button" class="modal-btn cancel-btn form-cancel-btn">Cancel</button>
                    <button type="submit" class="modal-btn save-btn">Update Password</button>
                </div>
            </form>
        </div>
    </div>

    <div id="delete-account-modal" class="modal-overlay">
        <div class="modal-content">
            <button class="close-modal">&times;</button>
            <h2>Delete Account</h2>
            <p>Are you sure you want to delete your TUPV Retrieve account? This action is permanent and will remove all your active reports.</p>
            <div class="modal-actions">
                <button id="cancel-delete-btn" class="modal-btn cancel-btn">Cancel</button>
                <button id="confirm-delete-btn" class="modal-btn delete-btn">Yes, Delete Account</button>
            </div>
            <div id="delete-error-msg" style="color: #ef4444; font-size: 0.9em; margin-top: 12px; text-align: center;"></div>
        </div>
    </div>

    <script>
      // --- Standard Date/Time Script ---
    function updateDateTime() {
        const dateTimeElement = document.getElementById('current-date-time');
        if(dateTimeElement) {
            const now = new Date();
            const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
            dateTimeElement.textContent = now.toLocaleDateString('en-US', options);
        }
    }
    setInterval(updateDateTime, 1000);
    updateDateTime();

    // --- MODAL SCRIPT (HEADER & FOOTER) ---
    const modals = {
        'about-link': 'about-modal',
        'footer-about-link': 'about-modal',
        'footer-how-it-works-link': 'how-it-works-modal',
        'footer-faq-link': 'faq-modal',
        'contact-link': 'footer-contact-modal',
        'footer-contact-link': 'footer-contact-modal',
        'footer-privacy-link': 'privacy-modal',
        'footer-terms-link': 'terms-modal',
        'contact-admin-btn': 'contact-admin-modal',
        'delete-account-btn': 'delete-account-modal',
        'edit-profile-btn': 'edit-profile-modal',
        'change-password-btn': 'change-password-modal'
    };

    Object.keys(modals).forEach(linkId => {
        const linkElement = document.getElementById(linkId);
        if(linkElement) {
            linkElement.addEventListener('click', (e) => {
                e.preventDefault();
                document.getElementById(modals[linkId]).classList.add('show');
            });
        }
    });

    // --- Helper function to close modal and reset form ---
    function closeModal(modal) {
        if (!modal) return;
        modal.classList.remove('show');
        // If the modal has a form inside it, reset it to its original database values
        const form = modal.querySelector('form');
        if (form) {
            form.reset();
        }
    }

    document.querySelectorAll('.close-modal').forEach(button => {
        button.addEventListener('click', function() {
            closeModal(this.closest('.modal-overlay'));
        });
    });

    document.querySelectorAll('.form-cancel-btn').forEach(button => {
        button.addEventListener('click', function() {
            closeModal(this.closest('.modal-overlay'));
        });
    });

    window.addEventListener('click', (event) => {
        if (event.target.classList.contains('modal-overlay')) {
            closeModal(event.target);
        }
    });

    const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
    if(cancelDeleteBtn) {
        cancelDeleteBtn.addEventListener('click', () => {
            closeModal(document.getElementById('delete-account-modal'));
        });
    }
    
    // --- Sidebar Toggle Script ---
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('desktop-sidebar');

    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
        });
    }
    
    // --- Page-Specific Profile Logic ---
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.dataset.tab;
            
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            tabContents.forEach(content => {
                if (content.id === tabId + '-tab') {
                    content.classList.add('active');
                } else {
                    content.classList.remove('active');
                }
            });
        });
    });

    // --- Notification Click Logic ---
    const notifList = document.querySelector('.notifications-list');
    const notifBadge = document.querySelector('.notif-badge');

    if (notifList) {
        notifList.addEventListener('click', (e) => {
            const item = e.target.closest('.notification-item.unread');
            if (!item) return; 
            
            const notifId = item.dataset.notifId;
            
            item.classList.remove('unread');
            item.classList.add('read');
            const icon = item.querySelector('.notif-icon');
            if (icon) {
                icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"></path></svg>';
                icon.style.color = '#10b981'; // Update to green checkmark
            }

            if (notifBadge) {
                let currentCount = parseInt(notifBadge.textContent, 10);
                if (currentCount > 0) {
                    currentCount--;
                    notifBadge.textContent = currentCount;
                    if (currentCount === 0) {
                        notifBadge.style.display = 'none';
                    }
                }
            }
            
            const formData = new FormData();
            formData.append('notification_id', notifId);
            
            fetch('mark_notification_read.php', {
                method: 'POST',
                body: formData
            })
            .then(res => res.json())
            .then(data => {
                if (!data.success) {
                    console.error('Failed to mark as read on server.');
                }
            });
        });
    }
    
    // --- Profile Picture Uploader ---
    const pfpContainer = document.getElementById('profile-picture-container');
    const pfpInput = document.getElementById('pfp-input');

    if (pfpContainer && pfpInput) {
        pfpContainer.addEventListener('click', () => pfpInput.click());
        
        pfpInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                const formData = new FormData();
                formData.append('pfp', file); 

                const reader = new FileReader();
                reader.onload = (e) => {
                    pfpContainer.innerHTML = ''; 
                    const img = document.createElement('img');
                    img.src = e.target.result;
                    pfpContainer.appendChild(img);
                };
                reader.readAsDataURL(file);

                fetch('upload_pfp.php', {
                    method: 'POST',
                    body: formData
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        console.log('PFP updated!');
                    } else {
                        alert('Error: ' + data.message);
                    }
                })
                .catch(error => {
                    console.error('Upload error:', error);
                    alert('An unexpected error occurred during upload.');
                });
            }
        });
    }

    // --- Delete Account Logic ---
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    const deleteErrorMsg = document.getElementById('delete-error-msg'); 

    if(confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', () => {
            if(deleteErrorMsg) deleteErrorMsg.textContent = ''; 

            confirmDeleteBtn.disabled = true;
            confirmDeleteBtn.textContent = 'Deleting...';

            fetch('delete_account.php', {
                method: 'POST'
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    window.location.href = 'logout.php';
                } else {
                    console.error('Account deletion failed:', data.message);
                    if(deleteErrorMsg) deleteErrorMsg.textContent = 'Error: ' + data.message;
                    confirmDeleteBtn.disabled = false;
                    confirmDeleteBtn.textContent = 'Yes, Delete Account';
                }
            })
            .catch(error => {
                console.error('Error during account deletion:', error);
                if(deleteErrorMsg) deleteErrorMsg.textContent = 'An unexpected error occurred. Please try again.';
                confirmDeleteBtn.disabled = false;
                confirmDeleteBtn.textContent = 'Yes, Delete Account';
            });
        });
    }

    </script>
</body>
</html>