document.addEventListener('DOMContentLoaded', () => {

    // --- MODAL LOGIC ---
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


    // --- LOGIN LOGIC ---
    const loginForm = document.getElementById('loginForm');
    const submitBtn = document.getElementById('login-btn');
    const modal = document.getElementById('message-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalMessage = document.getElementById('modal-message');

    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin" style="margin-right:8px;"></i> Logging in...';

        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        // 1. Hardcoded Admin Check (From your original PHP logic)
        if (email === 'lostandfoundadmin@gmail.com' && password === 'admin12345') {
            sessionStorage.setItem('role', 'admin');
            sessionStorage.setItem('user_name', 'Site Administrator');
            window.location.href = 'admin_side/overview.html';
            return;
        }

        try {
            // 2. Authenticate with Supabase Auth
            const { data: authData, error: authError } = await window.supabase.auth.signInWithPassword({
                email: email,
                password: password,
            });

            if (authError) throw authError;

            // 3. Fetch user details from your public table to build their session
            const { data: userData, error: dbError } = await window.supabase
                .from('users')
                .select('*')
                .eq('email', email)
                .single();

            if (dbError || !userData) {
                throw new Error("Could not retrieve user profile data.");
            }

            // 4. Save user session locally for homepage.js to use
            sessionStorage.setItem('user_id', userData.id);
            sessionStorage.setItem('user_email', userData.email);
            sessionStorage.setItem('user_name', userData.first_name + ' ' + userData.last_name);
            sessionStorage.setItem('role', userData.role);

            // 5. Success feedback and redirect
            modalTitle.textContent = 'Success!';
            modalTitle.style.color = 'var(--primary-blue)';
            modalMessage.textContent = 'Login successful! Redirecting...';
            modal.classList.add('show');
            
            // Clear any lingering guest states
            sessionStorage.removeItem('userType'); 

            setTimeout(() => {
                if (userData.role === 'admin') {
                    window.location.href = 'admin_side/overview.html';
                } else {
                    window.location.href = 'homepage.html';
                }
            }, 1500);

        } catch (err) {
            // Error Handling
            modalTitle.textContent = 'Login Failed';
            modalTitle.style.color = '#dc2626'; 
            
            // Map Supabase's default unconfirmed error to something more user-friendly
            if (err.message === "Email not confirmed") {
                modalMessage.textContent = "Please verify your email address before logging in. Check your inbox for the link!";
            } else {
                modalMessage.textContent = err.message || 'Invalid email or password.';
            }
            
            modal.classList.add('show');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    });
});