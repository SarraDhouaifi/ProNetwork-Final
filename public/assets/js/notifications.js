document.addEventListener('DOMContentLoaded', () => {
    const socket = io();
    const badge = document.getElementById('notif-badge');
    
    /* ==========================================
       1. GESTION DU BADGE (Socket.io)
    ========================================== */
    if (badge) {
        const userId = badge.dataset.userId;
        const countAttr = badge.getAttribute('data-count');
        let count = parseInt(countAttr) || 0;

        if (count > 0) {
            badge.style.display = 'flex';
            badge.innerText = count > 99 ? '99+' : count;
        }

        if (userId) {
            socket.emit('join', userId);

            socket.on('new_notification', () => {
                count++;
                badge.innerText = count > 99 ? '99+' : count;
                badge.style.display = 'flex';
            });
        }
    }

    /* ==========================================
       2. GESTION DU DROPDOWN "ME"
    ========================================== */
    const dropdownTrigger = document.getElementById('meDropdownTrigger');
    const dropdownMenu = document.getElementById('meDropdown');

    if (dropdownTrigger && dropdownMenu) {
        dropdownTrigger.addEventListener('click', (e) => {
            if (e.target.closest('a')) return;
            e.preventDefault(); 
            
            const isVisible = dropdownMenu.style.display === 'block';
            dropdownMenu.style.display = isVisible ? 'none' : 'block';
        });

        document.addEventListener('click', (e) => {
            if (!dropdownTrigger.contains(e.target)) {
                dropdownMenu.style.display = 'none';
            }
        });
    }
});

/* ==========================================
   3. ACTIONS DE RÉSEAU (Accept / Ignore)
========================================== */

// Note : Ces fonctions sont en dehors du DOMContentLoaded pour être accessibles 
// par les attributs onclick="function()" de ton HTML.

async function acceptConnectionRequest(senderId, notifId) {
    try {
        // On vise la route définie dans ton controller de notifications
        const res = await fetch(`/notifications/accept/${senderId}`, { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();

        if (data.success) {
            const notifItem = document.getElementById(`notif-${notifId}`);
            if (notifItem) {
                // Remplace les boutons par un message de succès
                const actionsDiv = notifItem.querySelector('.notif-actions');
                actionsDiv.innerHTML = '<span style="color:#0a66c2; font-weight:600; font-size:13px;">Accepted</span>';
                notifItem.classList.remove('unread');
                notifItem.style.backgroundColor = 'transparent'; // Enlève le bleu du "non-lu"
            }
        } else {
            alert("Error: " + (data.message || "Could not accept request"));
        }
    } catch (err) {
        console.error("Accept Error:", err);
    }
}

async function ignoreConnectionRequest(senderId, notifId) {
    if (!confirm("Ignore this invitation?")) return;

    try {
        const res = await fetch(`/notifications/reject/${senderId}`, { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();

        if (data.success) {
            const notifItem = document.getElementById(`notif-${notifId}`);
            if (notifItem) {
                // Animation de sortie
                notifItem.style.transition = '0.3s';
                notifItem.style.opacity = '0';
                notifItem.style.transform = 'translateX(20px)';
                setTimeout(() => notifItem.remove(), 300);
            }
        }
    } catch (err) {
        console.error("Ignore Error:", err);
    }
}

async function markAllAsRead() {
    try {
        const res = await fetch('/notifications/mark-all-read', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
            // UI Update
            document.querySelectorAll('.notification-item.unread').forEach(item => {
                item.classList.remove('unread');
                item.style.backgroundColor = 'transparent';
            });
            const badge = document.getElementById('notif-badge');
            if (badge) badge.style.display = 'none';
        }
    } catch (err) {
        console.error("Mark read error:", err);
    }
}