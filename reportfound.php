<?php
session_start();
// If the user is not logged in, redirect to login
if (!isset($_SESSION['user_id'])) {
    header("Location: login.html");
    exit;
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>RETRIEVE | Report Found Item</title>
    
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap" rel="stylesheet">
    
    <link rel="stylesheet" href="landing.css">
    <link rel="stylesheet" href="homepage.css">
    <link rel="stylesheet" href="header.css">
    <link rel="stylesheet" href="footer.css">
    <link rel="stylesheet" href="reportfound.css">
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
                <a href="reportfound.php" class="active">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="sidebar-icon"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
                    <span>Report Found Item</span>
                </a>
                <a href="profile.php">
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
                <a href="reportfound.php" class="nav-icon active" title="Found Items">
                     <img src="images/reportfound.png" alt="Found Items">
                </a>
                <a href="homepage.php" class="nav-icon" title="Home">
                    <img src="images/home.png" alt="Home">
                </a>
                <a href="profile.php" class="nav-icon" title="Profile">
                    <img src="images/user.png" alt="Profile">
                </a>
            </nav>

            <div class="main-content">
                <div class="report-form-container">
                    <form class="report-form" id="report-form">
                        <h2>Report a Found Item</h2>
                        
                        <div class="form-group category-group">
                            <label for="category-select">Select a Category</label>
                            <div class="select-wrapper">
                                <select id="category-select" name="category" required>
                                    <option value="" disabled selected>-- Please choose an option --</option>
                                    <option value="Electronics">Electronics</option>
                                    <option value="Books & Notes">Books & Notes</option>
                                    <option value="Clothing">Uniforms & Clothing</option>
                                    <option value="Accessories">Accessories & IDs</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                        </div>

                        <div class="form-group item-name-group">
                            <label for="item-name">Item Name</label>
                            <input type="text" id="item-name" name="item_name" placeholder="e.g., Casio Scientific Calculator" required>
                        </div>

                        <div class="form-group photo-group">
                            <label>Add Photo of Item</label>
                            <button type="button" class="photo-uploader" id="photo-uploader">
                                <i class="fa-solid fa-camera"></i>
                                <span>Click to upload photo</span>
                            </button>
                            <input type="file" id="photo-input" name="photo" accept="image/*" style="display: none;">
                        </div>

                        <div class="details-grid">
                            <div class="side-details">
                                <div class="form-group">
                                    <label for="found-date">Date and Time Found</label>
                                    <div class="date-time-inputs">
                                        <input type="date" id="found-date" name="date" required>
                                        <input type="time" id="found-time" name="time" required>
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label for="location">Exact Location Found</label>
                                    <input type="text" id="location" name="location" placeholder="e.g., CBA Building, 2nd Floor Room 204" required>
                                </div>
                            </div>
                        </div>

                        <div class="form-group description-group">
                            <label for="item-description">Additional Specific Details</label>
                            <textarea id="item-description" name="description" rows="5" placeholder="Mention specific colors, brands, identifying marks, or condition..." required></textarea>
                        </div>

                        <button type="submit" class="submit-btn">Submit Found Report</button>
                    </form>
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
    
    <div id="confirmation-modal" class="modal-overlay">
        <div class="modal-content confirmation-modal-content">
            <h2>Confirm Your Report</h2>
            <p>Please review the details below before submitting to the TUPV Admin.</p>
            <div class="summary-grid">
                <div class="summary-image-container">
                    <img id="summary-image" src="" alt="Item Preview">
                </div>
                <div class="summary-details">
                    <p><strong>Category:</strong> <span id="summary-category"></span></p>
                    <p><strong>Date & Time:</strong> <span id="summary-datetime"></span></p>
                    <p><strong>Location Found:</strong> <span id="summary-location"></span></p>
                    <p><strong>Description:</strong></p>
                    <p id="summary-description"></p>
                </div>
            </div>
            <div class="modal-actions">
                <button id="cancel-btn" class="modal-btn cancel-btn">Go Back</button>
                <button id="confirm-btn" class="modal-btn confirm-btn">Confirm & Submit</button>
            </div>
        </div>
    </div>

    <div id="success-modal" class="modal-overlay">
        <div class="modal-content success-modal-content">
            <div class="success-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            </div>
            <h2>Report Submitted!</h2>
            <p>Thank you for your honesty. Your report has been securely sent to the TUPV Administration for verification. We will notify you if a potential owner comes forward.</p>
            <button id="notify-btn" class="modal-btn notify-btn">Return to Dashboard</button>
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
            'footer-terms-link': 'terms-modal'
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

        document.querySelectorAll('.close-modal').forEach(button => {
            button.addEventListener('click', function() {
                this.closest('.modal-overlay').classList.remove('show');
            });
        });

        window.addEventListener('click', (event) => {
            if (event.target.classList.contains('modal-overlay')) {
                 event.target.classList.remove('show');
            }
        });
        
        // --- Sidebar Toggle Script ---
        const sidebarToggle = document.getElementById('sidebar-toggle');
        const sidebar = document.getElementById('desktop-sidebar');

        if (sidebarToggle && sidebar) {
            sidebarToggle.addEventListener('click', () => {
                sidebar.classList.toggle('collapsed');
            });
        }

        // --- Photo Uploader Script ---
        const photoUploader = document.getElementById('photo-uploader');
        const photoInput = document.getElementById('photo-input');
        let uploadedImageSrc = '';

        if (photoUploader && photoInput) {
            photoUploader.addEventListener('click', () => {
                photoInput.click();
            });

            photoInput.addEventListener('change', (event) => {
                const file = event.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        uploadedImageSrc = e.target.result;
                        photoUploader.innerHTML = '';
                        const img = document.createElement('img');
                        img.src = uploadedImageSrc;
                        photoUploader.appendChild(img);
                    };
                    reader.readAsDataURL(file);
                }
            });
        }

        // --- Form Submission and Modal Logic ---
        const reportForm = document.getElementById('report-form');
        const confirmationModal = document.getElementById('confirmation-modal');
        const successModal = document.getElementById('success-modal');

        if (reportForm && confirmationModal && successModal) {
            reportForm.addEventListener('submit', (event) => {
                event.preventDefault(); 

                const category = document.getElementById('category-select').value;
                const itemName = document.getElementById('item-name').value;
                const description = document.getElementById('item-description').value;
                const date = document.getElementById('found-date').value;
                const time = document.getElementById('found-time').value;
                const location = document.getElementById('location').value;
                
                if (!category || !itemName || !description || !date || !time || !location) {
                    alert('Please fill out all required fields.');
                    return;
                }
                
                document.getElementById('summary-category').textContent = category || 'Not specified';
                document.getElementById('summary-description').textContent = description || 'Not specified';
                document.getElementById('summary-datetime').textContent = `${date || 'N/A'} at ${time || 'N/A'}`;
                document.getElementById('summary-location').textContent = location || 'Not specified';
                
                // Better empty image handling
                const summaryImg = document.getElementById('summary-image');
                if (uploadedImageSrc) {
                    summaryImg.src = uploadedImageSrc;
                    summaryImg.style.padding = "0";
                    summaryImg.style.objectFit = "cover";
                } else {
                    summaryImg.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='1' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='3' y='3' width='18' height='18' rx='2' ry='2'%3E%3C/rect%3E%3Ccircle cx='8.5' cy='8.5' r='1.5'%3E%3C/circle%3E%3Cpolyline points='21 15 16 10 5 21'%3E%3C/polyline%3E%3C/svg%3E";
                    summaryImg.style.padding = "50px";
                    summaryImg.style.objectFit = "contain";
                }
                
                confirmationModal.classList.add('show');
            });

            const cancelBtn = document.getElementById('cancel-btn');
            const confirmBtn = document.getElementById('confirm-btn');
            const notifyBtn = document.getElementById('notify-btn');

            if(cancelBtn) {
                cancelBtn.addEventListener('click', () => {
                    confirmationModal.classList.remove('show');
                });
            }

            if(confirmBtn) {
                confirmBtn.addEventListener('click', () => {
                    const formData = new FormData(reportForm);
                    formData.append('report_type', 'found');
                    
                    fetch('submit_report.php', {
                        method: 'POST',
                        body: formData
                    })
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            confirmationModal.classList.remove('show');
                            successModal.classList.add('show');
                        } else {
                            alert('Error: ' + data.message);
                            confirmationModal.classList.remove('show');
                        }
                    })
                    .catch(error => {
                        console.error('Submission error:', error);
                        alert('An unexpected error occurred. Please try again.');
                    });
                });
            }

            if(notifyBtn) {
                notifyBtn.addEventListener('click', () => {
                    successModal.classList.remove('show');
                    reportForm.reset(); 
                    photoUploader.innerHTML = '<i class="fa-solid fa-camera"></i><span>Click to upload photo</span>';
                    uploadedImageSrc = '';
                    window.location.href = 'homepage.php';
                });
            }
        }
    </script>
</body>
</html>