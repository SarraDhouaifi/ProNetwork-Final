/**
 * ProNetwork - Main JavaScript
 * Regroupe : Auth, Posts, Interactions, Réseau et Notifications
 */

$(document).ready(function () {

    /* ==========================================
       1. AUTHENTIFICATION (Login, Register, PWD)
    ========================================== */
    
    // Inscription
    $('#registerForm').on('submit', function (e) {
        e.preventDefault();
        $.ajax({
            type: 'POST',
            url: '/register',
            contentType: 'application/json',
            data: JSON.stringify({
                firstName: $('input[name="firstName"]').val(),
                lastName: $('input[name="lastName"]').val(),
                email: $('input[name="email"]').val(),
                password: $('input[name="password"]').val()
            }),
            success: () => window.location.href = '/feed',
            error: xhr => $('#message').css('color', 'red').text(xhr.responseJSON?.message || 'Error')
        });
    });

    // Connexion
    $('#loginForm').on('submit', function (e) {
        e.preventDefault();
        $.ajax({
            type: 'POST',
            url: '/login',
            contentType: 'application/json',
            data: JSON.stringify({
                email: $('input[name="email"]').val(),
                password: $('input[name="password"]').val()
            }),
            success: res => window.location.href = res.redirectUrl || '/feed',
            error: xhr => $('#message').css('color', 'red').text(xhr.responseJSON?.message || 'Error')
        });
    });

    // Mot de passe oublié
    $('#forgotPasswordForm').on('submit', function(e) {
        e.preventDefault();
        const email = $('input[name="email"]').val();
        $.ajax({
            url: '/forgot-password',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ email: email }),
            success: (res) => $('#message').css('color', 'green').text(res.message),
            error: (xhr) => $('#message').css('color', 'red').text(xhr.responseJSON.message)
        });
    });


    /* ==========================================
       2. GESTION DES POSTS (Création & UI)
    ========================================== */

    $(document).on('submit', '.create-post form', async function (e) {
        e.preventDefault();
        const formData = new FormData(this);
        try {
            const res = await fetch('/post/create', { method: 'POST', body: formData });
            const data = await res.json();
            if (data.success) {
                this.reset();
                location.reload();
            } else {
                alert('Error creating post');
            }
        } catch (err) { console.error("Create post error:", err); }
    });

    // Menu Dropdown "Me" dans la navbar
    const dropdownTrigger = document.getElementById('meDropdownTrigger');
    const dropdownMenu = document.getElementById('meDropdown');
    if (dropdownTrigger && dropdownMenu) {
        dropdownTrigger.addEventListener('click', (e) => {
            if (!e.target.closest('a')) {
                e.preventDefault();
                e.stopPropagation();
                dropdownMenu.classList.toggle('show');
            }
        });
        document.addEventListener('click', (e) => {
            if (!dropdownMenu.contains(e.target)) dropdownMenu.classList.remove('show');
        });
    }


    /* ==========================================
       3. INTERACTIONS GLOBALES (Délégation d'événements)
    ========================================== */

    document.body.addEventListener('click', async (e) => {

        // --- LIKE POST ---
        const likeBtn = e.target.closest('.like-btn');
        if (likeBtn) {
            const postId = likeBtn.dataset.postId;
            try {
                const res = await fetch(`/post/${postId}/like`, { method: 'POST' });
                const data = await res.json();
                if (data.success) {
                    const countSpan = document.getElementById(`likes-count-${postId}`);
                    if (countSpan) countSpan.innerText = data.likesCount;
                    const icon = likeBtn.querySelector('i');
                    if (data.action === 'liked') {
                        likeBtn.style.color = '#0a66c2';
                        icon.classList.replace('fa-regular', 'fa-solid');
                    } else {
                        likeBtn.style.color = '#666';
                        icon.classList.replace('fa-solid', 'fa-regular');
                    }
                }
            } catch (err) { console.error(err); }
            return;
        }

        // --- TOGGLE COMMENTAIRES ---
        const commentToggle = e.target.closest('.comment-btn, .comment-toggle-btn');
        if (commentToggle) {
            const postId = commentToggle.dataset.postId;
            const section = document.getElementById(`comments-${postId}`);
            if (section) {
                section.style.display = (section.style.display === 'none' || section.style.display === '') ? 'block' : 'none';
            }
            return;
        }

        // --- DELETE POST ---
        const deleteBtn = e.target.closest('.delete-post-btn');
        if (deleteBtn && confirm('Delete this post?')) {
            const postId = deleteBtn.dataset.postId;
            try {
                const res = await fetch(`/post/${postId}`, { method: 'DELETE' });
                const data = await res.json();
                if (data.success) document.getElementById(`post-${postId}`).remove();
            } catch (err) { console.error(err); }
            return;
        }

        // --- SAVE EDIT POST ---
        if (e.target.classList.contains('save-edit')) {
            const postId = e.target.dataset.postId;
            const box = e.target.closest('.post-text');
            const text = box.querySelector('.edit-input').value;
            try {
                const res = await fetch(`/post/${postId}/edit`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text })
                });
                const data = await res.json();
                if (data.success) {
                    box.querySelector('.post-content').innerText = data.text;
                    box.querySelector('.post-content').style.display = 'block';
                    box.querySelector('.edit-input').style.display = 'none';
                    box.querySelector('.edit-actions').style.display = 'none';
                }
            } catch (err) { console.error(err); }
            return;
        }

        // --- LIKE COMMENT ---
        const commentLikeBtn = e.target.closest('.comment-like-btn');
        if (commentLikeBtn) {
            const { postId, commentId } = commentLikeBtn.dataset;
            try {
                const res = await fetch(`/post/${postId}/comment/${commentId}/like`, { method: 'POST' });
                const data = await res.json();
                if (data.success) document.getElementById(`comment-likes-${commentId}`).innerText = data.likesCount;
            } catch (err) { console.error(err); }
            return;
        }

        // --- CONNECTION MENU DROPDOWN (Profile Page) ---
        const connDropdown = e.target.closest('.connected-dropdown');
        if (connDropdown) {
            const menu = connDropdown.querySelector('.connection-menu');
            const trigger = connDropdown.querySelector('.connection-trigger');
            if (trigger && trigger.contains(e.target)) {
                e.preventDefault();
                e.stopPropagation();
                // Fermer les autres menus
                document.querySelectorAll('.connection-menu').forEach(m => m !== menu ? m.style.display = 'none' : null);
                menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
            }
        } else {
            document.querySelectorAll('.connection-menu').forEach(m => m.style.display = 'none');
        }

        // --- SEND POST TO USER (Direct Message) ---
        const confirmSendBtn = e.target.closest('.confirm-send-btn');
        if (confirmSendBtn) {
            const receiverId = confirmSendBtn.getAttribute('data-user-id');
            const modal = document.getElementById('shareModal');
            const postId = modal.getAttribute('data-current-post-id');

            confirmSendBtn.disabled = true;
            confirmSendBtn.innerText = "Sending...";

            try {
                const response = await fetch('/post/send-to-user', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ postId, receiverId })
                });
                const data = await response.json();
                if (data.success && data.conversationId) {
                    window.location.href = `/messages/t/${data.conversationId}`;
                } else {
                    alert("Error sending post.");
                    confirmSendBtn.disabled = false;
                    confirmSendBtn.innerText = "Send";
                }
            } catch (err) {
                console.error("DM Share Error:", err);
                confirmSendBtn.disabled = false;
            }
            return;
        }
    });

    // Initialisation
    loadNotifications();
    setInterval(loadNotifications, 30000);
});


/* ==========================================
   4. FONCTIONS RÉSEAU (Connect, Block, etc.)
========================================== */

async function sendConnectionRequest(userId) {
    try {
        const btn = document.getElementById(`btn-connect-${userId}`);
        const res = await fetch(`/connect/${userId}`, { method: 'POST' });
        const data = await res.json();
        
        if (data.success) {
            if(btn) {
                btn.innerHTML = '<i class="fa-solid fa-clock"></i> Invitation Sent';
                btn.classList.replace('btn-fill', 'btn-outline');
                btn.disabled = true;
            } else {
                location.reload(); // Fallback si pas sur profil
            }
        }
    } catch (err) { console.error(err); }
}

async function acceptConnectionRequest(senderId, notifId) {
    try {
        const res = await fetch(`/accept/${senderId}`, { method: 'POST' });
        const data = await res.json();
        if (data.success) {
            const notifItem = document.getElementById(`notif-${notifId}`);
            if (notifItem) {
                notifItem.querySelector('.notif-actions').innerHTML = '<span style="color:#0a66c2;font-weight:600;">Accepted</span>';
            }
            location.reload(); 
        }
    } catch (err) { console.error(err); }
}

async function ignoreConnectionRequest(senderId, notifId) {
    try {
        const res = await fetch(`/reject/${senderId}`, { method: 'POST' });
        const data = await res.json();
        if (data.success) {
            const notifItem = document.getElementById(`notif-${notifId}`);
            if (notifItem) notifItem.remove();
            location.reload();
        }
    } catch (err) { console.error(err); }
}

async function disconnectUser(userId) {
    if (!confirm('Remove this connection?')) return;
    try {
        const res = await fetch(`/disconnect/${userId}`, { method: 'POST' });
        const data = await res.json();
        if (data.success) location.reload();
    } catch (err) { console.error(err); }
}

async function blockUser(userId) {
    if (!confirm('Block this user? They will no longer see you or your posts.')) return;
    try {
        const res = await fetch(`/block/${userId}`, { method: 'POST' });
        const data = await res.json();
        if (data.success) location.reload();
    } catch (err) { console.error(err); }
}

function unblockUser(userId) {
    if (!confirm('Unblock this user?')) return;
    $.ajax({
        url: '/api/unblock-user',
        type: 'POST',
        data: { userId: userId },
        success: function(response) {
            if (response.success) {
                if (document.getElementById('block-list-container')) refreshBlockList();
                else location.reload();
            }
        }
    });
}


/* ==========================================
   5. COMMENTAIRES & NOTIFICATIONS
========================================== */

async function submitComment(e, postId) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    try {
        const response = await fetch(`/post/${postId}/comment`, { method: 'POST', body: formData });
        const data = await response.json();
        if (data.success) location.reload(); 
    } catch (err) { console.error("Comment Error:", err); }
}

async function loadNotifications() {
    try {
        const res = await fetch('/notifications');
        const notifications = await res.json();
        const badge = document.getElementById('notif-count');
        if(badge) {
            const unread = notifications.filter(n => !n.isRead).length;
            badge.innerText = unread > 0 ? unread : '';
        }
    } catch (err) { console.error("Notif error:", err); }
}


/* ==========================================
   6. MODALE DE PARTAGE
========================================== */

async function openShareModal(postId) {
    const modal = document.getElementById('shareModal');
    if (!modal) return;
    modal.setAttribute('data-current-post-id', postId);
    modal.style.display = 'block';

    const list = document.getElementById('connectionsList');
    list.innerHTML = '<p style="text-align:center; padding:20px;">Loading connections...</p>';

    try {
        const response = await fetch('/network/connections-data'); 
        const friends = await response.json();
        if (friends.length === 0) {
            list.innerHTML = '<p style="padding:20px;">No connections found.</p>';
            return;
        }
        list.innerHTML = friends.map(friend => `
            <div class="connection-item" style="display:flex; align-items:center; justify-content:space-between; padding:10px; border-bottom:1px solid #eee;">
                <div style="display:flex; align-items:center; gap:10px;">
                    <img src="${friend.profilePicture || '/assets/images/default.png'}" style="width:35px; height:35px; border-radius:50%; object-fit:cover;">
                    <span style="font-weight:600; font-size:14px;">${friend.firstName} ${friend.lastName || ''}</span>
                </div>
                <button class="confirm-send-btn btn-primary" data-user-id="${friend._id}" style="padding:4px 12px; font-size:12px; border-radius:15px; cursor:pointer;">Send</button>
            </div>
        `).join('');
    } catch (err) { list.innerHTML = '<p style="color:red; text-align:center;">Error loading data.</p>'; }
}

// Fermeture modale clic extérieur
window.onclick = function(event) {
    const modal = document.getElementById('shareModal');
    if (event.target == modal) modal.style.display = "none";
};

// Refresh block list via Socket.io si dispo
if (typeof io !== 'undefined') {
    const socket = io();
    socket.on('block-list-updated', () => {
        if (document.getElementById('block-list-container')) refreshBlockList();
    });
}