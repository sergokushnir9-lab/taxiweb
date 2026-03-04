// ==============================================
// МОДУЛЬ ПЛАНИРОВАНИЯ
// ==============================================

const Planned = {
    load: function() {
        App.loadComponent("planned", () => {
            this.init();
            App.currentSection = "planned";
        });
    },

    init: function() {
        this.initEvents();
        this.loadPlannedRides();
    },

    initEvents: function() {
        const createBtn = document.getElementById("create-plan-btn");
        if (createBtn) {
            createBtn.addEventListener("click", () => this.createNewPlan());
        }
    },

    loadPlannedRides: async function() {
        const list = document.querySelector('.planned-list');
        if (!list) return;

        try {
            const response = await fetch('/api/planned/rides');
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const rides = await response.json();

            if (!rides.length) {
                list.innerHTML = '<div class="planned-item"><div class="planned-details">Запланированных поездок пока нет.</div></div>';
                return;
            }

            list.innerHTML = rides.map((ride) => {
                const when = new Date(ride.plannedAt);
                const day = Number.isNaN(when.getTime()) ? 'Скоро' : when.toLocaleDateString('ru-RU');
                const time = Number.isNaN(when.getTime()) ? '—' : when.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
                return `
                    <div class="planned-item">
                        <div class="planned-date">
                            <div class="date-day">${day}</div>
                            <div class="date-time">${time}</div>
                        </div>
                        <div class="planned-details">
                            <div class="planned-route">${ride.from} → ${ride.to}</div>
                            <div class="planned-info"><span><i class="fas fa-ruble-sign"></i> ${ride.price} ₽</span></div>
                        </div>
                    </div>
                `;
            }).join('');
        } catch (error) {
            console.error('Не удалось загрузить запланированные поездки:', error);
            list.innerHTML = '<div class="planned-item"><div class="planned-details">Не удалось загрузить список из API.</div></div>';
        }
    },

    createNewPlan: async function() {
        const from = prompt('Откуда?');
        const to = prompt('Куда?');
        const plannedAt = prompt('Когда? (например: 2026-03-10T08:30:00)');
        const price = prompt('Цена (₽)');

        if (!from || !to || !plannedAt || !price) {
            App.showNotification('Все поля обязательны для создания поездки', 'error');
            return;
        }

        try {
            const response = await fetch('/api/planned/rides', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ from, to, plannedAt, price: Number(price) })
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            App.showNotification('Запланированная поездка создана', 'success');
            this.loadPlannedRides();
        } catch (error) {
            console.error('Ошибка создания запланированной поездки:', error);
            App.showNotification('Не удалось создать поездку в API', 'error');
        }
    }
};
