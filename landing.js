document.addEventListener('DOMContentLoaded', async () => {
    
    // --- DATABASE / AUTH LOGIC ---
    // Check if the user is logged in to Supabase's background system
    const { data: { session }, error } = await window.supabase.auth.getSession();
    
    // Check if the user has ACTUALLY logged in via your form (local session)
    const hasLocalSession = sessionStorage.getItem('user_id');
    
    if (session && hasLocalSession) {
        // Fully authenticated user. Redirect them to their dashboard.
        const role = sessionStorage.getItem('role');
        if (role === 'admin') {
            window.location.href = 'admin_side/overview.html';
        } else {
            window.location.href = 'homepage.html';
        }
    } else if (session && !hasLocalSession) {
        // Dangling session from email verification! 
        // Sign them out in the background so they are forced to log in properly
        // and aren't forcefully redirected away from the landing page.
        await window.supabase.auth.signOut();
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