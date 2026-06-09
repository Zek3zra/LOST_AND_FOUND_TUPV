document.addEventListener('DOMContentLoaded', () => {
    
    const registerForm = document.getElementById('registerForm');
    const submitBtn = document.getElementById('create-account-btn');
    const modal = document.getElementById('message-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalMessage = document.getElementById('modal-message');

    // Handle closing the modal cleanly
    document.getElementById('close-msg-modal').addEventListener('click', () => {
        modal.classList.remove('show');
    });

    registerForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        // 1. Set Loading UI
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin" style="margin-right:8px;"></i> Processing...';

        // 2. Get form data
        const firstName = document.getElementById('firstName').value.trim();
        const lastName = document.getElementById('lastName').value.trim();
        const email = document.getElementById('email').value.trim();
        const contactNumber = document.getElementById('contact_number').value.trim();
        const courseSection = document.getElementById('course_section').value.trim();
        const address = document.getElementById('address').value.trim();
        const password = document.getElementById('password').value;

        try {
            // 3. Register with Supabase Auth (Force the redirect URL)
            const { data: authData, error: authError } = await window.supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    // Force Supabase to redirect exactly here after clicking the email link
                    emailRedirectTo: 'http://127.0.0.1:5500/login.html'
                }
            });

            if (authError) throw authError;

            // 4. Save their extra profile details to your public 'users' table
           
            const { error: dbError } = await window.supabase
                .from('users')
                .insert([{
                    first_name: firstName,
                    last_name: lastName,
                    email: email,
                    contact_number: contactNumber,
                    course_section: courseSection,
                    address: address,
                    is_verified: false 
                }]);

            if (dbError) {
                console.error("Database Save Error:", dbError);
                throw new Error("Account created, but we couldn't save your profile details.");
            }

            // 5. Show Success Modal
            modalTitle.textContent = 'Verification Email Sent!';
            modalTitle.style.color = 'var(--primary-blue)';
            modalMessage.textContent = 'Please check your inbox (and spam folder) for a verification link from Retrieve TUPV to activate your account.';
            modal.classList.add('show');

            // Redirect to login after 4 seconds
            setTimeout(() => { window.location.href = 'login.html'; }, 4000);

        } catch (err) {
            // Handle Errors
            modalTitle.textContent = 'Registration Failed';
            modalTitle.style.color = '#dc2626';
            modalMessage.textContent = err.message || 'An unexpected error occurred.';
            modal.classList.add('show');
        } finally {
            // Restore button state
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    });
});