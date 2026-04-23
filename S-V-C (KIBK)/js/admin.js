auth.onAuthStateChanged(user => {
    if (user) {
        db.collection('users').doc(user.uid).get().then(doc => {
            const userData = doc.data();
            if (!userData.isAdmin) {
                alert("Acesso negado! Você não é um administrador.");
                window.location.href = 'dashboard.html';
            } else {
                loadAdminFunctions(); // Inicia as funções da página
            }
        });
    } else {
        window.location.href = 'login.html';
    }
});