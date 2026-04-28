// Sistema de Temas Avançado (Claro/Escuro)
const ThemeManager = {
    themes: {
        light: {
            name: 'Claro',
            icon: '🌙',
            nextIcon: '☀️',
            colors: {
                // Cores principais
                '--primary-color': '#2E7D32',
                '--primary-light': '#4CAF50',
                '--primary-dark': '#1B5E20',
                
                // Fundos
                '--bg-primary': '#f4f4f4',
                '--bg-secondary': '#ffffff',
                '--bg-tertiary': '#f9f9f9',
                '--bg-hover': '#f0f0f0',
                '--bg-card': '#ffffff',
                '--bg-input': '#ffffff',
                '--bg-modal': '#ffffff',
                '--bg-header': 'linear-gradient(135deg, #4CAF50, #2E7D32)',
                '--bg-footer': 'linear-gradient(70deg, #000000, #4b0088, #8d0000, #000000)',
                '--bg-badge': '#f0f0f0',
                '--bg-notification': '#f0f8ff',
                '--bg-day-checkbox': '#f5f5f5',
                '--bg-day-checkbox-hover': '#e0e0e0',
                '--bg-stat-card': '#ffffff',
                '--bg-pix-section': '#e8f5e9',
                '--bg-danger': '#fff5f5',
                '--bg-warning': '#fff8e1',
                '--bg-success': '#e8f5e9',
                '--bg-info': '#e3f2fd',
                
                // Textos
                '--text-primary': '#333333',
                '--text-secondary': '#666666',
                '--text-tertiary': '#999999',
                '--text-heading': '#222222',
                '--text-link': '#2196F3',
                '--text-link-hover': '#1976D2',
                '--text-inverse': '#ffffff',
                '--text-badge': '#666666',
                '--text-success': '#2E7D32',
                '--text-danger': '#d32f2f',
                '--text-warning': '#F57F17',
                '--text-info': '#1976D2',
                
                // Bordas
                '--border-primary': '#e0e0e0',
                '--border-secondary': '#eeeeee',
                '--border-input': '#cccccc',
                '--border-card': '#eeeeee',
                '--border-focus': '#4CAF50',
                
                // Sombras
                '--shadow-sm': '0 2px 4px rgba(0,0,0,0.08)',
                '--shadow-md': '0 4px 8px rgba(0,0,0,0.12)',
                '--shadow-lg': '0 8px 16px rgba(0,0,0,0.16)',
                '--shadow-xl': '0 12px 24px rgba(0,0,0,0.2)',
                
                // Estrelas e avaliações
                '--star-active': '#FFD700',
                '--star-inactive': '#cccccc',
                '--star-hover': '#FFC107',
                
                // Botões
                '--btn-primary-bg': '#4CAF50',
                '--btn-primary-text': '#ffffff',
                '--btn-primary-hover': '#388E3C',
                '--btn-secondary-bg': '#666666',
                '--btn-secondary-text': '#ffffff',
                '--btn-danger-bg': '#f44336',
                '--btn-danger-text': '#ffffff',
                '--btn-warning-bg': '#FF9800',
                '--btn-warning-text': '#ffffff',
                '--btn-info-bg': '#2196F3',
                '--btn-info-text': '#ffffff',
                
                // Outros
                '--scrollbar-bg': '#f1f1f1',
                '--scrollbar-thumb': '#888888',
                '--scrollbar-thumb-hover': '#555555',
                '--overlay-bg': 'rgba(0,0,0,0.5)',
                '--highlight-bg': '#fff3cd',
                '--highlight-text': '#856404',
            }
        },
        dark: {
            name: 'Escuro',
            icon: '☀️',
            nextIcon: '🌙',
            colors: {
                // Cores principais (mantidas mas ajustadas)
                '--primary-color': '#4CAF50',
                '--primary-light': '#66BB6A',
                '--primary-dark': '#1B5E20',
                
                // Fundos
                '--bg-primary': '#121212',
                '--bg-secondary': '#1E1E1E',
                '--bg-tertiary': '#252525',
                '--bg-hover': '#2A2A2A',
                '--bg-card': '#1E1E1E',
                '--bg-input': '#2D2D2D',
                '--bg-modal': '#1E1E1E',
                '--bg-header': 'linear-gradient(135deg, #1B5E20, #0D3B0F)',
                '--bg-footer': 'linear-gradient(70deg, #0a0a0a, #1a0033, #330000, #0a0a0a)',
                '--bg-badge': '#2D2D2D',
                '--bg-notification': '#1A2733',
                '--bg-day-checkbox': '#2D2D2D',
                '--bg-day-checkbox-hover': '#3D3D3D',
                '--bg-stat-card': '#1E1E1E',
                '--bg-pix-section': '#1A3320',
                '--bg-danger': '#331111',
                '--bg-warning': '#332B00',
                '--bg-success': '#1A3320',
                '--bg-info': '#0D2137',
                
                // Textos
                '--text-primary': '#E0E0E0',
                '--text-secondary': '#B0B0B0',
                '--text-tertiary': '#808080',
                '--text-heading': '#FFFFFF',
                '--text-link': '#64B5F6',
                '--text-link-hover': '#90CAF9',
                '--text-inverse': '#121212',
                '--text-badge': '#B0B0B0',
                '--text-success': '#66BB6A',
                '--text-danger': '#EF5350',
                '--text-warning': '#FFB300',
                '--text-info': '#64B5F6',
                
                // Bordas
                '--border-primary': '#333333',
                '--border-secondary': '#2A2A2A',
                '--border-input': '#404040',
                '--border-card': '#333333',
                '--border-focus': '#66BB6A',
                
                // Sombras
                '--shadow-sm': '0 2px 4px rgba(0,0,0,0.3)',
                '--shadow-md': '0 4px 8px rgba(0,0,0,0.4)',
                '--shadow-lg': '0 8px 16px rgba(0,0,0,0.5)',
                '--shadow-xl': '0 12px 24px rgba(0,0,0,0.6)',
                
                // Estrelas e avaliações
                '--star-active': '#FFD700',
                '--star-inactive': '#555555',
                '--star-hover': '#FFC107',
                
                // Botões
                '--btn-primary-bg': '#4CAF50',
                '--btn-primary-text': '#ffffff',
                '--btn-primary-hover': '#66BB6A',
                '--btn-secondary-bg': '#757575',
                '--btn-secondary-text': '#ffffff',
                '--btn-danger-bg': '#EF5350',
                '--btn-danger-text': '#ffffff',
                '--btn-warning-bg': '#FFA726',
                '--btn-warning-text': '#121212',
                '--btn-info-bg': '#42A5F5',
                '--btn-info-text': '#ffffff',
                
                // Outros
                '--scrollbar-bg': '#1E1E1E',
                '--scrollbar-thumb': '#555555',
                '--scrollbar-thumb-hover': '#777777',
                '--overlay-bg': 'rgba(0,0,0,0.7)',
                '--highlight-bg': '#332B00',
                '--highlight-text': '#FFD54F',
            }
        }
    },

    currentTheme: 'light',

    init() {
        // Carregar tema salvo
        this.loadSavedTheme();
        
        // Configurar botão de alternância
        this.setupToggleButton();
        
        // Observar mudanças no sistema
        this.watchSystemTheme();
        
        // Aplicar tema inicial
        this.applyTheme(this.currentTheme);
        
        // Salvar no perfil quando usuário logar
        this.saveToProfile();
        
        console.log(`🌓 ThemeManager iniciado - Tema: ${this.themes[this.currentTheme].name}`);
    },

    loadSavedTheme() {
        // Prioridade: localStorage > sistema > padrão
        const saved = localStorage.getItem('theme');
        
        if (saved && this.themes[saved]) {
            this.currentTheme = saved;
        } else {
            // Detectar preferência do sistema
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            this.currentTheme = prefersDark ? 'dark' : 'light';
        }
    },

    applyTheme(themeName) {
        const theme = this.themes[themeName];
        if (!theme) return;
        
        const root = document.documentElement;
        
        // Aplicar todas as variáveis CSS
        Object.entries(theme.colors).forEach(([property, value]) => {
            root.style.setProperty(property, value);
        });
        
        // Atualizar atributo data-theme
        root.setAttribute('data-theme', themeName);
        
        // Salvar no localStorage
        localStorage.setItem('theme', themeName);
        
        // Atualizar meta tag theme-color
        this.updateMetaThemeColor(theme.colors['--bg-primary']);
        
        // Atualizar botão de alternância
        this.updateToggleButton(theme);
        
        this.currentTheme = themeName;
        
        // Disparar evento personalizado
        window.dispatchEvent(new CustomEvent('themeChanged', { 
            detail: { theme: themeName } 
        }));
    },

    toggleTheme() {
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        
        // Animação de transição
        this.animateTransition(() => {
            this.applyTheme(newTheme);
            this.saveToProfile();
        });
    },

    animateTransition(callback) {
        // Criar overlay para transição suave
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: ${this.currentTheme === 'light' ? '#121212' : '#ffffff'};
            z-index: 99999;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;
        document.body.appendChild(overlay);
        
        // Animação
        requestAnimationFrame(() => {
            overlay.style.opacity = '0.3';
            
            setTimeout(() => {
                callback();
                
                setTimeout(() => {
                    overlay.style.opacity = '0';
                    setTimeout(() => overlay.remove(), 300);
                }, 50);
            }, 150);
        });
    },

    setupToggleButton() {
        // Procurar ou criar botão de alternância
        let toggleBtn = document.getElementById('theme-toggle');
        
        if (!toggleBtn) {
            // Criar botão se não existir
            const nav = document.querySelector('nav div');
            if (nav) {
                toggleBtn = document.createElement('button');
                toggleBtn.id = 'theme-toggle';
                toggleBtn.className = 'theme-toggle-btn';
                toggleBtn.setAttribute('aria-label', 'Alternar tema');
                nav.appendChild(toggleBtn);
            }
        }
        
        if (toggleBtn) {
            // Remover listeners antigos
            const newBtn = toggleBtn.cloneNode(true);
            toggleBtn.parentNode.replaceChild(newBtn, toggleBtn);
            
            // Adicionar novo listener
            newBtn.addEventListener('click', () => this.toggleTheme());
            
            // Atualizar ícone
            this.updateToggleButton(this.themes[this.currentTheme]);
        }
    },

    updateToggleButton(theme) {
        const btn = document.getElementById('theme-toggle');
        if (btn) {
            btn.innerHTML = theme.icon;
            btn.title = `Mudar para modo ${this.currentTheme === 'light' ? 'escuro' : 'claro'}`;
        }
    },

    updateMetaThemeColor(color) {
        let meta = document.querySelector('meta[name="theme-color"]');
        if (!meta) {
            meta = document.createElement('meta');
            meta.name = 'theme-color';
            document.head.appendChild(meta);
        }
        meta.content = color;
    },

    watchSystemTheme() {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        
        mediaQuery.addEventListener('change', (e) => {
            // Só mudar automaticamente se o usuário nunca escolheu manualmente
            if (!localStorage.getItem('theme')) {
                this.applyTheme(e.matches ? 'dark' : 'light');
            }
        });
    },

    async saveToProfile() {
        const user = auth.currentUser;
        if (user) {
            try {
                await db.collection('users').doc(user.uid).update({
                    theme: this.currentTheme,
                    themeUpdatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            } catch (error) {
                // Salvar apenas localmente se falhar
                console.log('Tema salvo apenas localmente');
            }
        }
    },

    async loadFromProfile() {
        const user = auth.currentUser;
        if (user) {
            try {
                const doc = await db.collection('users').doc(user.uid).get();
                if (doc.exists && doc.data().theme) {
                    this.applyTheme(doc.data().theme);
                }
            } catch (error) {
                console.log('Usando tema local');
            }
        }
    },

    // Métodos utilitários
    getCurrentTheme() {
        return this.currentTheme;
    },

    getThemeColors() {
        return this.themes[this.currentTheme].colors;
    },

    isDarkMode() {
        return this.currentTheme === 'dark';
    }
};

// Inicializar quando o documento estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ThemeManager.init());
} else {
    ThemeManager.init();
}

// Também carregar tema do perfil quando usuário logar
auth.onAuthStateChanged(user => {
    if (user) {
        ThemeManager.loadFromProfile();
    }
});