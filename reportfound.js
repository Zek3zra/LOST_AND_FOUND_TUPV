document.addEventListener('DOMContentLoaded', () => {

    // --- 1. Security Check ---
    const guestMode = sessionStorage.getItem('userType') === 'guest';
    if (!sessionStorage.getItem('user_id') && !guestMode) {
        window.location.href = 'login.html';
        return;
    }

    // --- 2. Basic UI & Modals ---
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
    
    // Admin Link Logic
    if (sessionStorage.getItem('role') === 'admin') {
        const adminLink = document.getElementById('admin-dashboard-link');
        if (adminLink) adminLink.classList.remove('hidden');
    }

    // Uniform Logout Logic
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            if (!guestMode) {
                await window.supabase.auth.signOut();
            }
            sessionStorage.clear();
            window.location.href = 'login.html';
        });
    }

    const modals = {
        'about-link': 'about-modal', 'footer-about-link': 'about-modal',
        'footer-how-it-works-link': 'how-it-works-modal', 'footer-faq-link': 'faq-modal',
        'contact-link': 'footer-contact-modal', 'footer-contact-link': 'footer-contact-modal',
        'footer-privacy-link': 'privacy-modal', 'footer-terms-link': 'terms-modal'
    };
    
    Object.keys(modals).forEach(id => {
        const el = document.getElementById(id);
        if(el) el.addEventListener('click', (e) => { e.preventDefault(); document.getElementById(modals[id]).classList.add('show'); });
    });
    
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', function() { this.closest('.modal-overlay').classList.remove('show'); });
    });


    // --- 3. Photo Uploader Preview ---
    const photoUploader = document.getElementById('photo-uploader');
    const photoInput = document.getElementById('photo-input');
    let uploadedImageFile = null; 

    if (photoUploader && photoInput) {
        photoUploader.addEventListener('click', () => photoInput.click());

        photoInput.addEventListener('change', (event) => {
            uploadedImageFile = event.target.files[0];
            if (uploadedImageFile) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    photoUploader.innerHTML = `<img src="${e.target.result}" alt="Preview" style="width: 100%; height: 100%; object-fit: cover; border-radius: 10px;">`;
                    document.getElementById('summary-image').src = e.target.result;
                    document.getElementById('summary-image').style.display = 'block';
                };
                reader.readAsDataURL(uploadedImageFile);
            }
        });
    }

    // --- 4. Form Submission & Supabase Integration ---
    const reportForm = document.getElementById('report-form');
    const confirmationModal = document.getElementById('confirmation-modal');
    const successModal = document.getElementById('success-modal');
    const confirmBtn = document.getElementById('confirm-btn');

    reportForm.addEventListener('submit', (event) => {
        event.preventDefault(); 
        // Populate confirmation modal (IDs match the 'found' HTML structure)
        document.getElementById('summary-category').textContent = document.getElementById('category-select').value;
        document.getElementById('summary-description').textContent = document.getElementById('item-description').value;
        document.getElementById('summary-datetime').textContent = `${document.getElementById('found-date').value} at ${document.getElementById('found-time').value}`;
        document.getElementById('summary-location').textContent = document.getElementById('location').value;
        confirmationModal.classList.add('show');
    });

    document.getElementById('cancel-btn').addEventListener('click', () => {
        confirmationModal.classList.remove('show');
    });

    // The actual database insertion
    confirmBtn.addEventListener('click', async () => {
        
        // Disable button to prevent double-clicks
        const originalBtnText = confirmBtn.innerHTML;
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Submitting...';

        try {
            let publicImageUrl = null;

            // Step A: Upload image to Supabase Storage (if a file was selected)
            if (uploadedImageFile) {
                const fileExt = uploadedImageFile.name.split('.').pop();
                const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
                
                const { data: uploadData, error: uploadError } = await window.supabase.storage
                    .from('item-images')
                    .upload(fileName, uploadedImageFile);
                
                if (uploadError) throw new Error('Image Upload Failed: ' + uploadError.message);
                
                // Get the public URL for the database
                const { data: publicUrlData } = window.supabase.storage
                    .from('item-images')
                    .getPublicUrl(fileName);
                    
                publicImageUrl = publicUrlData.publicUrl;
            }

            // Step B: Insert the record into 'item_reports'
            const { error: dbError } = await window.supabase
                .from('item_reports')
                .insert([{
                    user_id: sessionStorage.getItem('user_id'),
                    report_type: 'found', // CRITICAL: Marks it as found
                    item_category: document.getElementById('category-select').value,
                    item_name_specific: document.getElementById('item-name').value,
                    item_description: document.getElementById('item-description').value,
                    item_datetime: `${document.getElementById('found-date').value} ${document.getElementById('found-time').value}:00`,
                    item_location: document.getElementById('location').value,
                    image_path: publicImageUrl,
                    report_status: 'pending' // Admin must approve it
                }]);

            if (dbError) throw new Error('Database Error: ' + dbError.message);

            // Step C: Success UI
            confirmationModal.classList.remove('show');
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