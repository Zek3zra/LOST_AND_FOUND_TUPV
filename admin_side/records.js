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

    // ===================================
    // FETCH & RENDER LINE-TYPE TABLE
    // ===================================
    const recordsTableBody = document.getElementById('recordsTableBody');
    let allRecordsData = [];

    async function loadRecords() {
        const { data: posts, error } = await window.supabase
            .from('item_reports')
            .select('*, users(first_name, last_name, contact_number, profile_picture_path, email)')
            .in('report_status', ['matched', 'archived'])
            .order('created_at', { ascending: false });

        if (error) {
            recordsTableBody.innerHTML = `<tr><td colspan="5" style="color:var(--danger-red); text-align:center;">Error loading records.</td></tr>`;
            return;
        }

        allRecordsData = posts || [];
        renderRecords();
    }

    function renderRecords() {
        if (allRecordsData.length === 0) {
            recordsTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-secondary); padding: 40px;">No completed records found yet.</td></tr>`;
            return;
        }

        recordsTableBody.innerHTML = allRecordsData.map(post => {
            
            const postedDate = new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            const occurredDate = new Date(post.item_datetime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            const occurredLabel = post.report_type === 'lost' ? 'Lost:' : 'Found:';

            const itemName = post.item_name_specific || post.item_category;
            
            let reporterName = 'Admin Post';
            if (post.reporter_name_manual) {
                reporterName = post.reporter_name_manual + ' (Walk-in)';
            } else if (post.users) {
                reporterName = `${post.users.first_name} ${post.users.last_name}`;
            }

            let reportTypeDisplay = '';
            let resolutionDisplay = '';

            if (post.report_status === 'archived') {
                const roleTag = post.report_type === 'lost' ? '(Owner)' : '(Finder)';
                reportTypeDisplay = `
                    <div style="font-size:0.9rem; color:var(--text-primary); font-weight:600; margin-bottom:4px;">${reporterName} <span style="color:var(--text-secondary); font-weight:400; font-size:0.8rem;">${roleTag}</span></div>
                    <div style="font-size:0.8rem; color:var(--text-secondary); margin-bottom:6px;">Reported ${post.report_type.toUpperCase()}</div>
                    <span class="badge" style="background:var(--text-secondary); color:white;">ARCHIVED</span>
                `;
                resolutionDisplay = `<span style="color:var(--text-secondary); font-style:italic;">Manually removed from feed without matching.</span>`;
            
            } else if (post.report_status === 'matched') {
                
                if (post.report_type === 'lost') {
                    reportTypeDisplay = `
                        <div style="font-size:0.9rem; color:var(--text-primary); font-weight:600; margin-bottom:4px;">${reporterName} <span style="color:var(--text-secondary); font-weight:400; font-size:0.8rem;">(Owner)</span></div>
                        <div style="font-size:0.8rem; color:var(--text-secondary); margin-bottom:6px;">Reported <strong style="color:var(--danger-red)">LOST</strong></div>
                        <span class="badge" style="background:var(--success-green); color:white;"><i class="fa-solid fa-check"></i> RESOLVED</span>
                    `;
                    resolutionDisplay = `
                        <div style="color: var(--text-primary); font-size: 0.9rem; line-height: 1.5;">
                            <span style="color: var(--text-secondary); font-size: 0.8rem;">Matched / Found By:</span><br>
                            <strong>${post.matched_person_name || post.finder_name || 'Not specified'}</strong>
                        </div>`;
                
                } else if (post.report_type === 'found') {
                    reportTypeDisplay = `
                        <div style="font-size:0.9rem; color:var(--text-primary); font-weight:600; margin-bottom:4px;">${reporterName} <span style="color:var(--text-secondary); font-weight:400; font-size:0.8rem;">(Finder)</span></div>
                        <div style="font-size:0.8rem; color:var(--text-secondary); margin-bottom:6px;">Reported <strong style="color:var(--success-green)">FOUND</strong></div>
                        <span class="badge" style="background:var(--success-green); color:white;"><i class="fa-solid fa-check"></i> RESOLVED</span>
                    `;
                    resolutionDisplay = `
                        <div style="color: var(--text-primary); font-size: 0.9rem; line-height: 1.5;">
                            <span style="color: var(--text-secondary); font-size: 0.8rem;">Matched / Claimed By:</span><br>
                            <strong>${post.matched_person_name || post.receiver_name || 'Not specified'}</strong>
                        </div>`;
                }
            }

            const postJSON = encodeURIComponent(JSON.stringify(post));
            
            const viewBtn = `<button class="action-icon-btn primary" onclick="viewDetails('${postJSON}')" title="View Details"><i class="fa-solid fa-eye"></i></button>`;
            const restoreBtn = `<button class="action-icon-btn warning" onclick="openRestoreModal('${post.report_id}')" title="Restore to Active"><i class="fa-solid fa-rotate-left"></i></button>`;
            const deleteBtn = `<button class="action-icon-btn danger" onclick="deleteRecord('${post.report_id}')" title="Permanently Delete"><i class="fa-solid fa-trash-can"></i></button>`;

            return `
                <tr class="record-row" data-category="${post.report_status}" data-date="${post.created_at}">
                    <td style="white-space:nowrap;">
                        <div style="font-weight: 600; color:var(--text-primary); font-size: 0.9rem; margin-bottom: 4px;">Posted: ${postedDate}</div>
                        <div style="color:var(--text-secondary); font-size: 0.8rem;">${occurredLabel} ${occurredDate}</div>
                    </td>
                    <td>
                        <div style="font-weight: 600; color:var(--text-primary); font-size: 1.05rem;">${itemName}</div>
                        <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 2px;"><i class="fa-solid fa-location-dot" style="margin-right:4px;"></i>${post.item_location}</div>
                    </td>
                    <td>${reportTypeDisplay}</td>
                    <td>${resolutionDisplay}</td>
                    <td class="actions-col" onclick="event.stopPropagation();">
                        <div class="table-actions">
                            ${viewBtn}
                            ${restoreBtn}
                            ${deleteBtn}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
        
        applyFilters();
    }

    // ===================================
    // FILTERING, SEARCHING, SORTING
    // ===================================
    const tabButtons = document.querySelectorAll('.tab-btn');
    const searchInput = document.getElementById('searchInput');
    const sortSelect = document.getElementById('sortSelect');

    function applyFilters() {
        const activeTab = document.querySelector('.tab-btn.active').dataset.filter;
        const searchTerm = searchInput.value.toLowerCase();
        const rows = Array.from(recordsTableBody.querySelectorAll('.record-row'));
        
        rows.sort((a, b) => {
            const dateA = new Date(a.dataset.date);
            const dateB = new Date(b.dataset.date);
            return sortSelect.value === 'newest' ? dateB - dateA : dateA - dateB;
        });
        
        rows.forEach(row => recordsTableBody.appendChild(row));

        rows.forEach(row => {
            const category = row.dataset.category;
            const textContent = row.innerText.toLowerCase();
            const matchesTab = activeTab === 'all' || category === activeTab;
            const matchesSearch = textContent.includes(searchTerm);
            
            if (matchesTab && matchesSearch) row.style.display = '';
            else row.style.display = 'none';
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

    // ===================================
    // TABLE ACTIONS (RESTORE & DELETE)
    // ===================================
    let restoreTargetId = null;
    const restoreConfirmationModal = document.getElementById('restoreConfirmationModal');

    window.openRestoreModal = function(reportId) {
        restoreTargetId = reportId;
        restoreConfirmationModal.classList.add('show');
    };

    document.getElementById('executeRestoreBtn').addEventListener('click', async function() {
        if (!restoreTargetId) return;
        const originalText = this.innerHTML;
        this.disabled = true;
        this.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Restoring...';

        const { error } = await window.supabase.from('item_reports').update({ report_status: 'approved' }).eq('report_id', restoreTargetId);
        
        this.disabled = false;
        this.innerHTML = originalText;

        if (error) {
            alert("Error restoring: " + error.message);
        } else {
            restoreConfirmationModal.classList.remove('show');
            showSuccess("Post Restored", "The item has been moved back to the Active Posts feed.");
            loadRecords(); 
        }
    });

    window.deleteRecord = async function(reportId) {
        if (!confirm("WARNING: Are you sure you want to PERMANENTLY delete this record? This action cannot be undone.")) return;
        const { error } = await window.supabase.from('item_reports').delete().eq('report_id', reportId);
        if (error) alert("Error deleting record: " + error.message);
        else loadRecords();
    }

    // ===================================
    // CLEAR BULK RECORDS
    // ===================================
    const clearRecordsModal = document.getElementById('clearRecordsModal');
    const clearRecordsForm = document.getElementById('clearRecordsForm');
    const confirmClearBtn = document.getElementById('confirmClearBtn');

    document.getElementById('openClearRecordsBtn').addEventListener('click', () => {
        clearRecordsForm.reset();
        clearRecordsModal.classList.add('show');
    });

    clearRecordsForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if(!confirm("WARNING: This will permanently delete these records from the database. This action cannot be undone. Proceed?")) return;

        const originalText = confirmClearBtn.innerHTML;
        confirmClearBtn.disabled = true;
        confirmClearBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Deleting...';

        const start = document.getElementById('clearStart').value;
        const end = document.getElementById('clearEnd').value;
        const type = document.getElementById('clearType').value;

        try {
            let query = window.supabase.from('item_reports').delete()
                .gte('created_at', start + 'T00:00:00.000Z')
                .lte('created_at', end + 'T23:59:59.999Z');

            if (type === 'all') query = query.in('report_status', ['matched', 'archived']);
            else query = query.eq('report_status', type);

            const { error } = await query;
            if (error) throw error;

            alert("Records successfully cleared from the database.");
            clearRecordsModal.classList.remove('show');
            loadRecords(); 

        } catch (error) {
            alert("Error clearing records: " + error.message);
        } finally {
            confirmClearBtn.disabled = false;
            confirmClearBtn.innerHTML = originalText;
        }
    });

    // ===================================
    // VIEW DETAILS MODAL
    // ===================================
    window.viewDetails = async function(encodedReport) {
        const report = JSON.parse(decodeURIComponent(encodedReport));
        
        const isLost = report.report_type === 'lost';
        const isMatched = report.report_status === 'matched';

        // 1. Status & Headers
        const statusBadge = document.getElementById('modal-status');
        statusBadge.textContent = isMatched ? 'MATCHED / RESOLVED' : 'ARCHIVED RECORD';
        statusBadge.style.backgroundColor = isMatched ? 'var(--success-green)' : 'var(--text-secondary)';
        statusBadge.style.color = 'white';
        
        document.getElementById('modal-item').textContent = report.item_name_specific || report.item_category;
        document.getElementById('modal-category').textContent = report.item_category;
        document.getElementById('modal-location').textContent = report.item_location || 'Not Specified';

        // 2. Timelines
        const postedDateObj = new Date(report.created_at);
        document.getElementById('modal-posted-date').textContent = postedDateObj.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });

        const occurredDateObj = new Date(report.item_datetime);
        document.getElementById('modal-datetime-label').textContent = isLost ? 'Date Lost:' : 'Date Found:';
        document.getElementById('modal-datetime').textContent = occurredDateObj.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
        
        const resolvedContainer = document.getElementById('modal-resolved-container');
        const resolvedDateValue = report.resolved_date || report.updated_at; 
        
        if (resolvedDateValue) {
            const resolvedDateObj = new Date(resolvedDateValue);
            document.getElementById('modal-resolved-date').textContent = resolvedDateObj.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
            resolvedContainer.style.display = 'block';
            
            const resolvedLabel = document.getElementById('modal-resolved-label');
            if (isMatched) {
                resolvedLabel.textContent = 'Resolved On:';
                resolvedContainer.style.backgroundColor = '#f0fdf4';
                resolvedContainer.style.borderColor = '#bbf7d0';
                resolvedContainer.style.color = 'var(--success-green)';
                document.getElementById('modal-resolved-date').style.color = '#166534';
            } else {
                resolvedLabel.textContent = 'Archived On:';
                resolvedContainer.style.backgroundColor = '#f8fafc';
                resolvedContainer.style.borderColor = '#e2e8f0';
                resolvedContainer.style.color = 'var(--text-secondary)';
                document.getElementById('modal-resolved-date').style.color = 'var(--text-primary)';
            }
        } else {
            resolvedContainer.style.display = 'none';
        }

        const finalDescription = report.admin_specific_details || report.item_description || 'No description provided.';
        document.getElementById('modal-description').textContent = finalDescription;
        
        // 3. Image Handling
        const imgContainer = document.getElementById('modal-image-container');
        const imgEl = document.getElementById('modal-image');
        const noImg = document.getElementById('modal-no-image');

        if (report.image_path) {
            imgEl.src = report.image_path;
            imgEl.style.display = 'block';
            noImg.style.display = 'none';
        } else {
            imgEl.src = '';
            imgEl.style.display = 'none';
            noImg.style.display = 'flex';
        }

        // 4. Original Reporter Profile Block
        const reporterRole = isLost ? 'Original Reporter (Owner)' : 'Original Reporter (Finder)';
        document.getElementById('modal-reporter-role').textContent = reporterRole;
        
        const reporterAcadEl = document.getElementById('modal-reporter-acad');

        if (report.reporter_name_manual) {
            document.getElementById('modal-reporter').textContent = `${report.reporter_name_manual} (Walk-in)`;
            document.getElementById('modal-contact').textContent = report.reporter_contact_manual || 'No contact provided';
            document.getElementById('modal-reporter-avatar').src = DEFAULT_AVATAR;
            
            if (report.reporter_program_manual) {
                reporterAcadEl.textContent = report.reporter_program_manual;
                reporterAcadEl.style.display = 'block';
            } else {
                reporterAcadEl.style.display = 'none';
            }
        } else if (report.users) {
            document.getElementById('modal-reporter').textContent = `${report.users.first_name} ${report.users.last_name}`;
            document.getElementById('modal-contact').textContent = report.users.email || report.users.contact_number || 'No contact provided'; // Email priority
            document.getElementById('modal-reporter-avatar').src = report.users.profile_picture_path || DEFAULT_AVATAR;
            reporterAcadEl.style.display = 'none';
        } else {
            document.getElementById('modal-reporter').textContent = 'Anonymous Admin Post';
            document.getElementById('modal-contact').textContent = '';
            document.getElementById('modal-reporter-avatar').src = DEFAULT_AVATAR;
            reporterAcadEl.style.display = 'none';
        }

        // 5. Matched User Profile Block (New Update to Support Manual Matched Fields)
        const matchedBlock = document.getElementById('modal-matched-block');
        const matchedNameStr = report.matched_person_name || report.receiver_name || report.finder_name;
        const matchedAcadEl = document.getElementById('modal-matched-acad');

        if (isMatched && matchedNameStr) {
            matchedBlock.style.display = 'flex';
            document.getElementById('modal-matched-role').textContent = isLost ? 'Found / Handled By' : 'Claimed By (Owner)';
            document.getElementById('modal-matched-name').textContent = matchedNameStr;
            
            if (report.matched_person_contact || report.matched_person_acad) {
                document.getElementById('modal-matched-avatar').src = DEFAULT_AVATAR;
                
                if (report.matched_person_acad) {
                    matchedAcadEl.textContent = report.matched_person_acad;
                    matchedAcadEl.style.display = 'block';
                } else {
                    matchedAcadEl.style.display = 'none';
                }
                
                document.getElementById('modal-matched-contact').textContent = report.matched_person_contact || 'Walk-in / Unregistered';
            } else {
                matchedAcadEl.style.display = 'none';
                const firstN = matchedNameStr.split(' ')[0];
                const { data: matchedData } = await window.supabase
                    .from('users')
                    .select('profile_picture_path, email, contact_number')
                    .ilike('first_name', `%${firstN}%`)
                    .limit(1);

                if (matchedData && matchedData.length > 0) {
                    document.getElementById('modal-matched-avatar').src = matchedData[0].profile_picture_path || DEFAULT_AVATAR;
                    // Email priority for matched user
                    document.getElementById('modal-matched-contact').textContent = matchedData[0].email || matchedData[0].contact_number || 'Registered User';
                } else {
                    document.getElementById('modal-matched-avatar').src = DEFAULT_AVATAR;
                    document.getElementById('modal-matched-contact').textContent = 'Walk-in / Unregistered';
                }
            }
        } else {
            matchedBlock.style.display = 'none';
        }

        document.getElementById('viewDetailsModal').classList.add('show');
    };

    document.querySelectorAll('[data-close]').forEach(btn => {
        btn.addEventListener('click', function() {
            this.closest('.modal-overlay').classList.remove('show');
        });
    });

    loadRecords();
});