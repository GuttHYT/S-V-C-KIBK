let currentUser = null;
let currentEditingSellerId = null;

auth.onAuthStateChanged(user => {
    if (user) {
        currentUser = user;
        // Buscamos os dados do usuário para verificar se é Admin
        db.collection('users').doc(user.uid).get().then(doc => {
            const userData = doc.data();
            loadMyProducts(userData.isAdmin); // Passa se é admin ou não para a função
        });
    } else {
        window.location.href = 'login.html';
    }
});

function loadMyProducts(isAdmin) {
    const list = document.getElementById('my-products-list');
    if (!list) return;

    let query = db.collection('products');

    // REGRA DE OURO: Se NÃO for admin, filtra pelo ID do usuário. 
    // Se FOR admin, não adiciona o .where() e traz tudo.
    if (!isAdmin) {
        query = query.where('sellerId', '==', currentUser.uid);
    }

    query.onSnapshot(snapshot => {
        list.innerHTML = "";
        if (snapshot.empty) {
            list.innerHTML = '<p style="text-align:center; width:100%;">Nenhum produto encontrado.</p>';
            return;
        }

        snapshot.forEach(doc => {
            const p = doc.data();
            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                <img src="${p.imageUrl || 'assets/default-food.png'}" style="width:100%; height:150px; object-fit:cover; border-radius:8px;">
                <h3 style="margin-top:10px;">${p.name}</h3>
                <p>Estoque: <strong>${p.quantity}</strong> | R$ ${Number(p.price).toFixed(2)}</p>
                <p style="font-size:0.7rem; color:#999;">Vendedor ID: ${p.sellerId || 'Desconhecido'}</p>
                <div style="margin-top:10px; display: flex; gap: 5px;">
                    <button class="btn" style="padding:5px 10px; background:#2196F3; flex:1;" 
                        onclick="editProduct('${doc.id}', '${p.name}', ${p.price}, ${p.quantity}, '${p.category}', '${p.imageUrl}', '${p.sellerId}')">
                        Editar
                    </button>
                    <button class="btn" style="padding:5px 10px; background:#f44336; flex:1;" 
                        onclick="deleteProduct('${doc.id}')">
                        Excluir
                    </button>
                </div>
            `;
            list.appendChild(card);
        });
    });
}

function editProduct(id, name, price, qty, cat, img, sId) {
    document.getElementById('product-id').value = id;
    document.getElementById('p-name').value = name;
    document.getElementById('p-price').value = price;
    document.getElementById('p-qty').value = qty;
    document.getElementById('p-category').value = cat;
    document.getElementById('p-img').value = img;
    
    // Importante: Guardamos quem é o dono original do produto
    currentEditingSellerId = sId; 
    document.getElementById('form-title').innerText = "Editando: " + name;
    window.scrollTo(0,0);
}

// Variável global para evitar cliques múltiplos rápidos
let isSaving = false;

async function saveProduct() {
    if (isSaving) return;

    const id = document.getElementById('product-id').value;
    const name = document.getElementById('p-name').value;
    const price = document.getElementById('p-price').value;
    const qty = document.getElementById('p-qty').value;
    const category = document.getElementById('p-category').value;
    
    // 1. Captura o input de arquivo e o campo de texto do link
    const fileInput = document.getElementById('p-file');
    const urlInput = document.getElementById('p-img');

    // 2. Define a URL inicial (pega o que está no campo de texto)
    // Usamos || "" para garantir que se estiver vazio, vire uma string vazia e não undefined
    let finalImageUrl = urlInput ? urlInput.value.trim() : "";

    if (!name || !price || !qty) return alert("Preencha os campos obrigatórios!");

    try {
        isSaving = true;

        // 3. PRIORIDADE: Se o usuário selecionou um arquivo novo, faz o upload
        if (fileInput && fileInput.files.length > 0) {
            console.log("Fazendo upload do arquivo...");
            const uploadedUrl = await uploadFile(fileInput.files[0], 'products');
            if (uploadedUrl) {
                finalImageUrl = uploadedUrl;
            }
        }

        // 4. Verificação de segurança: se após tudo ainda estiver vazio
        if (!finalImageUrl || finalImageUrl === "undefined") {
            return alert("Por favor, insira um link de imagem ou faça upload de um arquivo.");
        }

        const productData = {
            name: name,
            price: parseFloat(price),
            quantity: parseInt(qty),
            category: category,
            img: finalImageUrl, // Aqui salvamos a URL final validada
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        if (id) {
            productData.sellerId = currentEditingSellerId || currentUser.uid;
            await db.collection('products').doc(id).update(productData);
            alert("Produto atualizado!");
        } else {
            productData.sellerId = currentUser.uid;
            productData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            await db.collection('products').add(productData);
            alert("Produto cadastrado!");
        }

        clearForm();
    } catch (e) {
        console.error("Erro detalhado:", e);
        alert("Erro ao salvar: " + e.message);
    } finally {
        isSaving = false;
    }
}

async function deleteProduct(id) {
    if (confirm("Deseja excluir este produto?")) {
        await db.collection('products').doc(id).delete();
    }
}

function clearForm() {
    document.getElementById('product-id').value = "";
    document.getElementById('p-name').value = "";
    document.getElementById('p-price').value = "";
    document.getElementById('p-qty').value = "";
    document.getElementById('p-img').value = "";
    document.getElementById('form-title').innerText = "Adicionar Novo Produto";
    currentEditingSellerId = null;
}

// CARREGAR FAVICON NA PÁGINA ATUAL
db.collection('settings').doc('global').onSnapshot(doc => {
    if (doc.exists) {
        const s = doc.data();
        
        // Muda o título da aba
        if (s.siteName) document.title = s.siteName;
        
        // Muda o Favicon
        if (s.favicon) {
            let link = document.querySelector("link[rel~='icon']");
            if (!link) {
                link = document.createElement('link');
                link.rel = 'icon';
                document.head.appendChild(link);
            }
            link.href = s.favicon;
        }

        // Aplica a cor global (isso altera a variável CSS --primary-color se você a usar)
        if (s.themeColor) {
            document.documentElement.style.setProperty('--primary-color', s.themeColor);
            // Se o header tiver cor fixa no CSS, você pode forçar aqui:
            const header = document.querySelector('header');
            if(header) header.style.background = s.themeColor;
        }
    }
});

function clearProductImage() {
    document.getElementById('p-img').value = "";   // Limpa o link
    document.getElementById('p-file').value = "";  // Limpa o arquivo selecionado
    document.getElementById('img-status').innerText = "Imagem removida (salve para aplicar)";
    document.getElementById('img-status').style.color = "red";
}