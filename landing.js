document.addEventListener('DOMContentLoaded', async () => {
    
    // --- DATABASE / AUTH LOGIC ---
    // Check if the user is already logged in to Supabase.
    // If they are, skip the landing page and redirect them straight to their dashboard.
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (session) {
        // User is logged in. Check sessionStorage to see if they are an admin.
        const role = sessionStorage.getItem('role');
        if (role === 'admin') {
            window.location.href = 'admin_side/overview.html';
        } else {
            window.location.href = 'homepage.html';
        }
    }

    // --- UI LOGIC (Modals) ---
    const modals = {
        'about-link': 'about-modal',
        'footer-about-link': 'about-modal',
        'footer-how-it-works-link': 'how-it-works-modal',
        'footer-faq-link': 'faq-modal',
        'contact-link': 'footer-contact-modal',
        'footer-contact-link': 'footer-contact-modal',
        'footer-privacy-link': 'privacy-modal',
        'footer-terms-link': 'terms-modal'
    };

    Object.keys(modals).forEach(linkId => {
        const linkElement = document.getElementById(linkId);
        if(linkElement) {
            linkElement.addEventListener('click', (e) => {
                e.preventDefault();
                document.getElementById(modals[linkId]).classList.add('show');
            });
        }
    });

    document.querySelectorAll('.close-modal').forEach(button => {
        button.addEventListener('click', function() {
            this.closest('.modal-overlay').classList.remove('show');
        });
    });

    window.addEventListener('click', (event) => {
        if (event.target.classList.contains('modal-overlay')) {
            event.target.classList.remove('show');
        }
    });

    // --- GUEST SESSION LOGIC ---
    const guestBtn = document.getElementById('guest-btn');
    if (guestBtn) {
        guestBtn.addEventListener('click', function() {
            sessionStorage.setItem('userType', 'guest');
        });
    }
});