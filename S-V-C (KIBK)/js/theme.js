// Sistema de Temas (Claro/Escuro)
const ThemeManager = {
    init() {
        this.themeToggle = document.getElementById('theme-toggle');
        this.loadTheme();
        this.setupEventListeners();
    },

    loadTheme() {
        // Carregar tema do localStorage ou do banco de dados
        const savedTheme = localStorage.getItem('theme');
        
        if (savedTheme) {
            this.applyTheme(savedTheme);
        } else {
            // Verificar preferência do sistema
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            this.applyTheme(prefersDark ? 'dark' : 'light');
        }
    },

    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        
        // Atualizar ícone do botão
        if (this.themeToggle) {
            this.themeToggle.innerHTML = theme === 'dark' ? '☀️' : '🌙';
            this.themeToggle.title = theme === 'dark' ? 'Modo Claro' : 'Modo Escuro';
        }

        // Salvar no perfil do usuário se estiver logado
        this.saveUserTheme(theme);
    },

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        this.applyTheme(newTheme);
    },

    async saveUserTheme(theme) {
        const user = auth.currentUser;
        if (user) {
            try {
                await db.collection('users').doc(user.uid).update({
                    theme: theme,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            } catch (error) {
                console.log("Tema salvo apenas localmente");
            }
        }
    },

    async loadUserTheme() {
        const user = auth.currentUser;
        if (user) {
            try {
                const doc = await db.collection('users').doc(user.uid).get();
                if (doc.exists && doc.data().theme) {
                    this.applyTheme(doc.data().theme);
                }
            } catch (error) {
                console.log("Usando tema local");
            }
        }
    },

    setupEventListeners() {
        if (this.themeToggle) {
            this.themeToggle.addEventListener('click', () => this.toggleTheme());
        }

        // Escutar mudanças no sistema
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (!localStorage.getItem('theme')) {
                this.applyTheme(e.matches ? 'dark' : 'light');
            }
        });
    }
};

// Inicializar quando o documento estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    ThemeManager.init();
});

// Também inicializar quando o auth mudar
auth.onAuthStateChanged(user => {
    if (user) {
        ThemeManager.loadUserTheme();
    }
});