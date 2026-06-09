document.addEventListener('DOMContentLoaded', async () => {

    // --- 1. ADMIN SECURITY CHECK ---
    const userRole = sessionStorage.getItem('role');
    if (userRole !== 'admin') {
        window.location.href = '../login.html';
        return;
    }

    // Set Admin Name in Header
    document.getElementById('admin-name').textContent = sessionStorage.getItem('user_name') || 'Site Administrator';

    // --- 2. SIDEBAR HAMBURGER TOGGLE ---
    const hamburger = document.getElementById('hamburger');
    const sidebar = document.getElementById('sidebar');
    if (hamburger && sidebar) {
        hamburger.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });
    }

    // --- 3. LOGOUT LOGIC ---
    document.getElementById('admin-logout-btn').addEventListener('click', async (e) => {
        e.preventDefault();
        await window.supabase.auth.signOut();
        sessionStorage.clear();
        window.location.href = '../login.html';
    });

    // --- 4. FETCH STATISTICS ---
    async function loadStatistics() {
        try {
            const { count: totalActive } = await window.supabase.from('item_reports').select('*', { count: 'exact', head: true }).eq('report_status', 'approved');
            const { count: totalLost } = await window.supabase.from('item_reports').select('*', { count: 'exact', head: true }).eq('report_status', 'approved').eq('report_type', 'lost');
            const { count: totalFound } = await window.supabase.from('item_reports').select('*', { count: 'exact', head: true }).eq('report_status', 'approved').eq('report_type', 'found');
            const { count: totalMatched } = await window.supabase.from('item_reports').select('*', { count: 'exact', head: true }).eq('report_status', 'matched');

            document.getElementById('stat-active').textContent = totalActive || 0;
            document.getElementById('stat-lost').textContent = totalLost || 0;
            document.getElementById('stat-found').textContent = totalFound || 0;
            document.getElementById('stat-reclaimed').textContent = totalMatched || 0;
        } catch (error) {
            console.error("Error loading stats:", error);
        }
    }

    // --- 5. FETCH RECENT POSTS ---
    async function loadRecentPosts() {
        const tableBody = document.getElementById('recent-posts-table');
        
        const { data: posts, error } = await window.supabase
            .from('item_reports')
            .select('*')
            .eq('report_status', 'approved')
            .order('created_at', { ascending: false })
            .limit(5);

        if (error) {
            tableBody.innerHTML = `<tr><td colspan="6" style="color:var(--danger-red); text-align:center;">Failed to load data.</td></tr>`;
            return;
        }

        if (!posts || posts.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-secondary); padding: 40px;">No recent approved posts found.</td></tr>`;
            return;
        }

        tableBody.innerHTML = posts.map(post => {
            const dateObj = new Date(post.item_datetime);
            const dateStr = dateObj.toLocaleString('en-US', { month: 'short', day: '2-digit', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
            
            const imgHtml = post.image_path 
                ? `<img src="${post.image_path}" alt="Item" class="table-img">`
                : `<div class="table-img" style="display:flex; justify-content:center; align-items:center; color:#94a3b8; font-size:0.8rem;">N/A</div>`;
            
            const badgeClass = post.report_type.toLowerCase();
            const reportTypeDisplay = post.report_type.charAt(0).toUpperCase() + post.report_type.slice(1);
            const postJSON = encodeURIComponent(JSON.stringify(post));

            return `
                <tr>
                    <td>${imgHtml}</td>
                    <td><span class="badge ${badgeClass}">${reportTypeDisplay}</span></td>
                    <td>
                        <div style="font-weight: 600;">${post.item_name_specific || post.item_category}</div>
                        <div style="font-size: 0.8rem; color: var(--text-secondary);">${post.item_category}</div>
                    </td>
                    <td>${post.item_location}</td>
                    <td>${dateStr}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="action-btn view-btn" title="View Details" onclick="viewDetails('${postJSON}')"><i class="fa-solid fa-eye"></i></button>
                            <button class="action-btn delete-btn" title="Archive Post" onclick="confirmDelete('${post.report_id}')"><i class="fa-solid fa-trash-can"></i></button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    loadStatistics();
    loadRecentPosts();

    // --- 6. EXPORT LOGS TO CSV ---
    const exportModal = document.getElementById('exportModal');
    
    document.getElementById('openExportBtn').addEventListener('click', () => {
        setExportDates(30); 
        exportModal.classList.add('show');
    });

    window.setExportDates = function(days) {
        const end = new Date();
        let start = new Date();
        if (days === 'thisMonth') {
            start = new Date(end.getFullYear(), end.getMonth(), 1);
        } else {
            start.setDate(end.getDate() - days);
        }
        document.getElementById('exportEnd').value = end.toISOString().split('T')[0];
        document.getElementById('exportStart').value = start.toISOString().split('T')[0];
    };

    document.getElementById('exportForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('downloadCsvBtn');
        const originalText = btn.innerHTML;
        
        btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Generating...';
        btn.disabled = true;

        const start = document.getElementById('exportStart').value;
        const end = document.getElementById('exportEnd').value;
        const statusFilter = document.getElementById('exportStatus').value;

        try {
            // Fetches all the data including contact number from the related user table
            let query = window.supabase
                .from('item_reports')
                .select('*, users(first_name, last_name, email, course_section, contact_number)')
                .gte('created_at', start + 'T00:00:00.000Z')
                .lte('created_at', end + 'T23:59:59.999Z')
                .order('created_at', { ascending: false });

            if (statusFilter !== 'all') {
                query = query.eq('report_status', statusFilter);
            }

            const { data, error } = await query;
            if (error) throw error;

            if (!data || data.length === 0) {
                alert('No reports found matching your date range and criteria.');
                btn.innerHTML = originalText;
                btn.disabled = false;
                return;
            }

            // Headers updated with explicit Dates & Roles
            const headers = [
                'Date Posted (System)', 
                'Date Occurred (Lost/Found)',
                'Report Type', 
                'Category', 
                'Specific Item Name', 
                'Description', 
                'Location', 
                'Status', 
                'Original Reporter', 
                'Reporter Contact',
                'Reporter Email', 
                'Reporter Course/Section',
                'Found By (Finder)',
                'Received By (Owner)'
            ];

            const rows = data.map(item => {
                // Formatting specific explicit dates
                const datePosted = new Date(item.created_at).toLocaleString('en-US');
                const dateOccurred = new Date(item.item_datetime).toLocaleString('en-US');
                
                // Smart Name/Contact resolution (Walk-in vs Registered)
                let reporterName = 'Admin Account';
                if (item.reporter_name_manual) {
                    reporterName = item.reporter_name_manual + ' (Walk-in)';
                } else if (item.users) {
                    reporterName = `${item.users.first_name} ${item.users.last_name}`;
                }

                let reporterContact = 'N/A';
                if (item.reporter_contact_manual) {
                    reporterContact = item.reporter_contact_manual;
                } else if (item.users && item.users.contact_number) {
                    reporterContact = item.users.contact_number;
                }

                const reporterEmail = item.users ? item.users.email : 'N/A';
                const reporterCourse = item.users && item.users.course_section ? item.users.course_section : 'N/A';
                
                const escapeCsv = (text) => `"${(text || 'N/A').replace(/"/g, '""')}"`;

                return [
                    escapeCsv(datePosted),
                    escapeCsv(dateOccurred),
                    escapeCsv(item.report_type.toUpperCase()),
                    escapeCsv(item.item_category),
                    escapeCsv(item.item_name_specific),
                    escapeCsv(item.item_description),
                    escapeCsv(item.item_location),
                    escapeCsv(item.report_status.toUpperCase()),
                    escapeCsv(reporterName),
                    escapeCsv(reporterContact),
                    escapeCsv(reporterEmail),
                    escapeCsv(reporterCourse),
                    escapeCsv(item.finder_name),
                    escapeCsv(item.receiver_name)
                ].join(',');
            });

            const csvContent = [headers.join(','), ...rows].join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            
            link.setAttribute('href', url);
            link.setAttribute('download', `TUPV_Retrieve_Export_${start}_to_${end}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            exportModal.classList.remove('show');
            
        } catch (err) {
            alert('Failed to generate export: ' + err.message);
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    });

    // --- 7. GENERAL MODAL CLOSING ---
    document.querySelectorAll('[data-close]').forEach(btn => {
        btn.addEventListener('click', function() {
            this.closest('.modal-overlay').classList.remove('show');
        });
    });

    // Make inline handlers available globally
    window.viewDetails = function(encodedReport) {
        const report = JSON.parse(decodeURIComponent(encodedReport));
        
        const statusBadge = document.getElementById('modal-status');
        statusBadge.textContent = report.report_type.charAt(0).toUpperCase() + report.report_type.slice(1);
        statusBadge.className = 'badge ' + report.report_type.toLowerCase();
        
        document.getElementById('modal-item').textContent = report.item_name_specific || 'N/A';
        document.getElementById('modal-category').textContent = report.item_category;
        document.getElementById('modal-location').textContent = report.item_location;
        
        const dateObj = new Date(report.item_datetime);
        document.getElementById('modal-datetime').textContent = dateObj.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
        
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

    window.confirmDelete = function(reportId) {
        const deleteBtn = document.getElementById('confirm-delete-btn');
        deleteBtn.dataset.reportId = reportId;
        document.getElementById('deleteConfirmationModal').classList.add('show');
    };

    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', async function() {
            const reportId = this.dataset.reportId;
            const originalText = this.innerHTML;
            
            this.disabled = true;
            this.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Archiving...';

            const { error } = await window.supabase.from('item_reports').delete().eq('report_id', reportId);

            if (!error) {
                document.getElementById('deleteConfirmationModal').classList.remove('show');
                loadStatistics(); 
                loadRecentPosts(); 
            } else {
                alert('Error archiving post: ' + error.message);
            }

            this.disabled = false;
            this.innerHTML = originalText;
        });
    }
});