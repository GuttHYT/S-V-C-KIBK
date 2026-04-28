// Painel Administrativo Avançado
const AdvancedAdmin = {
    async loadSiteStats() {
        try {
            // Total de usuários
            const usersSnap = await db.collection('users').get();
            const totalUsers = usersSnap.size;
            
            // Total de produtos
            const productsSnap = await db.collection('products').get();
            const totalProducts = productsSnap.size;
            
            // Total de pedidos
            const ordersSnap = await db.collection('orders').get();
            const totalOrders = ordersSnap.size;
            
            // Pedidos pendentes
            const pendingOrders = ordersSnap.docs.filter(doc => doc.data().status === 'pendente').length;
            
            // Vendedores ativos
            const activeSellers = usersSnap.docs.filter(doc => doc.data().role === 'seller').length;
            
            // Atualizar interface
            document.getElementById('stat-users').innerText = totalUsers;
            document.getElementById('stat-products').innerText = totalProducts;
            document.getElementById('stat-orders').innerText = totalOrders;
            document.getElementById('stat-pending').innerText = pendingOrders;
            document.getElementById('stat-sellers').innerText = activeSellers;
            
            // Gráfico simples de pedidos por dia (últimos 7 dias)
            this.loadOrdersChart(ordersSnap);
            
        } catch (error) {
            console.error("Erro ao carregar estatísticas:", error);
        }
    },

    loadOrdersChart(ordersSnap) {
        const last7Days = [];
        const today = new Date();
        
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            last7Days.push({
                date: date.toLocaleDateString('pt-BR', { weekday: 'short' }),
                count: 0
            });
        }
        
        ordersSnap.forEach(doc => {
            const order = doc.data();
            if (order.createdAt) {
                const orderDate = new Date(order.createdAt.seconds * 1000);
                const orderDay = orderDate.toLocaleDateString('pt-BR', { weekday: 'short' });
                
                const dayEntry = last7Days.find(d => d.date === orderDay);
                if (dayEntry) {
                    dayEntry.count++;
                }
            }
        });
        
        // Renderizar gráfico simples com barras
        const chartContainer = document.getElementById('orders-chart');
        if (chartContainer) {
            const maxCount = Math.max(...last7Days.map(d => d.count), 1);
            
            chartContainer.innerHTML = last7Days.map(day => `
                <div style="display: flex; align-items: end; gap: 5px;">
                    <div style="background: var(--primary-color); 
                                width: 30px; 
                                height: ${(day.count / maxCount) * 100}px; 
                                border-radius: 4px 4px 0 0;
                                min-height: 5px;">
                    </div>
                    <small style="font-size: 0.7rem;">${day.date}</small>
                </div>
            `).join('');
        }
    },

    async exportData(collection) {
        try {
            const snapshot = await db.collection(collection).get();
            const data = [];
            
            snapshot.forEach(doc => {
                data.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            // Criar arquivo JSON para download
            const jsonStr = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `${collection}_${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            
            URL.revokeObjectURL(url);
            alert(`Dados de ${collection} exportados com sucesso!`);
            
        } catch (error) {
            console.error("Erro ao exportar:", error);
            alert("Erro ao exportar dados: " + error.message);
        }
    },

    async bulkUpdatePrices(category, multiplier) {
        if (!confirm(`Isso irá multiplicar todos os preços da categoria "${category}" por ${multiplier}. Continuar?`)) {
            return;
        }
        
        try {
            const snapshot = await db.collection('products')
                .where('category', '==', category)
                .get();
            
            const batch = db.batch();
            let count = 0;
            
            snapshot.forEach(doc => {
                const currentPrice = doc.data().price;
                const newPrice = Math.round(currentPrice * multiplier * 100) / 100;
                
                batch.update(doc.ref, {
                    price: newPrice,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                count++;
            });
            
            await batch.commit();
            alert(`${count} produtos atualizados com sucesso!`);
            
        } catch (error) {
            console.error("Erro na atualização em lote:", error);
            alert("Erro: " + error.message);
        }
    },

    async sendGlobalAnnouncement(message) {
        if (!message) {
            alert("Digite uma mensagem!");
            return;
        }
        
        try {
            await db.collection('settings').doc('global').update({
                announcement: message,
                announcementDate: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            alert("Anúncio global enviado!");
        } catch (error) {
            console.error("Erro ao enviar anúncio:", error);
            alert("Erro: " + error.message);
        }
    }
};

// Inicializar estatísticas se estiver na página admin
if (window.location.pathname.includes('admin.html')) {
    auth.onAuthStateChanged(user => {
        if (user) {
            db.collection('users').doc(user.uid).get().then(doc => {
                if (doc.exists && doc.data().isAdmin) {
                    AdvancedAdmin.loadSiteStats();
                }
            });
        }
    });
}