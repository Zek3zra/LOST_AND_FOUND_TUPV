document.addEventListener('DOMContentLoaded', () => {

    // ===================================
    // Sidebar Toggle Logic
    // ===================================
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

    // ===================================
    // Search Filter Logic
    // ===================================
    const searchInput = document.getElementById('searchInput');
    const userTableBody = document.getElementById('userTableBody');

    if (searchInput && userTableBody) {
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            const rows = userTableBody.querySelectorAll('tr');

            rows.forEach(row => {
                if (row.classList.contains('empty-state')) return; 
                
                const name = row.dataset.name ? row.dataset.name.toLowerCase() : '';
                const email = row.dataset.email ? row.dataset.email.toLowerCase() : '';
                const status = row.dataset.status ? row.dataset.status.toLowerCase() : '';

                if (name.includes(searchTerm) || email.includes(searchTerm) || status.includes(searchTerm)) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        });
    }

    // ===================================
    // Modal Element Selectors
    // ===================================
    const viewUserModal = document.getElementById('viewUserModal');
    const deleteUserModal = document.getElementById('deleteUserModal');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    const modalUserDetails = document.getElementById('modal-user-details');
    const deleteUserName = document.getElementById('deleteUserName');

    let currentUserIdToDelete = null;

    // ===================================
    // Action Buttons (View / Delete)
    // ===================================
    if (userTableBody) {
        userTableBody.addEventListener('click', (e) => {
            const targetBtn = e.target.closest('.action-btn');
            if (!targetBtn) return;

            const tr = targetBtn.closest('tr');
            if (!tr) return;

            const userId = tr.dataset.userId;
            const userName = tr.dataset.name;

            // --- VIEW LATEST REPORT ---
            if (targetBtn.classList.contains('view-btn')) {
                // IMPORTANT: Make sure you have a get_user_report.php endpoint to catch this!
                fetch(`get_user_report.php?user_id=${userId}`)
                    .then(response => response.json())
                    .then(data => {
                        if (data.success && data.report) {
                            const dateObj = new Date(data.report.created_at);
                            const formattedDate = dateObj.toLocaleString('en-US', {
                                month: 'short', day: 'numeric', year: 'numeric'
                            });
                            
                            modalUserDetails.innerHTML = `
                                <div><strong>Report Status:</strong> <span class="badge pending">${data.report.report_status.toUpperCase()}</span></div>
                                <div><strong>Item Details:</strong> ${data.report.item_name_specific || data.report.item_category}</div>
                                <div><strong>Date Submitted:</strong> ${formattedDate}</div>
                            `;
                        } else {
                            modalUserDetails.innerHTML = '<div style="text-align:center; color: var(--text-secondary);">This user has not submitted any reports yet.</div>';
                        }
                        if (viewUserModal) viewUserModal.style.display = 'flex';
                    })
                    .catch(err => {
                        console.error('Error fetching report:', err);
                        modalUserDetails.innerHTML = '<div style="color: var(--danger-red);">Error loading report data.</div>';
                        if (viewUserModal) viewUserModal.style.display = 'flex';
                    });
            } 
            // --- DELETE USER ---
            else if (targetBtn.classList.contains('delete-btn')) {
                currentUserIdToDelete = userId;
                if (deleteUserName) deleteUserName.textContent = userName;
                if (deleteUserModal) deleteUserModal.style.display = 'flex';
            }
        });
    }

    // ===================================
    // Close Modals
    // ===================================
    const closeButtons = document.querySelectorAll('[data-close]');
    closeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            if (viewUserModal) viewUserModal.style.display = 'none';
            if (deleteUserModal) deleteUserModal.style.display = 'none';
            currentUserIdToDelete = null;
        });
    });

    // Close on outside click
    window.addEventListener('click', (e) => {
        if (e.target === viewUserModal) viewUserModal.style.display = 'none';
        if (e.target === deleteUserModal) {
            deleteUserModal.style.display = 'none';
            currentUserIdToDelete = null;
        }
    });

    // ===================================
    // Confirm Deletion AJAX Fetch
    // ===================================
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', () => {
            if (!currentUserIdToDelete) return;

            const originalText = confirmDeleteBtn.innerHTML;
            confirmDeleteBtn.disabled = true;
            confirmDeleteBtn.innerHTML = 'Deleting...';

            const formData = new FormData();
            formData.append('user_id', currentUserIdToDelete);

            // IMPORTANT: Ensure delete_user.php exists and accepts POST requests
            fetch('delete_user.php', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    const rowToRemove = userTableBody.querySelector(`tr[data-user-id="${currentUserIdToDelete}"]`);
                    if (rowToRemove) rowToRemove.remove();
                    if (deleteUserModal) deleteUserModal.style.display = 'none';
                } else {
                    alert('Error: ' + (data.message || 'Could not delete user.'));
                }
            })
            .catch(err => {
                console.error(err);
                alert('Request failed. Please try again later.');
            })
            .finally(() => {
                confirmDeleteBtn.disabled = false;
                confirmDeleteBtn.innerHTML = originalText;
                currentUserIdToDelete = null;
                if (deleteUserModal) deleteUserModal.style.display = 'none';
            });
        });
    }
});