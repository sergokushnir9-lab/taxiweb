// ==============================================
// МОДУЛЬ ПЛАНИРОВАНИЯ
// ==============================================

const Planned = {
    rides: [],

    // Загрузка модуля
    load: function() {
        App.loadComponent('planned', () => {
            this.init();
            App.currentSection = 'planned';
        });
    },

    // Инициализация модуля
    init: function() {
        this.initEvents();
        this.setDefaultDateTime();
        this.loadRides();
    },

    // Инициализация событий
    initEvents: function() {
        const createBtn = document.getElementById('create-plan-btn');
        if (createBtn) {
            createBtn.addEventListener('click', () => this.createNewPlan());
        }
    },

    setDefaultDateTime: function() {
        const input = document.getElementById('planned-at');
        if (!input) return;

        const date = new Date();
        date.setHours(date.getHours() + 1);
        input.value = date.toISOString().slice(0, 16);
    },

    loadRides: async function() {
        try {
            const response = await fetch('/api/planned/rides');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            this.rides = await response.json();
            this.renderRides();
        } catch (error) {
            console.warn('Не удалось загрузить запланированные поездки из API', error);
            this.rides = Helpers.loadFromStorage('plannedRides') || [];
            this.renderRides();
        }
    },

    validateForm: function({ from, to, plannedAt, price }) {
        if (!from) return 'Укажите адрес отправления';
        if (!to) return 'Укажите адрес назначения';
        if (!plannedAt) return 'Укажите дату и время поездки';

        const plannedDate = new Date(plannedAt);
        if (Number.isNaN(plannedDate.getTime())) return 'Некорректная дата поездки';
        if (plannedDate.getTime() <= Date.now()) return 'Дата поездки должна быть в будущем';

        const priceNumber = Number(price);
        if (!price || Number.isNaN(priceNumber)) return 'Укажите корректную цену';
        if (priceNumber < 100) return 'Минимальная цена поездки — 100 ₽';

        return null;
    },

    // Создание нового плана
    createNewPlan: async function() {
        const payload = {
            from: document.getElementById('planned-from')?.value.trim(),
            to: document.getElementById('planned-to')?.value.trim(),
            plannedAt: document.getElementById('planned-at')?.value,
            price: document.getElementById('planned-price')?.value
        };

        const validationError = this.validateForm(payload);
        if (validationError) {
            App.showNotification(validationError, 'error');
            return;
        }

        try {
            const response = await fetch('/api/planned/rides', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                throw new Error(errorData?.message || `HTTP ${response.status}`);
            }

            const createdRide = await response.json();
            this.rides.unshift(createdRide);
            this.renderRides();
            this.resetForm();
            App.showNotification('Поездка успешно запланирована', 'success');
            return;
        } catch (error) {
            console.warn('Не удалось создать поездку через API', error);
        }

        const fallbackRide = {
            id: `planned-local-${Date.now()}`,
            from: payload.from,
            to: payload.to,
            plannedAt: payload.plannedAt,
            price: Number(payload.price),
            status: 'scheduled'
        };

        this.rides.unshift(fallbackRide);
        Helpers.saveToStorage('plannedRides', this.rides);
        this.renderRides();
        this.resetForm();
        App.showNotification('Поездка сохранена локально (сервер недоступен)', 'info');
    },

    resetForm: function() {
        const from = document.getElementById('planned-from');
        const to = document.getElementById('planned-to');
        const price = document.getElementById('planned-price');

        if (from) from.value = '';
        if (to) to.value = '';
        if (price) price.value = '';
        this.setDefaultDateTime();
    },

    formatDate: function(value) {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return 'Дата не указана';

        return date.toLocaleString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    renderRides: function() {
        const container = document.getElementById('planned-list');
        if (!container) return;

        if (!this.rides.length) {
            container.innerHTML = '<div class="planned-item"><div class="planned-details"><div class="planned-route">Пока нет запланированных поездок</div><div class="planned-info"><span>Создайте первую поездку через форму выше</span></div></div></div>';
            return;
        }

        container.innerHTML = this.rides
            .map((ride) => `
                <div class="planned-item">
                    <div class="planned-date">
                        <div class="date-day">${this.formatDate(ride.plannedAt)}</div>
                        <div class="date-time">${ride.status === 'scheduled' ? 'Запланирована' : 'Создана'}</div>
                    </div>
                    <div class="planned-details">
                        <div class="planned-route">${ride.from} → ${ride.to}</div>
                        <div class="planned-info">
                            <span><i class="fas fa-ruble-sign"></i> ${Number(ride.price).toLocaleString('ru-RU')} ₽</span>
                            <span><i class="fas fa-hashtag"></i> ${ride.id}</span>
                        </div>
                    </div>
                </div>
            `)
            .join('');
    }
};
