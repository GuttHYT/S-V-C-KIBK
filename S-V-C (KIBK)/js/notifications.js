auth.onAuthStateChanged(user => {
    if (user) {
        db.collection('users').doc(user.uid).get().then(doc => {
            if (doc.exists) {
                const userData = doc.data();
                const bell = document.getElementById('noti-bell');
                
                if (userData.role === 'seller' || userData.isAdmin === true) {
                    if(bell) bell.style.display = 'block';
                    startOrderListener(user.uid, userData.isAdmin);
                } else {
                    if(bell) bell.style.display = 'none';
                }
            }
        });
    }
});

function startOrderListener(uid, isAdmin) {
    let query = db.collection('orders');
    
    if (!isAdmin) {
        query = query.where('sellerId', '==', uid);
    }

    query.onSnapshot(snapshot => {
        const list = document.getElementById('noti-list');
        const countBadge = document.getElementById('noti-count');
        
        if (!list) return;

        list.innerHTML = ""; // Limpa a lista antes de reconstruir
        let pendingCount = 0;

        if (snapshot.empty) {
            list.innerHTML = '<div style="padding:15px; color:#666; text-align:center;">Nenhum pedido.</div>';
            if(countBadge) countBadge.style.display = 'none';
            return;
        }

        snapshot.forEach(doc => {
            const order = doc.data();
            const orderId = doc.id;
            if (order.status === "pendente") pendingCount++;

            const item = document.createElement('div');
            item.style.cssText = "padding: 12px; border-bottom: 1px solid #eee; background: #fff; position: relative; animation: fadeIn 0.3s;";
            
            item.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; padding-right: 20px;">
                    <strong style="color:#2E7D32;">${order.buyerName || 'Cliente'}</strong>
                    <span style="background:#e8f5e9; padding:2px 6px; border-radius:4px; font-size:0.7rem;">${order.quantity}x</span>
                </div>
                <div style="font-size: 0.85rem; color: #333; margin-top:3px;">
                    ${order.productName}
                </div>
                <button onclick="deleteOrder('${orderId}')" style="position:absolute; top:5px; right:5px; background:none; border:none; color:#ff4444; cursor:pointer; font-weight:bold; font-size:16px; padding:5px;">
                    &times;
                </button>
            `;
            list.appendChild(item);
        });

        if (countBadge) {
            if (pendingCount > 0) {
                countBadge.style.display = 'block';
                countBadge.innerText = pendingCount;
            } else {
                countBadge.style.display = 'none';
            }
        }
    });
}

// Função para deletar a notificação/pedido individualmente
async function deleteOrder(orderId) {
    if (confirm("Deseja remover esta notificação?")) {
        try {
            await db.collection('orders').doc(orderId).delete();
            // A lista se atualizará sozinha por causa do onSnapshot
        } catch (error) {
            alert("Erro ao excluir: " + error.message);
        }
    }
}

function toggleNotiBox() {
    const box = document.getElementById('noti-box');
    if(box) box.style.display = (box.style.display === 'none') ? 'block' : 'none';
}

async function clearAllNotifications() {
    // 1. Confirmação de segurança
    const confirmar = confirm("Isso irá apagar permanentemente todas as suas notificações de pedidos. Continuar?");
    if (!confirmar) return;

    try {
        const user = auth.currentUser;
        if (!user) return;

        // Buscamos os dados do usuário para saber se é Admin ou Vendedor
        const userDoc = await db.collection('users').doc(user.uid).get();
        const userData = userDoc.data();

        let query = db.collection('orders');

        // Filtro: Se não for admin, ele só apaga os pedidos dele
        if (!userData.isAdmin) {
            query = query.where('sellerId', '==', user.uid);
        }

        const snapshot = await query.get();

        if (snapshot.empty) {
            alert("Nenhuma notificação encontrada para limpar.");
            return;
        }

        // 2. Executa a limpeza em lote (batch)
        const batch = db.batch();
        snapshot.forEach(doc => {
            batch.delete(doc.ref);
        });

        await batch.commit();
        alert("Histórico de notificações limpo com sucesso!");

    } catch (error) {
        console.error("Erro ao limpar notificações:", error);
        alert("Ocorreu um erro ao tentar limpar as notificações.");
    }
}