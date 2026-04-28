let currentUser = null;
let currentEditingSellerId = null;
let isSaving = false;

auth.onAuthStateChanged(user => {
    if (user) {
        currentUser = user;
        db.collection('users').doc(user.uid).get().then(doc => {
            const userData = doc.data();
            loadMyProducts(userData.isAdmin);
        });
    } else {
        window.location.href = 'login.html';
    }
});

function loadMyProducts(isAdmin) {
    const list = document.getElementById('my-products-list');
    if (!list) return;

    let query = db.collection('products');

    if (!isAdmin) {
        query = query.where('sellerId', '==', currentUser.uid);
    }

    const vendorsData = {};
    db.collection('users').get().then(vendorsSnap => {
        vendorsSnap.forEach(vDoc => {
            vendorsData[vDoc.id] = vDoc.data();
        });
    });

    query.onSnapshot(snapshot => {
        list.innerHTML = "";
        if (snapshot.empty) {
            list.innerHTML = '<p style="text-align:center; width:100%;">Nenhum produto encontrado.</p>';
            return;
        }

        snapshot.forEach(doc => {
            const p = doc.data();
            const productId = doc.id;
            const sellerName = vendorsData[p.sellerId] ? vendorsData[p.sellerId].name : "Desconhecido";
            
            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                <img src="${p.imageUrl || 'assets/default-food.png'}" style="width:100%; height:150px; object-fit:cover; border-radius:8px;">
                <h3 style="margin-top:10px;">${p.name}</h3>
                <p>Estoque: <strong>${p.quantity || 0}</strong> | R$ ${Number(p.price).toFixed(2)}</p>
                <p style="font-size:0.7rem; color:#999;">Categoria: ${p.category || 'Não definida'}</p>
                ${isAdmin ? `<p style="font-size:0.7rem; color:#2196F3;">👤 Vendedor: ${sellerName}</p>` : ''}
                <div style="margin-top:10px; display: flex; gap: 5px;">
                    <button class="btn" style="padding:5px 10px; background:#2196F3; flex:1;"
                        onclick="editProduct('${productId}', '${escapeHtml(p.name)}', ${p.price}, ${p.quantity}, '${p.category}', '${escapeHtml(p.imageUrl || '')}', '${p.sellerId}')">
                        Editar
                    </button>
                    <button class="btn" style="padding:5px 10px; background:#f44336; flex:1;" 
                        onclick="deleteProduct('${productId}')">
                        Excluir
                    </button>
                </div>
            `;
            list.appendChild(card);
        });
    });
}

function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/'/g, "\\'")
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function editProduct(id, name, price, qty, category, imageUrl, sellerId) {
    document.getElementById('product-id').value = id;
    currentEditingSellerId = sellerId;
    
    document.getElementById('p-name').value = name;
    document.getElementById('p-price').value = price;
    document.getElementById('p-qty').value = qty;
    document.getElementById('p-category').value = category;
    
    document.getElementById('form-title').innerText = "Editando Produto";

    const imgInput = document.getElementById('p-img');
    if (imgInput) {
        imgInput.value = imageUrl || "";
    }

    const preview = document.getElementById('img-preview');
    if (preview) {
        preview.src = imageUrl || 'assets/default-food.png';
    }

    const fileInput = document.getElementById('p-file');
    if (fileInput) {
        fileInput.value = "";
    }

    if (currentUser && currentUser.uid !== sellerId) {
        const uploadStatus = document.getElementById('upload-status');
        if (uploadStatus) {
            uploadStatus.innerText = "⚠️ Admin: Editando produto de outro vendedor";
            uploadStatus.style.color = "#FF9800";
        }
    } else {
        const uploadStatus = document.getElementById('upload-status');
        if (uploadStatus) {
            uploadStatus.innerText = "";
        }
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function saveProduct() {
    if (isSaving) {
        console.log("Salvamento em andamento, aguarde...");
        return;
    }
    
    isSaving = true;

    try {
        const id = document.getElementById('product-id').value;
        const name = document.getElementById('p-name').value.trim();
        const price = document.getElementById('p-price').value;
        const qty = document.getElementById('p-qty').value;
        const category = document.getElementById('p-category').value;

        if (!name) {
            alert("Por favor, insira o nome do produto!");
            isSaving = false;
            return;
        }
        if (!price || parseFloat(price) <= 0) {
            alert("Por favor, insira um preço válido!");
            isSaving = false;
            return;
        }
        if (!qty || parseInt(qty) < 0) {
            alert("Por favor, insira uma quantidade válida!");
            isSaving = false;
            return;
        }

        const imageUrlField = document.getElementById('p-img'); 
        const imageUrl = imageUrlField ? imageUrlField.value.trim() : "";
        const fileInput = document.getElementById('p-file');

        let finalImageUrl = "";

        // Upload de arquivo tem prioridade
        if (fileInput && fileInput.files[0]) {
            try {
                const uploadStatus = document.getElementById('upload-status');
                if (uploadStatus) {
                    uploadStatus.innerText = "Comprimindo imagem...";
                    uploadStatus.style.color = 'blue';
                }
                
                // Comprimir imagem antes do upload
                const compressedFile = await compressImage(fileInput.files[0], 800, 0.8);
                
                if (uploadStatus) {
                    uploadStatus.innerText = "Enviando imagem...";
                }
                
                // Fazer upload
                finalImageUrl = await uploadFile(compressedFile, 'products');
                
                if (uploadStatus) {
                    uploadStatus.innerText = "Imagem enviada com sucesso!";
                    uploadStatus.style.color = 'green';
                }
            } catch (uploadError) {
                console.error("Erro no upload:", uploadError);
                alert("Erro ao fazer upload da imagem: " + uploadError.message);
                isSaving = false;
                return;
            }
        }
        // Se não tem arquivo, usa URL
        else if (imageUrl) {
            finalImageUrl = imageUrl;
        }
        // Se está editando e não forneceu imagem, mantém a atual
        else if (id) {
            const productDoc = await db.collection('products').doc(id).get();
            finalImageUrl = productDoc.data().imageUrl || "assets/default-food.png";
        }
        // Novo produto sem imagem
        else {
            finalImageUrl = "assets/default-food.png";
        }

        // Determinar sellerId
        let sellerId;
        if (id && currentEditingSellerId) {
            sellerId = currentEditingSellerId;
        } else if (id) {
            const productDoc = await db.collection('products').doc(id).get();
            sellerId = productDoc.data().sellerId;
        } else {
            sellerId = currentUser ? currentUser.uid : auth.currentUser.uid;
        }

        const productData = {
            name: name,
            price: parseFloat(price),
            quantity: parseInt(qty),
            category: category,
            imageUrl: finalImageUrl,
            sellerId: sellerId,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        if (id) {
            await db.collection('products').doc(id).update(productData);
            alert("Produto atualizado com sucesso!");
        } else {
            productData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            await db.collection('products').add(productData);
            alert("Produto cadastrado com sucesso!");
        }

        clearForm();
        
    } catch (e) {
        console.error("Erro detalhado:", e);
        alert("Erro ao salvar produto: " + e.message);
    } finally {
        isSaving = false;
    }
}

async function deleteProduct(id) {
    if (confirm("Tem certeza que deseja excluir este produto?")) {
        try {
            await db.collection('products').doc(id).delete();
            alert("Produto excluído com sucesso!");
        } catch (error) {
            console.error("Erro ao excluir:", error);
            alert("Erro ao excluir produto: " + error.message);
        }
    }
}

function clearForm() {
    document.getElementById('product-id').value = "";
    document.getElementById('p-name').value = "";
    document.getElementById('p-price').value = "";
    document.getElementById('p-qty').value = "";
    document.getElementById('p-category').value = "doces";
    
    currentEditingSellerId = null;
    
    const urlInput = document.getElementById('p-img');
    if (urlInput) urlInput.value = "";

    const fileInput = document.getElementById('p-file');
    if (fileInput) fileInput.value = "";

    const preview = document.getElementById('img-preview');
    if (preview) preview.src = "";

    const uploadStatus = document.getElementById('upload-status');
    if (uploadStatus) {
        uploadStatus.innerText = "";
        uploadStatus.style.color = "blue";
    }

    document.getElementById('form-title').innerText = "Adicionar Novo Produto";
}

function clearProductImage() {
    const urlInput = document.getElementById('p-img');
    if (urlInput) urlInput.value = "";
    
    const fileInput = document.getElementById('p-file');
    if (fileInput) fileInput.value = "";
    
    const preview = document.getElementById('img-preview');
    if (preview) preview.src = "";
    
    const status = document.getElementById('upload-status');
    if (status) {
        status.innerText = "Imagem removida (salve para aplicar)";
        status.style.color = "red";
    }
}

// Preview da imagem quando colar URL
document.addEventListener('DOMContentLoaded', function() {
    const imgInput = document.getElementById('p-img');
    if (imgInput) {
        imgInput.addEventListener('input', function() {
            const preview = document.getElementById('img-preview');
            if (preview) {
                preview.src = this.value || 'assets/default-food.png';
            }
        });
    }
    
    // Preview da imagem quando selecionar arquivo
    const fileInput = document.getElementById('p-file');
    if (fileInput) {
        fileInput.addEventListener('change', function() {
            const preview = document.getElementById('img-preview');
            if (preview && this.files[0]) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    preview.src = e.target.result;
                };
                reader.readAsDataURL(this.files[0]);
            }
        });
    }
});

// CARREGAR FAVICON NA PÁGINA ATUAL
db.collection('settings').doc('global').onSnapshot(doc => {
    if (doc.exists) {
        const s = doc.data();
        if (s.siteName) document.title = s.siteName;
        if (s.favicon) {
            let link = document.querySelector("link[rel~='icon']");
            if (!link) {
                link = document.createElement('link');
                link.rel = 'icon';
                document.head.appendChild(link);
            }
            link.href = s.favicon;
        }
        if (s.themeColor) {
            document.documentElement.style.setProperty('--primary-color', s.themeColor);
            const header = document.querySelector('header');
            if(header) header.style.background = s.themeColor;
        }
    }
});