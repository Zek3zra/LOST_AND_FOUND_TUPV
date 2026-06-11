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

    // --- 2. FETCH AND RENDER USERS ---
    const userTableBody = document.getElementById('userTableBody');
    let allUsers = [];

    async function loadUsers() {
        const { data: users, error } = await window.supabase
            .from('users')
            .select('id, first_name, last_name, email, role, is_verified, profile_picture_path')
            .order('created_at', { ascending: false });

        if (error) {
            userTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color: var(--danger-red);">Error loading users: ${error.message}</td></tr>`;
            return;
        }

        allUsers = users || [];
        renderUsers(allUsers);
    }

    function renderUsers(usersToRender) {
        if (usersToRender.length === 0) {
            userTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; color: var(--text-secondary); padding: 40px;">No users found.</td></tr>';
            return;
        }

        userTableBody.innerHTML = usersToRender.map(user => {
            const avatar = user.profile_picture_path || '../images/default-avatar.png';
            const statusClass = user.is_verified ? 'success-green' : 'accent-amber';
            const statusText = user.is_verified ? 'Verified' : 'Pending';

            return `
                <tr data-user-id="${user.id}">
                    <td>
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <img src="${avatar}" style="width:36px; height:36px; border-radius:50%; object-fit:cover; border: 1px solid var(--border-light);">
                            <span style="font-weight:600; color: var(--text-primary);">${user.first_name} ${user.last_name}</span>
                        </div>
                    </td>
                    <td style="color: var(--text-secondary);">${user.email}</td>
                    <td><span style="background-color: var(--${statusClass}); color: white; padding: 4px 10px; border-radius: 12px; font-size: 0.8rem; font-weight: 500;">${statusText}</span></td>
                    <td style="text-transform: capitalize; font-weight: 500;">${user.role}</td>
                    <td style="text-align: right;">
                        <div style="display:flex; gap:8px; justify-content:flex-end;">
                            <button class="badge-btn" title="View Full Details" onclick="viewUserDetails('${user.id}')"><i class="fa-solid fa-eye"></i></button>
                            <button class="badge-btn" title="Open Support Chat" onclick="openSupportChat('${user.id}')"><i class="fa-solid fa-comment-dots"></i></button>
                            <button class="badge-btn" title="Edit Role" onclick="openEditModal('${user.id}', '${user.role}', '${user.first_name}')"><i class="fa-solid fa-user-shield"></i></button>
                            <button class="badge-btn" style="color: var(--danger-red); border-color: #fca5a5;" title="Delete User" onclick="confirmDeleteUser('${user.id}', '${user.first_name} ${user.last_name}')"><i class="fa-solid fa-trash-can"></i></button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // --- 3. SEARCH LISTENER ---
    document.getElementById('searchInput').addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = allUsers.filter(u => 
            `${u.first_name} ${u.last_name}`.toLowerCase().includes(term) ||
            u.email.toLowerCase().includes(term) ||
            u.role.toLowerCase().includes(term)
        );
        renderUsers(filtered);
    });

    // --- 4. VIEW COMPREHENSIVE USER DETAILS ---
    window.viewUserDetails = async function(userId) {
        const detailsContainer = document.getElementById('modal-user-details');
        detailsContainer.innerHTML = '<div style="text-align:center; padding: 40px; color: var(--text-secondary);"><i class="fa-solid fa-circle-notch fa-spin"></i> Fetching profile & records...</div>';
        document.getElementById('viewUserModal').classList.add('show');

        try {
            // 1. Fetch User Data
            const { data: user, error: userErr } = await window.supabase.from('users').select('*').eq('id', userId).single();
            if (userErr) throw userErr;

            // 2. Fetch User's Latest Record from item_reports
            const { data: reports, error: repErr } = await window.supabase.from('item_reports')
                .select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(1);
            
            let reportHtml = '<p style="color: var(--text-secondary); font-size: 0.9rem; font-style: italic;">No items reported by this user yet.</p>';
            
            if (reports && reports.length > 0) {
                const r = reports[0];
                const rDate = new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                
                // Color code the status badge dynamically
                let statusColor = 'var(--accent-amber)';
                if (r.report_status === 'approved') statusColor = 'var(--primary-blue)';
                if (r.report_status === 'matched' || r.report_status === 'archived') statusColor = 'var(--success-green)';

                reportHtml = `
                    <div style="background: var(--bg-body); padding: 16px; border-radius: 12px; border: 1px solid var(--border-light); margin-top: 8px;">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                            <strong style="color: var(--text-primary); font-size: 1.05rem;">${r.item_name_specific}</strong>
                            <span style="background: ${statusColor}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; text-transform: uppercase;">${r.report_status}</span>
                        </div>
                        <p style="margin-bottom: 4px; font-size: 0.9rem; color: var(--text-secondary);"><strong>Type:</strong> <span style="text-transform: capitalize;">${r.report_type} Item</span></p>
                        <p style="margin-bottom: 4px; font-size: 0.9rem; color: var(--text-secondary);"><strong>Category:</strong> ${r.item_category}</p>
                        <p style="margin-bottom: 0; font-size: 0.9rem; color: var(--text-secondary);"><strong>Submitted:</strong> ${rDate}</p>
                    </div>
                `;
            }

            // Build Comprehensive Layout
            const joinDate = new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
            const avatar = user.profile_picture_path || '../images/default-avatar.png';
            
            detailsContainer.innerHTML = `
                <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 24px; padding-bottom: 20px; border-bottom: 1px solid var(--border-light);">
                    <img src="${avatar}" style="width: 70px; height: 70px; border-radius: 50%; object-fit: cover; border: 2px solid var(--border-light); box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                    <div>
                        <h4 style="font-size: 1.25rem; color: var(--text-primary); margin-bottom: 4px;">${user.first_name} ${user.last_name}</h4>
                        <span style="font-size: 0.8rem; background: var(--primary-blue); color: white; padding: 3px 10px; border-radius: 12px; text-transform: capitalize; font-weight: 500;">${user.role} Account</span>
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; font-size: 0.95rem;">
                    <div style="background: var(--bg-body); padding: 12px; border-radius: 8px; border: 1px solid var(--border-light);">
                        <strong style="font-size: 0.8rem; color: var(--text-secondary); text-transform: uppercase;">Email Address</strong><br>
                        <span style="color: var(--text-primary); font-weight: 500;">${user.email}</span>
                    </div>
                    <div style="background: var(--bg-body); padding: 12px; border-radius: 8px; border: 1px solid var(--border-light);">
                        <strong style="font-size: 0.8rem; color: var(--text-secondary); text-transform: uppercase;">Contact #</strong><br>
                        <span style="color: var(--text-primary); font-weight: 500;">${user.contact_number || 'Not Provided'}</span>
                    </div>
                    <div style="background: var(--bg-body); padding: 12px; border-radius: 8px; border: 1px solid var(--border-light);">
                        <strong style="font-size: 0.8rem; color: var(--text-secondary); text-transform: uppercase;">Course / Section</strong><br>
                        <span style="color: var(--text-primary); font-weight: 500;">${user.course_section || 'Not Provided'}</span>
                    </div>
                    <div style="background: var(--bg-body); padding: 12px; border-radius: 8px; border: 1px solid var(--border-light);">
                        <strong style="font-size: 0.8rem; color: var(--text-secondary); text-transform: uppercase;">Home Address</strong><br>
                        <span style="color: var(--text-primary); font-weight: 500;">${user.address || 'Not Provided'}</span>
                    </div>
                    <div style="grid-column: 1 / -1; background: var(--bg-body); padding: 12px; border-radius: 8px; border: 1px solid var(--border-light);">
                        <strong style="font-size: 0.8rem; color: var(--text-secondary); text-transform: uppercase;">Member Since</strong><br>
                        <span style="color: var(--text-primary); font-weight: 500;">${joinDate}</span>
                    </div>
                </div>
                
                <h5 style="font-size: 1.05rem; color: var(--text-primary); margin-bottom: 12px;">Most Recent Report</h5>
                ${reportHtml}
            `;

        } catch (error) {
            detailsContainer.innerHTML = `<div style="color: var(--danger-red); text-align: center; padding: 20px;">Failed to load user records: ${error.message}</div>`;
        }
    };

    // --- 5. REDIRECT TO MESSENGER ---
    window.openSupportChat = function(userId) {
        // We drop a pin in sessionStorage so messages.html knows exactly who to open
        sessionStorage.setItem('targetChatUserId', userId);
        window.location.href = 'messages.html';
    };

    // --- 6. SIMPLIFIED EDIT ROLE ---
    window.openEditModal = function(userId, currentRole, firstName) {
        document.getElementById('editUserId').value = userId;
        document.getElementById('editRole').value = currentRole;
        document.getElementById('editUserName').textContent = firstName;
        document.getElementById('editUserModal').classList.add('show');
    };

    document.getElementById('editUserForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const uId = document.getElementById('editUserId').value;
        const newRole = document.getElementById('editRole').value;
        
        const btn = document.getElementById('saveEditBtn');
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...'; 
        btn.disabled = true;

        // ONLY updates the role, ignores verification status entirely
        const { error } = await window.supabase.from('users').update({ role: newRole }).eq('id', uId);
        
        if(!error) {
            document.getElementById('editUserModal').classList.remove('show');
            loadUsers(); // Refresh table
        } else {
            alert("Update failed: " + error.message);
        }
        btn.innerHTML = 'Save Changes'; 
        btn.disabled = false;
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
            loadUsers(); // Refresh table
        } else {
            alert('Error: Could not delete user. ' + error.message);
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

    // Initialize
    loadUsers();
});