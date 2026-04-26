// Verifica login e permissões
auth.onAuthStateChanged(user => {
    if (user) {
        // USUÁRIO LOGADO
        console.log("Logado como:", user.email);
        
        // Se ele estiver na página de login ou index, manda para o dashboard
        const paginasDeAcesso = ['login.html', 'index.html', 'cadastro.html'];
        const pathAtual = window.location.pathname;
        
        if (paginasDeAcesso.some(pagina => pathAtual.includes(pagina))) {
            window.location.href = 'dashboard.html';
        }

        // Continua o carregamento normal das funções
        if (typeof checkUserRole === "function") checkUserRole(user.uid);
        if (typeof loadProducts === "function") loadProducts();
        
    } else {
        // USUÁRIO NÃO LOGADO
        console.warn("Nenhum usuário detectado. Redirecionando...");

        // Verificamos se ele JÁ NÃO ESTÁ na página de login para não criar um loop infinito
        const pathAtual = window.location.pathname;
        if (!pathAtual.includes('login.html') && !pathAtual.includes('index.html')) {
            window.location.href = 'login.html';
        }
    }
});

async function checkUserRole(uid) {
    try {
        const userDoc = await db.collection('users').doc(uid).get();
        if (userDoc.exists) {
            const userData = userDoc.data();
            
            // Exibe saudação
            const userInfoElem = document.getElementById('user-info');
            if (userInfoElem) userInfoElem.innerText = `Olá, ${userData.name}!`;
            
            // 1. Controle do link de Vendedor e Notificações
            const sellerLinks = document.getElementById('seller-links');
            const bell = document.getElementById('noti-bell');

            if (userData.role === 'seller' || userData.isAdmin === true) {
                if (sellerLinks) sellerLinks.style.display = 'inline';
                if (bell) bell.style.display = 'block';
            }

            // 2. Controle EXCLUSIVO do link de Admin
            const adminLink = document.getElementById('admin-link');
            if (userData.isAdmin === true) {
                if (adminLink) {
                    adminLink.style.setProperty('display', 'inline', 'important');
                    console.log("Usuário é Admin. Mostrando painel...");
                }
            } else {
                if (adminLink) adminLink.style.display = 'none';
            }
        }
    } catch (e) {
        console.error("Erro ao verificar papel do usuário:", e);
    }
}

async function loadProducts() {
    const containerSalgados = document.getElementById('category-salgados');
    const containerDoces = document.getElementById('category-doces');

    const vendorsData = {};
    const vendorsSnap = await db.collection('users').get();
    vendorsSnap.forEach(vDoc => {
        vendorsData[vDoc.id] = vDoc.data();
    });

    if (!containerSalgados || !containerDoces) return;
    

    // Listener em tempo real para os produtos
    db.collection('products').onSnapshot(async (snapshot) => {
        containerSalgados.innerHTML = "";
        containerDoces.innerHTML = "";

        // Buscamos todos os vendedores para validar o PIX
        const vendorsSnap = await db.collection('users').where('role', '==', 'seller').get();
        const vendorsPix = {};
        vendorsSnap.forEach(v => vendorsPix[v.id] = v.data().pixKey);

        snapshot.forEach(doc => {
            const product = doc.data();
            const productId = doc.id;
            const isEsgotado = product.quantity <= 0;

            // Buscamos o nome do vendedor no objeto de vendedores que carregamos no início da função
            // Se não encontrar (vendedor deletado, por exemplo), mostra "Vendedor Desconhecido"
            const nomeVendedor = vendorsData[product.sellerId] ? vendorsData[product.sellerId].name : "Vendedor Desconhecido";

            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                <div style="position:relative;">
                    <img src="${product.imageUrl || 'assets/default-food.png'}" style="width:100%; border-radius:8px;">
                    ${isEsgotado ? '<span style="position:absolute; top:10px; left:10px; background:rgba(255,0,0,0.8); color:white; padding:5px; border-radius:5px; font-weight:bold;">ESGOTADO</span>' : ''}
                </div>
                
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
                    <h3 style="margin:0;">${product.name}</h3>
                    <span style="font-size: 0.7rem; background: #f0f0f0; padding: 2px 6px; border-radius: 10px; color: #666;">
                        👤 ${nomeVendedor}
                    </span>
                </div>

                <p style="font-size:0.9rem; color:#666; margin-top: 5px;">Disponível: <strong>${product.quantity}</strong></p>
                <p style="color: var(--primary-color); font-weight: bold; font-size:1.1rem;">R$ ${Number(product.price).toFixed(2)}</p>
                
                <div style="margin-top: 12px; display: ${isEsgotado ? 'none' : 'flex'}; flex-direction: column; gap: 8px;">
                    <div style="display: flex; gap: 5px;">
                        <input type="number" id="qty-${productId}" value="1" min="1" max="${product.quantity}" style="width: 50px; padding: 5px; border-radius:4px; border:1px solid #ccc;">
                        <button class="btn" onclick="orderProduct('${productId}', 'encomenda')" style="flex:1; background: #666; font-size: 0.8rem;">
                            Pagar na Entrega
                        </button>
                    </div>

                    <button class="btn" onclick="orderProduct('${productId}', 'pagamento')" style="background: #2E7D32; font-size: 0.8rem;">
                        💳 Pagar Agora (Pix)
                    </button>
                </div>
            `;

            if (product.category === 'salgados') containerSalgados.appendChild(card);
            else containerDoces.appendChild(card);
        });
    });
}

function logout() {
    auth.signOut().then(() => {
        window.location.href = 'login.html';
    }).catch((error) => {
        console.error("Erro ao sair:", error);
    });
}

async function orderProduct(productId, tipo) {
    const user = auth.currentUser;
    if (!user) return alert("Faça login para realizar o pedido!");

    const qtyInput = document.getElementById(`qty-${productId}`);
    const chosenQty = parseInt(qtyInput.value);

    try {
        // 1. BUSCAR O NOME REAL DO COMPRADOR (Uma única vez)
        const userDoc = await db.collection('users').doc(user.uid).get();
        const userDataComprador = userDoc.data();
        const nomeRealDoComprador = userDataComprador.name || "Cliente";

        // 2. BUSCAR DADOS DO PRODUTO
        const productRef = db.collection('products').doc(productId);
        const productDoc = await productRef.get();
        const product = productDoc.data();
        
        if (product.quantity < chosenQty) return alert("Estoque insuficiente!");

        // 3. BUSCAR DADOS DO VENDEDOR
        const sellerDoc = await db.collection('users').doc(product.sellerId).get();
        const sellerData = sellerDoc.data();

        // 4. CRIAR O PEDIDO NO BANCO (Aqui salvamos o buyerName corretamente)
        await db.collection('orders').add({
            buyerId: user.uid,
            buyerName: nomeRealDoComprador, 
            productName: product.name,
            quantity: chosenQty,
            sellerId: product.sellerId,
            tipo: tipo, 
            status: "pendente",
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // 5. ATUALIZAR ESTOQUE
        await productRef.update({
            quantity: product.quantity - chosenQty
        });

        // 6. FEEDBACK E WHATSAPP
        if (tipo === 'pagamento') {
            const pix = sellerData.pixKey || "Chave não cadastrada.";
            alert(`Sucesso! Chave Pix copiada (simbolicamente): ${pix}`);
        } else {
            alert("Encomenda realizada!");
        }

        const msg = `Olá! Meu nome é ${nomeRealDoComprador}. Acabei de fazer um pedido de ${chosenQty}x ${product.name}. Tipo: ${tipo === 'pagamento' ? 'Pagar via Pix' : 'Pagar na Entrega'}.`;
        window.open(`https://wa.me/${sellerData.whatsapp}?text=${encodeURIComponent(msg)}`);

    } catch (error) {
        console.error("Erro no pedido:", error);
        alert("Erro ao processar pedido.");
    }
}

// Unificando os Listeners de Configurações Globais
db.collection('settings').doc('global').onSnapshot(doc => {
    if (doc.exists) {
        const s = doc.data();
        if (s.siteName) document.title = s.siteName;
        if (s.favicon) {
            let link = document.querySelector("link[rel~='icon']") || document.createElement('link');
            link.rel = 'icon';
            link.href = s.favicon;
            document.head.appendChild(link);
        }
        if (s.themeColor) {
            document.documentElement.style.setProperty('--primary-color', s.themeColor);
            const header = document.querySelector('header');
            if(header) header.style.background = s.themeColor;
        }
        const alertBox = document.getElementById('global-alert');
        const alertText = document.getElementById('alert-text');
        if (alertBox && alertText) {
            if (s.topAlert && s.topAlert.trim() !== "") {
                alertBox.style.display = 'block';
                alertText.innerText = s.topAlert;
            } else {
                alertBox.style.display = 'none';
            }
        }
    }
});

window.uploadFile = async function(file, folder) {
    if (!file) return null;
    try {
        const storageRef = firebase.storage().ref();
        const fileRef = storageRef.child(`${folder}/${Date.now()}_${file.name}`);
        await fileRef.put(file);
        return await fileRef.getDownloadURL();
    } catch (error) {
        console.error("Erro no Upload:", error);
        throw error;
    }
};

async function uploadFile(file, folder) {
    if (!file) return null;
    const storageRef = firebase.storage().ref();
    const fileRef = storageRef.child(`${folder}/${Date.now()}_${file.name}`);
    
    await fileRef.put(file);
    return await fileRef.getDownloadURL();
}
