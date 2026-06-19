document.addEventListener('DOMContentLoaded', () => {
    
    const registerForm = document.getElementById('registerForm');
    const submitBtn = document.getElementById('create-account-btn');
    
    const modal = document.getElementById('message-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalMessage = document.getElementById('modal-message');

    // --- 1. PROGRAM MODAL LOGIC ---
    const programInput = document.getElementById('program');
    const programModal = document.getElementById('program-modal');
    
    programInput.addEventListener('click', () => {
        programModal.classList.add('show');
    });

    document.querySelectorAll('.program-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            programInput.value = e.target.getAttribute('data-value');
            programModal.classList.remove('show');
        });
    });

    // --- 2. AUTO-FORMAT SECTION INPUT ---
    const sectionInput = document.getElementById('section');
    sectionInput.addEventListener('blur', function(e) {
        let val = e.target.value.trim();
        if (val && val.includes('-')) {
            // Fixes inputs like "BET 1-A" to "BET 1 - A" automatically
            val = val.replace(/\s*-\s*/g, ' - ');
            e.target.value = val;
        }
    });

    // --- 3. FORM SUBMISSION ---
    registerForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        // Prevent spam clicking
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin" style="margin-right:8px;"></i> Processing...';

        // Get form data
        const firstName = document.getElementById('firstName').value.trim();
        const lastName = document.getElementById('lastName').value.trim();
        const email = document.getElementById('email').value.trim();
        const contactNumber = document.getElementById('contact_number').value.trim();
        const address = document.getElementById('address').value.trim();
        const password = document.getElementById('password').value;

        const program = programInput.value;
        const section = sectionInput.value.trim();

        try {
            // Validate Section Format
            if (!section.includes(" - ")) {
                throw new Error("Invalid Section format. Please ensure you include a dash with spaces (e.g., BET 1 - A or T09 - A).");
            }

            const courseSection = `${program} - ${section}`;

            // --- DUPLICATE ACCOUNT CHECK (PUBLIC TABLE) ---
            
            // A. Check if Email is already in the Users table
            const { data: emailCheck, error: emailErr } = await window.supabase
                .from('users')
                .select('email')
                .eq('email', email);
            
            if (emailCheck && emailCheck.length > 0) {
                document.getElementById('duplicate-msg').innerHTML = `The TUPV Email Address <strong>${email}</strong> is already registered.`;
                document.getElementById('duplicate-modal').classList.add('show');
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
                return; 
            }

            // B. Check if Full Name is already used
            const { data: nameCheck, error: nameErr } = await window.supabase
                .from('users')
                .select('id')
                .eq('first_name', firstName)
                .eq('last_name', lastName);
            
            if (nameCheck && nameCheck.length > 0) {
                document.getElementById('duplicate-msg').innerHTML = `An account belonging to <strong>${firstName} ${lastName}</strong> already exists in the system.`;
                document.getElementById('duplicate-modal').classList.add('show');
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
                return;
            }
            // ----------------------------------------------

            // --- REGISTER WITH SUPABASE AUTH ---
            const { data: authData, error: authError } = await window.supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    // NEW: Redirects user to the live Vercel login page after they click the email link
                    emailRedirectTo: 'https://retrieve-tupv.vercel.app/login.html'
                }
            });

            if (authError) throw new Error(authError.message);

            const user = authData.user;
            if (!user) throw new Error("Could not retrieve user data after signup.");

            // DEEP AUTH CHECK: If the user object is returned but identities array is empty, 
            // it means the email was already taken in the hidden Auth system from a previous failed attempt.
            if (user.identities && user.identities.length === 0) {
                document.getElementById('duplicate-msg').innerHTML = `The TUPV Email Address <strong>${email}</strong> is already connected to an authentication credential.`;
                document.getElementById('duplicate-modal').classList.add('show');
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
                return;
            }

            // --- SAVE PROFILE TO DATABASE ---
            const { error: dbError } = await window.supabase
                .from('users')
                .insert([{
                    id: user.id, 
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
                throw new Error("Account authenticated, but database storage failed: " + dbError.message);
            }

            // --- SUCCESS FLOW ---
            modalTitle.textContent = 'Verification Email Sent!';
            modalTitle.style.color = 'var(--primary-blue)';
            modalMessage.textContent = 'Please check your inbox (and spam folder) for a verification link from Retrieve TUPV to activate your account.';
            modal.classList.add('show');

            // Redirect to login after 4.5 seconds
            setTimeout(() => { window.location.href = 'login.html'; }, 4500);

        } catch (err) {
            // Catch all standard errors
            modalTitle.textContent = 'Registration Failed';
            modalTitle.style.color = '#dc2626';
            modalMessage.textContent = err.message || 'An unexpected error occurred.';
            modal.classList.add('show');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    });
});