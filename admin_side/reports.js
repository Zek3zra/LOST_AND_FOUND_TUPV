document.addEventListener('DOMContentLoaded', () => {

    // ===================================
    // Sidebar Toggle Logic
    // ===================================
    const hamburger = document.getElementById('hamburger');
    const sidebar = document.getElementById('sidebar');

    if (hamburger && sidebar) {
        hamburger.addEventListener('click', () => {
            sidebar.classList.toggle('open');
            const expanded = hamburger.getAttribute('aria-expanded') === 'true' || false;
            hamburger.setAttribute('aria-expanded', String(!expanded));
            sidebar.setAttribute('aria-hidden', String(!sidebar.classList.contains('open')));
        });
        
        hamburger.addEventListener('keydown', (e) => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            hamburger.click();
          }
        });
    }

    // ===========================================
    // Item Filtering and Sorting Functionality
    // ===========================================
    const tabButtons = document.querySelectorAll('.tab-btn');
    const sortButtons = document.querySelectorAll('.sorting-btn');
    const itemsContainer = document.getElementById('itemsContainer');
    const items = itemsContainer ? Array.from(itemsContainer.querySelectorAll('.item-card')) : [];

    const viewDetailsModal = document.getElementById('viewDetailsModal');
    const allCloseButtons = document.querySelectorAll('[data-close]');

    let currentTab = 'all';
    let currentSort = 'default';

    // Filter Items by Tab
    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        tabButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentTab = btn.getAttribute('data-tab');
        filterItems();
      });
    });

    // Sort Items
    sortButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        sortButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentSort = btn.getAttribute('data-sort');
        sortItems();
      });
    });

    function filterItems() {
      items.forEach(item => {
        const category = item.getAttribute('data-category');
        if (currentTab === 'all' || category === currentTab) {
          item.style.display = 'flex';
        } else {
          item.style.display = 'none';
        }
      });
      sortItems();
    }

    function sortItems() {
      if(!itemsContainer) return;
      let sortableItems = Array.from(itemsContainer.querySelectorAll('.item-card')).filter(item => item.style.display !== 'none');

      if (currentSort === 'name') {
        sortableItems.sort((a, b) => {
          const nameA = a.getAttribute('data-name').toLowerCase();
          const nameB = b.getAttribute('data-name').toLowerCase();
          return nameA.localeCompare(nameB);
        });
      } else if (currentSort === 'date') {
        sortableItems.sort((a, b) => {
          const dateA = a.getAttribute('data-date');
          const dateB = b.getAttribute('data-date');
          return new Date(dateA) - new Date(dateB);
        });
      }

      sortableItems.forEach(item => {
        itemsContainer.appendChild(item);
      });
    }

    // Initialize layout on load
    filterItems();

    // ===========================================
    // Modals Handling
    // ===========================================
    allCloseButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            if (viewDetailsModal) viewDetailsModal.style.display = 'none';
        });
    });

    window.addEventListener('click', (event) => {
        if (event.target == viewDetailsModal) {
            viewDetailsModal.style.display = "none";
        }
    });

    // ===========================================
    // "See Details" & "Mark as..." Click Logic
    // ===========================================
    if (itemsContainer) {
        itemsContainer.addEventListener('click', (e) => {
            const button = e.target.closest('.action-btn-text');
            if (!button) return;
            const card = e.target.closest('.item-card');
            if (!card) return;

            // --- Handle "See Details" ---
            if (button.classList.contains('btn-details')) {
                const imgEl = document.getElementById('modal-image');
                if (imgEl) imgEl.src = card.dataset.image;
                
                const statusEl = document.getElementById('modal-status');
                if (statusEl) {
                    statusEl.textContent = card.dataset.status || 'N/A';
                    let rawCat = card.dataset.category || '';
                    statusEl.className = 'badge ' + (rawCat === 'matches' ? 'matched' : rawCat);
                }
                
                document.getElementById('modal-item').textContent = card.dataset.name || 'N/A';
                document.getElementById('modal-category').textContent = card.dataset.category === 'matches' ? 'Matched' : card.dataset.category.charAt(0).toUpperCase() + card.dataset.category.slice(1);
                document.getElementById('modal-location').textContent = card.dataset.location || 'N/A';
                document.getElementById('modal-date').textContent = card.dataset.date || 'N/A';
                document.getElementById('modal-time').textContent = card.dataset.time || 'N/A';
                document.getElementById('modal-description').textContent = card.dataset.description || 'N/A';
                document.getElementById('modal-reporter').textContent = card.dataset.reporter || 'N/A';
                
                if (viewDetailsModal) viewDetailsModal.style.display = 'flex';
            }

            // --- Handle "Mark as..." ---
            if (button.dataset.action === 'mark-retrieved' || button.dataset.action === 'mark-found') {
                const reportId = card.dataset.reportId;
                const userId = card.dataset.userId;
                const action = button.dataset.action;
                const itemName = card.dataset.name;
                const actionText = (action === 'mark-retrieved') ? 'Retrieved' : 'Found';

                if (!confirm(`Are you sure you want to mark "${itemName}" as ${actionText}?`)) {
                    return;
                }

                const formData = new FormData();
                formData.append('report_id', reportId);
                formData.append('user_id', userId);
                formData.append('action', action);

                fetch('update_item_status.php', {
                    method: 'POST',
                    body: formData
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        // Create the new "Claimed" button to swap in
                        const claimedButton = document.createElement('button');
                        claimedButton.className = 'action-btn-text disabled';
                        claimedButton.disabled = true;
                        claimedButton.innerHTML = '<i class="fa-solid fa-check-double"></i> Claimed';

                        button.parentNode.replaceChild(claimedButton, button);

                        // Update the badge on the card image
                        const badge = card.querySelector('.badge.position-absolute');
                        if (badge) {
                            badge.textContent = 'Matched!';
                            badge.className = 'badge position-absolute matched';
                        }
                        
                        card.dataset.category = 'matches';
                        card.dataset.status = 'Matched!';
                        
                        // Immediately filter out if user is not on "All" or "Matches" tab
                        if (currentTab !== 'all' && currentTab !== 'matches') {
                            card.style.display = 'none';
                        }
                        
                    } else {
                        alert('Error: ' + data.message);
                    }
                })
                .catch(error => {
                    console.error('Update status error:', error);
                    alert('An error occurred. Please check the console.');
                });
            }
        });
    }
});