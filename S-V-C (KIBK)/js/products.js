let currentUser = null;

auth.onAuthStateChanged(user => {
    if (user) {
        currentUser = user;
        loadMyProducts();
    } else {
        window.location.href = 'login.html';
    }
});

async function saveProduct() {
    const id = document.getElementById('product-id').value;
    const productData = {
        name: document.getElementById('p-name').value,
        price: parseFloat(document.getElementById('p-price').value),
        quantity: parseInt(document.getElementById('p-qty').value),
        category: document.getElementById('p-category').value,
        imageUrl: document.getElementById('p-img').value,
        sellerId: currentUser.uid, // Vincula ao vendedor atual
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        if (id) {
            await db.collection('products').doc(id).update(productData);
            alert("Produto atualizado!");
        } else {
            await db.collection('products').add(productData);
            alert("Produto cadastrado!");
        }
        clearForm();
        loadMyProducts();
    } catch (error) {
        alert("Erro ao salvar: " + error.message);
    }
}

function loadMyProducts() {
    const list = document.getElementById('my-products-list');
    
    // Busca apenas produtos onde sellerId == ID do usuário logado
    db.collection('products').where("sellerId", "==", currentUser.uid)
    .onSnapshot(snapshot => {
        list.innerHTML = "";
        snapshot.forEach(doc => {
            const p = doc.data();
            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                <img src="${p.imageUrl}" style="width:100%; height:100px; object-fit:cover;">
                <h4>${p.name}</h4>
                <p>R$ ${p.price.toFixed(2)} | Qtd: ${p.quantity}</p>
                <button onclick="editProduct('${doc.id}', '${p.name}', ${p.price}, ${p.quantity}, '${p.category}', '${p.imageUrl}')" style="background:#2196F3; color:white; border:none; padding:5px; cursor:pointer;">Editar</button>
                <button onclick="deleteProduct('${doc.id}')" style="background:#f44336; color:white; border:none; padding:5px; cursor:pointer;">Excluir</button>
            `;
            list.appendChild(card);
        });
    });
}

function editProduct(id, name, price, qty, cat, img) {
    document.getElementById('product-id').value = id;
    document.getElementById('p-name').value = name;
    document.getElementById('p-price').value = price;
    document.getElementById('p-qty').value = qty;
    document.getElementById('p-category').value = cat;
    document.getElementById('p-img').value = img;
    document.getElementById('form-title').innerText = "Editando: " + name;
}

async function deleteProduct(id) {
    if (confirm("Tem certeza que deseja excluir este produto?")) {
        await db.collection('products').doc(id).delete();
    }
}

function clearForm() {
    document.getElementById('product-id').value = "";
    document.getElementById('p-name').value = "";
    document.getElementById('p-price').value = "";
    document.getElementById('p-qty').value = "";
    document.getElementById('form-title').innerText = "Adicionar Novo Produto";
}

async function updateSellingDays() {
    const selectedDays = Array.from(document.querySelectorAll('.days:checked')).map(cb => cb.value);
    try {
        await db.collection('vendors').doc(currentUser.uid).update({
            sellingDays: selectedDays
        });
        alert("Dias de venda atualizados com sucesso!");
    } catch (e) {
        alert("Erro: " + e.message);
    }
}

async function orderProduct(productId) {
    const qtyInput = document.getElementById(`qty-${productId}`);
    const chosenQty = parseInt(qtyInput.value);

    // 1. Pega os dados do comprador
    const userDoc = await db.collection('users').doc(auth.currentUser.uid).get();
    const buyerData = userDoc.data();

    // 2. Pega os dados atuais do produto
    const productDoc = await db.collection('products').doc(productId).get();
    const product = productDoc.data();

    // Validações básicas
    if (chosenQty > product.quantity) {
        alert(`Ops! Só temos ${product.quantity} unidades disponíveis.`);
        return;
    }
    if (chosenQty <= 0 || isNaN(chosenQty)) {
        alert("Escolha uma quantidade válida!");
        return;
    }

    const totalPreco = product.price * chosenQty;
    const confirmacao = confirm(`Deseja reservar ${chosenQty}x ${product.name} por R$ ${totalPreco.toFixed(2)}?`);
    
    if (confirmacao) {
        try {
            // Atualiza o estoque no Firebase (Subtrai a quantidade)
            await db.collection('products').doc(productId).update({
                quantity: product.quantity - chosenQty
            });

            // Registra o pedido
            await db.collection('orders').add({
                buyerId: auth.currentUser.uid,
                buyerName: buyerData.name,
                buyerWhatsapp: buyerData.whatsapp,
                sellerId: product.sellerId,
                productName: product.name,
                quantity: chosenQty,
                totalPrice: totalPreco,
                status: "pendente",
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Notifica via WhatsApp
            const sellerDoc = await db.collection('users').doc(product.sellerId).get();
            const sellerData = sellerDoc.data();
            const mensagem = `Olá! Sou *${buyerData.name}*. Reservei *${chosenQty}x ${product.name}* (Total: R$ ${totalPreco.toFixed(2)}) pelo site!`;
            const linkWhatsapp = `https://wa.me/55${sellerData.whatsapp.replace(/\D/g,'')}?text=${encodeURIComponent(mensagem)}`;
            
            window.open(linkWhatsapp, '_blank');

        } catch (error) {
            alert("Erro: " + error.message);
        }
    }
}