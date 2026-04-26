// Este código deve estar no topo do seu script principal
auth.onAuthStateChanged(user => {
    if (user) {
        // USUÁRIO LOGADO
        console.log("Logado como:", user.email);
        
        // Se ele estiver na página de login ou index, manda para o dashboard
        const paginasDeAcesso = ['login.html', 'index.html', 'cadastro.html'];
        const pathAtual = window.location.pathname;
        
        if (paginasDeAcesso.some(pagina => pathAtual.includes(pagina))) {
            window.location.href = 'dashboard.html';
        }

        // Continua o carregamento normal das funções
        if (typeof checkUserRole === "function") checkUserRole(user.uid);
        if (typeof loadProducts === "function") loadProducts();
        
    } else {
        // USUÁRIO NÃO LOGADO
        console.warn("Nenhum usuário detectado. Redirecionando...");

        // Verificamos se ele JÁ NÃO ESTÁ na página de login para não criar um loop infinito
        const pathAtual = window.location.pathname;
        if (!pathAtual.includes('login.html') && !pathAtual.includes('index.html')) {
            window.location.href = 'login.html';
        }
    }
});

// Login (já existia)
function login() {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  auth.signInWithEmailAndPassword(email, password)
    .then(userCredential => {
      window.location.href = 'dashboard.html';
    })
    .catch(err => alert("Erro no login: " + err.message));
}

// Registro
async function registerUser() {
  const name = document.getElementById('name').value.trim();
  const whatsapp = document.getElementById('whatsapp').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const role = document.getElementById('role').value;   // buyer ou seller

  if (!name || !whatsapp || !email || !password) {
    alert("Preencha todos os campos obrigatórios!");
    return;
  }
  if (password.length < 6) {
    alert("Senha deve ter no mínimo 6 caracteres");
    return;
  }

  try {
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    const uid = userCredential.user.uid;

    await db.collection('users').doc(uid).set({
      uid: uid,
      name: name,
      whatsapp: whatsapp,
      email: email,
      role: role,                    // buyer ou seller (você vai mudar depois)
      isAdmin: false,                // por padrão false
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    // Só cria documento em vendors se for vendedor
    if (role === "seller") {
      await db.collection('vendors').doc(uid).set({
        uid: uid,
        sellerName: name,
        sellingDays: [],           // Karina vai ter ["terça", "quinta"]
        sellingMessage: "",
        active: true,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }

    alert("Conta criada com sucesso! Use o login agora.");
    window.location.href = 'login.html';   // manda para login após registrar
  } catch (err) {
    console.error(err);
    alert("Erro no registro: " + err.message);
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