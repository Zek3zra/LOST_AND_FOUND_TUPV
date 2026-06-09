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
    // FETCH PENDING REPORTS
    // ===================================
    const tableBody = document.getElementById('pending-reports-table');

    async function loadPendingReports() {
        const { data: reports, error } = await window.supabase
            .from('item_reports')
            .select('*, users (first_name, last_name, email)')
            .eq('report_status', 'pending')
            .order('created_at', { ascending: true });

        if (error) {
            tableBody.innerHTML = `<tr><td colspan="5" style="color:var(--danger-red); text-align:center;">Failed to load data.</td></tr>`;
            return;
        }

        if (!reports || reports.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-secondary); padding: 40px;">No pending reports at this time. <i class="fa-solid fa-mug-hot" style="margin-left: 8px;"></i></td></tr>`;
            return;
        }

        tableBody.innerHTML = reports.map(report => {
            const dateStr = new Date(report.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
            let badgeColor = report.report_type === 'lost' ? 'background-color: rgba(239, 68, 68, 0.1); color: var(--danger-red);' : 'background-color: rgba(16, 185, 129, 0.1); color: var(--success-green);';
            const reporterName = report.users ? `${report.users.first_name} ${report.users.last_name}` : 'Unknown User';
            const reportJSON = encodeURIComponent(JSON.stringify(report));

            return `
                <tr id="row-${report.report_id}">
                    <td>
                        <div style="font-weight: 600; color: var(--text-primary);">${reporterName}</div>
                        <div style="font-size: 0.8rem; color: var(--text-secondary);">${report.users?.email || ''}</div>
                    </td>
                    <td><span style="${badgeColor} padding: 4px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase;">${report.report_type}</span></td>
                    <td>
                        <div style="font-weight: 600;">${report.item_name_specific || 'N/A'}</div>
                        <div style="font-size: 0.8rem; color: var(--text-secondary);">${report.item_category}</div>
                    </td>
                    <td>${dateStr}</td>
                    <td style="text-align: right;">
                        <button class="modal-btn confirm-btn" style="padding: 6px 16px; font-size: 0.85rem;" onclick="openReviewModal('${reportJSON}')">Review</button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    loadPendingReports();

    // ===================================
    // MODAL LOGIC & ACTIONS
    // ===================================
    const publishModal = document.getElementById('publishModal');
    const publishForm = document.getElementById('publishForm');
    const publishConfirmBtn = document.getElementById('publishConfirmBtn');
    
    // Modals
    const successModal = document.getElementById('successModal');
    const successTitle = document.getElementById('success-title');
    const successMessage = document.getElementById('success-message');
    const successIcon = document.getElementById('success-icon');
    const rejectReasonModal = document.getElementById('rejectReasonModal');

    // Image Upload Logic for Review
    const reviewImageWrapper = document.getElementById('reviewImageWrapper');
    const reviewNewImageInput = document.getElementById('reviewNewImageInput');
    const reviewImage = document.getElementById('reviewImage');
    let replacementImageFile = null;

    reviewImageWrapper.addEventListener('click', () => reviewNewImageInput.click());

    reviewNewImageInput.addEventListener('change', (e) => {
        replacementImageFile = e.target.files[0];
        if (replacementImageFile) {
            const reader = new FileReader();
            reader.onload = (event) => reviewImage.src = event.target.result;
            reader.readAsDataURL(replacementImageFile);
        }
    });

    window.openReviewModal = function(encodedReport) {
        const report = JSON.parse(decodeURIComponent(encodedReport));
        
        replacementImageFile = null; // reset
        document.getElementById('reviewReportId').value = report.report_id;
        document.getElementById('reviewUserId').value = report.user_id;
        document.getElementById('reviewOriginalImage').value = report.image_path || '';
        
        document.getElementById('reviewItemName').value = report.item_name_specific || report.item_category;
        document.getElementById('reviewCategory').value = report.item_category;
        document.getElementById('reviewLocation').value = report.item_location;
        document.getElementById('reviewDescription').value = report.item_description;

        // Split datetime for the inputs
        if (report.item_datetime) {
            const dt = report.item_datetime.split('T');
            if(dt.length > 1) {
                document.getElementById('reviewDate').value = dt[0];
                document.getElementById('reviewTime').value = dt[1].substring(0, 5);
            } else {
                const dateObj = new Date(report.item_datetime);
                document.getElementById('reviewDate').value = dateObj.toISOString().split('T')[0];
                document.getElementById('reviewTime').value = dateObj.toTimeString().substring(0, 5);
            }
        }

        // Image Handling
        if (report.image_path) {
            reviewImage.src = report.image_path;
            reviewImage.style.display = 'block';
        } else {
            reviewImage.src = '';
            reviewImage.style.display = 'none';
            reviewImageWrapper.innerHTML = '<span style="color:var(--text-secondary);"><i class="fa-solid fa-image"></i> No Image. Click to add one.</span>' + reviewImageWrapper.innerHTML;
        }

        publishModal.classList.add('show');
    };

    document.querySelectorAll('[data-close]').forEach(btn => {
        btn.addEventListener('click', function() {
            this.closest('.modal-overlay').classList.remove('show');
        });
    });

    document.getElementById('successOkBtn').addEventListener('click', () => {
        successModal.classList.remove('show');
    });

    // ===================================
    // APPROVE, ALTER & PUBLISH
    // ===================================
    publishForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const originalText = publishConfirmBtn.innerHTML;
        publishConfirmBtn.disabled = true;
        publishConfirmBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Publishing...';

        const reportId = document.getElementById('reviewReportId').value;
        const ownerId = document.getElementById('reviewUserId').value;
        const itemName = document.getElementById('reviewItemName').value;
        const newDatetime = `${document.getElementById('reviewDate').value}T${document.getElementById('reviewTime').value}:00`;

        try {
            // 1. Handle Image Replacement if admin uploaded a new one
            let finalImageUrl = document.getElementById('reviewOriginalImage').value;
            if (replacementImageFile) {
                const fileExt = replacementImageFile.name.split('.').pop();
                const fileName = `edited_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
                const { error: uploadError } = await window.supabase.storage.from('item-images').upload(fileName, replacementImageFile);
                if (uploadError) throw new Error('Image Upload Failed: ' + uploadError.message);
                const { data: publicUrlData } = window.supabase.storage.from('item-images').getPublicUrl(fileName);
                finalImageUrl = publicUrlData.publicUrl;
            }

            // 2. Update Database with altered fields
            const { error: dbError } = await window.supabase
                .from('item_reports')
                .update({
                    report_status: 'approved',
                    item_name_specific: itemName,
                    item_category: document.getElementById('reviewCategory').value,
                    item_location: document.getElementById('reviewLocation').value,
                    item_description: document.getElementById('reviewDescription').value,
                    item_datetime: newDatetime,
                    image_path: finalImageUrl
                })
                .eq('report_id', reportId);

            if (dbError) throw new Error("Database Error: " + dbError.message);

            // 3. Notify User
            if (ownerId && ownerId !== 'null') {
                await window.supabase.from('notifications').insert([{
                    user_id: ownerId,
                    report_id: reportId,
                    message: `Your report for "${itemName}" has been approved and published.`
                }]);
            }

            publishModal.classList.remove('show');
            successTitle.textContent = "Published!";
            successTitle.style.color = "var(--success-green)";
            successMessage.textContent = "The item is now live on the public feed.";
            successIcon.className = "fa-solid fa-circle-check";
            successIcon.parentElement.style.color = "var(--success-green)";
            successModal.classList.add('show');
            
            loadPendingReports(); 

        } catch (error) {
            alert(error.message);
        } finally {
            publishConfirmBtn.disabled = false;
            publishConfirmBtn.innerHTML = originalText;
        }
    });

    // ===================================
    // REJECT REPORT (WITH REASON)
    // ===================================
    document.getElementById('rejectInitBtn').addEventListener('click', () => {
        publishModal.classList.remove('show');
        document.getElementById('rejectReasonText').value = '';
        rejectReasonModal.classList.add('show');
    });

    document.getElementById('rejectReasonForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const rejectConfirmBtn = document.getElementById('rejectConfirmBtn');
        const originalText = rejectConfirmBtn.innerHTML;
        rejectConfirmBtn.disabled = true;
        rejectConfirmBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Rejecting...';

        const reportId = document.getElementById('reviewReportId').value;
        const ownerId = document.getElementById('reviewUserId').value;
        const itemName = document.getElementById('reviewItemName').value;
        const reasonText = document.getElementById('rejectReasonText').value.trim();

        const { error: dbError } = await window.supabase
            .from('item_reports')
            .update({ report_status: 'rejected' })
            .eq('report_id', reportId);

        if (!dbError) {
            if (ownerId && ownerId !== 'null') {
                await window.supabase.from('notifications').insert([{
                    user_id: ownerId,
                    report_id: reportId,
                    message: `Your report for "${itemName}" was declined by the administrator. Reason: ${reasonText}`
                }]);
            }

            rejectReasonModal.classList.remove('show');
            
            successTitle.textContent = "Report Rejected";
            successTitle.style.color = "var(--danger-red)";
            successMessage.textContent = "The report has been removed and the user has been notified of the reason.";
            successIcon.className = "fa-solid fa-trash-can";
            successIcon.parentElement.style.color = "var(--danger-red)";
            successModal.classList.add('show');
            
            loadPendingReports(); 
        } else {
            alert("Error rejecting report: " + dbError.message);
        }

        rejectConfirmBtn.disabled = false;
        rejectConfirmBtn.innerHTML = originalText;
    });
});