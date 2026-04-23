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
    if (!user) return;

    const newPhoto = document.getElementById('p-photo-url').value.trim();
    const newPix = document.getElementById('p-pix') ? document.getElementById('p-pix').value.trim() : "";

    try {
        await db.collection('users').doc(user.uid).update({
            photoUrl: newPhoto,
            pixKey: newPix
        });
        alert("Perfil atualizado com sucesso!");
        location.reload();
    } catch (error) {
        alert("Erro ao salvar: " + error.message);
    }
}