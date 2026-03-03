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
        // История поездок
        const historyBtn = document.querySelector("[data-action=\"history\"]");
        if (historyBtn) {
            historyBtn.addEventListener("click", this.openHistory);
        }

        // Настройки
        const settingsBtn = document.querySelector("[data-action=\"settings\"]");
        if (settingsBtn) {
            settingsBtn.addEventListener("click", this.openSettings);
        }

        // Выход
        const logoutBtn = document.querySelector("[data-action=\"logout\"]");
        if (logoutBtn) {
            logoutBtn.addEventListener("click", this.logout);
        }
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

    // Открыть историю поездок
    openHistory: function() {
        App.showNotification("История поездок будет доступна позже", "info");
    },

    // Открыть настройки
    openSettings: function() {
        App.showNotification("Настройки будут доступны позже", "info");
    },

    // Выход из аккаунта
    logout: function() {
        if (confirm("Вы уверены, что хотите выйти?")) {
            App.showNotification("Выход из аккаунта", "info");
            App.switchSection("main-menu");
        }
    }
};
