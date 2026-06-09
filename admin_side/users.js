document.addEventListener('DOMContentLoaded', async () => {

    // ===================================
    // 1. ADMIN SECURITY CHECK
    // ===================================
    const userRole = sessionStorage.getItem('role');
    if (userRole !== 'admin') {
        window.location.href = '../login.html';
        return;
    }

    document.getElementById('admin-name').textContent = sessionStorage.getItem('user_name') || 'Site Administrator';

    document.getElementById('admin-logout-btn').addEventListener('click', async (e) => {
        e.preventDefault();
        await window.supabase.auth.signOut();
        sessionStorage.clear();
        window.location.href = '../login.html';
    });

    const hamburger = document.getElementById('hamburger');
    const sidebar = document.getElementById('sidebar');
    if (hamburger && sidebar) {
        hamburger.addEventListener('click', () => sidebar.classList.toggle('open'));
    }

    // ===================================
    // 2. FETCH AND RENDER USERS
    // ===================================
    const userTableBody = document.getElementById('userTableBody');

    async function loadUsers() {
        const { data: users, error } = await window.supabase
            .from('users')
            .select('id, first_name, last_name, email, role, is_verified')
            .order('last_name', { ascending: true });

        if (error) {
            userTableBody.innerHTML = `<tr><td colspan="5" style="color:var(--danger-red); text-align:center;">Failed to load users.</td></tr>`;
            return;
        }

        if (!users || users.length === 0) {
            userTableBody.innerHTML = `<tr class="empty-state"><td colspan="5" style="text-align:center; color: var(--text-secondary); padding: 40px;">No users found.</td></tr>`;
            return;
        }

        userTableBody.innerHTML = users.map(user => {
            const fullName = `${user.first_name} ${user.last_name}`;
            
            // Badges
            const roleBadge = user.role === 'admin' 
                ? `<span class="badge" style="background: rgba(30, 58, 138, 0.1); color: var(--primary-blue);">ADMIN</span>` 
                : `<span class="badge" style="background: var(--bg-body); border: 1px solid var(--border-light); color: var(--text-secondary);">USER</span>`;
            
            const statusBadge = user.is_verified
                ? `<span class="badge" style="background: rgba(16, 185, 129, 0.1); color: var(--success-green);"><i class="fa-solid fa-check"></i> Verified</span>`
                : `<span class="badge" style="background: rgba(245, 158, 11, 0.1); color: var(--accent-amber);"><i class="fa-solid fa-clock"></i> Pending</span>`;

            const safeName = fullName.replace(/'/g, "\\'");
            
            // Action Buttons
            let adminActions = '';
            if (user.role !== 'admin') {
                adminActions = `
                    <button class="action-btn view-btn" title="View Latest Report" onclick="viewUserReport(${user.id})"><i class="fa-solid fa-eye"></i></button>
                    <button class="action-btn message-btn" title="Send Notification" onclick="openMessageModal(${user.id}, '${safeName}')"><i class="fa-solid fa-envelope"></i></button>
                    <button class="action-btn edit-btn" title="Edit Permissions" onclick="openEditModal(${user.id}, '${safeName}', '${user.role}', ${user.is_verified})"><i class="fa-solid fa-pen-to-square"></i></button>
                    <button class="action-btn delete-btn" title="Delete User" onclick="confirmDeleteUser(${user.id}, '${safeName}')"><i class="fa-solid fa-trash-can"></i></button>
                `;
            } else {
                adminActions = `<span style="color: var(--text-secondary); font-size: 0.85rem; font-weight: 500;">Admin Protected</span>`;
            }

            return `
                <tr data-user-id="${user.id}" data-name="${fullName}" data-email="${user.email}" data-role="${user.role}">
                    <td><div style="font-weight: 600; color: var(--text-primary);">${fullName}</div></td>
                    <td>${user.email}</td>
                    <td>${statusBadge}</td>
                    <td>${roleBadge}</td>
                    <td style="text-align: right;">
                        <div class="action-buttons" style="display: flex; justify-content: flex-end; gap: 8px;">
                            ${adminActions}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    loadUsers();

    // ===================================
    // 3. SEARCH FILTER
    // ===================================
    const searchInput = document.getElementById('searchInput');
    if (searchInput && userTableBody) {
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            const rows = userTableBody.querySelectorAll('tr');

            rows.forEach(row => {
                if (row.classList.contains('empty-state')) return; 
                const name = row.dataset.name ? row.dataset.name.toLowerCase() : '';
                const email = row.dataset.email ? row.dataset.email.toLowerCase() : '';
                const role = row.dataset.role ? row.dataset.role.toLowerCase() : '';

                if (name.includes(searchTerm) || email.includes(searchTerm) || role.includes(searchTerm)) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        });
    }

    // ===================================
    // 4. MODALS & ADMIN ACTIONS
    // ===================================
    
    // -- View Report --
    const viewUserModal = document.getElementById('viewUserModal');
    const modalUserDetails = document.getElementById('modal-user-details');

    window.viewUserReport = async function(userId) {
        modalUserDetails.innerHTML = '<div style="text-align:center; padding:20px;"><i class="fa-solid fa-circle-notch fa-spin"></i> Fetching records...</div>';
        viewUserModal.classList.add('show');

        const { data: report, error } = await window.supabase
            .from('item_reports')
            .select('item_name_specific, item_category, report_type, item_location, item_datetime')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (error || !report) {
            modalUserDetails.innerHTML = '<p style="text-align:center; color: var(--text-secondary);">No reports found for this user.</p>';
            return;
        }

        const dateObj = new Date(report.item_datetime);
        const formattedDate = dateObj.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });

        modalUserDetails.innerHTML = `
            <p><strong>Type:</strong> <span style="text-transform: uppercase;">${report.report_type}</span></p>
            <p><strong>Item:</strong> ${report.item_name_specific || report.item_category}</p>
            <p><strong>Location:</strong> ${report.item_location}</p>
            <p><strong>Date & Time:</strong> ${formattedDate}</p>
        `;
    };

    // -- Message User --
    const messageUserModal = document.getElementById('messageUserModal');
    const messageForm = document.getElementById('messageForm');
    const sendMessageBtn = document.getElementById('sendMessageBtn');

    window.openMessageModal = function(userId, userName) {
        document.getElementById('messageUserId').value = userId;
        document.getElementById('messageUserName').textContent = userName;
        document.getElementById('messageContent').value = '';
        messageUserModal.classList.add('show');
    };

    messageForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const originalText = sendMessageBtn.innerHTML;
        sendMessageBtn.disabled = true;
        sendMessageBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending...';

        const userId = document.getElementById('messageUserId').value;
        const msg = document.getElementById('messageContent').value;

        // Insert directly into the user's notification feed
        const { error } = await window.supabase.from('notifications').insert([{
            user_id: userId,
            message: "System Admin: " + msg
        }]);

        if (!error) {
            alert('Message successfully sent to the user!');
            messageUserModal.classList.remove('show');
        } else {
            alert('Error sending message: ' + error.message);
        }

        sendMessageBtn.disabled = false;
        sendMessageBtn.innerHTML = originalText;
    });

    // -- Edit User Account --
    const editUserModal = document.getElementById('editUserModal');
    const editUserForm = document.getElementById('editUserForm');
    const saveEditBtn = document.getElementById('saveEditBtn');

    window.openEditModal = function(userId, userName, currentRole, isVerified) {
        document.getElementById('editUserId').value = userId;
        document.getElementById('editUserName').textContent = userName;
        document.getElementById('editRole').value = currentRole;
        document.getElementById('editStatus').value = isVerified ? "true" : "false";
        editUserModal.classList.add('show');
    };

    editUserForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const originalText = saveEditBtn.innerHTML;
        saveEditBtn.disabled = true;
        saveEditBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';

        const userId = document.getElementById('editUserId').value;
        const newRole = document.getElementById('editRole').value;
        const newStatus = document.getElementById('editStatus').value === "true";

        const { error } = await window.supabase.from('users').update({
            role: newRole,
            is_verified: newStatus
        }).eq('id', userId);

        if (!error) {
            editUserModal.classList.remove('show');
            loadUsers(); // Refresh the table
        } else {
            alert('Error updating user: ' + error.message);
        }

        saveEditBtn.disabled = false;
        saveEditBtn.innerHTML = originalText;
    });

    // -- Delete User --
    const deleteUserModal = document.getElementById('deleteUserModal');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    let currentUserIdToDelete = null;

    window.confirmDeleteUser = function(userId, userName) {
        currentUserIdToDelete = userId;
        document.getElementById('deleteUserName').textContent = userName;
        deleteUserModal.classList.add('show');
    };

    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', async function() {
            if (!currentUserIdToDelete) return;
            const originalText = confirmDeleteBtn.innerHTML;
            confirmDeleteBtn.disabled = true;
            confirmDeleteBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Deleting...';

            const { error } = await window.supabase.from('users').delete().eq('id', currentUserIdToDelete);

            if (!error) {
                const rowToRemove = userTableBody.querySelector(`tr[data-user-id="${currentUserIdToDelete}"]`);
                if (rowToRemove) rowToRemove.remove();
                deleteUserModal.classList.remove('show');
            } else {
                alert('Error: Could not delete user. ' + error.message);
            }

            confirmDeleteBtn.disabled = false;
            confirmDeleteBtn.innerHTML = originalText;
            currentUserIdToDelete = null;
        });
    }

    // Modal Global Close functionality
    document.querySelectorAll('[data-close]').forEach(btn => {
        btn.addEventListener('click', function() {
            this.closest('.modal-overlay').classList.remove('show');
        });
    });
});