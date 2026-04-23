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