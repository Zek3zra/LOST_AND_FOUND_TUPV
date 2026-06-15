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

    function escapeQuote(str) {
        return (str || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
    }

    // Generic fallback Facebook-style gray silhouette avatar
    const DEFAULT_AVATAR = "data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2394a3b8'%3e%3cpath d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/%3e%3c/svg%3e";

    // ===================================
    // GLOBAL SYSTEM ALERTS
    // ===================================
    function showSuccess(title, message, type = "success") {
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
            titleEl.style.color = "var(--text-secondary)";
            btn.style.backgroundColor = "var(--text-secondary)";
            btn.style.borderColor = "var(--text-secondary)";
        } else {
            titleEl.style.color = "var(--success-green)";
            btn.classList.add('success-override');
        }
        
        modal.classList.add('show');
    }

    document.getElementById('alertOkBtn').addEventListener('click', () => {
        document.getElementById('systemAlertModal').classList.remove('show');
    });

    document.querySelectorAll('[data-close]').forEach(btn => {
        btn.addEventListener('click', function() {
            this.closest('.modal-overlay').classList.remove('show');
        });
    });

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
            itemsContainer.innerHTML = `<tr><td colspan="5" style="color:var(--danger-red); text-align:center; padding:40px;">Error loading posts.</td></tr>`;
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
            if (post.reporter_name_manual) {
                rName = post.reporter_name_manual;
            } else if (post.users) {
                rName = `${post.users.first_name} ${post.users.last_name}`;
                rContact = post.users.email || '';
            }

            const safeItemName = escapeQuote(post.item_name_specific);
            const encodedPost = encodeURIComponent(JSON.stringify(post));

            return `
                <tr class="clickable-row" onclick="openViewDetails('${encodedPost}')">
                    <td>
                        <div style="display: flex; align-items: center; gap: 12px;">
                            ${imgHtml}
                            <div style="font-weight: 600; color: var(--text-primary);">${post.item_name_specific || post.item_category}</div>
                        </div>
                    </td>
                    <td>
                        <div style="font-weight: 500;">${rName}</div>
                        <div style="font-size: 0.8rem; color: var(--text-secondary);">${rContact}</div>
                    </td>
                    <td>
                        <span class="card-type-badge ${badgeClass}">${post.report_type}</span>
                        <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 4px;">${post.item_category}</div>
                    </td>
                    <td>
                        <div style="font-size: 0.9rem;"><i class="fa-solid fa-location-dot" style="width:16px; color:var(--text-secondary);"></i> ${post.item_location}</div>
                        <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 4px;"><i class="fa-solid fa-clock" style="width:16px;"></i> ${dateStr}</div>
                    </td>
                    <td class="actions-col" onclick="event.stopPropagation();">
                        <div class="table-actions">
                            <button class="action-icon-btn success" title="Mark as Resolved (Match)" onclick="openMatchModal('${post.report_id}', '${post.user_id}', '${safeItemName}', '${post.report_type}')"><i class="fa-solid fa-handshake"></i></button>
                            <button class="action-icon-btn warning" title="Archive Post" onclick="openArchiveModal('${post.report_id}')"><i class="fa-solid fa-box-archive"></i></button>
                            <button class="action-icon-btn danger" title="Delete Post" onclick="openDeleteModal('${post.report_id}', '${post.user_id}', '${safeItemName}', '${post.report_type}')"><i class="fa-solid fa-trash-can"></i></button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

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
    // VIEW DETAILS MODAL
    // ===================================
    window.openViewDetails = function(encodedReport) {
        const report = JSON.parse(decodeURIComponent(encodedReport));
        
        const statusBadge = document.getElementById('modal-item-status');
        
        if (report.report_type === 'lost') {
            statusBadge.textContent = 'LOST ITEM';
            statusBadge.style.backgroundColor = 'var(--danger-red)';
            document.getElementById('modal-location-label').textContent = 'Last Seen At';
            document.getElementById('modal-date-label').textContent = 'Lost On';
        } else {
            statusBadge.textContent = 'FOUND ITEM';
            statusBadge.style.backgroundColor = 'var(--primary-blue)';
            document.getElementById('modal-location-label').textContent = 'Found At';
            document.getElementById('modal-date-label').textContent = 'Found On';
        }

        document.getElementById('modal-item-name').textContent = report.item_name_specific || report.item_category;
        document.getElementById('modal-item-category').textContent = report.item_category;
        document.getElementById('modal-item-location').textContent = report.item_location || 'Not Specified';
        
        const dt = new Date(report.item_datetime);
        document.getElementById('modal-item-datetime').textContent = dt.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
        
        const reporterNameEl = document.getElementById('modal-reporter-name');
        const reporterContactEl = document.getElementById('modal-reporter-contact');
        const reporterAcadEl = document.getElementById('modal-reporter-acad');
        
        if (report.reporter_name_manual) {
            reporterNameEl.textContent = `${report.reporter_name_manual} (Walk-in)`;
            reporterContactEl.textContent = report.reporter_contact_manual || 'No contact provided';
            document.getElementById('modal-reporter-avatar').src = DEFAULT_AVATAR;
            
            if (report.reporter_program_manual) {
                reporterAcadEl.textContent = report.reporter_program_manual;
                reporterAcadEl.style.display = 'block';
            } else {
                reporterAcadEl.style.display = 'none';
            }
        } else if (report.users) {
            reporterNameEl.textContent = `${report.users.first_name} ${report.users.last_name}`;
            reporterContactEl.textContent = report.users.email || report.users.contact_number || 'No contact provided'; // Email Prioritized
            document.getElementById('modal-reporter-avatar').src = report.users.profile_picture_path || DEFAULT_AVATAR;
            reporterAcadEl.style.display = 'none'; 
        } else {
            reporterNameEl.textContent = 'Anonymous / Unknown';
            reporterContactEl.textContent = '';
            document.getElementById('modal-reporter-avatar').src = DEFAULT_AVATAR;
            reporterAcadEl.style.display = 'none';
        }

        const publicDescBlock = document.getElementById('public-desc-block');
        if (report.item_description === 'Hidden for security purposes.') {
            publicDescBlock.style.display = 'none';
        } else {
            publicDescBlock.style.display = 'flex';
            document.getElementById('modal-item-description').textContent = report.item_description || 'No description provided.';
        }

        const adminDetailsContainer = document.getElementById('admin-details-container');
        if (report.admin_specific_details) {
            document.getElementById('modal-admin-details').textContent = report.admin_specific_details;
            adminDetailsContainer.style.display = 'flex';
        } else {
            adminDetailsContainer.style.display = 'none';
        }

        const imgContainer = document.getElementById('modal-image-container');
        const itemImg = document.getElementById('modal-item-image');
        const noImg = document.getElementById('modal-no-image');

        if (report.image_path) {
            itemImg.src = report.image_path;
            itemImg.style.display = 'block';
            noImg.style.display = 'none';
            imgContainer.style.display = 'flex';
        } else {
            itemImg.src = '';
            itemImg.style.display = 'none';
            noImg.style.display = 'flex';
            imgContainer.style.display = 'flex'; 
        }

        document.getElementById('viewDetailsModal').classList.add('show');
    };

    // ===================================
    // ARCHIVE POST MODAL
    // ===================================
    let archiveTargetId = null;
    const archiveConfirmationModal = document.getElementById('archiveConfirmationModal');
    
    window.openArchiveModal = function(id) {
        archiveTargetId = id;
        archiveConfirmationModal.classList.add('show');
    };

    document.getElementById('executeArchiveBtn').addEventListener('click', async function() {
        if (!archiveTargetId) return;
        const originalText = this.innerHTML;
        this.disabled = true;
        this.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Archiving...';

        const { error } = await window.supabase.from('item_reports').update({ 
            report_status: 'archived',
            resolved_date: new Date().toISOString()
        }).eq('report_id', archiveTargetId);
        
        if (!error) {
            archiveConfirmationModal.classList.remove('show');
            showSuccess("Post Archived", "The item has been successfully moved to Completed Records.", "warning");
            loadActivePosts();
        } else {
            alert("Archive Failed: " + error.message);
        }
        
        this.disabled = false;
        this.innerHTML = originalText;
    });

    // ===================================
    // DELETE POST MODAL
    // ===================================
    window.openDeleteModal = function(id, userId, itemName, type) {
        document.getElementById('deleteReportId').value = id;
        document.getElementById('deleteUserId').value = userId;
        document.getElementById('deleteItemName').value = itemName;
        document.getElementById('deleteReportType').value = type;
        document.getElementById('deleteReasonText').value = '';
        document.getElementById('deleteReasonModal').classList.add('show');
    };

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

        const { error } = await window.supabase.from('item_reports').delete().eq('report_id', reportId);

        if (!error) {
            if (ownerId && ownerId !== 'null' && ownerId !== 'undefined') {
                await window.supabase.from('notifications').insert([{
                    user_id: ownerId,
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
    // MATCH / RESOLVE LOGIC
    // ===================================
    const matchSearchInput = document.getElementById('matchSearchInput');
    const matchSuggestions = document.getElementById('matchSuggestions');
    const matchSelectedUserId = document.getElementById('matchSelectedUserId');
    const matchConfirmBtn = document.getElementById('matchConfirmBtn');
    
    let isManualMatch = false;

    document.getElementById('toggleManualMatchBtn').addEventListener('click', (e) => {
        isManualMatch = !isManualMatch;
        const input = document.getElementById('matchSearchInput');
        const label = document.getElementById('matchInputLabel');
        const btn = e.target;
        const extraFields = document.getElementById('manualMatchExtraFields');
        
        if (isManualMatch) {
            input.placeholder = "Enter full name of the walk-in student...";
            label.innerHTML = 'Walk-in Student Name <span style="color: var(--danger-red);">*</span>';
            btn.textContent = "Search Registered Users instead";
            matchSuggestions.style.display = 'none';
            matchSelectedUserId.value = '';
            extraFields.style.display = 'block';
        } else {
            input.placeholder = "Type a name or email to search registered users...";
            label.innerHTML = 'Claimed By / Matched To <span style="color: var(--danger-red);">*</span>';
            btn.textContent = "Enter Walk-in / Unregistered Student";
            extraFields.style.display = 'none';
        }
        input.value = '';
        document.getElementById('matchManualContact').value = '';
        document.getElementById('matchManualAcad').value = '';
    });

    window.openMatchModal = function(id, userId, itemName, type) {
        document.getElementById('matchReportId').value = id;
        document.getElementById('matchOriginalReporterId').value = userId; 
        document.getElementById('matchItemName').value = itemName;
        document.getElementById('matchReportType').value = type;
        
        isManualMatch = false;
        document.getElementById('matchInputLabel').innerHTML = 'Claimed By / Matched To <span style="color: var(--danger-red);">*</span>';
        matchSearchInput.placeholder = "Type a name or email to search registered users...";
        document.getElementById('toggleManualMatchBtn').textContent = "Enter Walk-in / Unregistered Student";
        document.getElementById('manualMatchExtraFields').style.display = 'none';
        
        matchSearchInput.value = '';
        matchSelectedUserId.value = '';
        document.getElementById('matchManualContact').value = '';
        document.getElementById('matchManualAcad').value = '';
        matchSuggestions.style.display = 'none';
        
        document.getElementById('matchReportModal').classList.add('show');
    };

    let debounceTimer;
    matchSearchInput.addEventListener('input', (e) => {
        if (isManualMatch) return; 
        
        clearTimeout(debounceTimer);
        matchSelectedUserId.value = ''; 
        const val = e.target.value.trim();
        
        if (val.length < 2) {
            matchSuggestions.style.display = 'none';
            return;
        }

        debounceTimer = setTimeout(async () => {
            const { data, error } = await window.supabase
                .from('users')
                .select('id, first_name, last_name, email, profile_picture_path')
                .or(`first_name.ilike.%${val}%,last_name.ilike.%${val}%,email.ilike.%${val}%`)
                .limit(5);

            if (data && data.length > 0) {
                matchSuggestions.innerHTML = data.map(u => {
                    const avatar = u.profile_picture_path || DEFAULT_AVATAR;
                    return `
                    <div class="suggestion-item" onclick="selectMatchUser('${u.id}', '${escapeQuote(u.first_name)} ${escapeQuote(u.last_name)}')">
                        <img src="${avatar}" class="suggestion-avatar" alt="Avatar">
                        <div>
                            <div style="font-weight: 600;">${u.first_name} ${u.last_name}</div>
                            <div style="font-size: 0.75rem; color: var(--text-secondary);">${u.email}</div>
                        </div>
                    </div>
                `}).join('');
                matchSuggestions.style.display = 'block';
            } else {
                matchSuggestions.innerHTML = `<div style="padding: 10px 14px; font-size: 0.85rem; color: var(--text-secondary);">No registered users found. Click the button below to enter manually.</div>`;
                matchSuggestions.style.display = 'block';
            }
        }, 300);
    });

    window.selectMatchUser = function(id, name) {
        matchSearchInput.value = name;
        matchSelectedUserId.value = id;
        matchSuggestions.style.display = 'none';
    };

    document.addEventListener('click', (e) => {
        if (!e.target.closest('#matchSearchInput') && !e.target.closest('#matchSuggestions')) {
            matchSuggestions.style.display = 'none';
        }
    });

    document.getElementById('matchReportForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const originalText = matchConfirmBtn.innerHTML;
        matchConfirmBtn.disabled = true;
        matchConfirmBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Matching...';

        const reportId = document.getElementById('matchReportId').value;
        const originalReporterId = document.getElementById('matchOriginalReporterId').value;
        const itemName = document.getElementById('matchItemName').value;
        const reportType = document.getElementById('matchReportType').value.toUpperCase(); 
        const personName = matchSearchInput.value.trim();
        const matchedUserId = matchSelectedUserId.value;

        const updatePayload = { 
            report_status: 'matched',
            matched_person_name: personName,
            resolved_date: new Date().toISOString()
        };

        if (isManualMatch) {
            updatePayload.matched_person_contact = document.getElementById('matchManualContact').value.trim();
            updatePayload.matched_person_acad = document.getElementById('matchManualAcad').value.trim();
        }

        const { error: dbError } = await window.supabase
            .from('item_reports')
            .update(updatePayload)
            .eq('report_id', reportId);

        if (!dbError) {
            if (originalReporterId && originalReporterId !== 'null' && originalReporterId !== 'undefined') {
                await window.supabase.from('notifications').insert([{
                    user_id: originalReporterId,
                    message: `Your ${reportType} item report for "${itemName}" has been successfully MATCHED and marked as resolved!`
                }]);
            }

            if (!isManualMatch && matchedUserId) {
                let matchMsg = reportType === 'LOST' 
                    ? `You have been recorded as finding/returning the LOST item: "${itemName}". Thank you for your honesty!`
                    : `You have successfully claimed your FOUND item: "${itemName}".`;
                
                await window.supabase.from('notifications').insert([{
                    user_id: matchedUserId,
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

    const newImageWrapper = document.getElementById('newImageWrapper');
    const newPhotoPreview = document.getElementById('newImagePreview');
    const newPhotoInput = document.getElementById('newPhotoInput');
    const newNoImage = document.getElementById('new-no-image');
    const newRemoveImageBtn = document.getElementById('newRemoveImageBtn');
    
    let newPostImageFile = null;

    openCreatePostBtn.addEventListener('click', () => {
        createPostForm.reset();
        newPostImageFile = null;
        newPhotoPreview.src = '';
        newPhotoPreview.style.display = 'none';
        newNoImage.style.display = 'flex';
        newRemoveImageBtn.style.display = 'none';
        createPostModal.classList.add('show');
    });

    newImageWrapper.addEventListener('click', () => newPhotoInput.click());

    newPhotoInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            newPostImageFile = file;
            const reader = new FileReader();
            reader.onload = (event) => {
                newPhotoPreview.src = event.target.result;
                newPhotoPreview.style.display = 'block';
                newNoImage.style.display = 'none';
                newRemoveImageBtn.style.display = 'flex';
            };
            reader.readAsDataURL(file);
        }
    });

    newRemoveImageBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        newPostImageFile = null;
        newPhotoInput.value = '';
        newPhotoPreview.src = '';
        newPhotoPreview.style.display = 'none';
        newNoImage.style.display = 'flex';
        newRemoveImageBtn.style.display = 'none';
    });

    createPostForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const originalText = submitNewPostBtn.innerHTML;
        submitNewPostBtn.disabled = true;
        submitNewPostBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Publishing...';

        try {
            let publicImageUrl = null;
            if (newPostImageFile) {
                const fileExt = newPostImageFile.name.split('.').pop() || 'png';
                const fileName = `manual_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
                const { error: uploadError } = await window.supabase.storage.from('item-images').upload(fileName, newPostImageFile);
                if (uploadError) throw new Error('Image Upload Failed: ' + uploadError.message);
                const { data } = window.supabase.storage.from('item-images').getPublicUrl(fileName);
                publicImageUrl = data.publicUrl;
            }

            const adminId = sessionStorage.getItem('user_id'); 
            const isFound = document.getElementById('newType').value === 'found';
            const rawDescription = document.getElementById('newDescription').value;

            const payload = {
                user_id: adminId, 
                reporter_name_manual: document.getElementById('newReporterName').value.trim(),
                reporter_contact_manual: document.getElementById('newReporterContact').value.trim(),
                reporter_program_manual: document.getElementById('newReporterProgram').value.trim(),
                report_type: document.getElementById('newType').value,
                item_category: document.getElementById('newCategory').value,
                item_name_specific: document.getElementById('newName').value,
                item_datetime: `${document.getElementById('newDate').value}T${document.getElementById('newTime').value}:00`,
                item_location: document.getElementById('newLocation').value,
                image_path: publicImageUrl,
                report_status: 'approved'
            };

            if (isFound) {
                payload.item_description = "Hidden for security purposes.";
                payload.admin_specific_details = rawDescription;
            } else {
                payload.item_description = rawDescription;
            }

            const { error: dbError } = await window.supabase.from('item_reports').insert([payload]);

            if (dbError) throw new Error('Database Error: ' + dbError.message);
            
            createPostModal.classList.remove('show');
            showSuccess("Post Created", "The manual post has been published directly to the live feed.");
            loadActivePosts();
            
        } catch (error) {
            showAlert("Creation Failed", error.message, "danger");
        } finally {
            submitNewPostBtn.disabled = false;
            submitNewPostBtn.innerHTML = originalText;
        }
    });

    loadActivePosts();
});