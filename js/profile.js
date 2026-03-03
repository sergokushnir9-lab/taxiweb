// ==============================================
// МОДУЛЬ ЛИЧНОГО КАБИНЕТА
// ==============================================

const Profile = {
    // Загрузка профиля
    load: function() {
        App.loadComponent("profile", () => {
            this.init();
            App.currentSection = "profile";
        });
    },

    // Инициализация профиля
    init: function() {
        this.loadUserData();
        this.initEvents();
        this.updateBalances();
    },

    // Загрузка данных пользователя
    loadUserData: function() {
        const userName = document.getElementById("user-name");
        if (userName && App.userData) {
            userName.textContent = App.userData.username
                ? "@" + App.userData.username
                : (App.userData.first_name || "Пользователь");
        }
    },

    // Инициализация событий
    initEvents: function() {
        const historyBtn = document.querySelector('[data-action="history"]');
        if (historyBtn) historyBtn.addEventListener('click', this.openHistory);

        const settingsBtn = document.querySelector('[data-action="settings"]');
        if (settingsBtn) settingsBtn.addEventListener('click', this.openSettings);

        const adminBtn = document.querySelector('[data-action="admin"]');
        if (adminBtn) adminBtn.addEventListener('click', () => this.openAdminPanel());

        const adminSaveBtn = document.getElementById('admin-save-btn');
        if (adminSaveBtn) adminSaveBtn.addEventListener('click', () => this.saveAdminData());

        const adminCancelBtn = document.getElementById('admin-cancel-btn');
        if (adminCancelBtn) adminCancelBtn.addEventListener('click', () => this.closeAdminPanel());

        const logoutBtn = document.querySelector('[data-action="logout"]');
        if (logoutBtn) logoutBtn.addEventListener('click', this.logout);
    },

    // Обновление балансов
    updateBalances: async function() {
        const mainBalance = document.getElementById("main-balance");
        const bonusBalance = document.getElementById("bonus-balance");

        try {
            const response = await fetch('/api/profile');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const profile = await response.json();
            const main = profile?.balances?.main ?? 1240;
            const bonus = profile?.balances?.bonus ?? 180;

            if (mainBalance) mainBalance.textContent = new Intl.NumberFormat('ru-RU').format(main);
            if (bonusBalance) bonusBalance.textContent = new Intl.NumberFormat('ru-RU').format(bonus);
        } catch (error) {
            console.warn('Не удалось загрузить баланс из API, используем значения по умолчанию.', error);
            if (mainBalance) mainBalance.textContent = "1 240";
            if (bonusBalance) bonusBalance.textContent = "180";
        }
    },

    openHistory: function() {
        App.showNotification("История поездок будет доступна позже", "info");
    },

    openSettings: function() {
        App.showNotification("Настройки будут доступны позже", "info");
    },

    // Открыть админ-панель
    openAdminPanel: async function() {
        App.openModal('admin-modal');

        try {
            const response = await fetch('/api/admin/config');
            if (!response.ok) return;

            const admin = await response.json();
            const nameInput = document.getElementById('admin-name');
            const phoneInput = document.getElementById('admin-phone');
            const tgInput = document.getElementById('admin-telegram');

            if (nameInput) nameInput.value = admin.name || '';
            if (phoneInput) phoneInput.value = admin.phone || '';
            if (tgInput) tgInput.value = admin.telegram || '';
        } catch (error) {
            console.warn('Не удалось загрузить настройки админа', error);
        }
    },

    closeAdminPanel: function() {
        App.closeModal('admin-modal');
    },

    saveAdminData: async function() {
        const payload = {
            name: document.getElementById('admin-name')?.value?.trim(),
            phone: document.getElementById('admin-phone')?.value?.trim(),
            telegram: document.getElementById('admin-telegram')?.value?.trim()
        };

        if (!payload.name || !payload.phone) {
            App.showNotification('Заполните имя и телефон администратора', 'warning');
            return;
        }

        try {
            const response = await fetch('/api/admin/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            App.showNotification('Данные администратора сохранены', 'success');
            this.closeAdminPanel();
        } catch (error) {
            console.error(error);
            App.showNotification('Не удалось сохранить данные администратора', 'error');
        }
    },

    logout: function() {
        if (confirm("Вы уверены, что хотите выйти?")) {
            App.showNotification("Выход из аккаунта", "info");
            App.switchSection("main-menu");
        }
    }
};
