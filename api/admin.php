<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Lost & Found Admin</title>
  <link rel="stylesheet" href="overview.css">
  <link rel="stylesheet" href="css/all.min.css">
</head>
<body>

<!-- Hamburger for mobile -->
<div class="hamburger" id="hamburger" aria-label="Menu" role="button" tabindex="0" aria-expanded="false">
  <span></span>
  <span></span>
  <span></span>
</div>

<!-- Sidebar -->
<div id="sidebar" aria-hidden="true">
  <a href="#"><button class="nav-button" data-section="overview"><i class="fa-solid fa-database"></i> Overview</button></a>
  <a href="#"><button class="nav-button" data-section="post-item"><i class="fa-solid fa-pen-to-square"></i> Post Item</button></a>
  <a href="#"><button class="nav-button" data-section="reports"><i class="fa-solid fa-bell"></i> Reports</button></a>
  <a href="#"><button class="nav-button" data-section="users"><i class="fa-solid fa-circle-user"></i> Users</button></a>
</div>

<!-- Desktop Nav -->
<nav>
  <a href="#"><button class="nav-button" data-section="overview"><i class="fa-solid fa-database"></i> Overview</button></a>
  <a href="#"><button class="nav-button" data-section="post-item"><i class="fa-solid fa-pen-to-square"></i> Post Item</button></a>
  <a href="#"><button class="nav-button" data-section="reports"><i class="fa-solid fa-bell"></i> Reports</button></a>
  <a href="#"><button class="nav-button" data-section="users"><i class="fa-solid fa-circle-user"></i> Users</button></a>
</nav>

<div class="main">

  <!-- Overview Section -->
  <section id="overview-section" class="content-section">
    <h2>Activity Overview</h2>
    <div class="activity-overview">
      <div class="activity-card" id="found-items">
        <h3>Overall</h3>
        <h3>Found Items: <span id="found-count">0</span></h3>
        <h3>Never Claimed: <span id="unclaimed-count">0</span></h3>
        <h3>Recent Lost Items: <span id="recent-lost">0</span></h3>
        <h3>Recent Found Items: <span id="recent-found">0</span></h3>
      </div>
      <div class="activity-card" id="claimed-items">
        <h3>Lost Items: <span id="lost-count">0</span></h3>
        <h3>Found Items: <span id="found-count2">0</span></h3>
        <h3>Matches: <span id="matches-count">0</span></h3>
        <h3>User Inquires: <span id="inquiries-count">0</span></h3>
      </div>
    </div>
  </section>

  <!-- Post Item Section -->
  <section id="post-item-section" class="content-section" style="display:none;">
    <h2>Post Item</h2>
    <form id="item-form">
      <div>
        <label>Type:</label>
        <select id="item-type" required>
          <option value="lost">Lost</option>
          <option value="found">Found</option>
        </select>
      </div>
      <div>
        <label for="item-title">Item Name:</label>
        <input type="text" id="item-title" placeholder="e.g., Blue Wallet" required />
      </div>
      <div>
        <label for="item-description">Description:</label>
        <textarea id="item-description" placeholder="Describe the item" required></textarea>
      </div>
      <div>
        <label for="item-location">Location (optional):</label>
        <input type="text" id="item-location" placeholder="e.g., Library" />
      </div>
      <div>
        <label for="item-date">Date:</label>
        <input type="date" id="item-date" required />
      </div>
      <button type="submit" class="btn submit-btn">Post Item</button>
    </form>
  </section>

  <!-- Reports Section (placeholder) -->
  <section id="reports-section" class="content-section" style="display:none;">
    <h2>Reports</h2>
    <p>Reports will appear here.</p>
  </section>

  <!-- Users Section (placeholder) -->
  <section id="users-section" class="content-section" style="display:none;">
    <h2>Users</h2>
    <p>User management will appear here.</p>
  </section>

</div>

<script src="lost&found.js"></script>

<script>
  // Fetch real stats from backend
  async function refreshData() {
    try {
      const res = await fetch('api/get_stats.php');
      const stats = await res.json();

      // Update all stat fields (some are duplicates in your layout)
      document.getElementById('found-count').textContent = stats.found || 0;
      document.getElementById('found-count2').textContent = stats.found || 0;
      document.getElementById('lost-count').textContent = stats.lost || 0;
      document.getElementById('unclaimed-count').textContent = stats.found || 0; // assuming all are unclaimed for now
      document.getElementById('recent-lost').textContent = stats.recent_lost || 0;
      document.getElementById('recent-found').textContent = stats.recent_found || 0;
      document.getElementById('matches-count').textContent = stats.matches || 0;
      document.getElementById('inquiries-count').textContent = 0; // not implemented yet
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  }

  // Handle form submission
  document.getElementById('item-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = {
      type: document.getElementById('item-type').value,
      title: document.getElementById('item-title').value,
      description: document.getElementById('item-description').value,
      location: document.getElementById('item-location').value || null,
      date_posted: document.getElementById('item-date').value
    };

    try {
      const res = await fetch('api/post_item.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const result = await res.json();
      if (result.success) {
        alert('Item posted successfully!');
        document.getElementById('item-form').reset();
        refreshData(); // update Overview
      } else {
        alert('Error: ' + (result.message || 'Failed to post item'));
      }
    } catch (err) {
      alert('Network error. Check console.');
      console.error(err);
    }
  });

  // Initial load
  refreshData();
</script>

</body>
</html>