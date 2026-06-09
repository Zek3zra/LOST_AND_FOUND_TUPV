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

    // ===================================
    // FETCH & RENDER LIVE POSTS
    // ===================================
    const itemsContainer = document.getElementById('itemsContainer');
    let allPostsData = [];

    async function loadActivePosts() {
        const { data: posts, error } = await window.supabase
            .from('item_reports')
            .select('*, users(first_name, last_name, contact_number)')
            .eq('report_status', 'approved')
            .order('created_at', { ascending: false });

        if (error) {
            itemsContainer.innerHTML = `<p style="color:red; text-align:center; grid-column: 1/-1;">Error loading posts.</p>`;
            return;
        }

        allPostsData = posts || [];
        renderPosts();
    }

    function renderPosts() {
        if (allPostsData.length === 0) {
            itemsContainer.innerHTML = `<p style="text-align:center; color:var(--text-secondary); grid-column: 1/-1;">No active posts found. Feed is clean!</p>`;
            return;
        }

        itemsContainer.innerHTML = allPostsData.map(post => {
            const dateStr = new Date(post.item_datetime).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            let badgeColor = post.report_type === 'lost' ? 'var(--danger-red)' : 'var(--success-green)';
            let badgeText = post.report_type.toUpperCase();

            let reporterName = 'Admin Post';
            if (post.reporter_name_manual) {
                reporterName = post.reporter_name_manual + ' (Walk-in)';
            } else if (post.users) {
                reporterName = `${post.users.first_name} ${post.users.last_name}`;
            }

            const imgHtml = post.image_path 
                ? `<img src="${post.image_path}" style="width:100%; height:200px; object-fit:cover;">`
                : `<div style="width:100%; height:200px; background:#e2e8f0; display:flex; align-items:center; justify-content:center; color:#94a3b8;">No Image</div>`;

            const postJSON = encodeURIComponent(JSON.stringify(post));
            const reporterJSON = encodeURIComponent(reporterName);
            
            const archiveBtn = `<button style="background:none; border:none; cursor:pointer; color: var(--text-secondary); padding: 6px; font-size: 1.1rem; transition: color 0.2s;" onmouseover="this.style.color='var(--danger-red)'" onmouseout="this.style.color='var(--text-secondary)'" onclick="archivePost('${post.report_id}')" title="Move to completed records without matching"><i class="fa-solid fa-folder-minus"></i></button>`;
            const matchBtn = `<button class="modal-btn cancel-btn" style="padding: 6px 12px; font-size: 0.8rem; color: var(--primary-blue); border-color: var(--primary-blue);" onclick="openMatchModal('${post.report_id}', '${post.user_id}', '${post.report_type}', '${reporterJSON}')"><i class="fa-solid fa-handshake"></i> Resolve</button>`;

            return `
                <div class="item-card" data-category="${post.report_type}" data-date="${post.created_at}">
                    <div style="position:relative;">
                        ${imgHtml}
                        <span class="badge" style="position:absolute; top:12px; right:12px; background:${badgeColor}; color:white;">${badgeText}</span>
                    </div>
                    <div class="card-body">
                        <h4>${post.item_name_specific || post.item_category}</h4>
                        <p><i class="fa-solid fa-location-dot"></i> ${post.item_location}</p>
                        <p><i class="fa-solid fa-calendar"></i> ${dateStr}</p>
                        
                        <div class="card-actions">
                            <button class="modal-btn cancel-btn" style="padding: 6px 12px; font-size: 0.8rem;" onclick="viewDetails('${postJSON}', '${reporterJSON}')">Details</button>
                            <div style="display:flex; gap: 8px; align-items:center;">
                                ${archiveBtn}
                                ${matchBtn}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        applyFilters();
    }

    loadActivePosts();

    // ===================================
    // FILTERING, SEARCHING, SORTING
    // ===================================
    const tabButtons = document.querySelectorAll('.tab-btn');
    const searchInput = document.getElementById('searchInput');
    const sortSelect = document.getElementById('sortSelect');

    function applyFilters() {
        const activeTab = document.querySelector('.tab-btn.active').dataset.filter;
        const searchTerm = searchInput.value.toLowerCase();
        const cards = Array.from(itemsContainer.querySelectorAll('.item-card'));
        
        cards.sort((a, b) => {
            const dateA = new Date(a.dataset.date);
            const dateB = new Date(b.dataset.date);
            return sortSelect.value === 'newest' ? dateB - dateA : dateA - dateB;
        });
        
        cards.forEach(card => itemsContainer.appendChild(card));

        cards.forEach(card => {
            const category = card.dataset.category;
            const textContent = card.innerText.toLowerCase();
            const matchesTab = activeTab === 'all' || category === activeTab;
            const matchesSearch = textContent.includes(searchTerm);
            
            if (matchesTab && matchesSearch) card.style.display = 'flex';
            else card.style.display = 'none';
        });
    }

    tabButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            tabButtons.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            applyFilters();
        });
    });

    searchInput.addEventListener('input', applyFilters);
    sortSelect.addEventListener('change', applyFilters);

    window.archivePost = async function(reportId) {
        if (!confirm("Are you sure you want to move this post to the Completed Records page?")) return;
        const { error } = await window.supabase.from('item_reports').update({ report_status: 'archived' }).eq('report_id', reportId);
        if (error) alert("Error archiving: " + error.message);
        else loadActivePosts(); 
    };

    // ===================================
    // AUTOCOMPLETE LOGIC (USERS SEARCH)
    // ===================================
    function setupAutocomplete(inputId, listId, hiddenId) {
        const input = document.getElementById(inputId);
        const list = document.getElementById(listId);
        const hidden = document.getElementById(hiddenId);
        let debounceTimer;

        input.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            hidden.value = ''; // Reset hidden ID if they modify a selected name manually
            
            const val = e.target.value.trim();
            if (!val) { list.style.display = 'none'; return; }

            debounceTimer = setTimeout(async () => {
                const { data } = await window.supabase
                    .from('users')
                    .select('id, first_name, last_name, email')
                    .or(`first_name.ilike.%${val}%,last_name.ilike.%${val}%`)
                    .limit(5);

                if (data && data.length > 0) {
                    list.innerHTML = data.map(u => `
                        <li data-id="${u.id}" data-name="${u.first_name} ${u.last_name}">
                            <div style="font-weight:600;">${u.first_name} ${u.last_name}</div>
                            <span class="autocomplete-email">${u.email}</span>
                        </li>
                    `).join('');
                    list.style.display = 'block';

                    list.querySelectorAll('li').forEach(li => {
                        li.addEventListener('click', () => {
                            input.value = li.dataset.name;
                            hidden.value = li.dataset.id; // Store ID for notification
                            list.style.display = 'none';
                        });
                    });
                } else {
                    list.style.display = 'none';
                }
            }, 300);
        });

        // Close list if clicked outside
        document.addEventListener('click', (e) => {
            if (e.target !== input && e.target !== list) list.style.display = 'none';
        });
    }

    setupAutocomplete('matchFinderName', 'finderSuggestions', 'matchFinderId');
    setupAutocomplete('matchReceiverName', 'receiverSuggestions', 'matchReceiverId');


    // ===================================
    // DYNAMIC MATCH MODAL LOGIC
    // ===================================
    const markMatchedModal = document.getElementById('markMatchedModal');
    const markMatchedForm = document.getElementById('markMatchedForm');
    const confirmMatchBtn = document.getElementById('confirmMatchBtn');

    window.openMatchModal = function(reportId, userId, reportType, encodedReporter) {
        document.getElementById('matchReportId').value = reportId;
        document.getElementById('matchUserId').value = userId; // Original Poster ID
        document.getElementById('matchReportType').value = reportType;
        
        const reporterName = decodeURIComponent(encodedReporter);
        const cleanReporterName = reporterName.replace(' (Walk-in)', ''); 

        const finderInput = document.getElementById('matchFinderName');
        const receiverInput = document.getElementById('matchReceiverName');
        document.getElementById('matchFinderId').value = '';
        document.getElementById('matchReceiverId').value = '';
        
        const matchTitle = document.getElementById('matchModalTitle');
        const matchDesc = document.getElementById('matchModalDesc');
        const finderLabel = document.getElementById('matchFinderLabel');
        const receiverLabel = document.getElementById('matchReceiverLabel');

        finderInput.value = '';
        receiverInput.value = '';

        // Pre-fill the original reporter's name if applicable
        if (cleanReporterName !== 'Admin Post') {
            if (reportType === 'lost') {
                matchTitle.textContent = 'Resolve Lost Item';
                matchDesc.textContent = 'This item was LOST. Search for the student who found it, and confirm the owner who is receiving it.';
                finderLabel.textContent = 'Found By (Finder)';
                receiverLabel.innerHTML = 'Returned To (Owner) <span style="color: var(--danger-red);">*</span>';
                
                receiverInput.value = cleanReporterName;
                if (userId && userId !== 'null') document.getElementById('matchReceiverId').value = userId;

            } else if (reportType === 'found') {
                matchTitle.textContent = 'Resolve Found Item';
                matchDesc.textContent = 'This item was FOUND. Log who is claiming it as the owner.';
                finderLabel.textContent = 'Turned Over By (Finder)';
                receiverLabel.innerHTML = 'Claimed By (Owner) <span style="color: var(--danger-red);">*</span>';
                
                finderInput.value = cleanReporterName;
                if (userId && userId !== 'null') document.getElementById('matchFinderId').value = userId;
            }
        }
        
        markMatchedModal.classList.add('show');
    };

    markMatchedForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const originalText = confirmMatchBtn.innerHTML;
        confirmMatchBtn.disabled = true;
        confirmMatchBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';

        const reportId = document.getElementById('matchReportId').value;
        const originalPosterId = document.getElementById('matchUserId').value;
        const reportType = document.getElementById('matchReportType').value;
        
        const finderName = document.getElementById('matchFinderName').value.trim();
        const receiverName = document.getElementById('matchReceiverName').value.trim();
        
        const finderId = document.getElementById('matchFinderId').value;
        const receiverId = document.getElementById('matchReceiverId').value;

        // 1. Update Database Status
        const { error: updateError } = await window.supabase
            .from('item_reports')
            .update({ report_status: 'matched', finder_name: finderName, receiver_name: receiverName })
            .eq('report_id', reportId);

        if (updateError) {
            alert("Error updating status: " + updateError.message);
            confirmMatchBtn.disabled = false;
            confirmMatchBtn.innerHTML = originalText;
            return;
        }

        // 2. Intelligent Notification System (Avoid duplicate notifications)
        const notificationsToInsert = [];
        const notifiedUsers = new Set(); // Keep track so we don't double-ping someone
        const adminId = sessionStorage.getItem('user_id');

        // Target A: The Registered Finder
        if (finderId && finderId !== adminId && !notifiedUsers.has(finderId)) {
            notificationsToInsert.push({
                user_id: finderId, report_id: reportId,
                message: `You were successfully logged as the finder for an item turned over to the office. Thank you for your honesty!`
            });
            notifiedUsers.add(finderId);
        }

        // Target B: The Registered Owner/Claimer
        if (receiverId && receiverId !== adminId && !notifiedUsers.has(receiverId)) {
            notificationsToInsert.push({
                user_id: receiverId, report_id: reportId,
                message: `Your item was successfully logged as claimed/returned to you.`
            });
            notifiedUsers.add(receiverId);
        }

        // Target C: The Original Poster (Fallback if they weren't logged as finder/receiver but still own the post)
        if (originalPosterId && originalPosterId !== 'null' && originalPosterId !== adminId && !notifiedUsers.has(originalPosterId)) {
            const msg = reportType === 'lost' 
                ? 'Good news! Your LOST item report has been marked as "Found & Matched".'
                : `Your FOUND item report has been successfully claimed by ${receiverName}.`;
            notificationsToInsert.push({ user_id: originalPosterId, report_id: reportId, message: msg });
        }

        // Push all notifications
        if (notificationsToInsert.length > 0) {
            await window.supabase.from('notifications').insert(notificationsToInsert);
        }

        markMatchedModal.classList.remove('show');
        confirmMatchBtn.disabled = false;
        confirmMatchBtn.innerHTML = originalText;
        
        loadActivePosts(); 
    });

    // ===================================
    // VIEW DETAILS & CREATE POST
    // ===================================
    window.viewDetails = function(encodedReport, encodedReporter) {
        const report = JSON.parse(decodeURIComponent(encodedReport));
        const reporter = decodeURIComponent(encodedReporter);
        
        document.getElementById('modal-status').textContent = `REPORTED ${report.report_type.toUpperCase()}`;
        document.getElementById('modal-status').style.backgroundColor = report.report_type === 'lost' ? 'var(--danger-red)' : 'var(--success-green)';
        
        document.getElementById('modal-item').textContent = report.item_name_specific || 'N/A';
        document.getElementById('modal-category').textContent = report.item_category;
        document.getElementById('modal-location').textContent = report.item_location;
        
        const roleTag = report.report_type === 'lost' ? '(Owner)' : '(Finder)';
        document.getElementById('modal-reporter').textContent = `${reporter} ${roleTag}`;
        
        const contactLabel = document.getElementById('modal-contact-label');
        const contactText = document.getElementById('modal-contact');
        const contactNumber = report.reporter_contact_manual || (report.users ? report.users.contact_number : null);

        if (contactNumber) {
            contactLabel.style.display = 'block';
            contactText.style.display = 'block';
            contactText.textContent = contactNumber;
        } else {
            contactLabel.style.display = 'none';
            contactText.style.display = 'none';
        }
        
        const dateObj = new Date(report.item_datetime);
        document.getElementById('modal-datetime').textContent = dateObj.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
        document.getElementById('modal-description').textContent = report.item_description;
        
        const imgEl = document.getElementById('modal-image');
        if (report.image_path) {
            imgEl.src = report.image_path;
            imgEl.style.display = 'inline-block';
        } else {
            imgEl.style.display = 'none';
        }

        document.getElementById('viewDetailsModal').classList.add('show');
    };

    document.querySelectorAll('[data-close]').forEach(btn => {
        btn.addEventListener('click', function() {
            this.closest('.modal-overlay').classList.remove('show');
        });
    });

    const createPostModal = document.getElementById('createPostModal');
    const newPhotoPreview = document.getElementById('newPhotoPreview');
    const newPhotoInput = document.getElementById('newPhotoInput');
    const createPostForm = document.getElementById('createPostForm');
    const submitNewPostBtn = document.getElementById('submitNewPostBtn');
    let adminUploadedFile = null;

    document.getElementById('openCreatePostBtn').addEventListener('click', () => {
        createPostForm.reset();
        newPhotoPreview.innerHTML = '<span><i class="fa-solid fa-camera"></i> Click to upload</span>';
        adminUploadedFile = null;
        createPostModal.classList.add('show');
    });

    newPhotoPreview.addEventListener('click', () => newPhotoInput.click());
    newPhotoInput.addEventListener('change', (e) => {
        adminUploadedFile = e.target.files[0];
        if (adminUploadedFile) {
            const reader = new FileReader();
            reader.onload = (event) => newPhotoPreview.innerHTML = `<img src="${event.target.result}" style="width: 100%; height: 100%; object-fit: cover;">`;
            reader.readAsDataURL(adminUploadedFile);
        }
    });

    createPostForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const originalText = submitNewPostBtn.innerHTML;
        submitNewPostBtn.disabled = true;
        submitNewPostBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Publishing...';

        try {
            let publicImageUrl = null;
            if (adminUploadedFile) {
                const fileExt = adminUploadedFile.name.split('.').pop();
                const fileName = `admin_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
                const { error: uploadError } = await window.supabase.storage.from('item-images').upload(fileName, adminUploadedFile);
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
            loadActivePosts();
        } catch (error) {
            alert(error.message);
        } finally {
            submitNewPostBtn.disabled = false;
            submitNewPostBtn.innerHTML = originalText;
        }
    });
});