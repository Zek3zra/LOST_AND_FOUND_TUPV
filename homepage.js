document.addEventListener('DOMContentLoaded', async () => {
    
    // --- 1. AUTHENTICATION & UI SETUP ---
    const { data: { session } } = await window.supabase.auth.getSession();
    const guestMode = sessionStorage.getItem('userType') === 'guest';
    
    if (!session && !guestMode) {
        window.location.href = 'login.html';
        return;
    }

    if (sessionStorage.getItem('role') === 'admin') {
        const adminLink = document.getElementById('admin-dashboard-link');
        if (adminLink) adminLink.classList.remove('hidden');
    }

    // Sidebar Toggle
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('desktop-sidebar');
    if(sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
        });
    }

    // Date/Time
    function updateDateTime() {
        const dt = document.getElementById('current-date-time');
        if(dt) dt.textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
    setInterval(updateDateTime, 1000);
    updateDateTime();

    // Logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            if (!guestMode) await window.supabase.auth.signOut();
            sessionStorage.clear();
            window.location.href = 'login.html';
        });
    }

    // --- 2. GLOBAL MODALS HANDLER (Header/Footer Links) ---
    const staticModals = {
        'about-link': 'about-modal', 'footer-about-link': 'about-modal',
        'footer-how-it-works-link': 'how-it-works-modal', 'footer-faq-link': 'faq-modal',
        'contact-link': 'footer-contact-modal', 'footer-contact-link': 'footer-contact-modal',
        'footer-privacy-link': 'privacy-modal', 'footer-terms-link': 'terms-modal'
    };
    
    Object.keys(staticModals).forEach(id => {
        const el = document.getElementById(id);
        if(el) {
            el.addEventListener('click', (e) => { 
                e.preventDefault(); 
                document.getElementById(staticModals[id]).classList.add('show'); 
            });
        }
    });

    document.querySelectorAll('[data-close]').forEach(btn => {
        btn.addEventListener('click', function() {
            this.closest('.modal-overlay').classList.remove('show');
        });
    });

    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-overlay')) {
            e.target.classList.remove('show');
        }
    });


    // --- 3. DATA FETCHING ---
    let globalFetchedItems = []; // Store items so we can access them when a card is clicked

    const { data: allItems, error: fetchError } = await window.supabase
        .from('item_reports')
        .select('*')
        .eq('report_status', 'approved')
        .order('item_datetime', { ascending: false });

    document.getElementById('loading-indicator').classList.add('hidden');

    if (fetchError) {
        document.getElementById('lost-items-list').innerHTML = `<div class="empty-state">Failed to load items.</div>`;
        return;
    }

    globalFetchedItems = allItems || [];
    const lostItems = globalFetchedItems.filter(item => item.report_type === 'lost');
    const foundItems = globalFetchedItems.filter(item => item.report_type === 'found');


    // --- 4. HTML GENERATION (Clean Gallery Card) ---
    function createGalleryCardHTML(item) {
        const dateObj = new Date(item.item_datetime);
        const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        
        let imageContent = '';
        if (item.image_path) {
            imageContent = `<img src="${item.image_path}" alt="Item">`;
        } else {
            imageContent = `
                <div class="gallery-no-image">
                    <i class="fa-solid fa-image fa-2x"></i>
                    <span>NO IMAGE</span>
                </div>
            `;
        }

        // Return a clean, minimal card structure. Note the data-id attribute.
        return `
            <div class="gallery-card" data-id="${item.report_id}" data-category="${item.item_category}">
                <div class="gallery-image-container">
                    ${imageContent}
                </div>
                <div class="gallery-info">
                    <div class="gallery-title" title="${item.item_name_specific}">${item.item_name_specific}</div>
                    <span class="gallery-date">${formattedDate}</span>
                </div>
            </div>
        `;
    }

    const lostList = document.getElementById('lost-items-list');
    const foundList = document.getElementById('found-items-list');

    lostList.innerHTML = lostItems.length > 0 ? lostItems.map(createGalleryCardHTML).join('') : '<div class="empty-state">No lost items reported yet.</div>';
    foundList.innerHTML = foundItems.length > 0 ? foundItems.map(createGalleryCardHTML).join('') : '<div class="empty-state">No found items reported yet.</div>';


    // --- 5. OPEN ITEM DETAILS MODAL ---
    const itemDetailsModal = document.getElementById('item-details-modal');
    
    // Use event delegation on the container
    document.querySelector('.items-container').addEventListener('click', (e) => {
        const card = e.target.closest('.gallery-card');
        if (!card) return;

        const itemId = card.getAttribute('data-id');
        const item = globalFetchedItems.find(i => String(i.report_id) === String(itemId));
        if (!item) return;

        // Populate Modal Info
        const statusBadge = document.getElementById('modal-item-status');
        if (item.report_type === 'lost') {
            statusBadge.textContent = 'LOST ITEM';
            statusBadge.style.backgroundColor = 'var(--accent-amber)';
            document.getElementById('modal-location-label').textContent = 'Last Seen At';
            document.getElementById('modal-date-label').textContent = 'Lost On';
        } else {
            statusBadge.textContent = 'FOUND ITEM';
            statusBadge.style.backgroundColor = 'var(--primary-blue)';
            document.getElementById('modal-location-label').textContent = 'Found At';
            document.getElementById('modal-date-label').textContent = 'Found On';
        }

        document.getElementById('modal-item-name').textContent = item.item_name_specific;
        document.getElementById('modal-item-category').textContent = item.item_category;
        document.getElementById('modal-item-location').textContent = item.item_location || 'Not Specified';
        
        const dt = new Date(item.item_datetime);
        document.getElementById('modal-item-datetime').textContent = dt.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
        
        document.getElementById('modal-item-description').textContent = item.item_description;

        // Populate Image
        const imgContainer = document.getElementById('modal-image-container');
        const itemImg = document.getElementById('modal-item-image');
        const noImg = document.getElementById('modal-no-image');

        if (item.image_path) {
            itemImg.src = item.image_path;
            itemImg.style.display = 'block';
            noImg.style.display = 'none';
            imgContainer.style.display = 'block';
        } else {
            itemImg.src = '';
            itemImg.style.display = 'none';
            noImg.style.display = 'flex';
            imgContainer.style.display = 'block'; 
        }

        itemDetailsModal.classList.add('show');
    });

    document.getElementById('close-item-modal').addEventListener('click', () => {
        itemDetailsModal.classList.remove('show');
    });


    // --- 6. FILTERING & TABS ---
    const lostBtn = document.getElementById('lost-btn');
    const foundBtn = document.getElementById('found-btn');
    const categorySelect = document.getElementById('category-filter-select');

    function applyFilters() {
        const activeContainer = lostBtn.classList.contains('active') ? lostList : foundList;
        const selectedCat = categorySelect.value;
        
        activeContainer.querySelectorAll('.gallery-card').forEach(card => {
            const matches = !selectedCat || card.dataset.category === selectedCat;
            if (matches) card.classList.remove('hidden');
            else card.classList.add('hidden');
        });
    }

    lostBtn.addEventListener('click', () => {
        lostBtn.classList.add('active');
        foundBtn.classList.remove('active');
        lostList.classList.remove('hidden');
        foundList.classList.add('hidden');
        applyFilters();
    });

    foundBtn.addEventListener('click', () => {
        foundBtn.classList.add('active');
        lostBtn.classList.remove('active');
        foundList.classList.remove('hidden');
        lostList.classList.add('hidden');
        applyFilters();
    });

    categorySelect.addEventListener('change', applyFilters);
});