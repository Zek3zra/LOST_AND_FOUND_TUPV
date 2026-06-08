document.addEventListener('DOMContentLoaded', async () => {
    
    // --- 1. AUTHENTICATION CHECK ---
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    const guestMode = sessionStorage.getItem('userType') === 'guest';
    
    if (!session && !guestMode) {
        window.location.href = 'login.html';
        return;
    }

    // --- 2. POPULATE USER PROFILE UI ---
    if (guestMode) {
        document.getElementById('sidebar-user-name').textContent = 'Guest User';
        document.getElementById('sidebar-user-email').textContent = 'Read-only mode';
        document.getElementById('logout-btn').innerHTML = '<i class="fa-solid fa-arrow-right-to-bracket"></i> <span>Log In</span>';
    } else {
        document.getElementById('sidebar-user-name').textContent = sessionStorage.getItem('user_name') || 'User';
        document.getElementById('sidebar-user-email').textContent = sessionStorage.getItem('user_email') || '';
        
        // Show Admin link if role is admin cleanly via classes
        if (sessionStorage.getItem('role') === 'admin') {
            document.getElementById('admin-dashboard-link').classList.remove('hidden');
        }
    }

    // Handle Logout
    document.getElementById('logout-btn').addEventListener('click', async () => {
        if (!guestMode) {
            await supabase.auth.signOut();
        }
        sessionStorage.clear();
        window.location.href = 'login.html';
    });

    // --- 3. FETCH DATA FROM SUPABASE ---
    const { data: allItems, error: fetchError } = await window.supabase
        .from('item_reports')
        .select('*')
        .eq('report_status', 'approved')
        .order('item_datetime', { ascending: false });

    // Hide loading indicator cleanly
    document.getElementById('loading-indicator').classList.add('hidden');

    if (fetchError) {
        console.error("Error fetching items:", fetchError);
        document.getElementById('lost-items-list').innerHTML = `<div class="empty-state">Failed to load items. Please refresh your browser.</div>`;
        return;
    }

    // Separate items
    const lostItems = allItems.filter(item => item.report_type === 'lost');
    const foundItems = allItems.filter(item => item.report_type === 'found');

    // --- 4. RENDER ITEMS ---
    const lostList = document.getElementById('lost-items-list');
    const foundList = document.getElementById('found-items-list');

    function createCardHTML(item) {
        const dateObj = new Date(item.item_datetime);
        const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const imgPath = item.image_path ? item.image_path : 'images/category.png'; 

        return `
            <div class="item-card" data-category="${item.item_category}">
                <div class="card-image">
                    <img src="${imgPath}" alt="${item.item_name_specific}" onerror="this.src='images/category.png'">
                    <span class="status-badge ${item.report_status}">${item.report_status.toUpperCase()}</span>
                </div>
                <div class="card-content">
                    <div class="card-header">
                        <span class="category-tag"><i class="fa-solid fa-tag"></i> ${item.item_category}</span>
                        <span class="date-tag"><i class="fa-regular fa-clock"></i> ${formattedDate}</span>
                    </div>
                    <h3 class="item-title">${item.item_name_specific || item.item_category}</h3>
                    <p class="item-description">${item.item_description}</p>
                    <div class="location-tag">
                        <i class="fa-solid fa-location-dot"></i> ${item.item_location || 'Location not specified'}
                    </div>
                </div>
            </div>
        `;
    }

    // Inject HTML
    lostList.innerHTML = lostItems.length > 0 
        ? lostItems.map(createCardHTML).join('') 
        : '<div class="empty-state">No lost items reported yet.</div>';
        
    foundList.innerHTML = foundItems.length > 0 
        ? foundItems.map(createCardHTML).join('') 
        : '<div class="empty-state">No found items reported yet.</div>';

    // --- 5. TAB & FILTER LOGIC ---
    const tabLost = document.getElementById('tab-lost');
    const tabFound = document.getElementById('tab-found');
    const categoryFilter = document.getElementById('category-filter');

    function applyFilters() {
        const activeTab = tabLost.classList.contains('active') ? lostList : foundList;
        const selectedCategory = categoryFilter.value;
        const cards = activeTab.querySelectorAll('.item-card');

        cards.forEach(card => {
            const matchesCategory = selectedCategory === "" || card.dataset.category === selectedCategory;
            
            // Cleanly toggle visibility via classes
            if (matchesCategory) {
                card.classList.remove('hidden');
            } else {
                card.classList.add('hidden');
            }
        });
    }

    tabLost.addEventListener('click', () => {
        tabLost.classList.add('active');
        tabFound.classList.remove('active');
        
        lostList.classList.remove('hidden');
        foundList.classList.add('hidden');
        
        applyFilters();
    });

    tabFound.addEventListener('click', () => {
        tabFound.classList.add('active');
        tabLost.classList.remove('active');
        
        foundList.classList.remove('hidden');
        lostList.classList.add('hidden');
        
        applyFilters();
    });

    categoryFilter.addEventListener('change', applyFilters);

    // Initial check for URL parameters (if navigating from a specific category link)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('category')) {
        categoryFilter.value = urlParams.get('category');
        applyFilters();
    }
});