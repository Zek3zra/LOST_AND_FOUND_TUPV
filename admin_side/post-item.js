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

    // ===================================
    // GLOBAL SUCCESS/DANGER UI HANDLER
    // ===================================
    function showSuccess(title, message, type = "success") {
        const modal = document.getElementById('successModal');
        const icon = document.getElementById('success-icon');
        const wrapper = document.getElementById('success-icon-wrapper');
        const titleEl = document.getElementById('success-title');
        const btn = document.getElementById('successOkBtn');
        
        titleEl.textContent = title;
        document.getElementById('success-message').textContent = message;
        
        btn.className = "modal-btn confirm-btn";
        wrapper.style.backgroundColor = "";
        wrapper.style.color = "";
        
        if (type === 'danger') {
            titleEl.style.color = "var(--danger-red)";
            wrapper.style.backgroundColor = "rgba(239, 68, 68, 0.1)";
            wrapper.style.color = "var(--danger-red)";
            icon.className = "fa-solid fa-trash-can";
            btn.classList.add('danger-solid');
        } else {
            titleEl.style.color = "var(--success-green)";
            wrapper.style.backgroundColor = "rgba(16, 185, 129, 0.1)";
            wrapper.style.color = "var(--success-green)";
            icon.className = "fa-solid fa-circle-check";
            btn.classList.add('success-override');
        }
        
        wrapper.style.animation = 'none';
        wrapper.offsetHeight; 
        wrapper.style.animation = null;

        modal.classList.add('show');
    }

    document.getElementById('successOkBtn').addEventListener('click', () => {
        document.getElementById('successModal').classList.remove('show');
    });

    // ===================================
    // FETCH PENDING REPORTS
    // ===================================
    const tableBody = document.getElementById('pending-reports-table');
    let allPendingReports = [];

    async function loadPendingReports() {
        const { data: reports, error } = await window.supabase
            .from('item_reports')
            .select('*, users (first_name, last_name, email, profile_picture_path)')
            .eq('report_status', 'pending')
            .order('created_at', { ascending: true });

        if (error) {
            tableBody.innerHTML = `<tr><td colspan="5" style="color:var(--danger-red); text-align:center;">Failed to load data.</td></tr>`;
            return;
        }

        allPendingReports = reports || [];
        renderPendingTable(allPendingReports);
    }

    function renderPendingTable(reportsToRender) {
        if (reportsToRender.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-secondary); padding: 40px;">No pending reports match your criteria. <i class="fa-solid fa-mug-hot" style="margin-left: 8px;"></i></td></tr>`;
            return;
        }

        tableBody.innerHTML = reportsToRender.map(report => {
            const dateStr = new Date(report.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
            let badgeColor = report.report_type === 'lost' ? 'background-color: rgba(239, 68, 68, 0.1); color: var(--danger-red);' : 'background-color: rgba(16, 185, 129, 0.1); color: var(--success-green);';
            const reporterName = report.users ? `${report.users.first_name} ${report.users.last_name}` : 'Unknown User';
            const avatarUrl = report.users?.profile_picture_path || '../images/default-avatar.png';
            
            const reportJSON = encodeURIComponent(JSON.stringify(report));

            return `
                <tr id="row-${report.report_id}">
                    <td>
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <img src="${avatarUrl}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 1px solid var(--border-light);">
                            <div>
                                <div style="font-weight: 600; color: var(--text-primary);">${reporterName}</div>
                                <div style="font-size: 0.8rem; color: var(--text-secondary);">${report.users?.email || ''}</div>
                            </div>
                        </div>
                    </td>
                    <td><span style="${badgeColor} padding: 4px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase;">${report.report_type}</span></td>
                    <td>
                        <div style="font-weight: 600;">${report.item_name_specific || 'N/A'}</div>
                        <div style="font-size: 0.8rem; color: var(--text-secondary);">${report.item_category}</div>
                    </td>
                    <td>${dateStr}</td>
                    <td class="actions-col">
                        <button class="modal-btn confirm-btn" style="padding: 6px 16px; font-size: 0.85rem;" onclick="openReviewModal('${reportJSON}')">Review</button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    loadPendingReports();

    // ===================================
    // SEARCH FEATURE
    // ===================================
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = allPendingReports.filter(r => {
            const nameMatch = r.users ? `${r.users.first_name} ${r.users.last_name}`.toLowerCase().includes(term) : false;
            const itemMatch = (r.item_name_specific || '').toLowerCase().includes(term);
            const catMatch = (r.item_category || '').toLowerCase().includes(term);
            return nameMatch || itemMatch || catMatch;
        });
        renderPendingTable(filtered);
    });

    // ===================================
    // MODAL LOGIC & ACTIONS
    // ===================================
    const publishModal = document.getElementById('publishModal');
    const publishForm = document.getElementById('publishForm');
    const publishConfirmBtn = document.getElementById('publishConfirmBtn');
    const rejectReasonModal = document.getElementById('rejectReasonModal');

    // Image Upload & Removal Logic
    const reviewImageWrapper = document.getElementById('reviewImageWrapper');
    const reviewNewImageInput = document.getElementById('reviewNewImageInput');
    const reviewImage = document.getElementById('reviewImage');
    const reviewNoImage = document.getElementById('review-no-image');
    const removeImageBtn = document.getElementById('removeImageBtn');
    
    // Image Removal Reason Elements
    const imageRemovalReasonContainer = document.getElementById('imageRemovalReasonContainer');
    const imageRemovalReason = document.getElementById('imageRemovalReason');
    
    let replacementImageFile = null;
    let removeImageFlag = false;

    reviewImageWrapper.addEventListener('click', () => reviewNewImageInput.click());

    reviewNewImageInput.addEventListener('change', (e) => {
        replacementImageFile = e.target.files[0];
        if (replacementImageFile) {
            removeImageFlag = false; 
            imageRemovalReasonContainer.style.display = 'none';
            imageRemovalReason.required = false;
            imageRemovalReason.value = '';

            const reader = new FileReader();
            reader.onload = (event) => {
                reviewImage.src = event.target.result;
                reviewImage.style.display = 'block';
                reviewNoImage.style.display = 'none';
                removeImageBtn.style.display = 'flex'; 
            };
            reader.readAsDataURL(replacementImageFile);
        }
    });

    // Handle Image Removal click
    removeImageBtn.addEventListener('click', (e) => {
        e.stopPropagation(); 
        replacementImageFile = null;
        removeImageFlag = true;
        reviewImage.src = '';
        reviewImage.style.display = 'none';
        reviewNoImage.style.display = 'flex';
        reviewNewImageInput.value = '';
        removeImageBtn.style.display = 'none';

        // Prompt for reason
        imageRemovalReasonContainer.style.display = 'flex';
        imageRemovalReason.required = true;
    });

    window.openReviewModal = function(encodedReport) {
        const report = JSON.parse(decodeURIComponent(encodedReport));
        
        replacementImageFile = null; 
        removeImageFlag = false;
        reviewNewImageInput.value = '';

        // Reset removal reason box
        imageRemovalReasonContainer.style.display = 'none';
        imageRemovalReason.required = false;
        imageRemovalReason.value = '';

        document.getElementById('reviewReportId').value = report.report_id;
        document.getElementById('reviewUserId').value = report.user_id;
        document.getElementById('reviewOriginalImage').value = report.image_path || '';
        document.getElementById('reviewReportType').value = report.report_type; 
        
        document.getElementById('reviewItemName').value = report.item_name_specific || report.item_category;
        document.getElementById('reviewCategory').value = report.item_category;
        document.getElementById('reviewLocation').value = report.item_location;
        
        const isFound = report.report_type === 'found';
        const descriptionLabel = document.getElementById('reviewDescriptionLabel');
        const descriptionInput = document.getElementById('reviewDescription');
        
        if (isFound) {
            descriptionLabel.innerHTML = 'Secret Identifiers <span style="color: var(--danger-red); font-size: 0.65rem; font-weight: 500; margin-left: 6px;">(Only Admin sees this)</span>';
            descriptionInput.value = report.admin_specific_details || '';
        } else {
            descriptionLabel.innerHTML = 'Public Description';
            descriptionInput.value = report.item_description || '';
        }

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

        if (report.image_path) {
            reviewImage.src = report.image_path;
            reviewImage.style.display = 'block';
            reviewNoImage.style.display = 'none';
            removeImageBtn.style.display = 'flex';
        } else {
            reviewImage.src = '';
            reviewImage.style.display = 'none';
            reviewNoImage.style.display = 'flex';
            removeImageBtn.style.display = 'none';
        }

        publishModal.classList.add('show');
    };

    document.querySelectorAll('[data-close]').forEach(btn => {
        btn.addEventListener('click', function() {
            this.closest('.modal-overlay').classList.remove('show');
        });
    });

    // ===================================
    // APPROVE & PUBLISH
    // ===================================
    publishForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const originalText = publishConfirmBtn.innerHTML;
        publishConfirmBtn.disabled = true;
        publishConfirmBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Publishing...';

        const reportId = document.getElementById('reviewReportId').value;
        const ownerId = document.getElementById('reviewUserId').value;
        const itemName = document.getElementById('reviewItemName').value;
        const reportType = document.getElementById('reviewReportType').value;
        const newDatetime = `${document.getElementById('reviewDate').value}T${document.getElementById('reviewTime').value}:00`;
        const updatedDescValue = document.getElementById('reviewDescription').value;

        try {
            let finalImageUrl = document.getElementById('reviewOriginalImage').value;
            
            // Check if admin removed the image or uploaded a new one
            if (removeImageFlag) {
                finalImageUrl = null;
            } else if (replacementImageFile) {
                const fileExt = replacementImageFile.name.split('.').pop();
                const fileName = `edited_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
                const { error: uploadError } = await window.supabase.storage.from('item-images').upload(fileName, replacementImageFile);
                if (uploadError) throw new Error('Image Upload Failed: ' + uploadError.message);
                const { data: publicUrlData } = window.supabase.storage.from('item-images').getPublicUrl(fileName);
                finalImageUrl = publicUrlData.publicUrl;
            }

            const updatePayload = {
                report_status: 'approved',
                item_name_specific: itemName,
                item_category: document.getElementById('reviewCategory').value,
                item_location: document.getElementById('reviewLocation').value,
                item_datetime: newDatetime,
                image_path: finalImageUrl
            };

            // Set details correctly based on report type
            if (reportType === 'found') {
                updatePayload.admin_specific_details = updatedDescValue;
                updatePayload.item_description = "Hidden for security purposes."; 
            } else {
                updatePayload.item_description = updatedDescValue;
            }

            const { error: dbError } = await window.supabase
                .from('item_reports')
                .update(updatePayload)
                .eq('report_id', reportId);

            if (dbError) throw new Error("Database Error: " + dbError.message);

            // Trigger Notification to User with potential image removal reason
            if (ownerId && ownerId !== 'null' && ownerId !== 'undefined') {
                let notificationMsg = `Your ${reportType.toUpperCase()} item report for "${itemName}" has been reviewed, approved, and is now active.`;
                
                if (removeImageFlag) {
                    const reason = imageRemovalReason.value.trim();
                    if (reason) {
                        notificationMsg += ` Note: Your attached image was removed by the administrator. Reason: ${reason}`;
                    }
                }

                await window.supabase.from('notifications').insert([{
                    user_id: ownerId,
                    message: notificationMsg
                }]);
            }

            publishModal.classList.remove('show');
            showSuccess("Published!", "The item has been approved and is now live on the public feed.", "success");
            loadPendingReports(); 

        } catch (error) {
            alert(error.message);
        } finally {
            publishConfirmBtn.disabled = false;
            publishConfirmBtn.innerHTML = originalText;
        }
    });

    // ===================================
    // REJECT REPORT & NOTIFY
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
        rejectConfirmBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending...';

        const reportId = document.getElementById('reviewReportId').value;
        const ownerId = document.getElementById('reviewUserId').value;
        const itemName = document.getElementById('reviewItemName').value;
        const reportType = document.getElementById('reviewReportType').value.toUpperCase();
        const reasonText = document.getElementById('rejectReasonText').value.trim();

        const { error: dbError } = await window.supabase
            .from('item_reports')
            .update({ report_status: 'rejected' })
            .eq('report_id', reportId);

        if (!dbError) {
            // Trigger Rejection Notification to User
            if (ownerId && ownerId !== 'null' && ownerId !== 'undefined') {
                await window.supabase.from('notifications').insert([{
                    user_id: ownerId,
                    message: `Your ${reportType} item report for "${itemName}" was declined by the administrator. Reason: ${reasonText}`
                }]);
            }

            rejectReasonModal.classList.remove('show');
            showSuccess("Report Rejected", "The report has been removed and the user has been notified of the reason.", "danger");
            loadPendingReports(); 
        } else {
            alert("Error rejecting report: " + dbError.message);
        }

        rejectConfirmBtn.disabled = false;
        rejectConfirmBtn.innerHTML = originalText;
    });
});