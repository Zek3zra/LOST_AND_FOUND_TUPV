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

    // Helper Function
    function escapeQuote(str) {
        return (str || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
    }

    const DEFAULT_AVATAR = "../images/no_profile.png";

    let allMessages = [];
    let currentActiveUserId = null; 
    let contactMap = new Map(); 

    const contactsListEl = document.getElementById('contactsList');
    const chatMessagesEl = document.getElementById('chatMessages');
    const chatInput = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendBtn');
    const resolveTicketBtn = document.getElementById('resolveTicketBtn'); 
    
    const contactSearch = document.getElementById('contactSearch');
    const newChatSuggestions = document.getElementById('newChatSuggestions');
    let searchDebounceTimer;
    
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

    // --- LOAD AND MAP MESSAGES ---
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
                        avatar: uData.profile_picture_path || DEFAULT_AVATAR,
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
                        avatar: msg.users.profile_picture_path || DEFAULT_AVATAR,
                        latestMessage: latestPreview,
                        timestamp: new Date(msg.created_at),
                        lastSender: msg.sender,     // Added for Unread Logic
                        lastMsgId: msg.msg_id       // Added for Unread Logic
                    });
                }
            }
        }

        // Auto-read the currently active chat (prevents false "NEW" badges when actively chatting)
        if (currentActiveUserId && contactMap.has(currentActiveUserId)) {
            const activeContact = contactMap.get(currentActiveUserId);
            localStorage.setItem(`admin_read_${currentActiveUserId}`, activeContact.lastMsgId);
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
            
            // --- UNREAD LOGIC IMPLEMENTATION ---
            const lastReadMsgId = localStorage.getItem(`admin_read_${contact.user_id}`);
            const isUnread = (contact.lastSender === 'user' && String(lastReadMsgId) !== String(contact.lastMsgId));
            
            const unreadClass = isUnread ? 'unread-chat' : '';
            const unreadBadge = isUnread ? `<span class="unread-indicator">Unread</span>` : '';

            return `
                <div class="contact-item ${isActive} ${unreadClass}" onclick="openChat('${contact.user_id}')">
                    <img src="${contact.avatar}" class="contact-avatar" alt="Avatar">
                    <div class="contact-info">
                        <div class="contact-header">
                            <div class="contact-name">${contact.name} ${unreadBadge}</div>
                            <div class="contact-time">${timeStr}</div>
                        </div>
                        <div class="contact-preview">${contact.latestMessage}</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // --- SEARCH / START NEW CHAT LOGIC ---
    contactSearch.addEventListener('input', (e) => {
        clearTimeout(searchDebounceTimer);
        const val = e.target.value.trim();
        
        renderContactsUI(val); 

        if (val.length < 2) {
            newChatSuggestions.style.display = 'none';
            return;
        }

        searchDebounceTimer = setTimeout(async () => {
            const { data, error } = await window.supabase
                .from('users')
                .select('id, first_name, last_name, email, profile_picture_path')
                .or(`first_name.ilike.%${val}%,last_name.ilike.%${val}%,email.ilike.%${val}%`)
                .limit(6);

            if (data && data.length > 0) {
                newChatSuggestions.innerHTML = '<div style="padding: 8px 14px; font-size: 0.75rem; font-weight: 700; color: var(--text-secondary); background: #f8fafc; border-bottom: 1px solid var(--border-light); text-transform: uppercase; letter-spacing: 0.05em;">Start New Chat</div>' + 
                data.map(u => {
                    const avatar = u.profile_picture_path || DEFAULT_AVATAR;
                    return `
                    <div class="suggestion-item" onclick="startNewChat('${u.id}', '${escapeQuote(u.first_name)}', '${escapeQuote(u.last_name)}', '${escapeQuote(avatar)}')">
                        <img src="${avatar}" class="suggestion-avatar" alt="Avatar">
                        <div style="flex: 1; min-width: 0;">
                            <div style="font-weight: 600; font-size: 0.9rem; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${u.first_name} ${u.last_name}</div>
                            <div style="font-size: 0.75rem; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${u.email}</div>
                        </div>
                    </div>
                `}).join('');
                newChatSuggestions.style.display = 'block';
            } else {
                newChatSuggestions.style.display = 'none';
            }
        }, 300);
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-box')) {
            newChatSuggestions.style.display = 'none';
        }
    });

    window.startNewChat = function(id, firstName, lastName, avatar) {
        newChatSuggestions.style.display = 'none';
        contactSearch.value = ''; 
        
        const strId = String(id);
        
        if (!contactMap.has(strId)) {
            contactMap.set(strId, {
                user_id: strId,
                name: `${firstName} ${lastName}`,
                avatar: avatar || DEFAULT_AVATAR,
                latestMessage: "Start a new conversation...",
                timestamp: new Date() 
            });
        }
        
        renderContactsUI(''); 
        window.openChat(strId);
    };

    // --- CHAT INTERACTION LOGIC ---
    window.openChat = function(userId) {
        currentActiveUserId = String(userId); 
        const contactData = contactMap.get(currentActiveUserId);
        
        if (!contactData) {
            document.getElementById('emptyChatState').style.display = 'flex';
            document.getElementById('activeChatContainer').style.display = 'none';
            return;
        }

        // Marks chat as Read instantly upon opening
        if (contactData.lastMsgId) {
            localStorage.setItem(`admin_read_${currentActiveUserId}`, contactData.lastMsgId);
        }

        document.getElementById('emptyChatState').style.display = 'none';
        document.getElementById('activeChatContainer').style.display = 'flex';
        document.getElementById('activeChatName').textContent = contactData.name;
        document.getElementById('activeChatAvatar').src = contactData.avatar;
        
        resolveTicketBtn.style.display = 'flex';
        
        renderContactsUI(contactSearch.value);
        renderChatHistory(currentActiveUserId);

        document.getElementById('messengerWrapper').classList.add('show-chat');
    };

    document.getElementById('mobileBackBtn').addEventListener('click', () => {
        document.getElementById('messengerWrapper').classList.remove('show-chat');
        currentActiveUserId = null;
        renderContactsUI();
    });

    function renderChatHistory(userId) {
        const strId = String(userId);
        const userMessages = allMessages.filter(msg => String(msg.user_id) === strId);
        
        if (userMessages.length === 0) {
            chatMessagesEl.innerHTML = `<div style="text-align:center; color: var(--text-secondary); margin-top: 20px;">No message history found. Type below to start the conversation!</div>`;
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

    // ==========================================
    // ADMIN REAL-TIME LISTENER 
    // ==========================================
    window.supabase.channel('admin-global-chat-listener')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, payload => {
            loadChatData(true);
        })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'chat_messages' }, payload => {
            loadChatData(true);
        })
        .subscribe();
});