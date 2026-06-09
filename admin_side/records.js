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
    // FETCH & RENDER LINE-TYPE TABLE
    // ===================================
    const recordsTableBody = document.getElementById('recordsTableBody');
    let allRecordsData = [];

    async function loadRecords() {
        const { data: posts, error } = await window.supabase
            .from('item_reports')
            .select('*, users(first_name, last_name, contact_number)')
            .in('report_status', ['matched', 'archived'])
            .order('created_at', { ascending: false });

        if (error) {
            recordsTableBody.innerHTML = `<tr><td colspan="5" style="color:red; text-align:center;">Error loading records.</td></tr>`;
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
            
            // --- STRICT DATE SEPARATION ---
            // 1. When it was actually posted to the system
            const postedDate = new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            
            // 2. When the item was actually lost or found by the user
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
                            <span style="color: var(--text-secondary); font-size: 0.8rem;">Found By (Finder):</span><br>
                            <strong>${post.finder_name || 'Not specified'}</strong><br>
                            <span style="color: var(--text-secondary); font-size: 0.8rem; margin-top:4px; display:block;">Returned To (Owner):</span>
                            <strong style="color: var(--primary-blue);">${post.receiver_name || 'Not specified'}</strong>
                        </div>`;
                
                } else if (post.report_type === 'found') {
                    reportTypeDisplay = `
                        <div style="font-size:0.9rem; color:var(--text-primary); font-weight:600; margin-bottom:4px;">${reporterName} <span style="color:var(--text-secondary); font-weight:400; font-size:0.8rem;">(Finder)</span></div>
                        <div style="font-size:0.8rem; color:var(--text-secondary); margin-bottom:6px;">Reported <strong style="color:var(--success-green)">FOUND</strong></div>
                        <span class="badge" style="background:var(--success-green); color:white;"><i class="fa-solid fa-check"></i> RESOLVED</span>
                    `;
                    resolutionDisplay = `
                        <div style="color: var(--text-primary); font-size: 0.9rem; line-height: 1.5;">
                            <span style="color: var(--text-secondary); font-size: 0.8rem;">Turned Over By (Finder):</span><br>
                            <strong>${post.finder_name || 'Not specified'}</strong><br>
                            <span style="color: var(--text-secondary); font-size: 0.8rem; margin-top:4px; display:block;">Claimed By (Owner):</span>
                            <strong style="color: var(--primary-blue);">${post.receiver_name || 'Not specified'}</strong>
                        </div>`;
                }
            }

            const postJSON = encodeURIComponent(JSON.stringify(post));
            const reporterJSON = encodeURIComponent(reporterName);
            const restoreBtn = `<button style="background:none; border:none; cursor:pointer; color: var(--text-secondary); padding: 6px; font-size: 0.9rem; font-weight: 600; display:flex; align-items:center; gap:6px; transition: color 0.2s;" onmouseover="this.style.color='var(--primary-blue)'" onmouseout="this.style.color='var(--text-secondary)'" onclick="restorePost('${post.report_id}')" title="Move back to Active Posts feed"><i class="fa-solid fa-rotate-left"></i> Restore</button>`;

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
                    <td style="text-align: right;">
                        <div style="display: flex; flex-direction:column; justify-content: flex-end; align-items: flex-end; gap: 8px;">
                            <button class="modal-btn cancel-btn" style="padding: 6px 12px; font-size: 0.8rem;" onclick="viewDetails('${postJSON}', '${reporterJSON}')">View Details</button>
                            ${restoreBtn}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
        
        applyFilters();
    }

    loadRecords();

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
    // RESTORE LOGIC
    // ===================================
    window.restorePost = async function(reportId) {
        if (!confirm("Are you sure you want to restore this item back to the Active Posts feed?")) return;

        const { error } = await window.supabase.from('item_reports').update({ report_status: 'approved' }).eq('report_id', reportId);
        if (error) alert("Error restoring: " + error.message);
        else loadRecords(); 
    };

    // ===================================
    // CLEAR RECORDS DATABASE LOGIC
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
    window.viewDetails = function(encodedReport, encodedReporter) {
        const report = JSON.parse(decodeURIComponent(encodedReport));
        const reporter = decodeURIComponent(encodedReporter);
        
        const isLost = report.report_type === 'lost';
        const isMatched = report.report_status === 'matched';

        const statusBadge = document.getElementById('modal-status');
        statusBadge.textContent = isMatched ? 'MATCHED / RESOLVED' : 'ARCHIVED';
        statusBadge.style.backgroundColor = isMatched ? 'var(--accent-amber)' : 'var(--text-secondary)';
        
        document.getElementById('modal-item').textContent = report.item_name_specific || 'N/A';
        document.getElementById('modal-category').textContent = report.item_category;
        document.getElementById('modal-location').textContent = report.item_location;
        
        const roleTag = isLost ? '(Owner)' : '(Finder)';
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

        // STRICT SEPARATION OF POSTED VS OCCURRED
        const postedDateObj = new Date(report.created_at);
        document.getElementById('modal-posted-date').textContent = postedDateObj.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });

        const occurredDateObj = new Date(report.item_datetime);
        document.getElementById('modal-datetime-label').textContent = isLost ? 'Date Lost:' : 'Date Found:';
        document.getElementById('modal-datetime').textContent = occurredDateObj.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
        
        document.getElementById('modal-description').textContent = report.item_description;
        
        const imgEl = document.getElementById('modal-image');
        if (report.image_path) {
            imgEl.src = report.image_path;
            imgEl.style.display = 'inline-block';
        } else {
            imgEl.style.display = 'none';
        }

        const finderLabel = document.getElementById('modal-found-by-label');
        const finderText = document.getElementById('modal-found-by');
        const receiverLabel = document.getElementById('modal-received-by-label');
        const receiverText = document.getElementById('modal-received-by');

        finderLabel.textContent = isLost ? 'Found By (Finder):' : 'Turned Over By (Finder):';
        receiverLabel.textContent = isLost ? 'Returned To (Owner):' : 'Claimed By (Owner):';

        if (report.finder_name) {
            finderLabel.style.display = 'block';
            finderText.style.display = 'block';
            finderText.textContent = report.finder_name;
        } else {
            finderLabel.style.display = 'none';
            finderText.style.display = 'none';
        }

        if (report.receiver_name) {
            receiverLabel.style.display = 'block';
            receiverText.style.display = 'block';
            receiverText.textContent = report.receiver_name;
        } else {
            receiverLabel.style.display = 'none';
            receiverText.style.display = 'none';
        }

        document.getElementById('viewDetailsModal').classList.add('show');
    };

    document.querySelectorAll('[data-close]').forEach(btn => {
        btn.addEventListener('click', function() {
            this.closest('.modal-overlay').classList.remove('show');
        });
    });
});