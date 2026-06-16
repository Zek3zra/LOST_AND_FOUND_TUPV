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

    document.querySelectorAll('.close-modal, [data-close]').forEach(button => {
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

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const originalText = submitBtn.innerHTML;
        
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Authenticating...';
        submitBtn.disabled = true;

        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        try {
            // 1. Authenticate with Supabase
            const { data: authData, error: authError } = await window.supabase.auth.signInWithPassword({
                email: email,
                password: password,
            });

            if (authError) throw new Error(authError.message);

            const session = authData.session;
            if (!session) throw new Error("Authentication failed. Please try again.");

            // 2. Fetch User Profile & Role from the database
            const { data: userData, error: userError } = await window.supabase
                .from('users')
                .select('first_name, last_name, role')
                .eq('id', session.user.id)
                .single();

            if (userError) throw new Error("Could not retrieve user profile.");

            // 3. NEW: Intercept Banned Users IMMEDIATELY
            if (userData.role === 'banned') {
                await window.supabase.auth.signOut(); // Force immediate log out
                throw new Error("BANNED_ACCOUNT");
            }

            // 4. Store necessary data for regular / admin users
            sessionStorage.setItem('user_id', session.user.id);
            sessionStorage.setItem('user_name', userData.first_name + ' ' + userData.last_name);
            sessionStorage.setItem('role', userData.role);

            // 5. Success feedback and redirect
            modalTitle.textContent = 'Success!';
            modalTitle.style.color = 'var(--primary-blue)';
            modalMessage.innerHTML = 'Login successful! Redirecting...';
            modal.classList.add('show');
            
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
            
            if (err.message === "BANNED_ACCOUNT") {
                modalTitle.textContent = 'Account Suspended';
                modalTitle.style.color = '#f97316'; // Orange warning color
                modalMessage.innerHTML = 'Your account has been banned due to violations of campus guidelines.<br><br>If you believe this is a mistake, please proceed to the <strong>TUPV Administration Office</strong> to appeal your status.';
            } else if (err.message === "Email not confirmed") {
                modalMessage.innerHTML = "Please verify your email address before logging in. Check your inbox for the link!";
            } else {
                modalMessage.innerHTML = err.message || 'Invalid email or password.';
            }
            
            modal.classList.add('show');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    });
});