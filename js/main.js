// ==============================================
// ОСНОВНОЙ МОДУЛЬ ПРИЛОЖЕНИЯ
// ==============================================

const App = {
    // Глобальные переменные
    tg: null,
    isDark: false,
    currentSection: 'main-menu',
    userData: null,

    // Инициализация приложения
    init: function() {
        console.log('Инициализация приложения...');
        
        // Инициализация Telegram Web App
        this.tg = window.Telegram?.WebApp;
        if (this.tg) {
            this.initTelegram();
        }
        
        // Загрузка начального контента
        this.loadMainMenu();
        
        // Инициализация темы
        this.initTheme();
        
        // Инициализация событий
        this.initEvents();
    },

    // Инициализация Telegram Web App
    initTelegram: function() {
        if (this.tg.ready) this.tg.ready();
        if (this.tg.expand) this.tg.expand();
        
        // Получаем данные пользователя
        if (this.tg.initDataUnsafe?.user) {
            this.userData = this.tg.initDataUnsafe.user;
            console.log('Пользователь Telegram:', this.userData);
        }
        
        // Настройка темы
        this.isDark = this.tg.colorScheme === 'dark';
        document.body.classList.toggle('dark', this.isDark);
    },

    // Инициализация темы
    initTheme: function() {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            this.isDark = savedTheme === 'dark';
            document.body.classList.toggle('dark', this.isDark);
        }
        this.updateThemeIcon();
    },

    // Переключение темы
    toggleTheme: function() {
        this.isDark = !this.isDark;
        document.body.classList.toggle('dark', this.isDark);
        localStorage.setItem('theme', this.isDark ? 'dark' : 'light');
        this.updateThemeIcon();
    },

    // Обновление иконки темы
    updateThemeIcon: function() {
        const icon = document.getElementById('theme-icon');
        if (icon) {
            icon.textContent = this.isDark ? '🌙' : '☀️';
        }
    },

    // Инициализация событий
    initEvents: function() {
        // Глобальные события
        document.addEventListener('click', this.handleGlobalClick.bind(this));
    },

    // Обработка глобальных кликов
    handleGlobalClick: function(event) {
        const target = event.target;
        
        // Обработка кнопок назад
        if (target.closest('.back-btn')) {
            this.goBack();
        }
    },

    // Загрузка главного меню
    loadMainMenu: function() {
        this.loadComponent('menu', () => {
            this.currentSection = 'main-menu';
            this.initMenuEvents();
        });
    },

    // Переключение секций
    switchSection: function(section) {
        console.log('Переключение на секцию:', section);
        
        if (section === this.currentSection && section !== 'main-menu') {
            return;
        }
        
        this.currentSection = section;
        
        switch(section) {
            case 'main-menu':
                this.loadMainMenu();
                break;
            case 'profile':
                Profile.load();
                break;
            case 'passenger':
                Passenger.load();
                break;
            case 'driver':
                Driver.load();
                break;
            case 'delivery':
                Delivery.load();
                break;
            case 'planned':
                Planned.load();
                break;
            default:
                this.loadMainMenu();
        }
    },

    // Назад к главному меню
    goBack: function() {
        this.switchSection('main-menu');
    },

    // Загрузка компонента
    loadComponent: function(componentName, callback) {
        const container = document.getElementById('content-container');
        
        // Показываем лоадер
        this.showLoader(true);
        
        // Определяем путь к компоненту
        const componentPath = `components/${componentName}.html`;
        
        // Загружаем компонент
        fetch(componentPath)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Ошибка загрузки ${componentPath}: ${response.status}`);
                }
                return response.text();
            })
            .then(html => {
                container.innerHTML = html;
                
                // Инициализируем компонент после загрузки
                this.initComponent();
                
                // Скрываем лоадер
                this.showLoader(false);
                
                // Вызываем callback если есть
                if (callback) callback();
            })
            .catch(error => {
                console.error('Ошибка загрузки компонента:', error);
                container.innerHTML = `
                    <div class="error-message">
                        <i class="fas fa-exclamation-triangle"></i>
                        <h3>Ошибка загрузки</h3>
                        <p>Не удалось загрузить компонент</p>
                        <button class="btn primary" onclick="App.loadMainMenu()">Вернуться в меню</button>
                    </div>
                `;
                this.showLoader(false);
            });
    },

    // Инициализация компонента
    initComponent: function() {
        // Инициализация событий
        const sectionHeaders = document.querySelectorAll('.section-header');
        sectionHeaders.forEach(header => {
            const backBtn = header.querySelector('.back-btn');
            if (backBtn) {
                backBtn.addEventListener('click', () => this.goBack());
            }
        });
    },

    // Инициализация событий меню
    initMenuEvents: function() {
        const tiles = document.querySelectorAll('.tile');
        tiles.forEach(tile => {
            tile.addEventListener('click', (e) => {
                const section = e.currentTarget.dataset.section;
                if (section) {
                    this.switchSection(section);
                }
            });
        });
    },

    // Показать/скрыть лоадер
    showLoader: function(show) {
        let loader = document.getElementById('loader');
        if (!loader) {
            // Создаем лоадер если его нет
            const loaderHTML = `
                <div class="loader" id="loader">
                    <div class="loader-spinner"></div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', loaderHTML);
            loader = document.getElementById('loader');
        }
        loader.style.display = show ? 'flex' : 'none';
    },

    // Открыть профиль
    openProfile: function() {
        this.switchSection('profile');
    },

    // Открыть модальное окно
    openModal: function(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'flex';
        }
    },

    // Закрыть модальное окно
    closeModal: function(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
        }
    },

    // Показать уведомление
    showNotification: function(message, type = 'info') {
        alert(message);
    },

    // Переключение уведомлений
    toggleNotifications: function() {
        this.showNotification('Уведомления', 'info');
    }
};

// Глобальные функции для использования в HTML
window.switchSection = (section) => App.switchSection(section);
window.goBack = () => App.goBack();
window.openProfile = () => App.openProfile();
window.toggleTheme = () => App.toggleTheme();
window.openModal = (modalId) => App.openModal(modalId);
window.closeModal = (modalId) => App.closeModal(modalId);
