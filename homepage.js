document.addEventListener('DOMContentLoaded', async () => {
    
    // --- 1. AUTHENTICATION & UI SETUP ---
    const { data: { session } } = await window.supabase.auth.getSession();
    const guestMode = sessionStorage.getItem('userType') === 'guest';
    const userId = sessionStorage.getItem('user_id');
    
    if (!session && !guestMode) {
        window.location.href = 'login.html';
        return;
    }

    // --- REAL-TIME BAN LISTENER ---
    // --- REAL-TIME ACCOUNT STATUS LISTENER ---
    if (userId && !guestMode) {
        window.supabase.channel('user-status-listener')
            // 1. Listen for Role Changes and Bans (UPDATE)
            .on('postgres_changes', { 
                event: 'UPDATE', 
                schema: 'public', 
                table: 'users', 
                filter: `id=eq.${userId}` 
            }, async (payload) => {
                const newRole = payload.new.role;
                const currentRole = sessionStorage.getItem('role');

                // Handle Ban
                if (newRole === 'banned') {
                    await window.supabase.auth.signOut();
                    sessionStorage.clear();
                    window.location.replace('login.html');
                } 
                // Handle Role Change (e.g., User to Admin)
                else if (newRole && currentRole && newRole !== currentRole) {
                    await window.supabase.auth.signOut();
                    sessionStorage.clear();
                    window.location.replace('login.html');
                }
            })
            // 2. Listen for Account Deletion (DELETE)
            .on('postgres_changes', { 
                event: 'DELETE', 
                schema: 'public', 
                table: 'users', 
                filter: `id=eq.${userId}` 
            }, async () => {
                await window.supabase.auth.signOut();
                sessionStorage.clear();
                window.location.replace('login.html');
            })
            .subscribe();
    }

    if (sessionStorage.getItem('role') === 'admin') {
        const adminLink = document.getElementById('admin-dashboard-link');
        if (adminLink) adminLink.classList.remove('hidden');
    }

    // Redirect Guests from Restricted Links
    if (guestMode) {
        document.querySelectorAll('.restricted-link').forEach(link => {
            link.href = 'guestprofile.html';
        });
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
    let globalFetchedItems = []; 

    const { data: allItems, error: fetchError } = await window.supabase
        .from('item_reports')
        .select('*, users(first_name, last_name, email, contact_number)')
        .eq('report_status', 'approved')
        .order('item_datetime', { ascending: false });

    document.getElementById('loading-indicator').classList.add('hidden');

    if (fetchError) {
        document.getElementById('lost-items-list').innerHTML = `<div class="empty-state">Failed to load items.</div>`;
        return;
    }

    globalFetchedItems = allItems || [];
    
    const lostListContainer = document.getElementById('lost-items-list');
    const foundListContainer = document.getElementById('found-items-list');

    // --- 4. HTML GENERATION (Compact Grid Cards) ---
    function renderCards(container, itemsArray) {
        if (itemsArray.length === 0) {
            container.innerHTML = '<div class="empty-state">No items match your criteria.</div>';
            return;
        }

        container.innerHTML = itemsArray.map(item => {
            const dateObj = new Date(item.item_datetime);
            const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            
            let imageContent = item.image_path 
                ? `<img src="${item.image_path}" alt="Item">` 
                : `<div class="gallery-no-image"><i class="fa-regular fa-image"></i><span>NO PHOTO</span></div>`;

            const badgeClass = item.report_type === 'lost' ? 'badge-lost' : 'badge-found';

            return `
                <div class="gallery-card" data-id="${item.report_id}">
                    <div class="gallery-image-container">
                        ${imageContent}
                        <span class="gallery-badge ${badgeClass}">${item.report_type.toUpperCase()}</span>
                    </div>
                    <div class="gallery-info">
                        <div class="gallery-title" title="${item.item_name_specific}">${item.item_name_specific}</div>
                        <div class="gallery-meta"><i class="fa-solid fa-location-dot"></i> <span>${item.item_location}</span></div>
                        <div class="gallery-meta"><i class="fa-solid fa-clock"></i> <span>${formattedDate}</span></div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Initial render
    const lostItems = globalFetchedItems.filter(item => item.report_type === 'lost');
    const foundItems = globalFetchedItems.filter(item => item.report_type === 'found');
    renderCards(lostListContainer, lostItems);
    renderCards(foundListContainer, foundItems);


    // --- 5. OPEN ITEM DETAILS MODAL ---
    const itemDetailsModal = document.getElementById('item-details-modal');
    
    document.querySelector('.items-container').addEventListener('click', (e) => {
        const card = e.target.closest('.gallery-card');
        if (!card) return;

        const itemId = card.getAttribute('data-id');
        const item = globalFetchedItems.find(i => String(i.report_id) === String(itemId));
        if (!item) return;

        const statusBadge = document.getElementById('modal-item-status');
        const footerMessage = document.getElementById('modal-footer-message');
        
        if (item.report_type === 'lost') {
            statusBadge.textContent = 'LOST ITEM';
            statusBadge.style.backgroundColor = 'var(--accent-amber)';
            document.getElementById('modal-location-label').textContent = 'Last Seen At';
            document.getElementById('modal-date-label').textContent = 'Lost On';
            footerMessage.innerHTML = '<strong>Did you find this item?</strong> Please surrender it to the Admin at the library or contact support.';
        } else {
            statusBadge.textContent = 'FOUND ITEM';
            statusBadge.style.backgroundColor = 'var(--primary-blue)';
            document.getElementById('modal-location-label').textContent = 'Found At';
            document.getElementById('modal-date-label').textContent = 'Found On';
            footerMessage.innerHTML = '<strong>Is this your item?</strong> Please contact the TUPV Library to claim it.';
        }

        document.getElementById('modal-item-name').textContent = item.item_name_specific;
        document.getElementById('modal-item-category').textContent = item.item_category;
        document.getElementById('modal-item-location').textContent = item.item_location || 'Not Specified';
        
        const dt = new Date(item.item_datetime);
        document.getElementById('modal-item-datetime').textContent = dt.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
        
        const reporterNameEl = document.getElementById('modal-reporter-name');
        const reporterContactEl = document.getElementById('modal-reporter-contact');
        
        if (item.users) {
            reporterNameEl.textContent = `${item.users.first_name} ${item.users.last_name}`;
            reporterContactEl.textContent = item.users.contact_number || item.users.email || 'No contact provided';
        } else if (item.reporter_name_manual) {
            reporterNameEl.textContent = `${item.reporter_name_manual} (Posted by Admin)`;
            reporterContactEl.textContent = item.reporter_contact_manual || 'No contact provided';
        } else {
            reporterNameEl.textContent = 'Anonymous / Unknown';
            reporterContactEl.textContent = '';
        }

        document.getElementById('modal-item-description').textContent = item.item_description || 'No description provided.';

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


    // --- 6. FILTERING & SEARCH LOGIC ---
    const searchInput = document.getElementById('searchInput');
    const categorySelect = document.getElementById('category-filter-select');
    const lostBtn = document.getElementById('lost-btn');
    const foundBtn = document.getElementById('found-btn');

    function applyFilters() {
        const activeType = lostBtn.classList.contains('active') ? 'lost' : 'found';
        const searchTerm = searchInput.value.toLowerCase().trim();
        const selectedCat = categorySelect.value;
        
        const filteredArray = globalFetchedItems.filter(item => {
            const isCorrectType = item.report_type === activeType;
            const matchesCategory = selectedCat === '' || item.item_category === selectedCat;
            const matchesSearch = 
                (item.item_name_specific && item.item_name_specific.toLowerCase().includes(searchTerm)) ||
                (item.item_location && item.item_location.toLowerCase().includes(searchTerm));
                
            return isCorrectType && matchesCategory && matchesSearch;
        });

        if (activeType === 'lost') {
            renderCards(lostListContainer, filteredArray);
        } else {
            renderCards(foundListContainer, filteredArray);
        }
    }

    searchInput.addEventListener('input', applyFilters);
    categorySelect.addEventListener('change', applyFilters);

    lostBtn.addEventListener('click', () => {
        lostBtn.classList.add('active');
        foundBtn.classList.remove('active');
        lostListContainer.classList.remove('hidden');
        foundListContainer.classList.add('hidden');
        applyFilters();
    });

    foundBtn.addEventListener('click', () => {
        foundBtn.classList.add('active');
        lostBtn.classList.remove('active');
        foundListContainer.classList.remove('hidden');
        lostListContainer.classList.add('hidden');
        applyFilters();
    });

});