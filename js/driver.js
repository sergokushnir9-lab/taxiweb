// ==============================================
// МОДУЛЬ ВОДИТЕЛЯ - ОБНОВЛЕННАЯ ВЕРСИЯ
// ==============================================

const Driver = {
    // Конфигурация
    config: {
        minPrice: 300,
        maxPrice: 1500,
        priceStep: 20,
        defaultPrice: 620,
        modalId: "driver-price-modal",
        tariffModalId: "tariff-modal",
        acceptModalId: "accept-order-modal",
        status: {
            online: "В сети",
            offline: "Не в сети"
        }
    },

    // Состояние модуля
    state: {
        isOnline: true,
        currentOrder: null,
        pendingOffer: null,
        isLoading: false,
        currentTab: 'app-orders',
        activeFilter: 'all',
        activeCity: 'moscow',
        tariffActive: true,
        tariffExpires: null
    },

    // DOM элементы (кеширование)
    elements: {},

    // Загрузка модуля
    load: function() {
        App.loadComponent("driver", () => {
            this.init();
            App.currentSection = "driver";
        });
    },

    // Инициализация модуля
    init: function() {
        this.cacheElements();
        this.initEvents();
        this.checkDriverStatus();
        this.updateUI();
        this.loadOrders();
    },

    // Кеширование DOM элементов
    cacheElements: function() {
        this.elements = {
            driverToggle: document.getElementById("driver-toggle"),
            statusIndicator: document.getElementById("driver-status-indicator"),
            statusText: document.getElementById("driver-status-text"),
            driverCard: document.getElementById("driver-card"),
            tariffInfo: document.getElementById("tariff-info"),
            citySelect: document.getElementById("city-select"),
            sortSelect: document.getElementById("sort-select"),
            appOrdersFeed: document.getElementById("app-orders-feed"),
            tgOrdersFeed: document.getElementById("tg-orders-feed"),
            driverBalance: document.getElementById("driver-balance"),
            driverName: document.getElementById("driver-name"),
            driverRating: document.getElementById("driver-rating"),
            priceSlider: document.getElementById("driver-price-slider"),
            sliderValue: document.getElementById("driver-slider-value"),
            sendOfferBtn: document.getElementById("send-driver-offer-btn"),
            cancelBtn: document.getElementById("cancel-driver-price-btn"),
            originalPrice: document.getElementById("original-price"),
            offerPrice: document.getElementById("offer-price"),
            priceDifference: document.getElementById("price-difference")
        };
    },

    // Инициализация событий
    initEvents: function() {
        // Переключение статуса водителя
        if (this.elements.driverToggle) {
            this.elements.driverToggle.addEventListener("change", () => this.toggleDriverStatus());
        }

        // Выбор города
        if (this.elements.citySelect) {
            this.elements.citySelect.addEventListener("change", (e) => {
                this.state.activeCity = e.target.value;
                this.loadOrders();
            });
        }

        // Сортировка
        if (this.elements.sortSelect) {
            this.elements.sortSelect.addEventListener("change", () => {
                this.loadOrders();
            });
        }

        // Отправка предложения цены
        if (this.elements.sendOfferBtn) {
            this.elements.sendOfferBtn.addEventListener("click", () => this.sendDriverOffer());
        }

        // Отмена предложения
        if (this.elements.cancelBtn) {
            this.elements.cancelBtn.addEventListener("click", () => this.closeDriverModal());
        }

        // Слайдер цены
        if (this.elements.priceSlider) {
            this.elements.priceSlider.addEventListener("input", (e) => {
                this.elements.sliderValue.textContent = e.target.value + " ₽";
                this.elements.offerPrice.textContent = e.target.value + " ₽";
                
                // Обновляем разницу
                const original = parseInt(this.elements.originalPrice.textContent);
                const offer = parseInt(e.target.value);
                const diff = offer - original;
                this.elements.priceDifference.textContent = (diff >= 0 ? '+' : '') + diff + ' ₽';
                this.elements.priceDifference.className = diff >= 0 ? 'price-diff positive' : 'price-diff negative';
            });
        }
    },

    // Проверка статуса водителя
    checkDriverStatus: function() {
        // Здесь будет API запрос для проверки
        // Для демо - симулируем проверку
        const isDriver = localStorage.getItem('isDriver') === 'true';
        
        if (!isDriver) {
            App.showNotification("Вы не зарегистрированы как водитель", "error");
            setTimeout(() => App.loadMainMenu(), 1200);
            return false;
        }
        
        // Загружаем данные водителя
        this.loadDriverData();
        return true;
    },

    // Загрузка данных водителя
    loadDriverData: function() {
        // Здесь будет API запрос
        // Для демо - используем тестовые данные
        const driverData = {
            name: "Иван Петров",
            rating: 4.8,
            balance: 1250,
            carModel: "Toyota Camry",
            carColor: "Черный",
            carNumber: "А123ВС77",
            completedOrders: 247,
            onlineHours: 156,
            tariffActive: true,
            tariffExpires: Date.now() + (8 * 60 * 60 * 1000) + (42 * 60 * 1000) + (15 * 1000) // 8:42:15
        };

        this.updateDriverCard(driverData);
    },

    // Обновление карточки водителя
    updateDriverCard: function(data) {
        if (this.elements.driverName) this.elements.driverName.textContent = data.name;
        if (this.elements.driverRating) this.elements.driverRating.textContent = data.rating;
        if (this.elements.driverBalance) this.elements.driverBalance.textContent = data.balance.toLocaleString() + ' ₽';
        
        // Обновляем тариф
        this.state.tariffActive = data.tariffActive;
        this.state.tariffExpires = data.tariffExpires;
        this.updateTariffInfo();
    },

    // Обновление информации о тарифе
    updateTariffInfo: function() {
        const tariffInfo = this.elements.tariffInfo;
        if (!tariffInfo) return;

        if (this.state.tariffActive && this.state.tariffExpires) {
            tariffInfo.innerHTML = `
                <div class="tariff-status active">
                    <i class="fas fa-crown"></i>
                    <div>
                        <h4>Тариф активен</h4>
                        <p>Истекает через <span id="tariff-expires">8:42:15</span></p>
                    </div>
                    <button class="btn small" onclick="Driver.extendTariff()">
                        Продлить
                    </button>
                </div>
            `;
            
            // Запускаем таймер
            this.startTariffTimer();
        } else {
            tariffInfo.innerHTML = `
                <div class="tariff-status inactive">
                    <i class="fas fa-crown"></i>
                    <div>
                        <h4>Тариф не активен</h4>
                        <p>Для работы необходимо активировать тариф</p>
                    </div>
                    <button class="btn small primary" onclick="Driver.showTariffModal()">
                        Активировать
                    </button>
                </div>
            `;
        }
    },

    // Таймер тарифа
    startTariffTimer: function() {
        if (!this.state.tariffExpires) return;
        
        const updateTimer = () => {
            const now = Date.now();
            const diff = this.state.tariffExpires - now;
            
            if (diff <= 0) {
                this.state.tariffActive = false;
                this.updateTariffInfo();
                App.showNotification("Тариф истек", "warning");
                return;
            }
            
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);
            
            const timerElement = document.getElementById('tariff-expires');
            if (timerElement) {
                timerElement.textContent = `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }
        };
        
        updateTimer();
        setInterval(updateTimer, 1000);
    },

    // Проверка тарифа
    checkTariff: function() {
        if (!this.state.tariffActive) {
            setTimeout(() => this.showTariffModal(), 1000);
        }
    },

    // Показать модалку тарифа
    showTariffModal: function() {
        App.openModal(this.config.tariffModalId);
    },

    // Закрыть модалку тарифа
    closeTariffModal: function() {
        App.closeModal(this.config.tariffModalId);
    },

    // Купить тариф
    buyTariff: function(tariffType) {
        App.showLoader();
        
        // Симуляция API запроса
        setTimeout(() => {
            App.hideLoader();
            
            if (tariffType === '24h') {
                this.state.tariffActive = true;
                this.state.tariffExpires = Date.now() + (24 * 60 * 60 * 1000);
                this.updateTariffInfo();
                App.showNotification("Тариф успешно активирован на 24 часа!", "success");
            } else if (tariffType === '7days') {
                this.state.tariffActive = true;
                this.state.tariffExpires = Date.now() + (7 * 24 * 60 * 60 * 1000);
                this.updateTariffInfo();
                App.showNotification("Тариф успешно активирован на 7 дней!", "success");
            }
            
            this.closeTariffModal();
        }, 1500);
    },

    // Продлить тариф
    extendTariff: function() {
        this.showTariffModal();
    },

    // Переключение статуса водителя
    toggleDriverStatus: function() {
        const toggle = this.elements.driverToggle;
        const indicator = this.elements.statusIndicator;
        const statusText = this.elements.statusText;
        
        this.state.isOnline = toggle.checked;
        
        if (this.state.isOnline) {
            indicator.className = "status-indicator online";
            statusText.textContent = "В сети";
            App.showNotification("Вы теперь онлайн и видите заказы", "success");
            this.loadOrders();
        } else {
            indicator.className = "status-indicator offline";
            statusText.textContent = "Не в сети";
            App.showNotification("Вы теперь оффлайн", "info");
            this.clearOrdersFeed();
        }
    },

    // Переключение табов
    switchTab: function(tabId) {
        this.state.currentTab = tabId;
        
        // Обновляем активные табы
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.toggle('active', tab.getAttribute('data-tab') === tabId);
        });
        
        // Показываем активную панель
        document.querySelectorAll('.tab-pane').forEach(pane => {
            pane.classList.toggle('active', pane.id === `${tabId}-tab`);
        });
        
        // Загружаем данные для активного таба
        if (tabId === 'app-orders' || tabId === 'tg-orders') {
            this.loadOrders();
        } else if (tabId === 'stats') {
            this.loadStatistics();
        }
    },

    // Загрузка заказов
    loadOrders: function() {
        if (!this.state.isOnline || !this.state.tariffActive) {
            this.clearOrdersFeed();
            return;
        }
        
        this.clearOrdersFeed();
        
        // Показываем индикатор загрузки
        const feed = this.state.currentTab === 'app-orders' 
            ? this.elements.appOrdersFeed 
            : this.elements.tgOrdersFeed;
        
        if (feed) {
            feed.innerHTML = '<div class="loading-orders"><i class="fas fa-spinner fa-spin"></i><p>Загружаем заказы...</p></div>';
        }
        
        // Симуляция загрузки
        setTimeout(() => {
            this.renderOrders();
        }, 1000);
    },

    // Очистка ленты заказов
    clearOrdersFeed: function() {
        const message = !this.state.isOnline 
            ? '<div class="empty-orders"><i class="fas fa-wifi-slash"></i><p>Вы не в сети</p></div>'
            : !this.state.tariffActive 
                ? '<div class="empty-orders"><i class="fas fa-crown"></i><p>Активируйте тариф для просмотра заказов</p><button class="btn small" onclick="Driver.showTariffModal()">Активировать</button></div>'
                : '<div class="empty-orders"><i class="fas fa-car"></i><p>Заказов пока нет</p></div>';
        
        if (this.elements.appOrdersFeed) this.elements.appOrdersFeed.innerHTML = message;
        if (this.elements.tgOrdersFeed) this.elements.tgOrdersFeed.innerHTML = message;
    },

    // Рендер заказов
    renderOrders: function() {
        const feed = this.state.currentTab === 'app-orders' 
            ? this.elements.appOrdersFeed 
            : this.elements.tgOrdersFeed;
        
        if (!feed) return;
        
        // Тестовые данные
        const orders = this.state.currentTab === 'app-orders' 
            ? this.getAppOrders()
            : this.getTgOrders();
        
        // Применяем фильтры и сортировку
        const filteredOrders = this.applyFilters(orders);
        const sortedOrders = this.applySorting(filteredOrders);
        
        // Рендерим
        if (sortedOrders.length === 0) {
            feed.innerHTML = '<div class="empty-orders"><i class="fas fa-search"></i><p>Заказов не найдено</p></div>';
            return;
        }
        
        let html = '';
        sortedOrders.forEach(order => {
            html += this.renderOrderCard(order);
        });
        
        feed.innerHTML = html;
    },

    // Получение заказов из приложения
    getAppOrders: function() {
        return [
            {
                id: "1243",
                price: 480,
                distance: "2.8 км",
                from: "ул. Ленина, 10",
                to: "ул. Пушкина, 25",
                time: "2 мин назад",
                passengers: 1,
                category: "Эконом",
                payment: "Карта",
                city: "moscow"
            },
            {
                id: "1244",
                price: 720,
                distance: "5.2 км",
                from: "ТЦ Мега, Химки",
                to: "Шереметьево, терминал D",
                time: "5 мин назад",
                passengers: 2,
                category: "Комфорт",
                payment: "Наличные",
                city: "moscow"
            },
            {
                id: "1245",
                price: 1150,
                distance: "12.5 км",
                from: "ВДНХ, главный вход",
                to: "Домодедово, терминал А",
                time: "12 мин назад",
                passengers: 3,
                category: "Бизнес",
                payment: "Карта",
                city: "moscow"
            },
            {
                id: "1246",
                price: 390,
                distance: "1.5 км",
                from: "м. Проспект Мира",
                to: "м. Сухаревская",
                time: "1 мин назад",
                passengers: 1,
                category: "Эконом",
                payment: "Карта",
                city: "moscow"
            }
        ];
    },

    // Получение заказов из Telegram
    getTgOrders: function() {
        return [
            {
                id: "tg-1001",
                price: 600,
                from: "м. Киевская",
                to: "м. Парк Победы",
                time: "8 мин назад",
                source: "Группа 'Такси Москва'",
                passengers: 1,
                note: "Без разговоров",
                city: "moscow"
            },
            {
                id: "tg-1002",
                price: 850,
                from: "ул. Тверская, 15",
                to: "Аэропорт Внуково",
                time: "15 мин назад",
                source: "Бот 'Заказы такси'",
                passengers: 2,
                note: "3 чемодана",
                city: "moscow"
            },
            {
                id: "tg-1003",
                price: 550,
                from: "Ленинский проспект, 120",
                to: "м. Университет",
                time: "22 мин назад",
                source: "Группа 'Заказы такси ЮЗАО'",
                passengers: 1,
                note: "С ребенком",
                city: "moscow"
            }
        ];
    },

    // Рендер карточки заказа
    renderOrderCard: function(order) {
        const isTg = order.id.startsWith('tg-');
        
        return `
            <div class="order-item ${isTg ? 'tg-order' : ''}" data-order-id="${order.id}">
                <div class="order-header">
                    <div class="order-id">${isTg ? 'TG#' : '#'}${order.id.replace('tg-', '')}</div>
                    <div class="order-time">${order.time}</div>
                </div>
                
                <div class="order-price">
                    <span class="price-badge">${order.price.toLocaleString()} ₽</span>
                    ${order.distance ? `<span class="distance">${order.distance}</span>` : ''}
                </div>
                
                <div class="order-route">
                    <div class="route-point from">
                        <i class="fas fa-circle"></i>
                        <span>${order.from}</span>
                    </div>
                    <div class="route-point to">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>${order.to}</span>
                    </div>
                </div>
                
                <div class="order-meta">
                    <span class="meta-item"><i class="fas fa-user"></i> ${order.passengers} пасс.</span>
                    ${order.category ? `<span class="meta-item"><i class="fas fa-car"></i> ${order.category}</span>` : ''}
                    ${order.payment ? `<span class="meta-item"><i class="fas fa-credit-card"></i> ${order.payment}</span>` : ''}
                    ${order.source ? `<span class="meta-item"><i class="fab fa-telegram"></i> ${order.source}</span>` : ''}
                    ${order.note ? `<span class="meta-item"><i class="fas fa-comment"></i> "${order.note}"</span>` : ''}
                </div>
                
                <div class="driver-actions">
                    <button class="btn accept full-width" onclick="Driver.acceptOrder('${order.id}', ${order.price}, '${order.from}', '${order.to}')">
                        <i class="fas fa-check"></i> Взять за ${order.price} ₽
                    </button>
                    <button class="btn primary outline full-width" onclick="Driver.openPriceModal('${order.id}', ${order.price}, '${order.from}', '${order.to}')">
                        <i class="fas fa-tag"></i> Предложить цену
                    </button>
                </div>
            </div>
        `;
    },

    // Применение фильтров
    applyFilters: function(orders) {
        if (this.state.activeFilter === 'all') return orders;
        
        return orders.filter(order => {
            switch(this.state.activeFilter) {
                case 'high-price':
                    return order.price > 700;
                case 'new':
                    return order.time.includes('мин') && parseInt(order.time) <= 5;
                case 'nearby':
                    return order.distance && parseFloat(order.distance) <= 3;
                case 'airport':
                    return order.to.includes('аэропорт') || order.to.includes('Аэропорт');
                case 'urgent':
                    return order.time.includes('мин') && parseInt(order.time) <= 10;
                case 'without-driver':
                    return Math.random() > 0.5; // Для демо
                default:
                    return true;
            }
        });
    },

    // Применение сортировки
    applySorting: function(orders) {
        const sortBy = this.elements.sortSelect ? this.elements.sortSelect.value : 'newest';
        
        return [...orders].sort((a, b) => {
            switch(sortBy) {
                case 'price-high':
                    return b.price - a.price;
                case 'price-low':
                    return a.price - b.price;
                case 'distance':
                    const distA = a.distance ? parseFloat(a.distance) : 0;
                    const distB = b.distance ? parseFloat(b.distance) : 0;
                    return distA - distB;
                case 'newest':
                default:
                    const timeA = this.parseTime(a.time);
                    const timeB = this.parseTime(b.time);
                    return timeA - timeB;
            }
        });
    },

    // Парсинг времени
    parseTime: function(timeStr) {
        if (timeStr.includes('мин')) {
            return parseInt(timeStr);
        } else if (timeStr.includes('час')) {
            return parseInt(timeStr) * 60;
        }
        return 0;
    },

    // Применение фильтра
    applyFilter: function(filter) {
        this.state.activeFilter = filter;
        this.loadOrders();
    },

    // Обновление UI
    updateUI: function() {
        // Обновляем состояние переключателя
        if (this.elements.driverToggle) {
            this.elements.driverToggle.checked = this.state.isOnline;
        }
        
        // Обновляем индикатор статуса
        if (this.elements.statusIndicator && this.elements.statusText) {
            if (this.state.isOnline) {
                this.elements.statusIndicator.className = "status-indicator online";
                this.elements.statusText.textContent = "В сети";
            } else {
                this.elements.statusIndicator.className = "status-indicator offline";
                this.elements.statusText.textContent = "Не в сети";
            }
        }
    },

    // Принять заказ
    acceptOrder: function(orderId, price, from, to) {
        if (!this.state.tariffActive) {
            this.showTariffModal();
            return;
        }
        
        this.state.currentOrder = { orderId, price, from, to };
        
        // Заполняем модалку данными
        document.getElementById('modal-order-id').textContent = orderId.replace('tg-', '');
        document.getElementById('modal-order-price').textContent = price;
        document.getElementById('modal-from').textContent = from;
        document.getElementById('modal-to').textContent = to;
        
        App.openModal(this.config.acceptModalId);
    },

    // Подтвердить принятие заказа
    confirmAcceptOrder: function() {
        App.showLoader();
        
        // Симуляция API запроса
        setTimeout(() => {
            App.hideLoader();
            App.closeModal(this.config.acceptModalId);
            
            // Показываем контакты в принятом заказе
            const orderElement = document.querySelector(`[data-order-id="${this.state.currentOrder.orderId}"]`);
            if (orderElement) {
                // Удаляем кнопки принятия
                const actions = orderElement.querySelector('.driver-actions');
                if (actions) actions.remove();
                
                // Добавляем контакты
                const contactsHTML = `
                    <div class="order-contacts">
                        <div class="contact-item">
                            <i class="fas fa-phone"></i>
                            <span class="contact-phone">+7 XXX XXX-XX-XX</span>
                            <button class="btn icon-btn small" onclick="Driver.callPassenger('${this.state.currentOrder.orderId}')">
                                <i class="fas fa-phone-alt"></i>
                            </button>
                        </div>
                        <div class="contact-item">
                            <i class="fab fa-telegram"></i>
                            <span class="contact-telegram">Чат с пассажиром</span>
                            <button class="btn icon-btn small primary" onclick="Driver.openChat('${this.state.currentOrder.orderId}')">
                                <i class="fas fa-comment"></i>
                            </button>
                        </div>
                        <div class="order-status">
                            <span class="status-badge accepted">Заказ принят</span>
                        </div>
                    </div>
                `;
                
                orderElement.insertAdjacentHTML('beforeend', contactsHTML);
            }
            
            App.showNotification(`Заказ #${this.state.currentOrder.orderId.replace('tg-', '')} успешно принят!`, "success");
            
            // Обновляем статистику
            const totalOrders = document.getElementById('total-orders');
            if (totalOrders) {
                totalOrders.textContent = parseInt(totalOrders.textContent) + 1;
            }
        }, 1500);
    },

    // Закрыть модалку принятия заказа
    closeAcceptModal: function() {
        App.closeModal(this.config.acceptModalId);
        this.state.currentOrder = null;
    },

    // Открыть модалку предложения цены
    openPriceModal: function(orderId, price, from, to) {
        if (!this.state.tariffActive) {
            this.showTariffModal();
            return;
        }
        
        this.state.currentOrder = { orderId, price, from, to };
        
        // Устанавливаем значения
        const slider = document.getElementById('driver-price-slider');
        const originalPrice = document.getElementById('original-price');
        const currentPrice = document.getElementById('current-order-price');
        
        if (slider && originalPrice && currentPrice) {
            slider.value = Math.max(price + 50, 400);
            slider.dispatchEvent(new Event('input'));
            
            originalPrice.textContent = price + ' ₽';
            currentPrice.innerHTML = `Текущая цена заказа: <strong>${price} ₽</strong>`;
        }
        
        App.openModal(this.config.modalId);
    },

    // Закрыть модалку предложения цены
    closeDriverModal: function() {
        App.closeModal(this.config.modalId);
        this.state.currentOrder = null;
    },

    // Отправить предложение цены
    sendDriverOffer: function() {
        if (!this.state.currentOrder) return;
        
        const offerPrice = document.getElementById('driver-price-slider').value;
        
        App.showLoader();
        
        // Симуляция API запроса
        setTimeout(() => {
            App.hideLoader();
            this.closeDriverModal();
            
            // Обновляем UI заказа
            const orderElement = document.querySelector(`[data-order-id="${this.state.currentOrder.orderId}"]`);
            if (orderElement) {
                orderElement.classList.add('offer-sent');
                
                const priceBadge = orderElement.querySelector('.price-badge');
                if (priceBadge) {
                    priceBadge.innerHTML = `${this.state.currentOrder.price} ₽ <small>(предложено ${offerPrice} ₽)</small>`;
                }
                
                const actions = orderElement.querySelector('.driver-actions');
                if (actions) {
                    actions.innerHTML = `
                        <div class="offer-status">
                            <i class="fas fa-clock"></i>
                            <span>Ожидание ответа от пассажира...</span>
                        </div>
                    `;
                }
            }
            
            App.showNotification(`Предложение ${offerPrice} ₽ отправлено пассажиру!`, "success");
        }, 1500);
    },

    // Обновить заказы
    refreshOrders: function() {
        if (!this.state.tariffActive) {
            this.showTariffModal();
            return;
        }
        
        this.loadOrders();
        App.showNotification("Заказы обновлены", "info");
    },

    // Позвонить пассажиру
    callPassenger: function(orderId) {
        // В реальном приложении здесь будет логика звонка
        App.showNotification("Функция звонка будет доступна в полной версии", "info");
    },

    // Открыть чат
    openChat: function(orderId) {
        // В реальном приложении здесь будет открытие чата
        App.showNotification("Чат с пассажиром откроется в Telegram", "info");
    },

    // Загрузить статистику
    loadStatistics: function() {
        // Здесь будет загрузка статистики с сервера
        console.log("Загрузка статистики...");
    }
};

// Экспорт для глобального доступа
window.Driver = Driver;
