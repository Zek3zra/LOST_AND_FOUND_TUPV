  // Toggle sidebar on mobile
  const hamburger = document.getElementById('hamburger');
  const sidebar = document.getElementById('sidebar');

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

  // Handle section switching
  const navButtons = document.querySelectorAll('.nav-button');

  function switchSection(sectionId) {
    document.querySelectorAll('.content-section').forEach(sec => {
      sec.style.display = 'none';
    });
    document.getElementById(sectionId).style.display = 'block';

    // Update active nav buttons
    document.querySelectorAll('.nav-button').forEach(btn => {
      btn.classList.remove('active');
    });
    const btn = document.querySelector(`.nav-button[data-section="${sectionId.replace('-section','')}"]`);
    if (btn) {
      btn.classList.add('active');
    }

    // Close sidebar on mobile
    if (window.innerWidth <= 768 && sidebar.classList.contains('open')) {
      sidebar.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
      sidebar.setAttribute('aria-hidden', 'true');
    }
  }

  document.querySelectorAll('.nav-button').forEach(btn => {
    btn.addEventListener('click', () => {
      switchSection(btn.dataset.section + '-section');
    });
  });

  // Default to overview
  switchSection('overview-section');

  // Refresh data function
  function refreshData() {
    document.getElementById('found-count').textContent = Math.floor(Math.random() * 20) + 1;
    document.getElementById('claimed-count').textContent = Math.floor(Math.random() * 10) + 1;
  }

  // Toggle admin post
  function toggleAdminPost() {
    document.getElementById('admin-post-container').classList.toggle('show');
  }

  
  // Example: Toggle report cards based on filter
const filterButtons = document.querySelectorAll('.filter-btn');
const reportCards = document.querySelectorAll('.report-card');

filterButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    // Remove active class from all buttons
    filterButtons.forEach(b => b.classList.remove('active'));
    // Add active class to clicked button
    btn.classList.add('active');

    const filter = btn.dataset.filter;

    reportCards.forEach(card => {
      if (filter === 'all') {
        card.style.display = 'flex';
      } else if (filter === 'lost' && card.classList.contains('lost')) {
        card.style.display = 'flex';
      } else if (filter === 'found' && card.classList.contains('found')) {
        card.style.display = 'flex';
      } else if (filter === 'matches' && card.classList.contains('matches')) {
        card.style.display = 'flex';
      } else {
        card.style.display = 'none';
      }
    });
  });
});