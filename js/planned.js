// ==============================================
// МОДУЛЬ ПЛАНИРОВАНИЯ
// ==============================================

const Planned = {
    // Загрузка модуля
    load: function() {
        App.loadComponent("planned", () => {
            this.init();
            App.currentSection = "planned";
        });
    },

    // Инициализация модуля
    init: function() {
        this.initEvents();
    },

    // Инициализация событий
    initEvents: function() {
        const createBtn = document.getElementById("create-plan-btn");
        if (createBtn) {
            createBtn.addEventListener("click", this.createNewPlan);
        }
    },

    // Создание нового плана
    createNewPlan: function() {
        App.showNotification("Создание новой запланированной поездки", "info");
    }
};
