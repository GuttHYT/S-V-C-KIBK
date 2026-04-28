// Verifica login e permissões
auth.onAuthStateChanged(user => {
    if (user) {
        // 1. Verifica as permissões (Admin/Vendedor) e mostra os links
        checkUserRole(user.uid);
        
        // 2. CARREGA OS PRODUTOS
        loadProducts(); 
        
    } else {
        // Se não estiver logado, vai para o login
        window.location.href = 'login.html';
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

    if (!containerSalgados || !containerDoces) return;
    
    // Carregar dados dos vendedores
    const vendorsData = {};
    const vendorsSnap = await db.collection('users').get();
    vendorsSnap.forEach(vDoc => {
        vendorsData[vDoc.id] = vDoc.data();
    });
    
    // Listener em tempo real para os produtos
    db.collection('products').onSnapshot(async (snapshot) => {
        containerSalgados.innerHTML = "";
        containerDoces.innerHTML = "";
        
        // Carregar todas as avaliações do usuário atual
        const userId = auth.currentUser ? auth.currentUser.uid : null;
        const userRatings = {};
        
        if (userId) {
            const ratingsSnap = await db.collection('ratings')
                .where('userId', '==', userId)
                .get();
            
            ratingsSnap.forEach(doc => {
                const rating = doc.data();
                userRatings[rating.productId] = {
                    ratingId: doc.id,
                    stars: rating.stars
                };
            });
        }
        
        // Calcular média de estrelas para cada produto
        const productRatings = {};
        const allRatingsSnap = await db.collection('ratings').get();
        
        allRatingsSnap.forEach(doc => {
            const rating = doc.data();
            if (!productRatings[rating.productId]) {
                productRatings[rating.productId] = {
                    totalStars: 0,
                    count: 0
                };
            }
            productRatings[rating.productId].totalStars += rating.stars;
            productRatings[rating.productId].count++;
        });
        
        snapshot.forEach(doc => {
            const product = doc.data();
            const productId = doc.id;
            const isEsgotado = product.quantity <= 0;
            
            // Buscar o nome do vendedor
            const nomeVendedor = vendorsData[product.sellerId] ? vendorsData[product.sellerId].name : "Vendedor Desconhecido";
            
            // Calcular média de avaliações
            const ratingData = productRatings[productId] || { totalStars: 0, count: 0 };
            const avgRating = ratingData.count > 0 ? (ratingData.totalStars / ratingData.count) : 0;
            const userRating = userRatings[productId] || null;
            
            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                <div style="position:relative;">
                    <img src="${product.imageUrl || 'assets/default-food.png'}" style="width:100%; border-radius:8px; height:150px; object-fit:cover;">
                    ${isEsgotado ? '<span style="position:absolute; top:10px; left:10px; background:rgba(255,0,0,0.8); color:white; padding:5px; border-radius:5px; font-weight:bold;">ESGOTADO</span>' : ''}
                </div>
                
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
                    <h3 style="margin:0;">${product.name}</h3>
                    <span style="font-size: 0.7rem; background: #f0f0f0; padding: 2px 6px; border-radius: 10px; color: #666;">
                        👤 ${nomeVendedor}
                    </span>
                </div>
                
                <!-- Sistema de Avaliação -->
                <div style="margin-top: 10px; padding: 10px; background: #f9f9f9; border-radius: 8px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div class="star-rating" data-product-id="${productId}">
                            ${generateStars(avgRating, userRating ? userRating.stars : 0)}
                        </div>
                        <span style="font-size: 0.8rem; color: #666;">
                            ${avgRating > 0 ? avgRating.toFixed(1) : '0.0'} (${ratingData.count} ${ratingData.count === 1 ? 'avaliação' : 'avaliações'})
                        </span>
                    </div>
                    ${userId ? `
                        <div style="margin-top: 8px;">
                            <p style="font-size: 0.75rem; color: #666; margin-bottom: 5px;">
                                ${userRating ? 'Sua avaliação (clique para alterar):' : 'Sua avaliação:'}
                            </p>
                            <div style="display: flex; gap: 2px;">
                                ${[1,2,3,4,5].map(star => `
                                    <span onclick="rateProduct('${productId}', ${star})" 
                                          style="cursor: pointer; font-size: 1.5rem; transition: 0.2s;"
                                          onmouseover="highlightStars('${productId}', ${star})"
                                          onmouseout="resetStars('${productId}')"
                                          class="star-${productId}"
                                          data-star="${star}">
                                        ${star <= (userRating ? userRating.stars : 0) ? '⭐' : '☆'}
                                    </span>
                                `).join('')}
                            </div>
                        </div>
                    ` : '<p style="font-size: 0.75rem; color: #999; margin-top: 5px;">Faça login para avaliar</p>'}
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
                
                <button onclick="window.location.href='profile.html?uid=${product.sellerId}'" 
                        style="margin-top: 10px; background: #2196F3; color: white; border: none; padding: 5px 10px; border-radius: 5px; cursor: pointer; width: 100%;">
                    Ver Perfil do Vendedor
                </button>
            `;

            if (product.category === 'salgados') containerSalgados.appendChild(card);
            else containerDoces.appendChild(card);
        });
    });
}

// Função para gerar estrelas de exibição
function generateStars(average, userStars) {
    const fullStars = Math.floor(average);
    const halfStar = average - fullStars >= 0.5;
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
    
    let starsHtml = '';
    for (let i = 0; i < fullStars; i++) starsHtml += '⭐';
    if (halfStar) starsHtml += '✨'; // Meia estrela
    for (let i = 0; i < emptyStars; i++) starsHtml += '☆';
    
    return starsHtml;
}

// Funções para o sistema de avaliação
async function rateProduct(productId, stars) {
    const user = auth.currentUser;
    if (!user) {
        alert("Faça login para avaliar produtos!");
        return;
    }
    
    try {
        // Verifica se já existe uma avaliação deste usuário para este produto
        const existingRating = await db.collection('ratings')
            .where('userId', '==', user.uid)
            .where('productId', '==', productId)
            .get();
        
        if (existingRating.empty) {
            // Nova avaliação
            await db.collection('ratings').add({
                userId: user.uid,
                productId: productId,
                stars: stars,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log("Avaliação criada com sucesso!");
        } else {
            // Atualizar avaliação existente
            const ratingDoc = existingRating.docs[0];
            await db.collection('ratings').doc(ratingDoc.id).update({
                stars: stars,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log("Avaliação atualizada com sucesso!");
        }
        
        // Atualiza a média no perfil do vendedor
        await updateSellerRating(productId);
        
    } catch (error) {
        console.error("Erro ao avaliar:", error);
        alert("Erro ao salvar avaliação: " + error.message);
    }
}

// Função para atualizar a média do vendedor
async function updateSellerRating(productId) {
    try {
        // Busca o produto para saber o vendedor
        const productDoc = await db.collection('products').doc(productId).get();
        if (!productDoc.exists) return;
        
        const sellerId = productDoc.data().sellerId;
        
        // Busca todos os produtos do vendedor
        const productsSnap = await db.collection('products')
            .where('sellerId', '==', sellerId)
            .get();
        
        let totalStars = 0;
        let totalRatings = 0;
        
        // Para cada produto, busca suas avaliações
        for (const prodDoc of productsSnap.docs) {
            const ratingsSnap = await db.collection('ratings')
                .where('productId', '==', prodDoc.id)
                .get();
            
            ratingsSnap.forEach(ratingDoc => {
                totalStars += ratingDoc.data().stars;
                totalRatings++;
            });
        }
        
        // Calcula a média
        const averageRating = totalRatings > 0 ? (totalStars / totalRatings) : 0;
        
        // Atualiza no perfil do vendedor
        await db.collection('users').doc(sellerId).update({
            sellerRating: averageRating,
            totalRatings: totalRatings,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
    } catch (error) {
        console.error("Erro ao atualizar rating do vendedor:", error);
    }
}

// Efeitos visuais para as estrelas
function highlightStars(productId, stars) {
    const starElements = document.querySelectorAll(`.star-${productId}`);
    starElements.forEach(element => {
        const starNum = parseInt(element.getAttribute('data-star'));
        if (starNum <= stars) {
            element.textContent = '⭐';
            element.style.transform = 'scale(1.2)';
        } else {
            element.textContent = '☆';
            element.style.transform = 'scale(1)';
        }
    });
}

function resetStars(productId) {
    const starElements = document.querySelectorAll(`.star-${productId}`);
    // Recarrega a página para resetar (temporário)
    // Em uma versão mais avançada, você pode armazenar o estado original
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
        // 1. BUSCAR O NOME REAL DO COMPRADOR
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

        // 4. CRIAR O PEDIDO NO BANCO
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