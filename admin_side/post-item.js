// post-item.js

document.addEventListener('DOMContentLoaded', () => {

    // ===================================
    // Pre-filler Script (Edit Mode)
    // ===================================
    (function loadEditData() {
        const editDataJSON = localStorage.getItem('editItemData');
        
        if (editDataJSON) {
            try {
                const itemData = JSON.parse(editDataJSON);

                document.getElementById('reportId').value = itemData.report_id || '';
                document.getElementById('existingImagePath').value = itemData.image_path || '';
                
                if (itemData.status && itemData.status.toLowerCase() === 'found') {
                    document.getElementById('foundItemBtn').click();
                } else {
                    document.getElementById('lostItemBtn').click();
                }

                document.getElementById('category-select').value = itemData.category || '';
                document.getElementById('itemName').value = itemData.item || '';
                document.getElementById('description').value = itemData.description || '';
                document.getElementById('location').value = itemData.location || '';
                document.getElementById('date').value = itemData.date || '';
                document.getElementById('time').value = itemData.time || '';

                const uploader = document.getElementById('photo-uploader');
                const imageSrc = itemData.image_path;
                
                if (imageSrc && imageSrc.includes('uploads/')) {
                    uploader.innerHTML = `<img src="../${imageSrc}" style="width:100%; height:100%; object-fit:cover; border-radius:10px;" alt="Preview">`;
                }

                document.getElementById('submitReport').textContent = 'Update Post';
                
            } catch (e) {
                console.error("Failed to parse edit data:", e);
            }
            
            localStorage.removeItem('editItemData');
        }
    })();


    // ===================================
    // Element Selectors
    // ===================================
    const hamburger = document.getElementById('hamburger');
    const sidebar = document.getElementById('sidebar');

    const reportForm = document.getElementById('reportForm');
    const lostItemBtn = document.getElementById('lostItemBtn');
    const foundItemBtn = document.getElementById('foundItemBtn');
    const reportTypeInput = document.getElementById('reportType'); 
    const photoUploader = document.getElementById('photo-uploader');
    const photoInput = document.getElementById('photo-input');
    const submitReportBtn = document.getElementById('submitReport'); 

    const reportsTableBody = document.getElementById('reportsTableBody');
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    const batchPublishBtn = document.getElementById('batchPublishBtn');
    const batchRejectBtn = document.getElementById('batchRejectBtn');

    const successModal = document.getElementById('successModal');                 
    const successOkBtn = document.getElementById('successOkBtn');
    const successTitle = document.getElementById('success-title');
    const successMessage = document.getElementById('success-message');
    const publishModal = document.getElementById('publishModal');                 
    const publishForm = document.getElementById('publishForm');                   
    const publishCancelBtn = document.getElementById('publishCancelBtn');         
    const publishConfirmBtn = document.getElementById('publishConfirmBtn');       

    let selectedReportData = null; 

    // ===================================
    // Sidebar Toggle Logic
    // ===================================
    if (hamburger && sidebar) {
        hamburger.addEventListener('click', () => {
            sidebar.classList.toggle('open');
            const expanded = hamburger.getAttribute('aria-expanded') === 'true' || false;
            hamburger.setAttribute('aria-expanded', String(!expanded));
            sidebar.setAttribute('aria-hidden', String(!sidebar.classList.contains('open')));
        });
    }

    // ===================================
    // Main Form Logic
    // ===================================
    if (lostItemBtn && foundItemBtn && reportTypeInput) {
        lostItemBtn.addEventListener('click', () => {
            lostItemBtn.classList.add('active');     
            foundItemBtn.classList.remove('active'); 
            reportTypeInput.value = 'lost';          
        });

        foundItemBtn.addEventListener('click', () => {
            foundItemBtn.classList.add('active');    
            lostItemBtn.classList.remove('active');  
            reportTypeInput.value = 'found';         
        });
    }

    if (photoUploader && photoInput) {
        photoUploader.addEventListener('click', () => photoInput.click());
        photoInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    photoUploader.innerHTML = `<img src="${e.target.result}" style="width:100%; height:100%; object-fit:cover; border-radius:10px;" alt="Preview">`;
                };
                reader.readAsDataURL(file);
            }
        });
    }

    if (reportForm && submitReportBtn) {
        reportForm.addEventListener('submit', (e) => {
            e.preventDefault(); 
            const formData = new FormData(reportForm);
            const originalButtonText = submitReportBtn.textContent;
            
            submitReportBtn.disabled = true; 
            submitReportBtn.textContent = 'Saving...';

            fetch('submit_admin_post.php', { method: 'POST', body: formData })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showSuccessModal('Success!', data.message);
                    reportForm.reset();
                    if(lostItemBtn) lostItemBtn.click(); 
                    
                    // Reset to the new UI icon
                    if(photoUploader) {
                        photoUploader.innerHTML = '<i class="fa-solid fa-cloud-arrow-up" style="font-size: 1.5rem;"></i><span>Upload Image</span>'; 
                    }
                } else { 
                    alert('Error: ' + data.message); 
                }
            })
            .catch(error => { 
                console.error('Form submit error:', error); 
                alert('Save failed.'); 
            })
            .finally(() => { 
                submitReportBtn.disabled = false; 
                submitReportBtn.textContent = originalButtonText; 
            });
        });
    }

    // ===============================================
    // Table Management Logic
    // ===============================================
    if (selectAllCheckbox && reportsTableBody) {
        selectAllCheckbox.addEventListener('change', () => {
            const checkboxes = reportsTableBody.querySelectorAll('.report-checkbox');
            checkboxes.forEach(checkbox => { checkbox.checked = selectAllCheckbox.checked; });
        });

        reportsTableBody.addEventListener('change', (e) => {
             if (e.target.classList.contains('report-checkbox') && !e.target.checked) {
                 selectAllCheckbox.checked = false;
             }
        });
    }

    if (reportsTableBody) {
        reportsTableBody.addEventListener('click', (e) => {
            const targetButton = e.target.closest('button');
            if (!targetButton) return; 
            const tr = targetButton.closest('tr');
            if (!tr || !tr.dataset.reportId) return; 

            // View Details / Approve Button
            if (targetButton.classList.contains('view-request-btn')) {
                reportsTableBody.querySelectorAll('tr').forEach(row => row.classList.remove('selected'));
                tr.classList.add('selected');
                selectedReportData = tr.dataset; 

                if(publishForm && publishModal) {
                    document.getElementById('publishReportId').value = selectedReportData.reportId || '';
                    const reportType = selectedReportData.reportType || 'lost';
                    
                    const publishStatusText = document.getElementById('publishStatusText');
                    const publishReportTypeInput = document.getElementById('publishReportType');
                    
                    if(publishStatusText) publishStatusText.textContent = reportType.charAt(0).toUpperCase() + reportType.slice(1);
                    
                    // Add badge colors dynamically inside the modal based on type
                    publishStatusText.className = 'badge ' + reportType.toLowerCase();
                    
                    if(publishReportTypeInput) publishReportTypeInput.value = reportType;
                    
                    document.getElementById('publishCategory').value = selectedReportData.itemCategory || '';
                    document.getElementById('publishItemName').value = selectedReportData.itemNameSpecific || selectedReportData.itemCategory || '';
                    document.getElementById('publishDescription').value = selectedReportData.itemDescription || '';
                    document.getElementById('publishLocation').value = selectedReportData.itemLocation || '';
                    document.getElementById('publishDate').value = selectedReportData.itemDate || '';
                    document.getElementById('publishTime').value = selectedReportData.itemTime || '';
                    document.getElementById('publishUserName').textContent = selectedReportData.userName || 'N/A';
                    document.getElementById('publishUserEmail').textContent = selectedReportData.userEmail || 'N/A';
                    
                    const imagePreview = document.getElementById('publishImagePreview');
                    const existingImageInput = document.getElementById('publishExistingImage');
                    
                    if(imagePreview && existingImageInput) {
                        imagePreview.innerHTML = '';
                        const imagePath = selectedReportData.imagePath;
                        if (imagePath && imagePath !== 'null' && imagePath !== '') {
                            const img = document.createElement('img');
                            img.src = '../' + imagePath; 
                            img.onerror = () => { imagePreview.textContent = 'Image not found.'; };
                            imagePreview.appendChild(img);
                            existingImageInput.value = imagePath;
                        } else {
                            imagePreview.textContent = 'No image provided.';
                            existingImageInput.value = '';
                        }
                     }
                    publishModal.style.display = 'flex';
                }
            }
            // Reject Button
            else if (targetButton.classList.contains('delete-request-btn')) {
                const reportId = tr.dataset.reportId;
                const itemName = tr.dataset.itemNameSpecific || 'this item';
                
                if (confirm(`Are you sure you want to reject the report for "${itemName}"?`)) {
                    const formData = new FormData();
                    formData.append('report_id', reportId);

                    fetch('reject_report.php', { method: 'POST', body: formData }) 
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            tr.remove(); 
                            if (selectedReportData && selectedReportData.reportId === reportId) {
                                selectedReportData = null; 
                            }
                        } else {
                            alert('Error: ' + data.message);
                        }
                    })
                    .catch(error => { console.error('Reject Error:', error); alert('Failed to reject report.'); });
                }
            }
        });
    }

    // ===============================================
    // Batch Actions
    // ===============================================
    if (batchPublishBtn) batchPublishBtn.addEventListener('click', () => handleBatchAction('publish'));
    if (batchRejectBtn) batchRejectBtn.addEventListener('click', () => handleBatchAction('reject'));

    function handleBatchAction(action) {
        if (!reportsTableBody) return; 
        const selectedCheckboxes = reportsTableBody.querySelectorAll('.report-checkbox:checked');
        const reportIds = Array.from(selectedCheckboxes).map(cb => cb.value);

        if (reportIds.length === 0) {
            alert('Please select at least one report using the checkboxes.');
            return;
        }

        const actionVerb = (action === 'publish') ? 'Publish' : 'Reject';
        if (!confirm(`${actionVerb} ${reportIds.length} selected report(s)?`)) return;

        if(batchPublishBtn) batchPublishBtn.disabled = true;
        if(batchRejectBtn) batchRejectBtn.disabled = true;
        
        const formData = new FormData();
        formData.append('action', action);
        reportIds.forEach(id => formData.append('report_ids[]', id));

        fetch('batch_action.php', { method: 'POST', body: formData }) 
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                reportIds.forEach(id => {
                    const row = reportsTableBody.querySelector(`tr[data-report-id="${id}"]`);
                    if (row) row.remove();
                });
                if (selectAllCheckbox) selectAllCheckbox.checked = false;
                showSuccessModal('Success', data.message);
            } else {
                alert('Error: ' + data.message);
            }
        })
        .catch(error => { console.error('Batch action error:', error); alert(`Batch ${action} failed.`); })
        .finally(() => {
             if(batchPublishBtn) batchPublishBtn.disabled = false;
             if(batchRejectBtn) batchRejectBtn.disabled = false;
        });
    }

    // ===============================================
    // Modal Submissions & Toggles
    // ===============================================
    if (publishForm && publishConfirmBtn) {
        publishForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(publishForm);
            const originalButtonText = publishConfirmBtn.textContent;
            
            publishConfirmBtn.disabled = true; 
            publishConfirmBtn.textContent = 'Publishing...';

            fetch('submit_approval.php', { method: 'POST', body: formData }) 
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showSuccessModal('Published!', data.message);
                    if(publishModal) publishModal.style.display = 'none';
                    const reportId = formData.get('report_id');
                    const approvedRow = reportsTableBody ? reportsTableBody.querySelector(`tr[data-report-id="${reportId}"]`) : null;
                    if (approvedRow) approvedRow.remove();
                    selectedReportData = null;
                } else {
                    alert('Error: ' + data.message);
                }
            })
            .catch(error => { console.error('Publish error:', error); alert('Publish failed.'); })
            .finally(() => { 
                publishConfirmBtn.disabled = false; 
                publishConfirmBtn.textContent = originalButtonText; 
            });
        });
    }

    if(publishCancelBtn) {
        publishCancelBtn.onclick = () => {
             if(publishModal) publishModal.style.display = 'none';
             selectedReportData = null; 
             if(reportsTableBody) reportsTableBody.querySelectorAll('tr').forEach(row => row.classList.remove('selected')); 
        };
    }

    function showSuccessModal(title, message) {
        if (successTitle) successTitle.textContent = title;
        if (successMessage) successMessage.textContent = message;
        if (successModal) successModal.style.display = 'flex';
    }

    if (successOkBtn) {
        successOkBtn.onclick = () => { if(successModal) successModal.style.display = 'none'; };
    }

    const allCloseButtons = document.querySelectorAll('[data-close]');
    allCloseButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            if (publishModal) publishModal.style.display = 'none';
            if (reportsTableBody) reportsTableBody.querySelectorAll('tr').forEach(row => row.classList.remove('selected'));
        });
    });

    window.onclick = (e) => {
        if (e.target === successModal) successModal.style.display = 'none';
        if (e.target === publishModal) {
             publishModal.style.display = 'none';
             selectedReportData = null; 
             if(reportsTableBody) reportsTableBody.querySelectorAll('tr').forEach(row => row.classList.remove('selected')); 
        }
    };

});