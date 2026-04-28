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

function formatDateTime(timestamp) {
    if (!timestamp || !timestamp.seconds) return 'Data não disponível';
    
    const date = new Date(timestamp.seconds * 1000);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    // Formatar hora
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const time = `${hours}:${minutes}`;
    
    // Formatar data
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const fullDate = `${day}/${month}/${year}`;
    
    // Mostrar data relativa para hoje/ontem
    if (diffDays === 0) {
        return `Hoje às ${time}`;
    } else if (diffDays === 1) {
        return `Ontem às ${time}`;
    } else if (diffDays < 7) {
        return `Há ${diffDays} dias (${fullDate} às ${time})`;
    } else {
        return `${fullDate} às ${time}`;
    }
}

function startOrderListener(uid, isAdmin) {
    let query = db.collection('orders');
    
    if (!isAdmin) {
        query = query.where('sellerId', '==', uid);
    }

    // Ordenar por data (mais recentes primeiro)
    query = query.orderBy('createdAt', 'desc');

    query.onSnapshot(snapshot => {
        const list = document.getElementById('noti-list');
        const countBadge = document.getElementById('noti-count');
        
        if (!list) return;

        list.innerHTML = "";
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

            const estiloPgto = order.tipo === 'pagamento' 
                ? { texto: 'PIX', cor: '#2E7D32', bg: '#e8f5e9' } 
                : { texto: 'Entrega', cor: '#666', bg: '#f5f5f5' };

            const dataFormatada = formatDateTime(order.createdAt);

            const item = document.createElement('div');
            item.style.cssText = "padding: 12px; border-bottom: 1px solid #eee; background: #fff; position: relative;";
            
            item.innerHTML = `
                <div style="padding-right: 20px;">
                    <div style="font-size: 0.75rem; color: #666; font-weight: bold; text-transform: uppercase;">
                        👤 Pedido de: ${order.buyerName || 'Usuário'}
                    </div>
                    
                    <div style="font-size: 0.9rem; color: #333; margin: 4px 0;">
                        <strong>${order.quantity}x</strong> ${order.productName}
                    </div>

                    <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                        <span style="font-size: 0.6rem; padding: 2px 5px; border-radius: 4px; background: ${estiloPgto.bg}; color: ${estiloPgto.cor}; border: 1px solid ${estiloPgto.cor};">
                            ${estiloPgto.texto}
                        </span>
                        <small style="font-size: 0.65rem; color: #999;">
                            📅 ${dataFormatada}
                        </small>
                    </div>
                </div>

                <button onclick="deleteOrder('${orderId}')" style="position:absolute; top:8px; right:8px; background:none; border:none; color:#ccc; cursor:pointer; font-size:18px;">
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

async function deleteOrder(orderId) {
    if (confirm("Deseja remover esta notificação?")) {
        try {
            await db.collection('orders').doc(orderId).delete();
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
    const confirmar = confirm("Isso irá apagar permanentemente todas as suas notificações de pedidos. Continuar?");
    if (!confirmar) return;

    try {
        const user = auth.currentUser;
        if (!user) return;

        const userDoc = await db.collection('users').doc(user.uid).get();
        const userData = userDoc.data();

        let query = db.collection('orders');

        if (!userData.isAdmin) {
            query = query.where('sellerId', '==', user.uid);
        }

        const snapshot = await query.get();

        if (snapshot.empty) {
            alert("Nenhuma notificação encontrada para limpar.");
            return;
        }

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