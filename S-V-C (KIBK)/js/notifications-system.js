// Sistema de Notificações Pessoais
const NotificationSystem = {
    async init() {
        this.user = auth.currentUser;
        if (!this.user) return;
        
        await this.loadUserRole();
        this.startListening();
        this.setupUI();
    },

    async loadUserRole() {
        const doc = await db.collection('users').doc(this.user.uid).get();
        this.userData = doc.data();
        this.isAdmin = this.userData.isAdmin || false;
        this.isSeller = this.userData.role === 'seller';
    },

    startListening() {
        let query = db.collection('notifications');
        
        // Admin vê todas, vendedor vê só as dele
        if (!this.isAdmin) {
            query = query.where('userId', '==', this.user.uid);
        }
        
        query = query.orderBy('createdAt', 'desc').limit(50);
        
        query.onSnapshot(snapshot => {
            this.updateNotificationList(snapshot);
            this.updateBadge(snapshot);
        });
    },

    updateNotificationList(snapshot) {
        const list = document.getElementById('personal-notifications-list');
        if (!list) return;

        if (snapshot.empty) {
            list.innerHTML = '<p style="text-align:center; color:#999; padding:20px;">Nenhuma notificação</p>';
            return;
        }

        list.innerHTML = '';
        snapshot.forEach(doc => {
            const notif = doc.data();
            const item = this.createNotificationItem(doc.id, notif);
            list.appendChild(item);
        });
    },

    createNotificationItem(id, notif) {
        const div = document.createElement('div');
        div.className = `notification-item ${notif.read ? 'read' : 'unread'}`;
        div.style.cssText = `
            padding: 12px;
            border-bottom: 1px solid #eee;
            cursor: pointer;
            transition: 0.3s;
            background: ${notif.read ? 'transparent' : '#f0f8ff'};
        `;

        const time = notif.createdAt ? 
            new Date(notif.createdAt.seconds * 1000).toLocaleString('pt-BR') : 
            'Agora';

        const icons = {
            payment: '💰',
            order: '📦',
            system: '🔔',
            reminder: '⏰',
            block: '🚫',
            unblock: '✅'
        };

        div.innerHTML = `
            <div style="display: flex; align-items: start; gap: 10px;">
                <span style="font-size: 1.5rem;">${icons[notif.type] || '📌'}</span>
                <div style="flex: 1;">
                    <p style="margin: 0; font-size: 0.9rem;">${notif.message}</p>
                    <small style="color: #999;">${time}</small>
                </div>
                ${!notif.read ? '<span style="background: #2196F3; width: 8px; height: 8px; border-radius: 50%;"></span>' : ''}
            </div>
        `;

        div.onclick = async () => {
            if (!notif.read) {
                await db.collection('notifications').doc(id).update({ read: true });
            }
            if (notif.actionUrl) {
                window.location.href = notif.actionUrl;
            }
        };

        return div;
    },

    updateBadge(snapshot) {
        const badge = document.getElementById('notifications-badge');
        if (!badge) return;

        const unreadCount = snapshot.docs.filter(doc => !doc.data().read).length;
        
        if (unreadCount > 0) {
            badge.style.display = 'block';
            badge.innerText = unreadCount;
        } else {
            badge.style.display = 'none';
        }
    },

    setupUI() {
        // Criar ícone de notificações se não existir
        if (!document.getElementById('notifications-icon')) {
            const nav = document.querySelector('nav div');
            if (nav) {
                const notifHTML = `
                    <div id="notifications-icon" style="position: relative; cursor: pointer;" onclick="NotificationSystem.togglePanel()">
                        🔔
                        <span id="notifications-badge" style="display: none; position: absolute; top: -5px; right: -5px; background: red; color: white; border-radius: 50%; padding: 2px 6px; font-size: 0.7rem;"></span>
                    </div>
                    <div id="notifications-panel" style="display: none; position: fixed; top: 60px; right: 20px; background: white; border-radius: 10px; box-shadow: 0 5px 20px rgba(0,0,0,0.3); width: 350px; max-height: 500px; overflow-y: auto; z-index: 10000;">
                        <div style="padding: 15px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;">
                            <h3 style="margin: 0;">Notificações</h3>
                            <button onclick="NotificationSystem.markAllRead()" style="background: none; border: none; color: #2196F3; cursor: pointer;">Marcar todas como lidas</button>
                        </div>
                        <div id="personal-notifications-list"></div>
                    </div>
                `;
                nav.insertAdjacentHTML('beforeend', notifHTML);
            }
        }
    },

    togglePanel() {
        const panel = document.getElementById('notifications-panel');
        if (panel) {
            panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        }
    },

    async markAllRead() {
        const snapshot = await db.collection('notifications')
            .where('userId', '==', this.user.uid)
            .where('read', '==', false)
            .get();

        const batch = db.batch();
        snapshot.forEach(doc => {
            batch.update(doc.ref, { read: true });
        });
        await batch.commit();
    },

    // Enviar notificação (usado pelo sistema)
    async send(userId, type, message, actionUrl = null) {
        await db.collection('notifications').add({
            userId,
            type,
            message,
            read: false,
            actionUrl,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    }
};