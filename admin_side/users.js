document.addEventListener('DOMContentLoaded', async () => {

    // --- 1. ADMIN SECURITY CHECK ---
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

    // Unified Missing Avatar Configuration
    const DEFAULT_AVATAR = "../images/no_profile.png";

    // --- GLOBAL ALERTS ---
    function showAlert(title, message, type = "success") {
        const modal = document.getElementById('systemAlertModal');
        const titleEl = document.getElementById('alert-title');
        const btn = document.getElementById('alertOkBtn');
        
        titleEl.textContent = title;
        document.getElementById('alert-message').textContent = message;
        
        btn.className = "modal-btn confirm-btn";
        
        if (type === 'danger') {
            titleEl.style.color = "var(--danger-red)";
            btn.classList.add('danger-override');
        } else if (type === 'warning') {
            titleEl.style.color = "#f97316"; 
            btn.style.backgroundColor = "#f97316";
            btn.style.borderColor = "#f97316";
        } else {
            titleEl.style.color = "var(--success-green)";
            btn.style.backgroundColor = "var(--success-green)";
            btn.style.borderColor = "var(--success-green)";
        }
        
        modal.classList.add('show');
    }

    document.getElementById('alertOkBtn').addEventListener('click', () => {
        document.getElementById('systemAlertModal').classList.remove('show');
    });

    function escapeQuote(str) {
        return (str || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
    }


    // --- 2. FETCH AND RENDER USERS ---
    const userTableBody = document.getElementById('userTableBody');
    let allUsers = [];

    async function loadUsers() {
        const { data: users, error } = await window.supabase
            .from('users')
            .select('id, first_name, last_name, email, role, is_verified, profile_picture_path, contact_number, course_section, address, created_at')
            .order('created_at', { ascending: false });

        if (error) {
            userTableBody.innerHTML = `<tr><td colspan="4" style="color:var(--danger-red); text-align:center;">Failed to load users.</td></tr>`;
            return;
        }

        allUsers = users || [];
        renderUsers(allUsers);
    }

    function renderUsers(usersToRender) {
        if (usersToRender.length === 0) {
            userTableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 40px; color: var(--text-secondary);">No users found.</td></tr>`;
            return;
        }

        userTableBody.innerHTML = usersToRender.map(user => {
            const avatar = user.profile_picture_path || DEFAULT_AVATAR;
            
            // Simplified badge classes
            let roleBadge = '';
            if (user.role === 'admin') roleBadge = `<span class="badge badge-admin">Admin</span>`;
            else if (user.role === 'banned') roleBadge = `<span class="badge badge-banned">Banned</span>`;
            else roleBadge = `<span class="badge badge-user">User</span>`;

            const verifBadge = user.is_verified 
                ? `<span class="badge badge-verified"><i class="fa-solid fa-check"></i> Verified</span>`
                : `<span class="badge badge-unverified"><i class="fa-solid fa-xmark"></i> Unverified</span>`;

            // Build action buttons (Message User replaces the Ban button)
            let actionBtns = ``;
            actionBtns += `<button class="action-icon-btn primary" onclick="viewUserDetails('${user.id}')" title="View Full Profile"><i class="fa-solid fa-eye"></i></button>`;
            actionBtns += `<button class="action-icon-btn success" onclick="openSupportChat('${user.id}')" title="Message User"><i class="fa-solid fa-comment-dots"></i></button>`;
            actionBtns += `<button class="action-icon-btn primary" style="background-color: var(--text-secondary);" onclick="editUserRole('${user.id}', '${user.role}', '${escapeQuote(user.first_name)} ${escapeQuote(user.last_name)}')" title="Edit Role (Ban/Unban)"><i class="fa-solid fa-pen-to-square"></i></button>`;
            actionBtns += `<button class="action-icon-btn danger" onclick="confirmDeleteUser('${user.id}', '${escapeQuote(user.first_name)} ${escapeQuote(user.last_name)}')" title="Permanently Delete"><i class="fa-solid fa-trash-can"></i></button>`;

            return `
                <tr>
                    <td>
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <img src="${avatar}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 1px solid var(--border-light);">
                            <div style="font-weight: 600; color: var(--text-primary);">${user.first_name} ${user.last_name}</div>
                        </div>
                    </td>
                    <td>
                        <div style="display: flex; flex-direction: column; gap: 6px; align-items: flex-start;">
                            ${roleBadge}
                            ${verifBadge}
                        </div>
                    </td>
                    <td>
                        <div style="font-size: 0.9rem;">${user.email}</div>
                        <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 4px;">${user.contact_number || 'No number'}</div>
                    </td>
                    <td class="actions-col">
                        <div class="table-actions">
                            ${actionBtns}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // --- 3. FILTERING AND SEARCH ---
    const searchInput = document.getElementById('searchUserInput');
    const roleFilter = document.getElementById('roleFilter');
    const statusFilter = document.getElementById('statusFilter');

    function applyFilters() {
        const term = searchInput.value.toLowerCase();
        const role = roleFilter.value;
        const status = statusFilter.value;

        const filtered = allUsers.filter(u => {
            // Enhanced Search: Now checks Name, Email, AND Course Section seamlessly
            const matchSearch = (u.first_name + ' ' + u.last_name).toLowerCase().includes(term) || 
                                u.email.toLowerCase().includes(term) || 
                                (u.course_section && u.course_section.toLowerCase().includes(term));
            
            const matchRole = role === 'all' || u.role === role;
            
            let matchStatus = true;
            if (status === 'verified') matchStatus = u.is_verified === true;
            if (status === 'unverified') matchStatus = u.is_verified === false || u.is_verified === null;

            return matchSearch && matchRole && matchStatus;
        });

        renderUsers(filtered);
    }

    searchInput.addEventListener('input', applyFilters);
    roleFilter.addEventListener('change', applyFilters);
    statusFilter.addEventListener('change', applyFilters);

    // --- 4. VIEW COMPREHENSIVE USER DETAILS ---
    window.viewUserDetails = async function(userId) {
        const detailsContainer = document.getElementById('modal-user-details');
        detailsContainer.innerHTML = '<div style="text-align:center; padding: 40px; color: var(--text-secondary);"><i class="fa-solid fa-circle-notch fa-spin"></i> Fetching profile & records...</div>';
        document.getElementById('viewUserModal').classList.add('show');

        try {
            const { data: user, error: userErr } = await window.supabase.from('users').select('*').eq('id', userId).single();
            if (userErr) throw userErr;

            const { data: reports, error: repErr } = await window.supabase.from('item_reports')
                .select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(1);
            
            let reportHtml = '<p style="color: var(--text-secondary); font-size: 0.9rem; font-style: italic; background: var(--bg-body); padding: 16px; border-radius: 8px; border: 1px solid var(--border-light); margin-top: 8px; text-align: center;">No items reported by this user yet.</p>';
            
            if (reports && reports.length > 0) {
                const r = reports[0];
                const rDate = new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                
                let statusColor = 'var(--text-secondary)';
                let statusBg = '#f1f5f9';
                let statusBorder = '#e2e8f0';
                if (r.report_status === 'approved') { statusColor = 'var(--primary-blue)'; statusBg = '#eff6ff'; statusBorder = '#bfdbfe'; }
                if (r.report_status === 'matched' || r.report_status === 'archived') { statusColor = 'var(--success-green)'; statusBg = '#ecfdf5'; statusBorder = '#a7f3d0'; }
                if (r.report_status === 'rejected') { statusColor = 'var(--danger-red)'; statusBg = '#fef2f2'; statusBorder = '#fecaca'; }
                if (r.report_status === 'pending') { statusColor = '#ea580c'; statusBg = '#fff7ed'; statusBorder = '#fed7aa'; }

                reportHtml = `
                    <div style="background: var(--bg-body); padding: 16px; border-radius: 12px; border: 1px solid var(--border-light); margin-top: 8px;">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                            <strong style="color: var(--text-primary); font-size: 1.05rem;">${r.item_name_specific}</strong>
                            <span style="color: ${statusColor}; background: ${statusBg}; border: 1px solid ${statusBorder}; padding: 4px 8px; border-radius: 4px; font-size: 0.7rem; font-weight: 600; text-transform: uppercase;">${r.report_status}</span>
                        </div>
                        <p style="margin-bottom: 4px; font-size: 0.9rem; color: var(--text-secondary);"><strong>Type:</strong> <span style="text-transform: capitalize;">${r.report_type} Item</span></p>
                        <p style="margin-bottom: 4px; font-size: 0.9rem; color: var(--text-secondary);"><strong>Category:</strong> ${r.item_category}</p>
                        <p style="margin-bottom: 0; font-size: 0.9rem; color: var(--text-secondary);"><strong>Submitted:</strong> ${rDate}</p>
                    </div>
                `;
            }

            const joinDate = new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
            const avatar = user.profile_picture_path || DEFAULT_AVATAR;

            let roleBadge = '';
            if (user.role === 'admin') roleBadge = `<span class="badge badge-admin">Admin</span>`;
            else if (user.role === 'banned') roleBadge = `<span class="badge badge-banned">Banned</span>`;
            else roleBadge = `<span class="badge badge-user">User</span>`;

            const verifBadge = user.is_verified 
                ? `<span class="badge badge-verified"><i class="fa-solid fa-check"></i> Verified</span>`
                : `<span class="badge badge-unverified"><i class="fa-solid fa-xmark"></i> Unverified</span>`;

            // Note: Message User button is deliberately removed from this bottom layout.
            detailsContainer.innerHTML = `
                <div style="display: flex; align-items: center; gap: 20px; margin-bottom: 24px;">
                    <img src="${avatar}" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; border: 2px solid var(--border-light);">
                    <div style="flex: 1;">
                        <h3 style="font-size: 1.5rem; color: var(--text-primary); margin-bottom: 8px;">${user.first_name} ${user.last_name}</h3>
                        <div style="display: flex; gap: 8px;">
                            ${roleBadge}
                            ${verifBadge}
                        </div>
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px; font-size: 0.95rem;">
                    <div style="background: var(--bg-body); padding: 12px; border-radius: 8px; border: 1px solid var(--border-light);">
                        <label style="display: block; font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase; font-weight: 700; margin-bottom: 4px;">Email Address</label>
                        <span style="color: var(--text-primary); font-weight: 500; word-break: break-all;">${user.email}</span>
                    </div>
                    <div style="background: var(--bg-body); padding: 12px; border-radius: 8px; border: 1px solid var(--border-light);">
                        <label style="display: block; font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase; font-weight: 700; margin-bottom: 4px;">Contact Number</label>
                        <span style="color: var(--text-primary); font-weight: 500;">${user.contact_number || 'Not Provided'}</span>
                    </div>
                    <div style="background: var(--bg-body); padding: 12px; border-radius: 8px; border: 1px solid var(--border-light);">
                        <label style="display: block; font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase; font-weight: 700; margin-bottom: 4px;">Program & Section</label>
                        <span style="color: var(--text-primary); font-weight: 500;">${user.course_section || 'Not Provided'}</span>
                    </div>
                    <div style="background: var(--bg-body); padding: 12px; border-radius: 8px; border: 1px solid var(--border-light);">
                        <label style="display: block; font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase; font-weight: 700; margin-bottom: 4px;">Home Address</label>
                        <span style="color: var(--text-primary); font-weight: 500;">${user.address || 'Not Provided'}</span>
                    </div>
                    <div style="grid-column: 1 / -1; background: var(--bg-body); padding: 12px; border-radius: 8px; border: 1px solid var(--border-light);">
                        <label style="display: block; font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase; font-weight: 700; margin-bottom: 4px;">Account Created</label>
                        <span style="color: var(--text-primary); font-weight: 500;">${joinDate}</span>
                    </div>
                </div>
                
                <h5 style="font-size: 1.05rem; color: var(--text-primary); margin-bottom: 8px;">Most Recent Report</h5>
                ${reportHtml}
            `;

        } catch (error) {
            detailsContainer.innerHTML = `<div style="color: var(--danger-red); text-align: center; padding: 20px;">Failed to load user records: ${error.message}</div>`;
        }
    };

    // --- REDIRECT TO MESSENGER ---
    window.openSupportChat = function(userId) {
        sessionStorage.setItem('targetChatUserId', userId);
        window.location.href = 'messages.html';
    };

    // --- 5. EDIT USER ROLE ---
    window.editUserRole = function(userId, currentRole, userName) {
        document.getElementById('editUserId').value = userId;
        document.getElementById('editUserRole').value = currentRole;
        document.getElementById('editUserNameDisplay').textContent = userName;
        document.getElementById('editUserModal').classList.add('show');
    };

    document.getElementById('editUserForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('saveEditBtn');
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
        btn.disabled = true;

        const userId = document.getElementById('editUserId').value;
        const newRole = document.getElementById('editUserRole').value;

        const { error } = await window.supabase.from('users').update({ role: newRole }).eq('id', userId);

        if (!error) {
            document.getElementById('editUserModal').classList.remove('show');
            showAlert("Role Updated", "The user's permissions have been successfully updated.", "success");
            loadUsers(); 
        } else {
            showAlert("Update Failed", error.message, "danger");
        }
        btn.innerHTML = 'Save Changes'; 
        btn.disabled = false;
    });

    // --- 6. DELETE USER ---
    let currentUserIdToDelete = null;

    window.confirmDeleteUser = function(userId, userName) {
        currentUserIdToDelete = userId;
        document.getElementById('deleteUserName').textContent = userName;
        document.getElementById('deleteUserModal').classList.add('show');
    };

    document.getElementById('confirm-delete-btn').addEventListener('click', async function() {
        if (!currentUserIdToDelete) return;
        const originalText = this.innerHTML;
        this.disabled = true;
        this.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Deleting...';

        const { error } = await window.supabase.from('users').delete().eq('id', currentUserIdToDelete);

        if (!error) {
            document.getElementById('deleteUserModal').classList.remove('show');
            showAlert("User Deleted", "The account and its data were permanently removed.", "danger");
            loadUsers();
        } else {
            showAlert("Deletion Failed", error.message, "danger");
        }

        this.disabled = false;
        this.innerHTML = originalText;
        currentUserIdToDelete = null;
    });

    // --- 7. CLOSE MODALS ---
    document.querySelectorAll('[data-close]').forEach(btn => {
        btn.addEventListener('click', function() {
            this.closest('.modal-overlay').classList.remove('show');
        });
    });

    loadUsers();
});