// overview.js

// Make functions globally available for inline HTML onclick handlers
window.viewDetails = function(report) {
    document.getElementById('modal-status').textContent = report.report_type.toUpperCase();
    document.getElementById('modal-status').className = 'badge ' + report.report_type.toLowerCase();
    
    document.getElementById('modal-item').textContent = report.item_name_specific || 'N/A';
    document.getElementById('modal-category').textContent = report.item_category;
    document.getElementById('modal-location').textContent = report.item_location;
    
    // Format Date nicely
    const dateObj = new Date(report.item_datetime);
    const formattedDate = dateObj.toLocaleString('en-US', { 
        month: 'short', day: 'numeric', year: 'numeric', 
        hour: 'numeric', minute: '2-digit', hour12: true 
    });
    
    document.getElementById('modal-datetime').textContent = formattedDate;
    document.getElementById('modal-description').textContent = report.item_description;
    
    // Open Modal by adding the "show" class
    document.getElementById('viewDetailsModal').classList.add('show');
};

window.confirmDelete = function(reportId) {
    const deleteBtn = document.getElementById('confirm-delete-btn');
    if(deleteBtn) {
        deleteBtn.dataset.reportId = reportId;
    }
    document.getElementById('deleteConfirmationModal').classList.add('show');
};

// Wait for DOM to load for listeners
document.addEventListener('DOMContentLoaded', () => {

    // --- Sidebar Toggle ---
    const hamburger = document.getElementById('hamburger');
    const sidebar = document.getElementById('sidebar');

    if (hamburger && sidebar) {
        hamburger.addEventListener('click', () => {
            sidebar.classList.toggle('open');
            const expanded = hamburger.getAttribute('aria-expanded') === 'true' || false;
            hamburger.setAttribute('aria-expanded', String(!expanded));
            sidebar.setAttribute('aria-hidden', String(!sidebar.classList.contains('open')));
        });
    }

    // --- Modal Close Logic ---
    const viewDetailsModal = document.getElementById('viewDetailsModal');
    const deleteModal = document.getElementById('deleteConfirmationModal');
    
    const allCloseButtons = document.querySelectorAll('[data-close]');
    allCloseButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            if (viewDetailsModal) viewDetailsModal.classList.remove('show');
            if (deleteModal) deleteModal.classList.remove('show');
        });
    });
    
    // Close when clicking outside modal content
    window.addEventListener('click', (event) => {
        if (event.target.classList.contains('modal-overlay')) {
            event.target.classList.remove('show');
        }
    });

    // --- Delete Confirmation AJAX Logic ---
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', function() {
            const reportId = this.dataset.reportId;

            if (!reportId) {
                alert('Error: Could not find report ID.');
                return;
            }
            
            const originalText = this.innerHTML;
            this.disabled = true;
            this.innerHTML = 'Archiving...';

            const formData = new FormData();
            formData.append('report_id', reportId);

            // Fetch request unchanged - connects to your backend
            fetch('delete_post.php', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    location.reload();
                } else {
                    alert('Error: ' + data.message);
                    this.disabled = false;
                    this.innerHTML = originalText;
                }
            })
            .catch(error => {
                console.error('Delete error:', error);
                alert('An error occurred. Please try again.');
                this.disabled = false;
                this.innerHTML = originalText;
            })
            .finally(() => {
                if (deleteModal) deleteModal.classList.remove('show');
            });
        });
    }
});