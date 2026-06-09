document.addEventListener('DOMContentLoaded', async () => {

    // --- 1. Security Check ---
    const guestMode = sessionStorage.getItem('userType') === 'guest';
    if (!sessionStorage.getItem('user_id') && !guestMode) {
        window.location.href = 'login.html';
        return;
    }

    if (guestMode) {
        document.getElementById('profile-name').textContent = 'Guest User';
        document.getElementById('profile-email').textContent = 'Read-only Access';
        // Disable forms for guests
        document.querySelectorAll('.profile-actions, .user-details-card button').forEach(el => el.style.display = 'none');
    }

    // --- 2. Basic UI & Logout ---
    function updateDateTime() {
        const dt = document.getElementById('current-date-time');
        if(dt) dt.textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
    setInterval(updateDateTime, 1000);
    updateDateTime();

    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('desktop-sidebar');
    if (sidebarToggle && sidebar) sidebarToggle.addEventListener('click', () => sidebar.classList.toggle('collapsed'));

    if (sessionStorage.getItem('role') === 'admin') {
        const adminLink = document.getElementById('admin-dashboard-link');
        if(adminLink) adminLink.classList.remove('hidden');
    }

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            if (!guestMode) await window.supabase.auth.signOut();
            sessionStorage.clear();
            window.location.href = 'login.html';
        });
    }

    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', function() { this.closest('.modal-overlay').classList.remove('show'); });
    });


    // --- 3. Fetch & Display User Data ---
    const userId = sessionStorage.getItem('user_id');

    async function loadUserProfile() {
        if (guestMode) return;

        const { data, error } = await window.supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

        if (data) {
            document.getElementById('profile-name').textContent = `${data.first_name} ${data.last_name}`;
            document.getElementById('profile-email').textContent = data.email;
            document.getElementById('profile-contact').textContent = data.contact_number || 'N/A';
            document.getElementById('profile-course').textContent = data.course_section || 'N/A';
            document.getElementById('profile-address').textContent = data.address || 'N/A';
            
            if (data.profile_picture_path) {
                document.getElementById('profile-picture-img').src = data.profile_picture_path;
            }

            // Pre-fill edit modal
            document.getElementById('edit-first-name').value = data.first_name;
            document.getElementById('edit-last-name').value = data.last_name;
            document.getElementById('edit-contact').value = data.contact_number || '';
            document.getElementById('edit-course').value = data.course_section || '';
            document.getElementById('edit-address').value = data.address || '';
        }
    }
    
    // --- 4. RESTORED: Notifications Fetcher ---
    async function loadNotifications() {
        if (guestMode) return;

        const { data, error } = await window.supabase
            .from('notifications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        const list = document.getElementById('notifications-list');
        const badge = document.getElementById('unread-count');

        if (error || !data || data.length === 0) {
            list.innerHTML = '<p style="color:var(--text-secondary); text-align:center; padding:10px;">No recent notifications.</p>';
            badge.textContent = '0 Unread';
            return;
        }

        let unreadCount = 0;
        list.innerHTML = data.map(n => {
            // Treat 0 as unread, 1 as read (standard boolean handling)
            const isRead = n.is_read == 1 || n.is_read === true;
            if (!isRead) unreadCount++;
            
            const dateStr = new Date(n.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
            
            return `
                <div class="notif-item ${isRead ? '' : 'unread'}" data-id="${n.notification_id}">
                    <div class="notif-content">
                        <p>${n.message || 'New update regarding your report.'}</p>
                        <small>${dateStr}</small>
                    </div>
                    ${!isRead ? `<button class="mark-read-btn" title="Mark as read"><i class="fa-solid fa-check"></i></button>` : ''}
                </div>
            `;
        }).join('');

        badge.textContent = `${unreadCount} Unread`;

        // Attach listeners to checkmarks
        document.querySelectorAll('.mark-read-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const item = e.target.closest('.notif-item');
                const notifId = item.dataset.id;
                
                // Visual feedback immediately
                item.style.opacity = '0.5';
                
                // Update Supabase
                await window.supabase
                    .from('notifications')
                    .update({ is_read: 1 })
                    .eq('notification_id', notifId);
                
                // Refresh list
                loadNotifications();
            });
        });
    }

    // Initialize both Data and Notifications
    loadUserProfile();
    loadNotifications();

    // --- 5. Handle Profile Editing ---
    document.getElementById('edit-profile-btn').addEventListener('click', () => {
        document.getElementById('edit-profile-modal').classList.add('show');
    });

    document.getElementById('edit-profile-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('save-profile-btn');
        btn.textContent = 'Saving...';
        btn.disabled = true;

        const updates = {
            first_name: document.getElementById('edit-first-name').value,
            last_name: document.getElementById('edit-last-name').value,
            contact_number: document.getElementById('edit-contact').value,
            course_section: document.getElementById('edit-course').value,
            address: document.getElementById('edit-address').value
        };

        const { error } = await window.supabase.from('users').update(updates).eq('id', userId);

        if (!error) {
            sessionStorage.setItem('user_name', `${updates.first_name} ${updates.last_name}`);
            document.getElementById('edit-profile-modal').classList.remove('show');
            loadUserProfile(); 
        } else {
            alert('Failed to update profile: ' + error.message);
        }

        btn.textContent = 'Save Changes';
        btn.disabled = false;
    });

    // --- 6. Handle Password Change ---
    document.getElementById('change-pwd-btn').addEventListener('click', () => {
        document.getElementById('change-pwd-modal').classList.add('show');
    });

    document.getElementById('change-pwd-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const newPwd = document.getElementById('new-pwd').value;
        const confirmPwd = document.getElementById('confirm-pwd').value;

        if (newPwd !== confirmPwd) {
            alert("New passwords do not match!");
            return;
        }

        const btn = document.getElementById('save-pwd-btn');
        btn.textContent = 'Updating...';
        btn.disabled = true;

        const { error } = await window.supabase.auth.updateUser({ password: newPwd });

        if (!error) {
            alert("Password updated successfully!");
            document.getElementById('change-pwd-modal').classList.remove('show');
            document.getElementById('change-pwd-form').reset();
        } else {
            alert("Failed to update password: " + error.message);
        }

        btn.textContent = 'Update Password';
        btn.disabled = false;
    });

    // --- 7. Handle Profile Picture Upload ---
    const pfpTrigger = document.getElementById('pfp-trigger');
    const pfpInput = document.getElementById('pfp-upload-input');

    if (pfpTrigger && !guestMode) {
        pfpTrigger.addEventListener('click', () => pfpInput.click());
    }

    pfpInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        document.getElementById('profile-picture-img').style.opacity = '0.5';

        const fileExt = file.name.split('.').pop();
        const fileName = `pfp_${userId}_${Date.now()}.${fileExt}`;

        const { error: uploadError } = await window.supabase.storage
            .from('profile-picture-img')
            .upload(fileName, file);

        if (uploadError) {
            alert("Failed to upload image: " + uploadError.message);
            document.getElementById('profile-picture-img').style.opacity = '1';
            return;
        }

        const { data: publicUrlData } = window.supabase.storage
            .from('profile-picture-img')
            .getPublicUrl(fileName);

        const publicUrl = publicUrlData.publicUrl;

        const { error: dbError } = await window.supabase
            .from('users')
            .update({ profile_picture_path: publicUrl })
            .eq('id', userId);

        if (!dbError) {
            document.getElementById('profile-picture-img').src = publicUrl;
        } else {
            alert("Failed to save image path to database.");
        }
        
        document.getElementById('profile-picture-img').style.opacity = '1';
    });

    // --- 8. Handle Account Deletion ---
    document.getElementById('delete-account-btn').addEventListener('click', () => {
        document.getElementById('delete-account-modal').classList.add('show');
    });

    document.getElementById('confirm-delete-btn').addEventListener('click', async () => {
        const btn = document.getElementById('confirm-delete-btn');
        btn.textContent = 'Deleting...';
        btn.disabled = true;

        const { error } = await window.supabase.from('users').delete().eq('id', userId);

        if (!error) {
            await window.supabase.auth.signOut();
            sessionStorage.clear();
            alert("Your account has been successfully deleted.");
            window.location.href = 'landing.html';
        } else {
            alert("Failed to delete account: " + error.message);
            btn.textContent = 'Yes, Delete My Account';
            btn.disabled = false;
        }
    });
});