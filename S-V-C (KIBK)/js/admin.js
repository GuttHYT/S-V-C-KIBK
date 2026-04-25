auth.onAuthStateChanged(user => {
    if (user) {
        db.collection('users').doc(user.uid).get().then(doc => {
            if (doc.exists && doc.data().isAdmin) {
                initAdminPanel();
            } else {
                alert("Acesso negado!");
                window.location.href = 'dashboard.html';
            }
        });
    } else {
        window.location.href = 'login.html';
    }
});

function initAdminPanel() {
    loadUsersList();
    loadCurrentSettings();
}

// Carrega a lista de usuários com botões de ação
async function loadUsersList() {
    const userListDiv = document.getElementById('admin-users-list');
    if (!userListDiv) return;

    try {
        const snapshot = await db.collection('users').get();
        userListDiv.innerHTML = "";

        snapshot.forEach(doc => {
            const u = doc.data();
            const uid = doc.id;
            const userRow = document.createElement('div');
            userRow.className = "card"; // Usando a classe card do seu CSS
            userRow.style.marginBottom = "10px";
            
            userRow.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <strong>${u.name}</strong> 
                        ${u.isAdmin ? '<span class="badge-admin" style="background:#ffebee; color:#d32f2f; padding:2px 5px; border-radius:4px; font-size:10px;">ADMIN</span>' : ''}
                        <br><small style="color:#666;">${u.email} | Cargo: ${u.role || 'user'}</small>
                    </div>
                    <div style="display:flex; gap:5px;">
                        <button onclick="toggleAdmin('${uid}', ${u.isAdmin || false})" class="btn" style="padding:5px; font-size:10px; background:#2196F3;">
                            ${u.isAdmin ? 'Remover Admin' : 'Tornar Admin'}
                        </button>
                        <button onclick="changeRole('${uid}', '${u.role}')" class="btn" style="padding:5px; font-size:10px; background:#FF9800;">
                            Cargo
                        </button>
                        <button onclick="deleteUserAccount('${uid}')" class="btn" style="padding:5px; font-size:10px; background:#f44336;">
                            Excluir
                        </button>
                    </div>
                </div>
            `;
            userListDiv.appendChild(userRow);
        });
    } catch (e) {
        console.error(e);
        userListDiv.innerHTML = "Erro ao carregar usuários.";
    }
}

// --- FUNÇÕES DE EDIÇÃO NO BANCO ---

// 1. Alternar status de Admin
async function toggleAdmin(uid, currentStatus) {
    if (confirm("Deseja alterar as permissões de administrador deste usuário?")) {
        try {
            await db.collection('users').doc(uid).update({
                isAdmin: !currentStatus
            });
            alert("Permissão atualizada!");
            loadUsersList(); // Recarrega a lista
        } catch (e) {
            alert("Erro: " + e.message);
        }
    }
}

// 2. Mudar cargo (vendedor ou usuário comum)
async function changeRole(uid, currentRole) {
    const newRole = currentRole === 'seller' ? 'user' : 'seller';
    if (confirm(`Mudar cargo para ${newRole}?`)) {
        try {
            await db.collection('users').doc(uid).update({
                role: newRole
            });
            alert("Cargo atualizado!");
            loadUsersList();
        } catch (e) {
            alert("Erro: " + e.message);
        }
    }
}

// 3. Excluir usuário do Banco de Dados
async function deleteUserAccount(uid) {
    if (uid === auth.currentUser.uid) {
        return alert("Você não pode excluir sua própria conta por aqui!");
    }

    if (confirm("ATENÇÃO: Isso excluirá o cadastro do usuário no banco de dados. Deseja continuar?")) {
        try {
            await db.collection('users').doc(uid).delete();
            alert("Usuário removido do banco de dados!");
            loadUsersList();
        } catch (e) {
            alert("Erro ao excluir: " + e.message);
        }
    }
}

// Função para carregar as configurações atuais ao abrir o painel
async function loadCurrentSettings() {
    try {
        const doc = await db.collection('settings').doc('global').get();
        if (doc.exists) {
            const s = doc.data();
            if (s.themeColor) document.getElementById('cfg-color').value = s.themeColor;
            if (s.siteName) document.getElementById('cfg-name').value = s.siteName;
            if (s.favicon) document.getElementById('cfg-favicon').value = s.favicon;
            if (s.topAlert) document.getElementById('cfg-alert').value = s.topAlert;
        }
    } catch (e) {
        console.error("Erro ao carregar configurações:", e);
    }
}

// Chame essa função dentro do seu initAdminPanel()
function initAdminPanel() {
    loadUsersList();
    loadCurrentSettings(); // Nova função
}

// 1. Salvar item individualmente
async function saveIndividual(field, inputId) {
    const value = document.getElementById(inputId).value;
    try {
        await db.collection('settings').doc('global').set({
            [field]: value,
            lastUpdate: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        alert("Campo atualizado com sucesso!");
    } catch (e) {
        alert("Erro ao salvar campo: " + e.message);
    }
}

// 2. Salvar tudo de uma vez
async function saveSettings() {
    const settings = {
        themeColor: document.getElementById('cfg-color').value,
        siteName: document.getElementById('cfg-name').value,
        favicon: document.getElementById('cfg-favicon').value || "", // Pega o valor do novo input
        topAlert: document.getElementById('cfg-alert').value || "",
        lastUpdate: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        await db.collection('settings').doc('global').set(settings, { merge: true });
        alert("Configurações globais aplicadas com sucesso!");
    } catch (e) {
        alert("Erro ao salvar: " + e.message);
    }
}

function previewColor(color) {
    document.documentElement.style.setProperty('--primary-color', color);
    const header = document.querySelector('header');
    if (header) header.style.background = color;
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