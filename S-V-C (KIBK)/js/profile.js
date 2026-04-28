const urlParams = new URLSearchParams(window.location.search);
const profileUid = urlParams.get('uid');
let currentProfileData = null;

function fetchUserData(user) {
    db.collection('users').doc(user.uid).get().then(doc => {
        if (doc.exists) {
            const data = doc.data();
            currentProfileData = data;
            
            document.getElementById('span-name').innerText = data.name || "Não informado";
            document.getElementById('span-email').innerText = data.email || user.email;
            document.getElementById('span-phone').innerText = data.whatsapp || "Não cadastrado";
            
            if (data.photoUrl) {
                document.getElementById('display-pic').src = data.photoUrl;
                document.getElementById('p-photo-url').value = data.photoUrl;
            }

            if (data.role === 'seller' || data.isAdmin === true) {
                showSellerSections(data, true);
            }
        }
    });
}

function showSellerSections(data, isOwner) {
    const pixSec = document.getElementById('pix-section');
    if(pixSec) {
        pixSec.style.display = 'block';
        document.getElementById('p-pix').value = data.pixKey || "";
    }
    
    showSellerRating(data.sellerRating || 0, data.totalRatings || 0);
    showSellingDays(data.sellingDays || [], isOwner);
}

function showSellingDays(days, isOwner) {
    const section = document.getElementById('selling-days-section');
    if (!section) return;
    
    section.style.display = 'block';
    
    if (isOwner) {
        document.getElementById('selling-days-readonly').style.display = 'none';
        document.getElementById('selling-days-edit').style.display = 'block';
        
        const checkboxes = document.querySelectorAll('input[name="sellingDay"]');
        checkboxes.forEach(cb => {
            cb.checked = days.includes(cb.value);
        });
    } else {
        document.getElementById('selling-days-readonly').style.display = 'block';
        document.getElementById('selling-days-edit').style.display = 'none';
        
        const display = document.getElementById('days-display');
        if (days && days.length > 0) {
            display.innerHTML = days.map(day => 
                `<span class="day-badge">${day}</span>`
            ).join('');
        } else {
            display.innerHTML = '<span class="no-days">Nenhum dia definido</span>';
        }
    }
}

function showSellerRating(rating, totalRatings) {
    const ratingContainer = document.getElementById('seller-rating');
    if (!ratingContainer) return;
    
    ratingContainer.style.display = 'block';
    
    const starsHtml = generateStarsDisplay(rating);
    document.getElementById('rating-stars').innerHTML = starsHtml;
    document.getElementById('rating-value').innerText = rating.toFixed(1);
    document.getElementById('rating-count').innerText = `(${totalRatings} ${totalRatings === 1 ? 'avaliação' : 'avaliações'})`;
}

function generateStarsDisplay(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating - fullStars >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    let html = '';
    for (let i = 0; i < fullStars; i++) html += '⭐';
    if (hasHalfStar) html += '✨';
    for (let i = 0; i < emptyStars; i++) html += '☆';
    
    return html;
}

async function updateSellingDays() {
    const user = auth.currentUser;
    if (!user) {
        alert("Você precisa estar logado!");
        return;
    }
    
    const checkboxes = document.querySelectorAll('input[name="sellingDay"]:checked');
    const selectedDays = Array.from(checkboxes).map(cb => cb.value);
    
    try {
        await db.collection('users').doc(user.uid).update({
            sellingDays: selectedDays,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        alert("Dias de venda atualizados com sucesso!");
        
        if (currentProfileData) {
            currentProfileData.sellingDays = selectedDays;
        }
    } catch (error) {
        console.error("Erro ao atualizar dias:", error);
        alert("Erro ao salvar dias de venda: " + error.message);
    }
}

auth.onAuthStateChanged(user => {
    if (profileUid) {
        loadUserProfile(profileUid);
        document.getElementById('page-title').innerText = "Perfil do Vendedor";
    } else if (user) {
        fetchUserData(user);
        document.getElementById('page-title').innerText = "Meu Perfil";
    } else {
        window.location.href = 'login.html';
    }
});

async function loadUserProfile(uid) {
    try {
        const doc = await db.collection('users').doc(uid).get();
        if (doc.exists) {
            const data = doc.data();
            currentProfileData = data;
            
            document.getElementById('span-name').innerText = data.name || "Sem nome";
            document.getElementById('span-email').innerText = data.email || "Sem email";
            document.getElementById('span-phone').innerText = data.whatsapp || "Não informado";
            
            const picElem = document.getElementById('display-pic');
            if(picElem && data.photoUrl) {
                picElem.src = data.photoUrl;
            }

            if (data.role === 'seller' || data.isAdmin === true) {
                showSellerSections(data, false);
            }

            hideEditFields();
            const saveBtn = document.querySelector('button[onclick="updateProfile()"]');
            if(saveBtn) saveBtn.style.display = 'none';
        }
    } catch (error) {
        console.error("Erro ao carregar perfil:", error);
    }
}

async function updateProfile() {
    const user = auth.currentUser;
    if (!user || profileUid) {
        alert("Você só pode editar seu próprio perfil!");
        return;
    }
    
    const fileInput = document.getElementById('p-file-profile');
    let newPhoto = document.getElementById('p-photo-url').value.trim();
    const newPix = document.getElementById('p-pix') ? document.getElementById('p-pix').value.trim() : "";

    try {
        // Se tem arquivo, faz upload
        if (fileInput && fileInput.files[0]) {
            // Mostrar status
            const saveBtn = document.querySelector('button[onclick="updateProfile()"]');
            if (saveBtn) {
                saveBtn.innerText = "Comprimindo imagem...";
                saveBtn.disabled = true;
            }
            
            // Comprimir imagem
            const compressedFile = await compressImage(fileInput.files[0], 400, 0.7);
            
            if (saveBtn) {
                saveBtn.innerText = "Enviando foto...";
            }
            
            // Fazer upload
            newPhoto = await uploadFile(compressedFile, 'profiles');
            
            if (saveBtn) {
                saveBtn.innerText = "Salvando...";
            }
        }

        await db.collection('users').doc(user.uid).update({
            photoUrl: newPhoto || "",
            pixKey: newPix,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        alert("Perfil atualizado com sucesso!");
        location.reload();
    } catch (error) {
        console.error("Erro ao salvar perfil:", error);
        alert("Erro ao salvar: " + error.message);
        
        // Restaurar botão
        const saveBtn = document.querySelector('button[onclick="updateProfile()"]');
        if (saveBtn) {
            saveBtn.innerText = "Salvar Alterações";
            saveBtn.disabled = false;
        }
    }
}

function clearProfileImage() {
    document.getElementById('p-photo-url').value = "";
    document.getElementById('p-file-profile').value = "";
    document.getElementById('display-pic').src = "assets/default-user.png";
}

function hideEditFields() {
    const editElements = document.querySelectorAll('.edit-field');
    editElements.forEach(el => el.style.display = 'none');
    
    const photoInput = document.getElementById('p-photo-url');
    const fileInput = document.getElementById('p-file-profile');
    const pixInput = document.getElementById('p-pix');
    
    if(photoInput) photoInput.style.display = 'none';
    if(fileInput) fileInput.style.display = 'none';
    if(pixInput) pixInput.readOnly = true;
}

function showEditFields() {
    const editElements = document.querySelectorAll('.edit-field');
    editElements.forEach(el => el.style.display = 'block');
    
    const photoInput = document.getElementById('p-photo-url');
    const fileInput = document.getElementById('p-file-profile');
    const pixInput = document.getElementById('p-pix');
    
    if(photoInput) photoInput.style.display = 'block';
    if(fileInput) fileInput.style.display = 'block';
    if(pixInput) pixInput.readOnly = false;
}

// Preview da imagem quando selecionar arquivo
document.addEventListener('DOMContentLoaded', function() {
    const fileInput = document.getElementById('p-file-profile');
    if (fileInput) {
        fileInput.addEventListener('change', function() {
            const preview = document.getElementById('display-pic');
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