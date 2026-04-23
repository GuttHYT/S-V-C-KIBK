// Verifica login
auth.onAuthStateChanged(user => {
    if (user) {
        checkUserRole(user.uid);
        loadProducts();
    } else {
        window.location.href = 'login.html';
    }
});

async function checkUserRole(uid) {
    const userDoc = await db.collection('users').doc(uid).get();
    if (userDoc.exists) {
        const userData = userDoc.data();
        document.getElementById('user-info').innerText = `Olá, ${userData.name}!`;
        if (userData.role === 'seller' || userData.isAdmin) {
            document.getElementById('seller-links').style.display = 'inline';
        }
    }
}

async function loadProducts() {
    const productsContainerSalgados = document.getElementById('category-salgados');
    const productsContainerDoces = document.getElementById('category-doces');

    console.log("Iniciando carregamento de produtos...");

    // 1. Primeiro pegamos os vendedores para ter os nomes e dias de venda
    const vendorsSnap = await db.collection('vendors').get();
    const vendorsData = {};
    vendorsSnap.forEach(doc => {
        vendorsData[doc.id] = doc.data();
    });

    // 2. Escuta os produtos em tempo real
    db.collection('products').onSnapshot(snapshot => {
        console.log("Snapshot recebido! Total de produtos:", snapshot.size);
        
        productsContainerSalgados.innerHTML = "";
        productsContainerDoces.innerHTML = "";

        if (snapshot.empty) {
            productsContainerSalgados.innerHTML = "<p>Nenhum produto cadastrado ainda.</p>";
            return;
        }

        snapshot.forEach(doc => {
            const product = doc.data();
            const productId = doc.id;
            const sellerInfo = vendorsData[product.sellerId] || { sellerName: "Vendedor" };
            
            const isEsgotado = product.quantity <= 0;

            // Lógica dos dias (Karina)
            let daysHtml = "";
            if (sellerInfo.sellingDays && sellerInfo.sellingDays.length > 0) {
                daysHtml = `<p style="color: #d32f2f; font-size: 0.75rem; font-weight: bold; margin-bottom:5px;">📅 Vendas: ${sellerInfo.sellingDays.join(', ')}</p>`;
            }

            const card = document.createElement('div');
            card.className = 'card';
            card.style.position = "relative";
            
            card.innerHTML = `
                <img src="${product.imageUrl || 'https://via.placeholder.com/150'}" style="width:100%; height:120px; object-fit:cover; border-radius:8px; filter: ${isEsgotado ? 'grayscale(1)' : 'none'};">
                <h3 style="font-size: 1.1rem; margin: 10px 0 5px 0;">${product.name}</h3>
                <p style="color: #666; font-size: 0.8rem; margin-bottom: 5px;">De: ${sellerInfo.sellerName}</p>
                ${daysHtml}
                <p style="font-weight: bold; color: #2E7D32; font-size: 1.1rem;">R$ ${product.price.toFixed(2)}</p>
                <p style="font-size: 0.85rem; margin: 5px 0; color: ${isEsgotado ? 'red' : '#333'}">
                    ${isEsgotado ? '<strong>ESGOTADO</strong>' : 'Estoque: ' + product.quantity}
                </p>

                <div style="margin-top: 10px; display: ${isEsgotado ? 'none' : 'flex'}; gap: 5px; align-items: center;">
                    <input type="number" id="qty-${productId}" value="1" min="1" max="${product.quantity}" 
                           style="width: 45px; padding: 5px; border: 1px solid #ccc; border-radius: 4px;">
                    <button class="btn" onclick="orderProduct('${productId}')" style="flex: 1; padding: 8px; font-size: 0.8rem;">Reservar</button>
                </div>
            `;

            if (product.category === 'salgados') {
                productsContainerSalgados.appendChild(card);
            } else {
                productsContainerDoces.appendChild(card);
            }
        });
    }, error => {
        console.error("Erro no Snapshot:", error);
        alert("Erro ao carregar produtos. Verifique as regras do Database.");
    });
}

async function orderProduct(productId) {
    const qtyInput = document.getElementById(`qty-${productId}`);
    const chosenQty = parseInt(qtyInput.value);

    try {
        const userDoc = await db.collection('users').doc(auth.currentUser.uid).get();
        const buyerData = userDoc.data();

        const productDoc = await db.collection('products').doc(productId).get();
        const product = productDoc.data();

        if (chosenQty > product.quantity || isNaN(chosenQty) || chosenQty <= 0) {
            alert("Quantidade inválida ou acima do estoque!");
            return;
        }

        const total = product.price * chosenQty;
        if (confirm(`Confirmar ${chosenQty}x ${product.name}?\nTotal: R$ ${total.toFixed(2)}`)) {
            
            // Subtrai estoque
            await db.collection('products').doc(productId).update({
                quantity: product.quantity - chosenQty
            });

            // Salva pedido
            await db.collection('orders').add({
                buyerId: auth.currentUser.uid,
                buyerName: buyerData.name,
                buyerWhatsapp: buyerData.whatsapp,
                sellerId: product.sellerId,
                productName: product.name,
                quantity: chosenQty,
                totalPrice: total,
                status: "pendente",
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Notifica Zap
            const sellerDoc = await db.collection('users').doc(product.sellerId).get();
            const sellerData = sellerDoc.data();
            const msg = `Oi! Sou ${buyerData.name}. Reservei ${chosenQty}x ${product.name} pelo site!`;
            const link = `https://wa.me/55${sellerData.whatsapp.replace(/\D/g,'')}?text=${encodeURIComponent(msg)}`;
            
            window.open(link, '_blank');
        }
    } catch (e) {
        alert("Erro: " + e.message);
    }
}

function logout() {
    auth.signOut().then(() => window.location.href = 'login.html');
}