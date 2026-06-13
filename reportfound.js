document.addEventListener('DOMContentLoaded', () => {

   // --- 1. Strict Security Check ---
    const guestMode = sessionStorage.getItem('userType') === 'guest';
    
    // KICK GUESTS OUT IMMEDIATELY
    if (guestMode) {
        window.location.href = 'guestprofile.html';
        return;
    }
    
    // REDIRECT UNAUTHENTICATED USERS TO LOGIN
    if (!sessionStorage.getItem('user_id')) {
        window.location.href = 'login.html';
        return;
    }

    // --- 2. Basic UI & Global Modals ---
    function updateDateTime() {
        const dt = document.getElementById('current-date-time');
        if(dt) dt.textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
    setInterval(updateDateTime, 1000);
    updateDateTime();

    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('desktop-sidebar');
    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', () => sidebar.classList.toggle('collapsed'));
    }
    
    if (sessionStorage.getItem('role') === 'admin') {
        const adminLink = document.getElementById('admin-dashboard-link');
        if (adminLink) adminLink.classList.remove('hidden');
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

    // Initialize Header & Footer Links to Modals
    const modals = {
        'about-link': 'about-modal', 'footer-about-link': 'about-modal',
        'footer-how-it-works-link': 'how-it-works-modal', 'footer-faq-link': 'faq-modal',
        'contact-link': 'footer-contact-modal', 'footer-contact-link': 'footer-contact-modal',
        'footer-privacy-link': 'privacy-modal', 'footer-terms-link': 'terms-modal'
    };
    
    Object.keys(modals).forEach(id => {
        const el = document.getElementById(id);
        if(el) {
            el.addEventListener('click', (e) => { 
                e.preventDefault(); 
                document.getElementById(modals[id]).classList.add('show'); 
            });
        }
    });

    document.querySelectorAll('[data-close]').forEach(btn => {
        btn.addEventListener('click', function() {
            this.closest('.modal-overlay').classList.remove('show');
        });
    });

    // Close Modals when clicking outside of them
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-overlay')) {
            e.target.classList.remove('show');
        }
    });


    // --- 3. PHOTO UPLOAD WARNING LOGIC ---
    const uploadTrigger = document.getElementById('upload-trigger');
    const itemImageInput = document.getElementById('item-image');
    const warningModal = document.getElementById('image-warning-modal');
    const proceedUploadBtn = document.getElementById('proceed-upload-btn');
    
    const imagePreviewContainer = document.getElementById('image-preview-container');
    const imagePreview = document.getElementById('image-preview');
    const uploadPrompt = document.getElementById('upload-prompt');
    const removeImageBtn = document.getElementById('remove-image-btn');

    let selectedFile = null;

    uploadTrigger.addEventListener('click', (e) => {
        if (e.target === removeImageBtn) return; 
        
        if (!selectedFile) {
            warningModal.classList.add('show');
        } else {
            itemImageInput.click();
        }
    });

    proceedUploadBtn.addEventListener('click', () => {
        warningModal.classList.remove('show');
        itemImageInput.click();
    });

    itemImageInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            selectedFile = file;
            const reader = new FileReader();
            reader.onload = function(e) {
                imagePreview.src = e.target.result;
                imagePreviewContainer.style.display = 'block';
                uploadPrompt.style.display = 'none';
            }
            reader.readAsDataURL(file);
        }
    });

    removeImageBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        itemImageInput.value = '';
        selectedFile = null;
        imagePreviewContainer.style.display = 'none';
        imagePreview.src = '';
        uploadPrompt.style.display = 'block';
    });

    // --- 4. FORM SUBMISSION -> TURNOVER MODAL -> SUMMARY MODAL ---
    const reportForm = document.getElementById('report-found-form');
    const turnoverModal = document.getElementById('turnover-warning-modal');
    const proceedSummaryBtn = document.getElementById('proceed-summary-btn');
    const summaryModal = document.getElementById('summary-modal');
    const confirmBtn = document.getElementById('confirm-btn');
    const successModal = document.getElementById('success-modal');

   reportForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Prevent spam clicking while loading
        const generateBtn = document.getElementById('generate-report-btn');
        const originalText = generateBtn.innerHTML;
        generateBtn.disabled = true;
        generateBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Checking...';

        // --- SPAM PROTECTION CHECK ---
        const { count, error: countError } = await window.supabase
            .from('item_reports')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', sessionStorage.getItem('user_id'))
            .eq('report_status', 'pending'); 

        generateBtn.disabled = false;
        generateBtn.innerHTML = originalText;

        if (countError) {
            alert("System error checking account status. Please try again.");
            return;
        }

        if (count >= 3) {
            alert("SPAM PROTECTION: You already have 3 pending reports. Please wait for the Admin to review them before submitting more.");
            return;
        }

        turnoverModal.classList.add('show');
    });

    proceedSummaryBtn.addEventListener('click', () => {
        turnoverModal.classList.remove('show');

        // Populate standard fields
        document.getElementById('summary-item-name').textContent = document.getElementById('item-name').value;
        document.getElementById('summary-category').textContent = document.getElementById('category-select').value;
        document.getElementById('summary-location').textContent = document.getElementById('location').value;
        
        const dateStr = document.getElementById('found-date').value;
        const timeStr = document.getElementById('found-time').value;
        const dt = new Date(`${dateStr}T${timeStr}`);
        document.getElementById('summary-datetime').textContent = dt.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
        
        // Populate Admin Only Details
        document.getElementById('summary-admin-details').textContent = document.getElementById('admin-details').value.trim();

        // Image Review handling
        const sumImage = document.getElementById('summary-image');
        const sumNoImage = document.getElementById('summary-no-image');
        
        if (selectedFile) {
            const reader = new FileReader();
            reader.onload = function(e) {
                sumImage.src = e.target.result;
                sumImage.style.display = 'block';
                sumNoImage.style.display = 'none';
            }
            reader.readAsDataURL(selectedFile);
        } else {
            sumImage.style.display = 'none';
            sumNoImage.style.display = 'flex';
        }

        summaryModal.classList.add('show');
    });

    // --- 5. FINALIZE SUBMIT TO DATABASE ---
    confirmBtn.addEventListener('click', async () => {
        const originalBtnText = confirmBtn.innerHTML;
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting...';

        try {
            let publicImageUrl = null;

            if (selectedFile) {
                const fileExt = selectedFile.name.split('.').pop() || 'png';
                const fileName = `found_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
                
                const { error: uploadError } = await window.supabase.storage
                    .from('item-images')
                    .upload(fileName, selectedFile);

                if (uploadError) throw new Error('Image Upload Failed: ' + uploadError.message);

                const { data } = window.supabase.storage
                    .from('item-images')
                    .getPublicUrl(fileName);
                publicImageUrl = data.publicUrl;
            }

            // Insert into Supabase
            // Note: item_description is hardcoded to prevent public viewing, while actual data goes to admin_specific_details
            const { error: dbError } = await window.supabase
                .from('item_reports')
                .insert([{
                    user_id: sessionStorage.getItem('user_id'),
                    report_type: 'found',
                    item_category: document.getElementById('category-select').value,
                    item_name_specific: document.getElementById('item-name').value,
                    item_description: 'Hidden for security purposes.', 
                    admin_specific_details: document.getElementById('admin-details').value, 
                    item_datetime: `${document.getElementById('found-date').value} ${document.getElementById('found-time').value}:00`,
                    item_location: document.getElementById('location').value,
                    image_path: publicImageUrl,
                    report_status: 'pending' 
                }]);

            if (dbError) throw new Error('Database Error: ' + dbError.message);

            summaryModal.classList.remove('show');
            successModal.classList.add('show');

        } catch (error) {
            alert(error.message);
        } finally {
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = originalBtnText;
        }
    });

    document.getElementById('notify-btn').addEventListener('click', () => {
        window.location.href = 'homepage.html';
    });
});