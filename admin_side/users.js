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
            userTableBody.innerHTML = `<tr><td colspan="5" style="color:var(--danger-red); text-align:center;">Failed to load users.</td></tr>`;
            return;
        }

        allUsers = users || [];
        renderUsers(allUsers);
    }

    function renderUsers(usersToRender) {
        if (usersToRender.length === 0) {
            userTableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 40px; color: var(--text-secondary);">No users found.</td></tr>`;
            return;
        }

        userTableBody.innerHTML = usersToRender.map(user => {
            const avatar = user.profile_picture_path || DEFAULT_AVATAR;
            
            // New simplified badge classes
            let roleBadge = '';
            if (user.role === 'admin') roleBadge = `<span class="badge badge-admin">Admin</span>`;
            else if (user.role === 'banned') roleBadge = `<span class="badge badge-banned">Banned</span>`;
            else roleBadge = `<span class="badge badge-user">User</span>`;

            const verifBadge = user.is_verified 
                ? `<span class="badge badge-verified"><i class="fa-solid fa-check"></i> Verified</span>`
                : `<span class="badge badge-unverified"><i class="fa-solid fa-xmark"></i> Unverified</span>`;

            const encodedUser = encodeURIComponent(JSON.stringify(user)).replace(/'/g, "%27");

            // Build action buttons (Now supports UNBAN)
            let actionBtns = ``;
            actionBtns += `<button class="action-icon-btn primary" onclick="viewUser('${encodedUser}')" title="View Full Profile"><i class="fa-solid fa-eye"></i></button>`;
            actionBtns += `<button class="action-icon-btn primary" style="background-color: var(--text-secondary);" onclick="editUserRole('${user.id}', '${user.role}', '${escapeQuote(user.first_name)} ${escapeQuote(user.last_name)}')" title="Edit Role"><i class="fa-solid fa-pen-to-square"></i></button>`;

            if (user.role === 'banned') {
                actionBtns += `<button class="action-icon-btn success" onclick="confirmUnbanUser('${user.id}', '${escapeQuote(user.first_name)} ${escapeQuote(user.last_name)}')" title="Unban User"><i class="fa-solid fa-unlock"></i></button>`;
            } else if (user.role !== 'admin') {
                actionBtns += `<button class="action-icon-btn warning" onclick="confirmBanUser('${user.id}', '${escapeQuote(user.first_name)} ${escapeQuote(user.last_name)}')" title="Ban User"><i class="fa-solid fa-ban"></i></button>`;
            }
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
                    <td>
                        <div style="font-size: 0.9rem;">${user.course_section || 'N/A'}</div>
                        <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 4px;">${user.address || 'N/A'}</div>
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
            const matchSearch = (u.first_name + ' ' + u.last_name).toLowerCase().includes(term) || u.email.toLowerCase().includes(term);
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

    // --- 4. VIEW USER DETAILS ---
    window.viewUser = function(encodedUser) {
        const user = JSON.parse(decodeURIComponent(encodedUser));
        
        document.getElementById('detail-avatar').src = user.profile_picture_path || DEFAULT_AVATAR;
        document.getElementById('detail-name').textContent = `${user.first_name} ${user.last_name}`;
        
        const roleBadge = document.getElementById('detail-role');
        roleBadge.textContent = user.role.toUpperCase();
        if(user.role === 'admin') roleBadge.className = 'badge badge-admin';
        else if(user.role === 'banned') roleBadge.className = 'badge badge-banned';
        else roleBadge.className = 'badge badge-user';

        const verifBadge = document.getElementById('detail-verification');
        if (user.is_verified) {
            verifBadge.innerHTML = '<i class="fa-solid fa-check"></i> Verified';
            verifBadge.className = 'badge badge-verified';
        } else {
            verifBadge.innerHTML = '<i class="fa-solid fa-xmark"></i> Unverified';
            verifBadge.className = 'badge badge-unverified';
        }

        document.getElementById('detail-email').textContent = user.email;
        document.getElementById('detail-contact').textContent = user.contact_number || 'Not Provided';
        document.getElementById('detail-course').textContent = user.course_section || 'Not Provided';
        document.getElementById('detail-address').textContent = user.address || 'Not Provided';
        
        const d = new Date(user.created_at);
        document.getElementById('detail-joined').textContent = d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

        document.getElementById('viewUserModal').classList.add('show');
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
            showAlert("Role Updated", "The user's permissions have been changed.", "success");
            loadUsers(); 
        } else {
            showAlert("Update Failed", error.message, "danger");
        }
        btn.innerHTML = 'Save Changes'; 
        btn.disabled = false;
    });

    // --- 6. BAN / UNBAN USER ---
    let currentUserIdToBan = null;
    let currentUserIdToUnban = null;

    window.confirmBanUser = function(userId, userName) {
        currentUserIdToBan = userId;
        document.getElementById('banUserName').textContent = userName;
        document.getElementById('banUserModal').classList.add('show');
    };

    document.getElementById('confirm-ban-btn').addEventListener('click', async function() {
        if (!currentUserIdToBan) return;
        const originalText = this.innerHTML;
        this.disabled = true;
        this.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Banning...';

        const { error } = await window.supabase.from('users').update({ role: 'banned' }).eq('id', currentUserIdToBan);

        if (!error) {
            document.getElementById('banUserModal').classList.remove('show');
            showAlert("User Banned", "The user's access has been completely revoked.", "warning");
            loadUsers(); 
        } else {
            showAlert("Ban Failed", error.message, "danger");
        }

        this.disabled = false;
        this.innerHTML = originalText;
        currentUserIdToBan = null;
    });

    // NEW: UNBAN LOGIC
    window.confirmUnbanUser = function(userId, userName) {
        currentUserIdToUnban = userId;
        document.getElementById('unbanUserName').textContent = userName;
        document.getElementById('unbanUserModal').classList.add('show');
    };

    document.getElementById('confirm-unban-btn').addEventListener('click', async function() {
        if (!currentUserIdToUnban) return;
        const originalText = this.innerHTML;
        this.disabled = true;
        this.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Restoring...';

        const { error } = await window.supabase.from('users').update({ role: 'user' }).eq('id', currentUserIdToUnban);

        if (!error) {
            document.getElementById('unbanUserModal').classList.remove('show');
            showAlert("User Restored", "The user's access has been successfully reinstated.", "success");
            loadUsers(); 
        } else {
            showAlert("Restore Failed", error.message, "danger");
        }

        this.disabled = false;
        this.innerHTML = originalText;
        currentUserIdToUnban = null;
    });


    // --- 7. DELETE USER ---
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

    // --- 8. CLOSE MODALS ---
    document.querySelectorAll('[data-close]').forEach(btn => {
        btn.addEventListener('click', function() {
            this.closest('.modal-overlay').classList.remove('show');
        });
    });

    loadUsers();
});