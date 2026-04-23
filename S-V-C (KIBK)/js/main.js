// Verifica login e permissões
auth.onAuthStateChanged(user => {
    if (user) {
        checkUserRole(user.uid);
        loadProducts();
    } else {
        window.location.href = 'login.html';
    }
});

async function checkUserRole(uid) {
    try {
        const userDoc = await db.collection('users').doc(uid).get();
        if (userDoc.exists) {
            const userData = userDoc.data();
            const userInfoElem = document.getElementById('user-info');
            if (userInfoElem) userInfoElem.innerText = `Olá, ${userData.name}!`;
            
            if (userData.role === 'seller' || userData.isAdmin) {
                document.getElementById('seller-links').style.display = 'inline';
                document.getElementById('noti-bell').style.display = 'block';
            }
            if (userData.isAdmin === true) {
                document.getElementById('admin-link').style.display = 'inline';
            }
        }
    } catch (e) {
        console.error("Erro ao verificar papel do usuário:", e);
    }
}

async function loadProducts() {
    const containerSalgados = document.getElementById('category-salgados');
    const containerDoces = document.getElementById('category-doces');
    
    if (!containerSalgados || !containerDoces) return;

    // 1. Carrega dados de todos os vendedores primeiro para evitar erros de undefined
    const vendorsData = {};
    try {
        const vendorsSnap = await db.collection('vendors').get();
        vendorsSnap.forEach(doc => {
            vendorsData[doc.id] = doc.data();
        });
    } catch (e) {
        console.warn("Aviso: Não foi possível carregar a lista de vendedores.");
    }

    // 2. Escuta os produtos em tempo real
    db.collection('products').onSnapshot(snapshot => {
        containerSalgados.innerHTML = "";
        containerDoces.innerHTML = "";

        if (snapshot.empty) {
            containerSalgados.innerHTML = "<p>Nenhum produto cadastrado ainda.</p>";
            return;
        }

        snapshot.forEach(doc => {
            const product = doc.data();
            const productId = doc.id;
            
            // PROTEÇÃO: Se o vendedor não existir ou não tiver dias, define como vazio
            const sellerInfo = vendorsData[product.sellerId] || {};
            const days = sellerInfo.sellingDays || [];
            const isEsgotado = product.quantity <= 0;

            const daysHtml = days.length > 0 
                ? `<p style="color:#d32f2f; font-size:0.75rem; font-weight:bold; margin:5px 0;">📅 ${days.join(', ')}</p>` 
                : `<p style="color:#666; font-size:0.7rem; margin:5px 0;">📅 Ver com vendedor</p>`;

            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                <div style="position: relative;">
                    <img src="${product.imageUrl || 'https://via.placeholder.com/150'}" 
                         style="width:100%; height:130px; object-fit:cover; border-radius:8px; display:block; 
                         filter: ${isEsgotado ? 'grayscale(1) opacity(0.6)' : 'none'};">
                    ${isEsgotado ? '<span style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); background:rgba(0,0,0,0.7); color:white; padding:5px 10px; border-radius:5px; font-weight:bold;">ESGOTADO</span>' : ''}
                </div>
                <h3 style="margin-top:10px; font-size:1.1rem;">${product.name}</h3>
                ${daysHtml}
                <p style="color: var(--primary-color); font-weight: bold; font-size: 1.2rem;">R$ ${Number(product.price).toFixed(2)}</p>
                <p style="font-size:0.8rem; color:#666;">Disponível: ${product.quantity}</p>
                
                <div style="margin-top: 12px; display: ${isEsgotado ? 'none' : 'flex'}; gap: 8px;">
                    <input type="number" id="qty-${productId}" value="1" min="1" max="${product.quantity}" 
                           style="width: 45px; padding: 5px; border: 1px solid #ccc; border-radius: 4px;">
                    <button class="btn" onclick="orderProduct('${productId}')" style="flex:1; padding: 8px;">Reservar</button>
                </div>
            `;

            if (product.category === 'salgados') {
                containerSalgados.appendChild(card);
            } else {
                containerDoces.appendChild(card);
            }
        });
    }, error => {
        console.error("Erro no Snapshot do Firestore:", error);
        containerSalgados.innerHTML = "<p>Erro ao carregar produtos. Verifique as regras do Firebase.</p>";
    });
}

function logout() {
    auth.signOut().then(() => {
        window.location.href = 'login.html';
    });
}