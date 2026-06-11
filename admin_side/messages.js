document.addEventListener('DOMContentLoaded', async () => {

    const userRole = sessionStorage.getItem('role');
    if (userRole !== 'admin') { window.location.href = '../login.html'; return; }

    document.getElementById('admin-name').textContent = sessionStorage.getItem('user_name') || 'Site Administrator';

    document.getElementById('admin-logout-btn').addEventListener('click', async (e) => {
        e.preventDefault();
        await window.supabase.auth.signOut();
        sessionStorage.clear();
        window.location.href = '../login.html';
    });

    const hamburger = document.getElementById('hamburger');
    const sidebar = document.getElementById('sidebar');
    if (hamburger && sidebar) hamburger.addEventListener('click', () => sidebar.classList.toggle('open'));

    let allMessages = [];
    let currentActiveUserId = null; 
    let contactMap = new Map(); 

    const contactsListEl = document.getElementById('contactsList');
    const chatMessagesEl = document.getElementById('chatMessages');
    const chatInput = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendBtn');
    const resolveTicketBtn = document.getElementById('resolveTicketBtn'); 
    
    const chatImageInput = document.getElementById('chatImageInput');
    const attachBtn = document.getElementById('attachBtn');
    const previewContainer = document.getElementById('chat-img-preview-container');
    const previewImg = document.getElementById('chat-img-preview');
    const removeImgBtn = document.getElementById('remove-chat-img-btn');
    let pendingImageFile = null;

    // --- PHOTO PREVIEW LOGIC ---
    attachBtn.addEventListener('click', () => chatImageInput.click());

    chatImageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            pendingImageFile = file;
            const reader = new FileReader();
            reader.onload = (event) => {
                previewImg.src = event.target.result;
                previewContainer.style.display = 'inline-block';
            };
            reader.readAsDataURL(file);
        }
    });

    removeImgBtn.addEventListener('click', () => {
        pendingImageFile = null;
        chatImageInput.value = '';
        previewContainer.style.display = 'none';
        previewImg.src = '';
    });

    // --- SYSTEM RESOLVE LOGIC ---
    resolveTicketBtn.addEventListener('click', async () => {
        if (!currentActiveUserId) return;
        
        const originalHtml = resolveTicketBtn.innerHTML;
        resolveTicketBtn.disabled = true;
        resolveTicketBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

        const { error } = await window.supabase.from('chat_messages').insert([{
            user_id: currentActiveUserId,
            sender: 'admin',
            message: '___RESOLVE_REQUEST___'
        }]);

        resolveTicketBtn.disabled = false;
        resolveTicketBtn.innerHTML = originalHtml;

        if (error) alert("Failed to send request: " + error.message);
        else await loadChatData(true);
    });

    async function loadChatData(isSilent = false) {
        if (!isSilent) {
            chatMessagesEl.innerHTML = '<div style="text-align:center; padding: 20px; color: var(--text-secondary);"><i class="fa-solid fa-circle-notch fa-spin"></i></div>';
        }

        const { data, error } = await window.supabase
            .from('chat_messages')
            .select('msg_id, user_id, sender, message, image_url, created_at, users(first_name, last_name, profile_picture_path)')
            .order('created_at', { ascending: true }); 

        if (error) {
            contactsListEl.innerHTML = `<div style="padding: 24px; text-align: center; color: var(--danger-red);">Failed to load messages.</div>`;
            return;
        }

        allMessages = data || [];
        processContactsList();
        
        const redirectUserId = sessionStorage.getItem('targetChatUserId');
        if (redirectUserId && !isSilent) {
            sessionStorage.removeItem('targetChatUserId'); 
            
            const targetId = String(redirectUserId);
            
            if (!contactMap.has(targetId)) {
                const { data: uData } = await window.supabase.from('users').select('first_name, last_name, profile_picture_path').eq('id', targetId).single();
                if (uData) {
                    contactMap.set(targetId, {
                        user_id: targetId,
                        name: `${uData.first_name} ${uData.last_name}`,
                        avatar: uData.profile_picture_path || '../images/default-avatar.png',
                        latestMessage: "Start a new conversation...",
                        timestamp: new Date()
                    });
                    renderContactsUI();
                }
            }
            
            if (contactMap.has(targetId)) {
                setTimeout(() => window.openChat(targetId), 50);
            }
            
        } else if (currentActiveUserId) {
            renderChatHistory(currentActiveUserId);
        }
    }

    function processContactsList() {
        contactMap.clear();
        for (let i = allMessages.length - 1; i >= 0; i--) {
            const msg = allMessages[i];
            
            if (msg.user_id && msg.users) {
                const strId = String(msg.user_id);
                
                if (!contactMap.has(strId)) {
                    let latestPreview = msg.message;
                    if (latestPreview === '___RESOLVE_REQUEST___') latestPreview = "✅ Resolution Requested";
                    else if (!latestPreview && msg.image_url) latestPreview = "🖼️ Sent a photo";

                    contactMap.set(strId, {
                        user_id: strId,
                        name: `${msg.users.first_name} ${msg.users.last_name}`,
                        avatar: msg.users.profile_picture_path || '../images/default-avatar.png',
                        latestMessage: latestPreview,
                        timestamp: new Date(msg.created_at) 
                    });
                }
            }
        }
        renderContactsUI();
    }

    function renderContactsUI(searchTerm = '') {
        const contactsArray = Array.from(contactMap.values());
        const filteredContacts = contactsArray.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));

        if (filteredContacts.length === 0) {
            contactsListEl.innerHTML = `<div style="padding: 24px; text-align: center; color: var(--text-secondary); font-size: 0.9rem;">No student conversations found.</div>`;
            return;
        }

        filteredContacts.sort((a, b) => b.timestamp - a.timestamp);

        contactsListEl.innerHTML = filteredContacts.map(contact => {
            const timeStr = !isNaN(contact.timestamp) ? contact.timestamp.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
            const isActive = contact.user_id === currentActiveUserId ? 'active' : '';
            return `
                <div class="contact-item ${isActive}" onclick="openChat('${contact.user_id}')">
                    <img src="${contact.avatar}" class="contact-avatar" alt="Avatar">
                    <div class="contact-info">
                        <div class="contact-header">
                            <div class="contact-name">${contact.name}</div>
                            <div class="contact-time">${timeStr}</div>
                        </div>
                        <div class="contact-preview">${contact.latestMessage}</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    document.getElementById('contactSearch').addEventListener('input', (e) => renderContactsUI(e.target.value));

    window.openChat = function(userId) {
        currentActiveUserId = String(userId); 
        const contactData = contactMap.get(currentActiveUserId);
        
        if (!contactData) {
            document.getElementById('emptyChatState').style.display = 'flex';
            document.getElementById('activeChatContainer').style.display = 'none';
            return;
        }

        document.getElementById('emptyChatState').style.display = 'none';
        document.getElementById('activeChatContainer').style.display = 'flex';
        document.getElementById('activeChatName').textContent = contactData.name;
        document.getElementById('activeChatAvatar').src = contactData.avatar;
        
        resolveTicketBtn.style.display = 'flex';
        
        renderContactsUI(document.getElementById('contactSearch').value);
        renderChatHistory(currentActiveUserId);

        // Slide the chat window into view on mobile devices
        document.getElementById('messengerWrapper').classList.add('show-chat');
    };

    // --- MOBILE BACK BUTTON LOGIC ---
    document.getElementById('mobileBackBtn').addEventListener('click', () => {
        document.getElementById('messengerWrapper').classList.remove('show-chat');
        currentActiveUserId = null;
        renderContactsUI();
    });

    function renderChatHistory(userId) {
        const strId = String(userId);
        const userMessages = allMessages.filter(msg => String(msg.user_id) === strId);
        
        if (userMessages.length === 0) {
            chatMessagesEl.innerHTML = `<div style="text-align:center; color: var(--text-secondary); margin-top: 20px;">No message history found.</div>`;
            return;
        }

        chatMessagesEl.innerHTML = userMessages.map(msg => {
            const timeObj = new Date(msg.created_at);
            const timeStr = !isNaN(timeObj) ? timeObj.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
            
            if (msg.message === '___RESOLVE_REQUEST___') {
                 return `
                    <div class="msg-wrap system" style="max-width: 100%; width: 100%;">
                        <div class="admin-resolve-bubble">
                            <i class="fa-solid fa-circle-exclamation" style="color: var(--accent-amber); margin-bottom: 8px; font-size: 1.5rem;"></i><br>
                            <strong>Resolution Requested</strong><br>
                            <span style="color: var(--text-secondary); font-size: 0.8rem;">Waiting for the student to confirm and close the chat.</span>
                        </div>
                        <div class="msg-time" style="text-align: center;">${timeStr}</div>
                    </div>
                `;
            }

            const textHtml = msg.message ? `<div>${msg.message}</div>` : '';
            const imgHtml = msg.image_url ? `<img src="${msg.image_url}" class="chat-msg-img" onclick="window.open('${msg.image_url}', '_blank')">` : '';

            if (msg.sender === 'admin') {
                return `<div class="msg-wrap admin"><div class="msg-bubble">${imgHtml}${textHtml}</div><div class="msg-time">${timeStr}</div></div>`;
            } else {
                return `<div class="msg-wrap user"><div class="msg-bubble">${imgHtml}${textHtml}</div><div class="msg-time">${timeStr}</div></div>`;
            }
        }).join('');

        setTimeout(() => chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight, 50);
    }

    async function sendReply() {
        if (!currentActiveUserId) return;
        
        const text = chatInput.value.trim();
        if (!text && !pendingImageFile) return; 

        const originalBtnHtml = sendBtn.innerHTML;
        chatInput.disabled = true;
        attachBtn.disabled = true;
        sendBtn.disabled = true;
        sendBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i>';

        try {
            let publicImageUrl = null;

            if (pendingImageFile) {
                const fileExt = pendingImageFile.name.split('.').pop() || 'png';
                const fileName = `admin_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
                
                const { error: uploadError } = await window.supabase.storage.from('chat-images').upload(fileName, pendingImageFile);
                if (uploadError) throw new Error("Image Upload Failed: " + uploadError.message);
                
                const { data } = window.supabase.storage.from('chat-images').getPublicUrl(fileName);
                publicImageUrl = data.publicUrl;
            }

            const payload = { 
                user_id: currentActiveUserId, 
                sender: 'admin', 
                message: text 
            };
            if (publicImageUrl) payload.image_url = publicImageUrl;

            const { error } = await window.supabase.from('chat_messages').insert([payload]);
            if (error) throw new Error(error.message);

            chatInput.value = '';
            pendingImageFile = null;
            chatImageInput.value = '';
            previewContainer.style.display = 'none';
            previewImg.src = '';

            await loadChatData(true);

        } catch (err) {
            alert("Failed to send message: " + err.message);
        } finally {
            chatInput.disabled = false;
            attachBtn.disabled = false;
            sendBtn.disabled = false;
            sendBtn.innerHTML = originalBtnHtml;
            chatInput.focus();
        }
    }

    sendBtn.addEventListener('click', sendReply);
    chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendReply(); });

    loadChatData();
});