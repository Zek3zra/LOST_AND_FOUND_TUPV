document.addEventListener('DOMContentLoaded', async () => {

    const userRole = sessionStorage.getItem('role');
    if (userRole !== 'admin') { window.location.href = '../login.html'; return; }
    document.getElementById('admin-name').textContent = sessionStorage.getItem('user_name') || 'Site Administrator';

    document.getElementById('admin-logout-btn').addEventListener('click', async (e) => {
        e.preventDefault();
        await window.supabase.auth.signOut();
        sessionStorage.clear();
        window.location.href = '../login.html';
    });

    const hamburger = document.getElementById('hamburger');
    const sidebar = document.getElementById('sidebar');
    if (hamburger && sidebar) hamburger.addEventListener('click', () => sidebar.classList.toggle('open'));

    // Helper Function to escape quotes for HTML strings
    function escapeQuote(str) {
        return (str || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
    }

    // ===================================
    // FETCH & RENDER LIVE POSTS
    // ===================================
    const itemsContainer = document.getElementById('itemsContainer');
    let allPostsData = [];

    async function loadActivePosts() {
        const { data: posts, error } = await window.supabase
            .from('item_reports')
            .select('*, users(first_name, last_name, email, contact_number)')
            .eq('report_status', 'approved')
            .order('created_at', { ascending: false });

        if (error) {
            itemsContainer.innerHTML = `<tr><td colspan="5" style="color:red; text-align:center; padding:40px;">Error loading posts.</td></tr>`;
            return;
        }

        allPostsData = posts || [];
        renderPosts(allPostsData);
    }

    function renderPosts(posts) {
        if (posts.length === 0) {
            itemsContainer.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 60px; color: var(--text-secondary);">No active posts match your criteria.</td></tr>`;
            return;
        }

        itemsContainer.innerHTML = posts.map(post => {
            const dateObj = new Date(post.item_datetime);
            const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            
            let imgHtml = post.image_path 
                ? `<img src="${post.image_path}" style="width:48px; height:48px; border-radius:8px; object-fit:cover; border: 1px solid var(--border-light);">` 
                : `<div style="width:48px; height:48px; border-radius:8px; background:var(--bg-body); border: 1px solid var(--border-light); display:flex; align-items:center; justify-content:center; color:var(--text-secondary);"><i class="fa-solid fa-image"></i></div>`;

            let badgeClass = post.report_type === 'lost' ? 'badge-lost' : 'badge-found';
            
            let rName = 'Manual Post';
            let rContact = post.reporter_contact_manual || '';
            if (post.users) {
                rName = `${post.users.first_name} ${post.users.last_name}`;
                rContact = post.users.email || '';
            } else if (post.reporter_name_manual) {
                rName = post.reporter_name_manual;
            }

            const safeItemName = escapeQuote(post.item_name_specific);

            return `
                <tr>
                    <td>
                        <div style="display: flex; align-items: center; gap: 12px;">
                            ${imgHtml}
                            <div>
                                <div style="font-weight: 600; color: var(--text-primary);">${post.item_name_specific}</div>
                                <div style="font-size: 0.8rem; color: var(--text-secondary); max-width: 250px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${escapeQuote(post.item_description)}">${post.item_description || 'No public description.'}</div>
                            </div>
                        </div>
                    </td>
                    <td>
                        <div style="font-weight: 500;">${rName}</div>
                        <div style="font-size: 0.8rem; color: var(--text-secondary);">${rContact}</div>
                    </td>
                    <td>
                        <span class="card-type-badge ${badgeClass}" style="position: static; box-shadow: none;">${post.report_type}</span>
                        <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 4px;">${post.item_category}</div>
                    </td>
                    <td>
                        <div style="font-size: 0.9rem;"><i class="fa-solid fa-location-dot" style="width:16px; color:var(--text-secondary);"></i> ${post.item_location}</div>
                        <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 4px;"><i class="fa-solid fa-clock" style="width:16px;"></i> ${dateStr}</div>
                    </td>
                    <td style="text-align: right; white-space: nowrap;">
                        <button class="action-icon-btn success" title="Mark as Resolved (Match)" onclick="openMatchModal('${post.report_id}', '${post.user_id}', '${safeItemName}', '${post.report_type}')"><i class="fa-solid fa-handshake"></i></button>
                        <button class="action-icon-btn warning" title="Archive Post" onclick="archivePost('${post.report_id}')"><i class="fa-solid fa-folder-minus"></i></button>
                        <button class="action-icon-btn danger" title="Delete Post" onclick="openDeleteModal('${post.report_id}', '${post.user_id}', '${safeItemName}', '${post.report_type}')"><i class="fa-solid fa-trash-can"></i></button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    loadActivePosts();

    // ===================================
    // FILTERING & SEARCH
    // ===================================
    const searchInput = document.getElementById('searchInput');
    const typeFilter = document.getElementById('typeFilter');
    const categoryFilter = document.getElementById('categoryFilter');

    function filterPosts() {
        const term = searchInput.value.toLowerCase();
        const type = typeFilter.value;
        const cat = categoryFilter.value;

        const filtered = allPostsData.filter(p => {
            const matchSearch = (p.item_name_specific && p.item_name_specific.toLowerCase().includes(term)) || 
                                (p.item_category && p.item_category.toLowerCase().includes(term));
            const matchType = type === 'all' || p.report_type === type;
            const matchCat = cat === 'all' || p.item_category === cat;
            return matchSearch && matchType && matchCat;
        });
        renderPosts(filtered);
    }

    searchInput.addEventListener('input', filterPosts);
    typeFilter.addEventListener('change', filterPosts);
    categoryFilter.addEventListener('change', filterPosts);


    // ===================================
    // GLOBAL MODAL HELPERS
    // ===================================
    document.querySelectorAll('[data-close]').forEach(btn => {
        btn.addEventListener('click', function() {
            this.closest('.modal-overlay').classList.remove('show');
        });
    });

    function showSuccess(title, message, type = "success") {
        const modal = document.getElementById('successModal');
        const icon = document.getElementById('success-icon');
        const titleEl = document.getElementById('success-title');
        
        titleEl.textContent = title;
        document.getElementById('success-message').textContent = message;
        
        if (type === 'danger') {
            titleEl.style.color = "var(--danger-red)";
            icon.className = "fa-solid fa-trash-can";
            icon.parentElement.style.color = "var(--danger-red)";
        } else if (type === 'warning') {
            titleEl.style.color = "var(--text-secondary)";
            icon.className = "fa-solid fa-folder-minus";
            icon.parentElement.style.color = "var(--text-secondary)";
        } else {
            titleEl.style.color = "var(--success-green)";
            icon.className = "fa-solid fa-handshake";
            icon.parentElement.style.color = "var(--success-green)";
        }
        
        modal.classList.add('show');
    }

    document.getElementById('successOkBtn').addEventListener('click', () => {
        document.getElementById('successModal').classList.remove('show');
    });


    // ===================================
    // DIRECT ACTIONS (RESOLVE, ARCHIVE, DELETE)
    // ===================================

    // 1. OPEN MATCH (RESOLVE) MODAL
    window.openMatchModal = function(id, userId, itemName, type) {
        document.getElementById('matchReportId').value = id;
        document.getElementById('matchUserId').value = userId;
        document.getElementById('matchItemName').value = itemName;
        document.getElementById('matchReportType').value = type;
        
        document.getElementById('matchSearchInput').value = '';
        document.getElementById('matchSelectedUserId').value = '';
        document.getElementById('matchSuggestions').style.display = 'none';
        
        document.getElementById('matchReportModal').classList.add('show');
    };

    // 2. ARCHIVE POST (1-CLICK)
    window.archivePost = async function(reportId) {
        if (!confirm("Are you sure you want to instantly archive this post?")) return;
        const { error } = await window.supabase.from('item_reports').update({ report_status: 'archived' }).eq('report_id', reportId);
        if (!error) {
            showSuccess("Post Archived", "The item has been successfully moved to Completed Records.", "warning");
            loadActivePosts();
        } else {
            alert("Error archiving post: " + error.message);
        }
    };

    // 3. OPEN DELETE REASON MODAL
    window.openDeleteModal = function(id, userId, itemName, type) {
        document.getElementById('deleteReportId').value = id;
        document.getElementById('deleteUserId').value = userId;
        document.getElementById('deleteItemName').value = itemName;
        document.getElementById('deleteReportType').value = type;
        document.getElementById('deleteReasonText').value = '';
        document.getElementById('deleteReasonModal').classList.add('show');
    };

    // SUBMIT DELETE REASON
    document.getElementById('deleteReasonForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('deleteConfirmBtn');
        const origText = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Deleting...';
        btn.disabled = true;

        const reportId = document.getElementById('deleteReportId').value;
        const ownerId = document.getElementById('deleteUserId').value;
        const itemName = document.getElementById('deleteItemName').value;
        const reportType = document.getElementById('deleteReportType').value.toUpperCase();
        const reason = document.getElementById('deleteReasonText').value.trim();

        // Delete from DB completely
        const { error } = await window.supabase.from('item_reports').delete().eq('report_id', reportId);

        if (!error) {
            if (ownerId && ownerId !== 'null') {
                await window.supabase.from('notifications').insert([{
                    user_id: ownerId,
                    report_id: reportId,
                    message: `Your active ${reportType} post for "${itemName}" was removed by the administrator. Reason: ${reason}`
                }]);
            }
            document.getElementById('deleteReasonModal').classList.remove('show');
            showSuccess("Post Deleted", "The post has been removed and the reporter was notified.", "danger");
            loadActivePosts();
        } else {
            alert("Delete failed: " + error.message);
        }

        btn.innerHTML = origText;
        btn.disabled = false;
    });


    // ===================================
    // AUTOCOMPLETE MATCHING SYSTEM LOGIC
    // ===================================
    const matchSearchInput = document.getElementById('matchSearchInput');
    const matchSuggestions = document.getElementById('matchSuggestions');
    const matchSelectedUserId = document.getElementById('matchSelectedUserId');
    const matchConfirmBtn = document.getElementById('matchConfirmBtn');

    let debounceTimer;
    matchSearchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        const val = e.target.value.trim();
        matchSelectedUserId.value = ''; 
        
        if (val.length < 2) {
            matchSuggestions.style.display = 'none';
            return;
        }

        debounceTimer = setTimeout(async () => {
            const { data, error } = await window.supabase
                .from('users')
                .select('id, first_name, last_name, email')
                .or(`first_name.ilike.%${val}%,last_name.ilike.%${val}%,email.ilike.%${val}%`)
                .limit(5);

            if (data && data.length > 0) {
                matchSuggestions.innerHTML = data.map(u => `
                    <div class="suggestion-item" data-id="${u.id}" data-name="${u.first_name} ${u.last_name}">
                        <div style="font-weight: 600;">${u.first_name} ${u.last_name}</div>
                        <div style="font-size: 0.8rem; color: var(--text-secondary);">${u.email}</div>
                    </div>
                `).join('');
                matchSuggestions.style.display = 'block';
            } else {
                matchSuggestions.style.display = 'none';
            }
        }, 300);
    });

    matchSuggestions.addEventListener('click', (e) => {
        const item = e.target.closest('.suggestion-item');
        if (item) {
            matchSearchInput.value = item.dataset.name;
            matchSelectedUserId.value = item.dataset.id;
            matchSuggestions.style.display = 'none';
        }
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('#matchSearchInput') && !e.target.closest('#matchSuggestions')) {
            matchSuggestions.style.display = 'none';
        }
    });

    // Submit Match Update to Database
    document.getElementById('matchReportForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const originalText = matchConfirmBtn.innerHTML;
        matchConfirmBtn.disabled = true;
        matchConfirmBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Matching...';

        const reportId = document.getElementById('matchReportId').value;
        const ownerId = document.getElementById('matchUserId').value;
        const itemName = document.getElementById('matchItemName').value;
        const reportType = document.getElementById('matchReportType').value.toUpperCase(); 
        const personName = matchSearchInput.value.trim();
        const matchedUserId = matchSelectedUserId.value;

        const { error: dbError } = await window.supabase
            .from('item_reports')
            .update({ 
                report_status: 'matched',
                matched_person_name: personName 
            })
            .eq('report_id', reportId);

        if (!dbError) {
            // Notify Original Reporter
            if (ownerId && ownerId !== 'null') {
                await window.supabase.from('notifications').insert([{
                    user_id: ownerId,
                    report_id: reportId,
                    message: `Your ${reportType} item report for "${itemName}" has been successfully MATCHED and marked as resolved!`
                }]);
            }

            // Notify Auto-Completed Matched User
            if (matchedUserId) {
                let matchMsg = reportType === 'LOST' 
                    ? `You have been recorded as finding/returning the LOST item: "${itemName}". Thank you for your honesty!`
                    : `You have successfully claimed your FOUND item: "${itemName}".`;
                
                await window.supabase.from('notifications').insert([{
                    user_id: matchedUserId,
                    report_id: reportId,
                    message: matchMsg
                }]);
            }

            document.getElementById('matchReportModal').classList.remove('show');
            showSuccess("Item Matched!", "The item has been successfully resolved and users notified.");
            loadActivePosts(); 
        } else {
            alert("Error matching report: " + dbError.message);
        }

        matchConfirmBtn.disabled = false;
        matchConfirmBtn.innerHTML = originalText;
    });

    // ===================================
    // CREATE MANUAL POST
    // ===================================
    const createPostModal = document.getElementById('createPostModal');
    const openCreatePostBtn = document.getElementById('openCreatePostBtn');
    const createPostForm = document.getElementById('createPostForm');
    const submitNewPostBtn = document.getElementById('submitNewPostBtn');

    const newPhotoPreview = document.getElementById('newPhotoPreview');
    const newPhotoInput = document.getElementById('newPhotoInput');
    let newPostImageFile = null;

    openCreatePostBtn.addEventListener('click', () => {
        createPostForm.reset();
        newPostImageFile = null;
        newPhotoPreview.innerHTML = '<span><i class="fa-solid fa-camera"></i> Click to upload</span>';
        createPostModal.classList.add('show');
    });

    newPhotoPreview.addEventListener('click', () => newPhotoInput.click());

    newPhotoInput.addEventListener('change', (e) => {
        newPostImageFile = e.target.files[0];
        if (newPostImageFile) {
            const reader = new FileReader();
            reader.onload = (event) => {
                newPhotoPreview.innerHTML = `<img src="${event.target.result}" style="width:100%; height:100%; object-fit:cover;">`;
            };
            reader.readAsDataURL(newPostImageFile);
        }
    });

    createPostForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const originalText = submitNewPostBtn.innerHTML;
        submitNewPostBtn.disabled = true;
        submitNewPostBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Publishing...';

        try {
            let publicImageUrl = null;
            if (newPostImageFile) {
                const fileExt = newPostImageFile.name.split('.').pop();
                const fileName = `manual_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
                const { error: uploadError } = await window.supabase.storage.from('item-images').upload(fileName, newPostImageFile);
                if (uploadError) throw new Error('Image Upload Failed: ' + uploadError.message);
                const { data: publicUrlData } = window.supabase.storage.from('item-images').getPublicUrl(fileName);
                publicImageUrl = publicUrlData.publicUrl;
            }

            const adminId = sessionStorage.getItem('user_id'); 
            const { error: dbError } = await window.supabase.from('item_reports').insert([{
                    user_id: adminId, 
                    reporter_name_manual: document.getElementById('newReporterName').value.trim(),
                    reporter_contact_manual: document.getElementById('newReporterContact').value.trim(),
                    report_type: document.getElementById('newType').value,
                    item_category: document.getElementById('newCategory').value,
                    item_name_specific: document.getElementById('newName').value,
                    item_description: document.getElementById('newDescription').value,
                    item_datetime: `${document.getElementById('newDate').value} ${document.getElementById('newTime').value}:00`,
                    item_location: document.getElementById('newLocation').value,
                    image_path: publicImageUrl,
                    report_status: 'approved'
                }]);

            if (dbError) throw new Error('Database Error: ' + dbError.message);
            createPostModal.classList.remove('show');
            showSuccess("Post Created", "The manual post has been published to the live feed.");
            loadActivePosts();
        } catch (error) {
            alert(error.message);
        } finally {
            submitNewPostBtn.disabled = false;
            submitNewPostBtn.innerHTML = originalText;
        }
    });
});