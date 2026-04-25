// Função para buscar os dados com segurança
function fetchUserData(user) {
    db.collection('users').doc(user.uid).get().then(doc => {
        if (doc.exists) {
            const data = doc.data();
            
            // Preenche os campos de texto
            document.getElementById('span-name').innerText = data.name || "Não informado";
            document.getElementById('span-email').innerText = data.email || user.email;
            document.getElementById('span-phone').innerText = data.whatsapp || "Não cadastrado";
            
            // Foto de perfil
            if (data.photoUrl) {
                document.getElementById('display-pic').src = data.photoUrl;
                document.getElementById('p-photo-url').value = data.photoUrl;
            }

            // Seção Pix (só para vendedores/admin)
            if (data.role === 'seller' || data.isAdmin === true) {
                const pixSec = document.getElementById('pix-section');
                if(pixSec) {
                    pixSec.style.display = 'block';
                    document.getElementById('p-pix').value = data.pixKey || "";
                }
            }
        } else {
            console.error("Documento do usuário não encontrado no Firestore.");
        }
    }).catch(error => {
        console.error("Erro ao buscar dados:", error);
        document.getElementById('span-name').innerText = "Erro ao carregar";
    });
}

// Monitor de autenticação
auth.onAuthStateChanged(user => {
    if (user) {
        fetchUserData(user);
    } else {
        window.location.href = 'login.html';
    }
});

// Função para salvar
async function updateProfile() {
    const user = auth.currentUser;
    const fileInput = document.getElementById('p-file-profile');
    let newPhoto = document.getElementById('p-photo-url').value.trim();
    const newPix = document.getElementById('p-pix') ? document.getElementById('p-pix').value.trim() : "";

    try {
        // Se subiu arquivo, ele ganha prioridade sobre o link
        if (fileInput && fileInput.files.length > 0) {
            newPhoto = await uploadFile(fileInput.files[0], 'profiles');
        }

        await db.collection('users').doc(user.uid).update({
            photoUrl: newPhoto, // Se estiver vazio (via botão remover), limpa no banco
            pixKey: newPix
        });

        alert("Perfil atualizado com sucesso!");
        location.reload();
    } catch (error) {
        alert("Erro ao salvar: " + error.message);
    }
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

function clearProfileImage() {
    document.getElementById('p-photo-url').value = "";
    document.getElementById('p-file-profile').value = "";
    document.getElementById('display-pic').src = "assets/default-user.png"; // Volta para a padrão
}