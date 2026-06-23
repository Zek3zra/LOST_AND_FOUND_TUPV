document.addEventListener('DOMContentLoaded', async () => {

    const guestMode = sessionStorage.getItem('userType') === 'guest';
    const userId = sessionStorage.getItem('user_id');

    if (!userId && !guestMode) {
        window.location.href = 'login.html';
        return;
    }

    // --- 1. BAN LISTENER (High Priority) ---
    // --- REAL-TIME ACCOUNT STATUS LISTENER ---
    if (userId && !guestMode) {
        window.supabase.channel('user-status-listener')
            // 1. Listen for Role Changes and Bans (UPDATE)
            .on('postgres_changes', { 
                event: 'UPDATE', 
                schema: 'public', 
                table: 'users', 
                filter: `id=eq.${userId}` 
            }, async (payload) => {
                const newRole = payload.new.role;
                const currentRole = sessionStorage.getItem('role');

                // Handle Ban
                if (newRole === 'banned') {
                    await window.supabase.auth.signOut();
                    sessionStorage.clear();
                    window.location.replace('login.html');
                } 
                // Handle Role Change (e.g., User to Admin)
                else if (newRole && currentRole && newRole !== currentRole) {
                    await window.supabase.auth.signOut();
                    sessionStorage.clear();
                    window.location.replace('login.html');
                }
            })
            // 2. Listen for Account Deletion (DELETE)
            .on('postgres_changes', { 
                event: 'DELETE', 
                schema: 'public', 
                table: 'users', 
                filter: `id=eq.${userId}` 
            }, async () => {
                await window.supabase.auth.signOut();
                sessionStorage.clear();
                window.location.replace('login.html');
            })
            .subscribe();
    }

    let currentUserData = {}; 

    // --- DYNAMIC SYSTEM ALERTS ---
    function showAlert(title, message, type = "success") {
        const modal = document.getElementById('systemAlertModal');
        const icon = document.getElementById('alert-icon');
        const wrapper = document.getElementById('alert-icon-wrapper');
        const titleEl = document.getElementById('alert-title');
        const btn = document.getElementById('alertOkBtn');
        
        titleEl.textContent = title;
        document.getElementById('alert-message').textContent = message;
        
        btn.className = "modal-btn confirm-btn";
        
        if (type === 'danger') {
            titleEl.style.color = "#ef4444";
            wrapper.style.backgroundColor = "#fee2e2";
            wrapper.style.color = "#ef4444";
            icon.className = "fa-solid fa-triangle-exclamation";
            btn.style.backgroundColor = "#ef4444";
            btn.style.borderColor = "#ef4444";
            btn.style.boxShadow = "0 4px 10px rgba(239, 68, 68, 0.2)";
        } else if (type === 'warning') {
            titleEl.style.color = "#F59E0B";
            wrapper.style.backgroundColor = "#fef3c7";
            wrapper.style.color = "#F59E0B";
            icon.className = "fa-solid fa-circle-exclamation";
            btn.style.backgroundColor = "#F59E0B";
            btn.style.borderColor = "#F59E0B";
            btn.style.boxShadow = "0 4px 10px rgba(245, 158, 11, 0.2)";
        } else {
            titleEl.style.color = "#10b981";
            wrapper.style.backgroundColor = "#d1fae5";
            wrapper.style.color = "#10b981";
            icon.className = "fa-solid fa-circle-check";
            btn.style.backgroundColor = "#10b981";
            btn.style.borderColor = "#10b981";
            btn.style.boxShadow = "0 4px 10px rgba(16, 185, 129, 0.2)";
        }
        
        wrapper.style.animation = 'none';
        wrapper.offsetHeight; 
        wrapper.style.animation = null;

        modal.classList.add('show');
    }

    document.getElementById('alertOkBtn').addEventListener('click', () => {
        document.getElementById('systemAlertModal').classList.remove('show');
    });

    // --- UI SETUP ---
    function updateDateTime() {
        const dt = document.getElementById('current-date-time');
        if(dt) dt.textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
    setInterval(updateDateTime, 1000);
    updateDateTime();

    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('desktop-sidebar');
    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', () => sidebar.classList.toggle('collapsed'));
    }

    if (sessionStorage.getItem('role') === 'admin') {
        const adminLink = document.getElementById('admin-dashboard-link');
        if (adminLink) adminLink.classList.remove('hidden');
    }

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            if (!guestMode) await window.supabase.auth.signOut();
            sessionStorage.clear();
            window.location.href = 'login.html';
        });
    }

    const mobileLogoutBtn = document.getElementById('mobile-logout-btn');
    if (mobileLogoutBtn) {
        mobileLogoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            if (!guestMode) await window.supabase.auth.signOut();
            sessionStorage.clear();
            window.location.href = 'login.html';
        });
    }

    const modals = {
        'about-link': 'about-modal', 'footer-about-link': 'about-modal',
        'footer-how-it-works-link': 'how-it-works-modal', 'footer-faq-link': 'faq-modal',
        'contact-link': 'footer-contact-modal', 'footer-contact-link': 'footer-contact-modal',
        'footer-privacy-link': 'privacy-modal', 'footer-terms-link': 'terms-modal'
    };
    
    Object.keys(modals).forEach(id => {
        const el = document.getElementById(id);
        if(el) el.addEventListener('click', (e) => { e.preventDefault(); document.getElementById(modals[id]).classList.add('show'); });
    });
    
    document.querySelectorAll('.close-modal, [data-close]').forEach(btn => {
        btn.addEventListener('click', function() { this.closest('.modal-overlay').classList.remove('show'); });
    });

    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-overlay')) e.target.classList.remove('show');
    });

    if (guestMode) {
        document.getElementById('profile-name').textContent = 'Guest Sandbox';
        document.getElementById('profile-email').textContent = 'Read-only Access';
        document.querySelectorAll('.profile-action-buttons button:not(#logout-btn):not(#mobile-logout-btn), #pfp-trigger .avatar-overlay').forEach(el => el.style.display = 'none');
        document.getElementById('pfp-trigger').style.cursor = 'default';
        return; 
    }

    // --- INITIAL DATA PULL ---
    async function checkUnreadMessages() {
        const { data: chats } = await window.supabase.from('chat_messages').select('msg_id, sender').eq('user_id', userId).order('created_at', { ascending: false }).limit(1);
        if (chats && chats.length > 0 && chats[0].sender === 'admin') {
            const lastReadId = sessionStorage.getItem('lastReadMsgId');
            if (String(lastReadId) !== String(chats[0].msg_id)) {
                document.getElementById('support-notif-dot').style.display = 'block';
            }
        }

        const { data: notifs } = await window.supabase.from('notifications').select('created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(1);
        if (notifs && notifs.length > 0) {
            const lastReadTime = sessionStorage.getItem('lastReadNotifTime');
            if (!lastReadTime || new Date(notifs[0].created_at).getTime() > new Date(lastReadTime).getTime()) {
                document.getElementById('general-notif-dot').style.display = 'block';
            }
        }
    }

    async function loadUserProfile() {
        const { data, error } = await window.supabase.from('users').select('*').eq('id', userId).single();
        if (error) return;

        currentUserData = data; 

        document.getElementById('profile-name').textContent = `${data.first_name} ${data.last_name}`;
        document.getElementById('profile-email').textContent = data.email;
        
        document.getElementById('display-fullname').textContent = `${data.first_name || ''} ${data.last_name || ''}`.trim() || 'Not provided';
        document.getElementById('display-course').textContent = data.course_section || 'Not provided';
        document.getElementById('display-address').textContent = data.address || 'Not provided';
        document.getElementById('display-contact').textContent = data.contact_number || 'Not provided';

        if (data.profile_picture_path) {
            document.getElementById('profile-picture-img').src = data.profile_picture_path;
        }
    }
    
    checkUnreadMessages();
    loadUserProfile();

    // --- IMAGE UPLOAD ---
    const pfpTrigger = document.getElementById('pfp-trigger');
    const pfpInput = document.getElementById('pfp-upload-input');
    const pfpImg = document.getElementById('profile-picture-img'); 

    pfpTrigger.addEventListener('click', () => pfpInput.click());

    pfpInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => { pfpImg.src = event.target.result; pfpImg.style.opacity = '0.5'; };
        reader.readAsDataURL(file);

        const fileExt = file.name.split('.').pop() || 'png';
        const fileName = `user_${userId}_${Date.now()}.${fileExt}`;

        try {
            const { error: uploadError } = await window.supabase.storage.from('profile-pictures').upload(fileName, file);
            if (uploadError) throw new Error(uploadError.message);

            const { data } = window.supabase.storage.from('profile-pictures').getPublicUrl(fileName);
            const { error: dbError } = await window.supabase.from('users').update({ profile_picture_path: data.publicUrl }).eq('id', userId);
            if (dbError) throw new Error(dbError.message);

            sessionStorage.setItem('profile_picture_path', data.publicUrl);
            pfpImg.src = data.publicUrl;
            pfpImg.style.opacity = '1';

        } catch (error) {
            showAlert("Upload Failed", "Profile picture upload failed: " + error.message, "danger");
            pfpImg.style.opacity = '1';
            loadUserProfile(); 
        }
    });

    // ==========================================
    // PROGRAM AND SECTION EDIT LOGIC 
    // ==========================================
    const editProgramInput = document.getElementById('edit-program');
    const editSectionInput = document.getElementById('edit-section'); 
    const programModal = document.getElementById('program-modal');
    const sectionModal = document.getElementById('section-modal');
    const sectionModalBody = document.getElementById('section-modal-body');

    const programSections = {
        'BS Mechanical Engineering': ['BSME 1 - A', 'BSME 1 - B', 'BSME 1 - C', 'BSME 1 - D', 'BSME 1 - E', 'BSME 2 - A', 'BSME 2 - B', 'BSME 2 - C', 'BSME 2 - D', 'BSME 2 - E', 'BSME 3 - A', 'BSME 3 - B', 'BSME 3 - C', 'BSME 3 - D', 'BSME 3 - E', 'BSME 3 - F', 'BSME 4 - A', 'BSME 4 - B', 'BSME 4 - C', 'BSME 4 - D', 'BSME 4 - E'],
        'BS Electrical Engineering': ['BSEE 1 - A', 'BSEE 2 - A', 'BSEE 3 - A', 'BSEE 4 - A'],
        'BS Electronics Engineering': ['BSECE 1 - A', 'BSECE 1 - B', 'BSECE 1 - C', 'BSECE 2 - A', 'BSECE 2 - B', 'BSECE 2 - C', 'BSECE 3 - A', 'BSECE 3 - B', 'BSECE 3 - C', 'BSECE 4 - A', 'BSECE 4 - B', 'BSECE 4 - C'],
        'BS Computer Engineering': ['BSCPE 1 - A', 'BSCPE 2 - A', 'BSCPE 3 - A', 'BSCPE 4 - A'],
        'BET (First Year)': ['BET 1 - A', 'BET 1 - B', 'BET 1 - C', 'BET 1 - D', 'BET 1 - E', 'BET 1 - F', 'BET 1 - G', 'BET 1 - H', 'BET 1 - I', 'BET 1 - J', 'BET 1 - K', 'BET 1 - L', 'BET 1 - M', 'BET 1 - N', 'BET 1 - O'],
        'BET major in Electrical Engineering Technology': ['SO4 - A', 'SO4 - B', 'TO4 - A', 'TO4 - B', 'FO4 - A', 'FO4 - B'],
        'BET major in Electronics Engineering Technology': ['SO5 - A', 'SO5 - B', 'SO5 - C', 'TO5 - A', 'TO5 - B', 'FO5 - A', 'FO5 - B'],
        'BET major in Chemical Engineering Technology': ['S02 - A', 'S02 - B', 'T02 - A', 'T02 - B', 'F02 - A', 'F02 - B'],
        'BET major in Computer Engineering Technology': ['S09 - A', 'T09 - A', 'F09 - A'],
        'BET major in Manufacturing Engineering Technology': ['S06 - A', 'S06 - B', 'T06 - A', 'T06 - B', 'F06 - A', 'F06 - B'],
        'BET major in Automotive Engineering Technology': ['S01 - A', 'T01 - A', 'F01 - A'],
        'BET major in Electromechanical Engineering Technology': ['S08 - A', 'T08 - A', 'F08 - A'],
        'BET major in Heating, Ventilation, Air-Conditioning & Refrigeration Engineering Technology': ['S07 - A', 'T07 - A', 'F07 - A'],
        'BS Chemistry': ['BSCHEM - 1A', 'BSCHEM - 1B', 'BSCHEM - 2A', 'BSCHEM - 2B', 'BSCHEM - 3A', 'BSCHEM - 3B', 'BSCHEM - 4A', 'BSCHEM - 4B'],
        'BS Instrumentation and Control Engineering': ['ICE - 1A', 'ICE - 2A', 'ICE - 3A', 'ICE - 4A'],
        'BS Mechatronics Engineering': ['MXE - 1A', 'MXE - 2A', 'MXE - 3A', 'MXE - 4A'],
        'BET major in Mechatronics Engineering Technology': ['MXT - 1A', 'MXT - 1B', 'MXT - 2A', 'MXT - 2B', 'MXT - 3A', 'MXT - 3B', 'MXT - 4A', 'MXT - 4B']
    };

    editProgramInput.addEventListener('click', () => programModal.classList.add('show'));
    editSectionInput.addEventListener('click', () => { if (!editSectionInput.disabled) sectionModal.classList.add('show'); });

    document.querySelectorAll('#program-modal .program-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const val = e.target.getAttribute('data-value');
            if (val === 'other') {
                document.getElementById('other-program-container').classList.add('show');
                document.getElementById('custom-program').focus();
            } else {
                editProgramInput.value = val;
                editSectionInput.disabled = false;
                editSectionInput.placeholder = "Click to select your section...";
                editSectionInput.value = "";
                populateSectionModal(val);
                programModal.classList.remove('show');
            }
        });
    });

    document.getElementById('confirm-custom-program')?.addEventListener('click', () => {
        const val = document.getElementById('custom-program').value.trim();
        if (val) {
            editProgramInput.value = val;
            editSectionInput.disabled = false;
            editSectionInput.placeholder = "Click to select your section...";
            editSectionInput.value = "";
            populateSectionModal("custom_unlisted_program");
            programModal.classList.remove('show');
        }
    });

    function populateSectionModal(programName) {
        const sections = programSections[programName] || [];
        let buttonsHTML = '<div class="section-grid">';
        
        sections.forEach(sec => {
            buttonsHTML += `<button type="button" class="section-btn" data-value="${sec}">${sec}</button>`;
        });
        
        buttonsHTML += `<button type="button" class="section-btn btn-other" data-value="other">Manual Input</button>`;
        buttonsHTML += '</div>';

        buttonsHTML += `
            <div class="other-section-container" id="other-section-container">
                <input type="text" id="custom-section" placeholder="e.g., BSME 5 - A">
                <button type="button" id="confirm-custom-section">Confirm</button>
            </div>
        `;
        
        sectionModalBody.innerHTML = buttonsHTML;
        
        document.querySelectorAll('#section-modal-body .section-btn').forEach(btn => {
            btn.addEventListener('click', (ev) => {
                const val = ev.target.getAttribute('data-value');
                if (val === 'other') {
                    document.getElementById('other-section-container').classList.add('show');
                    document.getElementById('custom-section').focus();
                } else {
                    editSectionInput.value = val;
                    sectionModal.classList.remove('show');
                }
            });
        });

        document.getElementById('confirm-custom-section')?.addEventListener('click', () => {
            const val = document.getElementById('custom-section').value.trim();
            if (val) {
                editSectionInput.value = val.toUpperCase();
                sectionModal.classList.remove('show');
            }
        });
    }

    document.getElementById('edit-profile-btn').addEventListener('click', () => {
        document.getElementById('edit-firstname').value = currentUserData.first_name || '';
        document.getElementById('edit-lastname').value = currentUserData.last_name || '';
        document.getElementById('edit-address').value = currentUserData.address || '';
        document.getElementById('edit-contact').value = currentUserData.contact_number || '';
        
        const courseSec = currentUserData.course_section || '';
        const splitIdx = courseSec.indexOf(' - ');
        
        if (splitIdx !== -1) {
            const prog = courseSec.substring(0, splitIdx).trim();
            const sec = courseSec.substring(splitIdx + 3).trim();
            editProgramInput.value = prog;
            editSectionInput.value = sec;
            editSectionInput.disabled = false;
            populateSectionModal(prog);
        } else {
            editProgramInput.value = courseSec;
            editSectionInput.value = '';
            editSectionInput.disabled = courseSec === '';
            if (courseSec !== '') populateSectionModal(courseSec);
        }

        document.getElementById('edit-profile-modal').classList.add('show');
    });

    document.getElementById('edit-profile-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('save-profile-btn');
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
        btn.disabled = true;

        const program = editProgramInput.value.trim();
        const section = editSectionInput.value.trim();
        const finalCourseSection = section ? `${program} - ${section}` : program;

        const updates = {
            first_name: document.getElementById('edit-firstname').value,
            last_name: document.getElementById('edit-lastname').value,
            contact_number: document.getElementById('edit-contact').value,
            course_section: finalCourseSection,
            address: document.getElementById('edit-address').value,
        };

        const { error } = await window.supabase.from('users').update(updates).eq('id', userId);
        if (!error) {
            document.getElementById('edit-profile-modal').classList.remove('show');
            showAlert("Profile Updated", "Your profile details have been successfully saved.", "success");
            loadUserProfile(); 
        } else {
            showAlert("Update Failed", "Error updating profile: " + error.message, "danger");
        }
        btn.innerHTML = 'Save Changes';
        btn.disabled = false;
    });

    // --- SECURITY MODAL ---
    document.getElementById('change-pwd-btn').addEventListener('click', () => {
        document.getElementById('change-pwd-form').reset();
        document.getElementById('change-pwd-modal').classList.add('show');
    });

    document.getElementById('change-pwd-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const currentPwd = document.getElementById('current-pwd').value;
        const newPwd = document.getElementById('new-pwd').value;
        const confirmPwd = document.getElementById('confirm-pwd').value;

        if (newPwd !== confirmPwd) { 
            showAlert("Validation Error", "New passwords do not match!", "warning"); 
            return; 
        }
        
        const btn = document.getElementById('save-pwd-btn');
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Updating...';
        btn.disabled = true;

        const { error: signInError } = await window.supabase.auth.signInWithPassword({ 
            email: currentUserData.email, 
            password: currentPwd 
        });

        if (signInError) {
            showAlert("Verification Failed", "Incorrect Current Password!", "danger");
            btn.innerHTML = 'Update Password';
            btn.disabled = false;
            return;
        }

        const { error } = await window.supabase.auth.updateUser({ password: newPwd });
        if (!error) {
            document.getElementById('change-pwd-modal').classList.remove('show');
            showAlert("Security Updated", "Your password has been successfully secured.", "success");
        } else {
            showAlert("Update Failed", "Failed to update password: " + error.message, "danger");
        }
        
        btn.innerHTML = 'Update Password';
        btn.disabled = false;
    });

    // --- SYSTEM NOTIFICATIONS LOGIC ---
    const notifModal = document.getElementById('notifications-modal');
    const notifList = document.getElementById('notifications-list');
    const notifBtn = document.getElementById('open-notifications-btn');
    const clearNotifsBtn = document.getElementById('clear-notifs-btn');

    if (notifBtn) {
        notifBtn.addEventListener('click', () => {
            document.getElementById('general-notif-dot').style.display = 'none';
            notifModal.classList.add('show');
            loadNotifications();
        });
    }

    if (clearNotifsBtn) {
        clearNotifsBtn.addEventListener('click', async () => {
            const originalText = clearNotifsBtn.innerHTML;
            clearNotifsBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Clearing...';
            await window.supabase.from('notifications').delete().eq('user_id', userId);
            await loadNotifications();
            clearNotifsBtn.innerHTML = originalText;
        });
    }

    async function loadNotifications() {
        notifList.innerHTML = '<div style="text-align:center; padding: 20px; color: #475569;"><i class="fa-solid fa-circle-notch fa-spin"></i> Loading...</div>';
        
        try {
            const { data: notifs, error } = await window.supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false });
            if (error) throw error;

            if (!notifs || notifs.length === 0) {
                notifList.innerHTML = '<div style="text-align:center; padding: 40px; color: #475569;"><i class="fa-regular fa-bell-slash" style="font-size: 2.5rem; margin-bottom: 12px; opacity: 0.5;"></i><br>No new notifications.</div>';
                clearNotifsBtn.style.display = 'none';
                return;
            }

            clearNotifsBtn.style.display = 'flex';
            sessionStorage.setItem('lastReadNotifTime', new Date().toISOString());

            notifList.innerHTML = notifs.map(n => {
                const timeStr = new Date(n.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                const cleanMessage = n.message.startsWith("System Admin:") ? n.message.replace("System Admin:", "").trim() : n.message;
                
                return `
                    <div class="notif-item">
                        <div class="notif-icon"><i class="fa-solid fa-circle-info"></i></div>
                        <div class="notif-content">
                            <div class="notif-text">${cleanMessage}</div>
                            <div class="notif-time">${timeStr}</div>
                        </div>
                    </div>
                `;
            }).join('');
        } catch (err) {
            notifList.innerHTML = `<div style="text-align:center; padding: 20px; color: #ef4444;">Could not load notifications: ${err.message}</div>`;
        }
    }

    // --- USER REPORT HISTORY LOGIC ---
    const historyBtn = document.getElementById('open-history-btn');
    const historyModal = document.getElementById('history-modal');
    const historyList = document.getElementById('history-list');
    let userHistoryData = []; 

    if (historyBtn) {
        historyBtn.addEventListener('click', () => {
            historyModal.classList.add('show');
            loadUserHistory();
        });
    }

    const clearHistoryBtn = document.getElementById('clear-history-btn');
    const confirmClearHistoryModal = document.getElementById('confirmClearHistoryModal');
    const executeClearHistoryBtn = document.getElementById('execute-clear-history-btn');

    if (clearHistoryBtn) clearHistoryBtn.addEventListener('click', () => confirmClearHistoryModal.classList.add('show'));
    
    if (executeClearHistoryBtn) {
        executeClearHistoryBtn.addEventListener('click', () => {
            localStorage.setItem(`hide_reports_until_${userId}`, new Date().toISOString());
            confirmClearHistoryModal.classList.remove('show');
            loadUserHistory();
        });
    }

    async function loadUserHistory() {
        historyList.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 40px; color: #475569;"><i class="fa-solid fa-circle-notch fa-spin"></i> Fetching your reports...</td></tr>';

        try {
            const { data, error } = await window.supabase.from('item_reports').select('*').eq('user_id', userId).order('created_at', { ascending: false });
            if (error) throw error;

            let visibleData = data || [];
            const hideUntil = localStorage.getItem(`hide_reports_until_${userId}`);
            
            if (hideUntil) {
                const cutoffTime = new Date(hideUntil).getTime();
                visibleData = visibleData.filter(report => new Date(report.created_at).getTime() > cutoffTime);
            }

            if (visibleData.length === 0) {
                historyList.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 40px; color: #475569;">You have not reported any items yet, or your view has been cleared.</td></tr>';
                return;
            }

            userHistoryData = visibleData; 

            historyList.innerHTML = visibleData.map(report => {
                const rDate = new Date(report.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                
                let statusClass = 'status-pending';
                if (report.report_status === 'approved') statusClass = 'status-approved';
                if (report.report_status === 'matched') statusClass = 'status-matched';
                if (report.report_status === 'rejected') statusClass = 'status-rejected';
                if (report.report_status === 'archived') statusClass = 'status-archived';

                return `
                    <tr class="clickable-row" onclick="viewHistoryDetails('${report.report_id}')">
                        <td>
                            <div><strong style="font-size:1rem; color:#0f172a;">${report.item_name_specific}</strong></div>
                            <div style="font-size:0.8rem; color:#475569; text-transform:capitalize;">${report.report_type} Item &bull; ${report.item_category}</div>
                        </td>
                        <td>${rDate}</td>
                        <td><span class="badge ${statusClass}" style="color: white;">${report.report_status}</span></td>
                        <td class="action-col" style="text-align: right;">
                            <button class="badge-btn" onclick="event.stopPropagation(); viewHistoryDetails('${report.report_id}')"><i class="fa-solid fa-eye"></i> View</button>
                        </td>
                    </tr>
                `;
            }).join('');

        } catch (err) {
            historyList.innerHTML = `<tr><td colspan="4" style="text-align:center; padding: 40px; color: #ef4444;">Failed to load history: ${err.message}</td></tr>`;
        }
    }

    window.viewHistoryDetails = async function(reportId) {
        const report = userHistoryData.find(r => String(r.report_id) === String(reportId));
        if (!report) return;

        document.getElementById('hist-modal-item').textContent = report.item_name_specific;
        document.getElementById('hist-modal-category').textContent = `${report.report_type} Item • ${report.item_category}`;
        document.getElementById('hist-modal-location').textContent = report.item_location;
        
        const postedDate = new Date(report.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const eventDate = new Date(report.item_datetime).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute:'2-digit' });
        
        document.getElementById('hist-modal-posted-date').textContent = postedDate;
        document.getElementById('hist-modal-datetime').textContent = eventDate;
        
        const actualDescription = report.report_type === 'found' && report.admin_specific_details 
            ? report.admin_specific_details 
            : report.item_description;
        document.getElementById('hist-modal-description').textContent = actualDescription || 'No description provided.';
        
        const matchBlock = document.getElementById('hist-match-details');
        if (report.report_status === 'matched') {
            const label = report.report_type === 'lost' ? 'Found and Returned By:' : 'Claimed By True Owner:';
            const personName = report.matched_person_name || 'Verified by Admin'; 
            
            document.getElementById('hist-match-label').textContent = label;
            document.getElementById('hist-match-person').textContent = personName;
            matchBlock.style.display = 'flex';
        } else {
            matchBlock.style.display = 'none';
        }

        const rejectBlock = document.getElementById('hist-reject-details');
        if (report.report_status === 'rejected') {
            let reasonText = "Declined by Administrator. Please check notifications for more details.";
            
            try {
                const { data: notifData } = await window.supabase
                    .from('notifications')
                    .select('message')
                    .eq('user_id', userId)
                    .ilike('message', `%${report.item_name_specific}%`)
                    .ilike('message', '%declined%')
                    .order('created_at', { ascending: false })
                    .limit(1);

                if (notifData && notifData.length > 0) {
                    const msg = notifData[0].message;
                    if (msg.includes("Reason:")) {
                        reasonText = msg.split("Reason:")[1].trim();
                    }
                }
            } catch(e) { console.error("Could not fetch reject reason", e); }

            document.getElementById('hist-reject-reason').textContent = reasonText;
            rejectBlock.style.display = 'flex';
        } else {
            rejectBlock.style.display = 'none';
        }

        const statusBadge = document.getElementById('hist-modal-status');
        statusBadge.textContent = report.report_status;
        statusBadge.className = 'badge'; 
        if (report.report_status === 'approved') statusBadge.classList.add('status-approved');
        else if (report.report_status === 'matched') statusBadge.classList.add('status-matched');
        else if (report.report_status === 'rejected') statusBadge.classList.add('status-rejected');
        else if (report.report_status === 'archived') statusBadge.classList.add('status-archived');
        else statusBadge.classList.add('status-pending');

        const imgEl = document.getElementById('hist-modal-image');
        const noImgEl = document.getElementById('hist-no-image');

        if (report.image_path) {
            imgEl.src = report.image_path;
            imgEl.style.display = 'block';
            noImgEl.style.display = 'none';
        } else {
            imgEl.src = '';
            imgEl.style.display = 'none';
            noImgEl.style.display = 'flex';
        }

        document.getElementById('historyDetailsModal').classList.add('show');
    };

    // --- MESSENGER LOGIC ---
    const messengerModal = document.getElementById('messenger-modal');
    const chatHistory = document.getElementById('chat-history');
    const chatInput = document.getElementById('chat-input');
    const sendChatBtn = document.getElementById('send-chat-btn');
    
    const userChatImageInput = document.getElementById('userChatImageInput');
    const userAttachBtn = document.getElementById('userAttachBtn');
    const userPreviewContainer = document.getElementById('user-chat-img-preview-container');
    const userPreviewImg = document.getElementById('user-chat-img-preview');
    const userRemoveImgBtn = document.getElementById('user-remove-chat-img-btn');
    let userPendingImageFile = null;

    if (userAttachBtn) {
        userAttachBtn.addEventListener('click', () => userChatImageInput.click());

        userChatImageInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                userPendingImageFile = file;
                const reader = new FileReader();
                reader.onload = (event) => {
                    userPreviewImg.src = event.target.result;
                    userPreviewContainer.style.display = 'inline-block';
                };
                reader.readAsDataURL(file);
            }
        });

        userRemoveImgBtn.addEventListener('click', () => {
            userPendingImageFile = null;
            userChatImageInput.value = '';
            userPreviewContainer.style.display = 'none';
            userPreviewImg.src = '';
        });
    }

    window.rejectResolution = async function(msgId) {
        await window.supabase.from('chat_messages').delete().eq('msg_id', msgId);
        await window.supabase.from('chat_messages').insert([{ user_id: userId, sender: 'user', message: '❌ I still need help with this.' }]);
        await loadMessenger(true);
    };

    // INSTANT UI RESPONSE ADDED HERE
    window.confirmResolution = async function() {
        const btn = document.querySelector('.confirm-resolve-btn');
        if (btn) btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Clearing...';
        if (btn) btn.disabled = true;

        const { error } = await window.supabase.from('chat_messages').delete().eq('user_id', userId);
        
        if (error) {
            showAlert("Error", "Failed to clear chat: " + error.message, "danger");
            if (btn) {
                btn.innerHTML = '<i class="fa-solid fa-check"></i> Yes, resolved';
                btn.disabled = false;
            }
        } else {
            // Instantly close modal and show success alert so it doesn't feel slow!
            document.getElementById('messenger-modal').classList.remove('show');
            showAlert("Ticket Resolved", "Your support chat has been cleared and resolved successfully.", "success");
            await loadMessenger(true); 
        }
    };

    async function loadMessenger(isSilent = false) {
        if (!isSilent) {
            chatHistory.innerHTML = '<div style="text-align:center; padding: 20px; color: #475569;"><i class="fa-solid fa-circle-notch fa-spin"></i></div>';
        }

        try {
            const { data: chats, error: chatErr } = await window.supabase.from('chat_messages').select('msg_id, user_id, sender, message, image_url, created_at').eq('user_id', userId).order('created_at', { ascending: true });
            if (chatErr) throw chatErr;

            let allMessages = chats || [];

            if (allMessages.length > 0) {
                const latestChat = allMessages[allMessages.length - 1];
                if (latestChat.sender === 'admin') {
                    sessionStorage.setItem('lastReadMsgId', latestChat.msg_id);
                    document.getElementById('support-notif-dot').style.display = 'none';
                }
            }

            allMessages = allMessages.filter(msg => msg.message !== '✅ The student confirmed the resolution and closed the chat.');

            if (allMessages.length === 0) {
                chatHistory.innerHTML = '<div style="text-align:center; color: #475569; padding: 40px; margin: auto;"><i class="fa-solid fa-headset" style="font-size: 2.5rem; opacity: 0.2; margin-bottom:12px;"></i><br>Send a message or a photo to open a ticket with the Admin.</div>';
                return;
            }

            chatHistory.innerHTML = allMessages.map(msg => {
                const timeStr = new Date(msg.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                
                if (msg.message === '___RESOLVE_REQUEST___') {
                    return `
                        <div class="msg-wrap system" style="max-width: 100%; width: 100%; margin: 12px 0;">
                            <div class="user-resolve-bubble">
                                <i class="fa-solid fa-clipboard-check" style="color: #10b981; font-size: 2rem; margin-bottom: 8px;"></i><br>
                                <strong style="font-size: 1rem; color: #0f172a;">Inquiry Resolved?</strong><br>
                                <span style="display:block; margin-top:4px;">The Admin has marked this inquiry as resolved.</span>
                                <div class="resolve-actions">
                                    <button class="reject-resolve-btn" onclick="rejectResolution('${msg.msg_id}')">No, I need help</button>
                                    <button class="confirm-resolve-btn" onclick="confirmResolution()"><i class="fa-solid fa-check"></i> Yes, resolved</button>
                                </div>
                            </div>
                            <div class="msg-time" style="text-align: center;">${timeStr}</div>
                        </div>
                    `;
                }

                const role = msg.sender === 'user' ? 'user' : 'admin';
                const textHtml = msg.message ? `<div>${msg.message}</div>` : '';
                const imgHtml = msg.image_url ? `<img src="${msg.image_url}" class="chat-msg-img" onclick="window.open('${msg.image_url}', '_blank')">` : '';

                return `<div class="msg-wrap ${role}"><div class="msg-bubble">${imgHtml}${textHtml}</div><div class="msg-time">${timeStr}</div></div>`;
                
            }).join('');
            
            setTimeout(() => chatHistory.scrollTop = chatHistory.scrollHeight, 50);

        } catch (err) {
            console.error("Messenger Rendering Error: ", err);
            if (!isSilent) chatHistory.innerHTML = '<div style="text-align:center; padding: 20px; color: #b91c1c;">Could not load chat history at this time.</div>';
        }
    }

    document.getElementById('open-messenger-btn').addEventListener('click', async () => {
        document.getElementById('support-notif-dot').style.display = 'none'; 
        messengerModal.classList.add('show');
        loadMessenger();
    });

    async function sendMessage() {
        const text = chatInput.value.trim();
        if (!text && !userPendingImageFile) return;

        const originalBtnHtml = sendChatBtn.innerHTML;
        chatInput.disabled = true;
        userAttachBtn.disabled = true;
        sendChatBtn.disabled = true;
        sendChatBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i>';

        try {
            let publicImageUrl = null;

            if (userPendingImageFile) {
                const fileExt = userPendingImageFile.name.split('.').pop() || 'png';
                const fileName = `user_${userId}_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
                
                const { error: uploadError } = await window.supabase.storage.from('chat-images').upload(fileName, userPendingImageFile);
                if (uploadError) throw new Error("Image Upload Failed: " + uploadError.message);
                
                const { data } = window.supabase.storage.from('chat-images').getPublicUrl(fileName);
                publicImageUrl = data.publicUrl;
            }

            const payload = { user_id: userId, sender: 'user', message: text };
            if (publicImageUrl) payload.image_url = publicImageUrl;

            const { error } = await window.supabase.from('chat_messages').insert([payload]);
            if (error) throw new Error(error.message);

            chatInput.value = '';
            userPendingImageFile = null;
            userChatImageInput.value = '';
            userPreviewContainer.style.display = 'none';
            userPreviewImg.src = '';
            
            await loadMessenger(true); 

        } catch (err) {
            showAlert("Message Error", "Failed to dispatch message: " + err.message, "danger");
        } finally {
            chatInput.disabled = false;
            userAttachBtn.disabled = false;
            sendChatBtn.disabled = false;
            sendChatBtn.innerHTML = originalBtnHtml;
            chatInput.focus();
        }
    }

    sendChatBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });

    // ==========================================
    // REAL-TIME LISTENERS (CHAT & NOTIFICATIONS)
    // Placed at the bottom to ensure all functions are loaded
    // ==========================================
    if (userId && !guestMode) {
        
        // 1. Chat Real-time Listener
        window.supabase.channel('profile-chat-listener')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `user_id=eq.${userId}` }, payload => {
                
                // If Admin sends a message, manage the notification dot
                if (payload.new.sender === 'admin') {
                    if (!document.getElementById('messenger-modal').classList.contains('show')) {
                        const lastReadId = sessionStorage.getItem('lastReadMsgId');
                        if (String(lastReadId) !== String(payload.new.msg_id)) {
                            document.getElementById('support-notif-dot').style.display = 'block';
                        }
                    }
                }
                
                // CRITICAL FIX: If the modal is open, refresh it no matter who sent the message
                if (document.getElementById('messenger-modal').classList.contains('show')) {
                    loadMessenger(true); 
                }
            })
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'chat_messages', filter: `user_id=eq.${userId}` }, payload => {
                if (document.getElementById('messenger-modal').classList.contains('show')) {
                    loadMessenger(true);
                }
            }).subscribe();

        // 2. Notification Real-time Listener
        window.supabase.channel('profile-notif-listener')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, payload => {
                const lastReadTime = sessionStorage.getItem('lastReadNotifTime');
                if (!lastReadTime || new Date(payload.new.created_at).getTime() > new Date(lastReadTime).getTime()) {
                    document.getElementById('general-notif-dot').style.display = 'block';
                }
                if (document.getElementById('notifications-modal').classList.contains('show')) {
                    loadNotifications();
                }
            }).subscribe();
    }
});