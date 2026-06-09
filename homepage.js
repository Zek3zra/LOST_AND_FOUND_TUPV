document.addEventListener('DOMContentLoaded', async () => {
    
    // --- 1. AUTHENTICATION & UI SETUP ---
    const { data: { session } } = await supabase.auth.getSession();
    const guestMode = sessionStorage.getItem('userType') === 'guest';
    
    if (!session && !guestMode) {
        window.location.href = 'login.html';
        return;
    }

    if (sessionStorage.getItem('role') === 'admin') {
        document.getElementById('admin-dashboard-link').classList.remove('hidden');
    }

    // Sidebar Toggle Logic
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('desktop-sidebar');
    if(sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
        });
    }

    // Date/Time UI
    function updateDateTime() {
        const dt = document.getElementById('current-date-time');
        if(dt) dt.textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
    setInterval(updateDateTime, 1000);
    updateDateTime();

    // Handle Logout
    document.getElementById('logout-btn').addEventListener('click', async (e) => {
        e.preventDefault();
        if (!guestMode) await supabase.auth.signOut();
        sessionStorage.clear();
        window.location.href = 'login.html';
    });

    // Handle Modals
    const modals = {
        'about-link': 'about-modal',
        'footer-about-link': 'about-modal',
        'footer-how-it-works-link': 'how-it-works-modal',
        'footer-faq-link': 'faq-modal',
        'contact-link': 'footer-contact-modal',
        'footer-contact-link': 'footer-contact-modal'
    };
    Object.keys(modals).forEach(id => {
        const el = document.getElementById(id);
        if(el) el.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById(modals[id]).classList.add('show');
        });
    });
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', function() { this.closest('.modal-overlay').classList.remove('show'); });
    });
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-overlay')) e.target.classList.remove('show');
    });

    // --- 2. DATA FETCHING ---
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

    const lostItems = allItems.filter(item => item.report_type === 'lost');
    const foundItems = allItems.filter(item => item.report_type === 'found');

    // --- 3. HTML GENERATION (Matching original CSS structure) ---
    function createCardHTML(item) {
        const dateObj = new Date(item.item_datetime);
        const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) + ' at ' + dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        
        const statusType = item.report_type === 'lost' ? 'LOST ITEM' : 'FOUND ITEM';
        const labelTwo = item.report_type === 'lost' ? 'LAST SEEN:' : 'FOUND AT:';
        const labelThree = item.report_type === 'lost' ? 'DATE REPORTED:' : 'DATE FOUND:';

        // Replicating the exact HTML structure your homepage.css expects
        return `
            <div class="item-card" data-category="${item.item_category}" data-status="${statusType}">
                <div class="item-details">
                    <h3>${statusType}</h3>
                    <p><strong>ITEM:</strong> ${item.item_name_specific || item.item_category}</p>
                    <p><strong>DESCRIPTION:</strong> ${item.item_description}</p>
                    <p><strong>${labelTwo}</strong> ${item.item_location || 'Not specified'}</p>
                    <p><strong>${labelThree}</strong> ${formattedDate}</p>
                </div>
                <div class="item-image ${!item.image_path ? 'no-image' : ''}">
                    ${item.image_path ? `<img src="${item.image_path}" alt="Item">` : `<span>NO IMAGE</span>`}
                </div>
            </div>
        `;
    }

    const lostList = document.getElementById('lost-items-list');
    const foundList = document.getElementById('found-items-list');

    lostList.innerHTML = lostItems.length > 0 ? lostItems.map(createCardHTML).join('') : '<div class="empty-state">No lost items reported yet.</div>';
    foundList.innerHTML = foundItems.length > 0 ? foundItems.map(createCardHTML).join('') : '<div class="empty-state">No found items reported yet.</div>';

    // --- 4. FILTERING & TABS ---
    const lostBtn = document.getElementById('lost-btn');
    const foundBtn = document.getElementById('found-btn');
    const categorySelect = document.getElementById('category-filter-select');

    function applyFilters() {
        const activeContainer = lostBtn.classList.contains('active') ? lostList : foundList;
        const selectedCat = categorySelect.value;
        
        activeContainer.querySelectorAll('.item-card').forEach(card => {
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