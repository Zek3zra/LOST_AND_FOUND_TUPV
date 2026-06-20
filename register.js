document.addEventListener('DOMContentLoaded', () => {
    
    const registerForm = document.getElementById('registerForm');
    const submitBtn = document.getElementById('create-account-btn');
    
    const modal = document.getElementById('message-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalMessage = document.getElementById('modal-message');

    // Global flag to track when to redirect on modal close
    let isRegistrationSuccessful = false;

    // --- 1. PROGRAM & SECTION MODAL LOGIC ---
    const programInput = document.getElementById('program');
    const sectionInput = document.getElementById('section'); 
    const programModal = document.getElementById('program-modal');
    const sectionModal = document.getElementById('section-modal');
    const sectionModalBody = document.getElementById('section-modal-body');
    
    // Exact Mapping based on the TUPV Document to ensure formal section names (e.g., BSME 2 - D)
    const programSections = {
        'BS Mechanical Engineering': [
            'BSME 1 - A', 'BSME 1 - B', 'BSME 1 - C', 'BSME 1 - D', 'BSME 1 - E',
            'BSME 2 - A', 'BSME 2 - B', 'BSME 2 - C', 'BSME 2 - D', 'BSME 2 - E',
            'BSME 3 - A', 'BSME 3 - B', 'BSME 3 - C', 'BSME 3 - D', 'BSME 3 - E', 'BSME 3 - F',
            'BSME 4 - A', 'BSME 4 - B', 'BSME 4 - C', 'BSME 4 - D', 'BSME 4 - E'
        ],
        'BS Electrical Engineering': [
            'BSEE 1 - A', 'BSEE 2 - A', 'BSEE 3 - A', 'BSEE 4 - A'
        ],
        'BS Electronics Engineering': [
            'BSECE 1 - A', 'BSECE 1 - B', 'BSECE 1 - C',
            'BSECE 2 - A', 'BSECE 2 - B', 'BSECE 2 - C',
            'BSECE 3 - A', 'BSECE 3 - B', 'BSECE 3 - C',
            'BSECE 4 - A', 'BSECE 4 - B', 'BSECE 4 - C'
        ],
        'BS Computer Engineering': [
            'BSCPE 1 - A', 'BSCPE 2 - A', 'BSCPE 3 - A', 'BSCPE 4 - A'
        ],
        'BS Engineering Technology': [
            'BET 1 - A', 'BET 1 - B', 'BET 1 - C', 'BET 1 - D', 'BET 1 - E',
            'BET 1 - F', 'BET 1 - G', 'BET 1 - H', 'BET 1 - I', 'BET 1 - J',
            'BET 1 - K', 'BET 1 - L', 'BET 1 - M', 'BET 1 - N', 'BET 1 - O'
        ],
        'BET major in Electrical Engineering Technology': [
            'SO4 - A', 'SO4 - B', 'TO4 - A', 'TO4 - B', 'FO4 - A', 'FO4 - B'
        ],
        'BET major in Electronics Engineering Technology': [
            'SO5 - A', 'SO5 - B', 'SO5 - C', 'TO5 - A', 'TO5 - B', 'FO5 - A', 'FO5 - B'
        ],
        'BET major in Chemical Engineering Technology': [
            'S02 - A', 'S02 - B', 'T02 - A', 'T02 - B', 'F02 - A', 'F02 - B'
        ],
        'BET major in Computer Engineering Technology': [
            'S09 - A', 'T09 - A', 'F09 - A'
        ],
        'BET major in Manufacturing Engineering Technology': [
            'S06 - A', 'S06 - B', 'T06 - A', 'T06 - B', 'F06 - A', 'F06 - B'
        ],
        'BET major in Automotive Engineering Technology': [
            'S01 - A', 'T01 - A', 'F01 - A'
        ],
        'BET major in Electromechanical Engineering Technology': [
            'S08 - A', 'T08 - A', 'F08 - A'
        ],
        'BET major in Heating, Ventilation, Air-Conditioning & Refrigeration Engineering Technology': [
            'S07 - A', 'T07 - A', 'F07 - A'
        ],
        'BS Chemistry': [
            'BSCHEM - 1A', 'BSCHEM - 1B', 'BSCHEM - 2A', 'BSCHEM - 2B',
            'BSCHEM - 3A', 'BSCHEM - 3B', 'BSCHEM - 4A', 'BSCHEM - 4B'
        ],
        'BS Instrumentation and Control Engineering': [
            'ICE - 1A', 'ICE - 2A', 'ICE - 3A', 'ICE - 4A'
        ],
        'BS Mechatronics Engineering': [
            'MXE - 1A', 'MXE - 2A', 'MXE - 3A', 'MXE - 4A'
        ],
        'BET major in Mechatronics Engineering Technology': [
            'MXT - 1A', 'MXT - 1B', 'MXT - 2A', 'MXT - 2B',
            'MXT - 3A', 'MXT - 3B', 'MXT - 4A', 'MXT - 4B'
        ]
    };

    // Open Program Modal
    programInput.addEventListener('click', () => {
        programModal.classList.add('show');
    });

    // Handle Program Selection
    document.querySelectorAll('.program-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const selectedProgram = e.target.getAttribute('data-value');
            programInput.value = selectedProgram;
            
            // Enable and clear Section Input
            sectionInput.disabled = false;
            sectionInput.placeholder = "Click to select your section...";
            sectionInput.value = "";
            
            // Populate Section Modal Body dynamically
            const sections = programSections[selectedProgram] || [];
            let buttonsHTML = '<div class="section-grid">';
            
            sections.forEach(sec => {
                buttonsHTML += `<button type="button" class="section-btn" data-value="${sec}">${sec}</button>`;
            });
            
            // Add "Other" button
            buttonsHTML += `<button type="button" class="section-btn btn-other" data-value="other">Other</button>`;
            buttonsHTML += '</div>';

            // Add hidden input container for "Other"
            buttonsHTML += `
                <div class="other-section-container" id="other-section-container">
                    <input type="text" id="custom-section" placeholder="e.g., BSME 5 - A">
                    <button type="button" id="confirm-custom-section">Confirm</button>
                </div>
            `;

            sectionModalBody.innerHTML = buttonsHTML;
            programModal.classList.remove('show');
            
            // Attach event listeners to the newly created section buttons
            attachSectionButtonListeners();
        });
    });

    // Open Section Modal
    sectionInput.addEventListener('click', () => {
        if (!sectionInput.disabled) {
            sectionModal.classList.add('show');
        }
    });

    // Function to handle Section clicking inside the newly generated modal content
    function attachSectionButtonListeners() {
        const secBtns = document.querySelectorAll('#section-modal-body .section-btn');
        secBtns.forEach(btn => {
            btn.addEventListener('click', (ev) => {
                const val = ev.target.getAttribute('data-value');
                
                if (val === 'other') {
                    // Show custom input box and focus it
                    document.getElementById('other-section-container').classList.add('show');
                    document.getElementById('custom-section').focus();
                } else {
                    // Set the standard pre-defined value
                    sectionInput.value = val;
                    sectionModal.classList.remove('show');
                }
            });
        });

        // Handle Confirm button for custom "Other" section
        const confirmCustomBtn = document.getElementById('confirm-custom-section');
        if (confirmCustomBtn) {
            confirmCustomBtn.addEventListener('click', () => {
                const customVal = document.getElementById('custom-section').value.trim();
                if (customVal) {
                    sectionInput.value = customVal.toUpperCase(); // Force format
                    sectionModal.classList.remove('show');
                }
            });
        }
    }

    // --- 2. MODAL CLOSE INTERCEPTION ---
    const closeMsgModalBtn = document.getElementById('close-msg-modal');
    if (closeMsgModalBtn) {
        closeMsgModalBtn.addEventListener('click', () => {
            if (isRegistrationSuccessful) window.location.href = 'login.html';
        });
    }

    window.addEventListener('click', (event) => {
        if (event.target === modal && isRegistrationSuccessful) {
            window.location.href = 'login.html';
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
        const section = sectionInput.value; 

        try {
            if (!section) {
                throw new Error("Please select or enter your section from the menu.");
            }

            // Database will store e.g., "BS Mechanical Engineering - BSME 2 - D"
            const courseSection = `${program} - ${section}`;

            // --- DUPLICATE ACCOUNT CHECK (PUBLIC TABLE) ---
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
                    emailRedirectTo: 'https://retrieve-tupv.vercel.app/login.html'
                }
            });

            if (authError) throw new Error(authError.message);

            const user = authData.user;
            if (!user) throw new Error("Could not retrieve user data after signup.");

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

            // --- SUCCESS FLOW (USER MUST CLICK X) ---
            isRegistrationSuccessful = true;
            modalTitle.textContent = 'Verification Email Sent!';
            modalTitle.style.color = 'var(--primary-blue)';
            modalMessage.innerHTML = `
                An activation link has been sent to your email.<br><br>
                <span style="color: #0fb90f; font-weight: 800; font-size: 1.1rem; text-decoration: underline;">
                    IMPORTANT: Please check your SPAM or JUNK folder, as the verification email may be routed there!
                </span><br><br>
                Click the "X" button above to proceed to the Login page.
            `;
            modal.classList.add('show');

        } catch (err) {
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