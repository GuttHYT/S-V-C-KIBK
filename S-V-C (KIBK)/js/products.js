let currentUser = null;
let currentEditingSellerId = null;

auth.onAuthStateChanged(user => {
    if (user) {
        currentUser = user;
        loadMyProducts();
    } else {
        window.location.href = 'login.html';
    }
});

function editProduct(id, name, price, qty, cat, img, sId) {
    document.getElementById('product-id').value = id;
    document.getElementById('p-name').value = name;
    document.getElementById('p-price').value = price;
    document.getElementById('p-qty').value = qty;
    document.getElementById('p-category').value = cat;
    document.getElementById('p-img').value = img;
    
    currentEditingSellerId = sId; 
    document.getElementById('form-title').innerText = "Editando: " + name;
}

async function saveProduct() {
    const id = document.getElementById('product-id').value;
    const name = document.getElementById('p-name').value;
    const price = document.getElementById('p-price').value;
    const qty = document.getElementById('p-qty').value;
    const category = document.getElementById('p-category').value;
    const fileInput = document.getElementById('p-file');
    const urlInput = document.getElementById('p-img').value;
    const statusLabel = document.getElementById('upload-status');

    if (!name || !price || !qty) {
        alert("Preencha o nome, preço e quantidade!");
        return;
    }

    let finalImageUrl = urlInput;

    try {
        if (fileInput && fileInput.files.length > 0) {
            if(statusLabel) statusLabel.innerText = "Subindo imagem...";
            const file = fileInput.files[0];
            const storageRef = firebase.storage().ref(`products/${Date.now()}_${file.name}`);
            const snapshot = await storageRef.put(file);
            finalImageUrl = await snapshot.ref.getDownloadURL();
        }

        const productData = {
            name: name,
            price: parseFloat(price),
            quantity: parseInt(qty),
            category: category,
            imageUrl: finalImageUrl || "",
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        if (!id) {
            productData.sellerId = currentUser.uid;
            await db.collection('products').add(productData);
        } else {
            productData.sellerId = currentEditingSellerId || currentUser.uid;
            await db.collection('products').doc(id).update(productData);
        }

        alert("Sucesso! Produto salvo.");
        clearForm();
        if(fileInput) fileInput.value = "";
    } catch (error) {
        alert("Erro técnico: " + error.message);
    }
}

async function loadMyProducts() {
    const list = document.getElementById('my-products-list');
    if(!list) return;

    const userDoc = await db.collection('users').doc(currentUser.uid).get();
    const userData = userDoc.data();
    let query = db.collection('products');

    if (!userData.isAdmin) {
        query = query.where("sellerId", "==", currentUser.uid);
    }

    query.onSnapshot(snapshot => {
        list.innerHTML = "";
        snapshot.forEach(doc => {
            const p = doc.data();
            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                <img src="${p.imageUrl || 'https://via.placeholder.com/150'}" style="width:100%; height:100px; object-fit:cover; border-radius:5px;">
                <h4>${p.name}</h4>
                <p>Estoque: ${p.quantity} | R$ ${p.price.toFixed(2)}</p>
                <div style="margin-top:10px;">
                    <button class="btn" style="padding:5px 10px; background:#2196F3;" onclick="editProduct('${doc.id}', '${p.name}', ${p.price}, ${p.quantity}, '${p.category}', '${p.imageUrl}', '${p.sellerId}')">Editar</button>
                    <button class="btn" style="padding:5px 10px; background:#f44336;" onclick="deleteProduct('${doc.id}')">Excluir</button>
                </div>
            `;
            list.appendChild(card);
        });
    });
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
    const statusLabel = document.getElementById('upload-status');
    if(statusLabel) statusLabel.innerText = "";
}

async function updateSellingDays() {
    const selectedDays = Array.from(document.querySelectorAll('.days:checked')).map(cb => cb.value);
    await db.collection('vendors').doc(currentUser.uid).set({ sellingDays: selectedDays }, { merge: true });
    alert("Dias atualizados!");
}