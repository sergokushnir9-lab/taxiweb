// ==============================================
// МОДУЛЬ ПАССАЖИРА
// ==============================================

const Passenger = {
    // Таймер заказа
    orderTimer: null,
    timerSeconds: 0,
    
    // Текущий заказ
    currentOrder: null,

    // Загрузка модуля
    load: function() {
        App.loadComponent('passenger', () => {
            this.init();
            App.currentSection = 'passenger';
        });
    },

    // Инициализация модуля
    init: function() {
        this.loadQuickAddresses();
        this.initEvents();
        this.initPhoneMask();
        this.loadActiveOrder();
    },

    // Загрузка быстрых адресов
    loadQuickAddresses: async function() {
        const fallback = Helpers.loadFromStorage('quickAddresses') || {
            home: { from: 'ул. Ленина, 15', to: '' },
            work: { from: 'ул. Пушкина, 42', to: '' },
            airport: { from: '', to: 'Аэропорт Енакиево' }
        };

        try {
            const response = await fetch('/api/passenger/quick-addresses');
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            this.quickAddresses = await response.json();
            this.saveQuickAddresses();
        } catch (error) {
            console.warn('Не удалось загрузить быстрые адреса из API, используем локальные.', error);
            this.quickAddresses = fallback;
        }
    },

    // Сохранение быстрых адресов
    saveQuickAddresses: function() {
        Helpers.saveToStorage('quickAddresses', this.quickAddresses);
    },

    // Инициализация событий
    initEvents: function() {
        // Быстрые адреса
        document.querySelectorAll('.quick-address').forEach(address => {
            address.addEventListener('click', (e) => {
                const type = e.currentTarget.dataset.type;
                if (type) {
                    this.setQuickAddress(type);
                }
            });
        });

        // Переключатели опций
        document.querySelectorAll('.option-toggle').forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                const option = e.currentTarget.dataset.option;
                if (option) {
                    this.toggleOption(option);
                }
            });
        });

        // Кнопка публикации заказа
        const publishBtn = document.getElementById('publish-order-btn');
        if (publishBtn) {
            publishBtn.addEventListener('click', () => this.publishOrder());
        }

        // Кнопка изменения цены
        const changePriceBtn = document.getElementById('change-price-btn');
        if (changePriceBtn) {
            changePriceBtn.addEventListener('click', () => this.openPriceModal());
        }

        // Обработка изменения цены в модальном окне
        const priceSlider = document.getElementById('price-slider');
        if (priceSlider) {
            priceSlider.addEventListener('input', (e) => {
                document.getElementById('slider-value').textContent = e.target.value + ' ₽';
            });
        }

        // Сохранение новой цены
        const savePriceBtn = document.getElementById('save-price-btn');
        if (savePriceBtn) {
            savePriceBtn.addEventListener('click', () => this.saveNewPrice());
        }

        // Валидация телефона при вводе
        const phoneInput = document.getElementById('phone');
        if (phoneInput) {
            phoneInput.addEventListener('input', (e) => {
                this.formatPhoneInput(e.target);
            });
        }

        // Валидация цены при вводе
        const priceInput = document.getElementById('offer-price');
        if (priceInput) {
            priceInput.addEventListener('input', (e) => {
                this.formatPriceInput(e.target);
            });
        }

        // Сохранение адресов при изменении
        const fromInput = document.getElementById('from');
        const toInput = document.getElementById('to');
        
        if (fromInput) {
            fromInput.addEventListener('blur', () => {
                this.saveRecentAddress('from', fromInput.value);
            });
        }
        
        if (toInput) {
            toInput.addEventListener('blur', () => {
                this.saveRecentAddress('to', toInput.value);
            });
        }
    },

    // Инициализация маски телефона
    initPhoneMask: function() {
        const phoneInput = document.getElementById('phone');
        if (phoneInput) {
            phoneInput.addEventListener('input', function(e) {
                let value = e.target.value.replace(/\D/g, '');
                
                if (value.length > 0) {
                    // Формат: +7 (XXX) XXX-XX-XX
                    let formatted = '+7';
                    if (value.length > 1) {
                        formatted += ' (' + value.substring(1, 4);
                    }
                    if (value.length >= 4) {
                        formatted += ') ' + value.substring(4, 7);
                    }
                    if (value.length >= 7) {
                        formatted += '-' + value.substring(7, 9);
                    }
                    if (value.length >= 9) {
                        formatted += '-' + value.substring(9, 11);
                    }
                    
                    e.target.value = formatted;
                }
            });
        }
    },

    // Форматирование ввода телефона
    formatPhoneInput: function(input) {
        input.value = input.value.replace(/[^\d\s()+-]/g, '');
    },

    // Форматирование ввода цены
    formatPriceInput: function(input) {
        input.value = input.value.replace(/\D/g, '');
        
        // Добавляем разделители тысяч при вводе
        if (input.value.length > 3) {
            const value = parseInt(input.value);
            input.value = value.toLocaleString('ru-RU');
        }
    },

    // Установка быстрого адреса
    setQuickAddress: function(type) {
        const address = this.quickAddresses[type];
        if (!address) return;

        const fromInput = document.getElementById('from');
        const toInput = document.getElementById('to');

        if (address.from && fromInput) {
            fromInput.value = address.from;
            fromInput.focus();
        }
        
        if (address.to && toInput) {
            toInput.value = address.to;
            toInput.focus();
        }

        // Показываем уведомление
        const addressNames = {
            'home': 'Домой',
            'work': 'На работу',
            'airport': 'В аэропорт'
        };
        
        App.showNotification(`Адрес "${addressNames[type]}" установлен`, 'success');
    },

    // Переключение опции
    toggleOption: function(option) {
        const toggle = document.getElementById(`${option}-toggle`);
        if (toggle) {
            toggle.checked = !toggle.checked;
            
            // Анимация переключения
            const toggleSwitch = toggle.parentElement;
            toggleSwitch.classList.add('toggled');
            setTimeout(() => {
                toggleSwitch.classList.remove('toggled');
            }, 300);
            
            App.showNotification(
                `${option === 'child-seat' ? 'Детское кресло' : 'Багаж'} ${toggle.checked ? 'добавлено' : 'убрано'}`,
                'info'
            );
        }
    },

    // Сохранение недавнего адреса
    saveRecentAddress: function(type, value) {
        if (!value || value.trim() === '') return;
        
        let recentAddresses = Helpers.loadFromStorage('recentAddresses') || { from: [], to: [] };
        
        // Добавляем адрес, если его еще нет
        if (!recentAddresses[type].includes(value)) {
            recentAddresses[type].unshift(value);
            // Ограничиваем количество сохраненных адресов
            if (recentAddresses[type].length > 5) {
                recentAddresses[type].pop();
            }
            
            Helpers.saveToStorage('recentAddresses', recentAddresses);
        }
    },

    // Валидация формы
    validateForm: function() {
        const from = document.getElementById('from');
        const to = document.getElementById('to');
        const phone = document.getElementById('phone');
        const price = document.getElementById('offer-price');

        const validation = Helpers.validateRequiredFields([
            { element: from, label: 'Откуда', value: from.value },
            { element: to, label: 'Куда', value: to.value },
            { element: phone, label: 'Телефон', value: phone.value },
            { element: price, label: 'Цена', value: price.value }
        ]);

        if (!validation.valid) {
            validation.field.focus();
            return { valid: false, error: validation.message };
        }

        // Валидация телефона
        if (!Helpers.validatePhoneNumber(phone.value)) {
            phone.focus();
            return { valid: false, error: 'Пожалуйста, введите корректный номер телефона' };
        }

        // Валидация цены
        const priceValue = parseInt(price.value.replace(/\D/g, ''));
        if (isNaN(priceValue) || priceValue < 100) {
            price.focus();
            return { valid: false, error: 'Минимальная цена - 100 ₽' };
        }

        if (priceValue > 10000) {
            price.focus();
            return { valid: false, error: 'Максимальная цена - 10 000 ₽' };
        }

        return { valid: true, data: { from: from.value, to: to.value, phone: phone.value, price: priceValue } };
    },

    // Публикация заказа
    publishOrder: async function() {
        const validation = this.validateForm();
        if (!validation.valid) {
            App.showNotification(validation.error, 'error');
            return;
        }

        const data = validation.data;
        const childSeat = document.getElementById('child-seat-toggle').checked;
        const luggage = document.getElementById('luggage-toggle').checked;

        try {
            const response = await fetch('/api/passenger/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    from: data.from,
                    to: data.to,
                    phone: data.phone,
                    price: data.price,
                    comment: [childSeat ? 'Детское кресло' : '', luggage ? 'Багаж' : ''].filter(Boolean).join(', ')
                })
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const apiOrder = await response.json();
            this.currentOrder = {
                ...apiOrder,
                childSeat: childSeat,
                luggage: luggage,
                status: 'waiting',
                driver: null
            };

            this.saveOrder(this.currentOrder);
        } catch (error) {
            console.error('Ошибка публикации заказа через API:', error);
            App.showNotification('Не удалось опубликовать заказ на сервере', 'error');
            return;
        }
        
        // Показываем активный заказ
        this.showActiveOrder(this.currentOrder);
        
        // Запускаем таймер
        this.startOrderTimer();
        
        App.showNotification('Заказ опубликован! Ожидайте откликов водителей.', 'success');
    },

    // Сохранение заказа
    saveOrder: function(order) {
        let orders = Helpers.loadFromStorage('passengerOrders') || [];
        orders.push(order);
        Helpers.saveToStorage('passengerOrders', orders);
    },

    // Показ активного заказа
    showActiveOrder: function(order) {
        const activeOrder = document.getElementById('active-order');
        if (!activeOrder) return;

        // Заполняем данные
        document.getElementById('active-from').textContent = order.from;
        document.getElementById('active-to').textContent = order.to;
        document.getElementById('active-phone').textContent = Helpers.formatPhoneNumber(order.phone);
        document.getElementById('active-price').textContent = Helpers.formatPrice(order.price);

        // Детали заказа
        let detailsHtml = '';
        if (order.childSeat) {
            detailsHtml += `<div class="detail-item">
                <i class="fas fa-baby"></i>
                <span>Детское кресло: <strong>Да</strong></span>
            </div>`;
        }
        if (order.luggage) {
            detailsHtml += `<div class="detail-item">
                <i class="fas fa-suitcase"></i>
                <span>Багаж: <strong>Да</strong></span>
            </div>`;
        }
        
        const orderDetails = document.getElementById('order-details');
        if (orderDetails) {
            orderDetails.innerHTML = detailsHtml;
        }

        // Показываем блок
        activeOrder.classList.remove('hidden');
        
        // Скроллим к активному заказу
        setTimeout(() => {
            activeOrder.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 300);
    },

    // Запуск таймера заказа
    startOrderTimer: function() {
        this.timerSeconds = 0;
        
        if (this.orderTimer) {
            clearInterval(this.orderTimer);
        }
        
        this.orderTimer = setInterval(() => {
            this.timerSeconds++;
            this.updateTimerDisplay();
        }, 1000);
    },

    // Обновление отображения таймера
    updateTimerDisplay: function() {
        const timerElement = document.getElementById('timer');
        if (!timerElement) return;
        
        const minutes = Math.floor(this.timerSeconds / 60);
        const seconds = this.timerSeconds % 60;
        
        timerElement.textContent = 
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    },

    // Загрузка активного заказа
    loadActiveOrder: function() {
        const orders = Helpers.loadFromStorage('passengerOrders') || [];
        const activeOrder = orders.find(order => order.status === 'waiting');
        
        if (activeOrder) {
            this.currentOrder = activeOrder;
            this.showActiveOrder(activeOrder);
            this.startOrderTimer();
            
            // Восстанавливаем таймер
            const timeDiff = Math.floor((Date.now() - new Date(activeOrder.createdAt).getTime()) / 1000);
            this.timerSeconds = timeDiff;
            this.updateTimerDisplay();
        }
    },

    // Открытие модального окна цены
    openPriceModal: function() {
        if (!this.currentOrder) return;
        
        const modal = document.getElementById('price-modal');
        if (!modal) return;
        
        const priceSlider = document.getElementById('price-slider');
        const sliderValue = document.getElementById('slider-value');
        
        // Устанавливаем текущую цену
        priceSlider.value = this.currentOrder.price;
        sliderValue.textContent = Helpers.formatPrice(this.currentOrder.price);
        
        // Показываем модальное окно
        modal.style.display = 'flex';
    },

    // Сохранение новой цены
    saveNewPrice: function() {
        const priceSlider = document.getElementById('price-slider');
        if (!priceSlider || !this.currentOrder) return;
        
        const newPrice = parseInt(priceSlider.value);
        
        // Обновляем цену в текущем заказе
        this.currentOrder.price = newPrice;
        document.getElementById('active-price').textContent = Helpers.formatPrice(newPrice);
        
        // Обновляем в хранилище
        let orders = Helpers.loadFromStorage('passengerOrders') || [];
        const orderIndex = orders.findIndex(order => order.id === this.currentOrder.id);
        if (orderIndex !== -1) {
            orders[orderIndex].price = newPrice;
            Helpers.saveToStorage('passengerOrders', orders);
        }
        
        // Закрываем модальное окно
        this.closePriceModal();
        
        App.showNotification(`Цена обновлена: ${Helpers.formatPrice(newPrice)}`, 'success');
    },

    // Закрытие модального окна цены
    closePriceModal: function() {
        const modal = document.getElementById('price-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    },

    // Отмена заказа
    cancelOrder: function() {
        if (!this.currentOrder) return;
        
        if (confirm('Вы уверены, что хотите отменить заказ?')) {
            // Обновляем статус заказа
            this.currentOrder.status = 'cancelled';
            
            // Обновляем в хранилище
            let orders = Helpers.loadFromStorage('passengerOrders') || [];
            const orderIndex = orders.findIndex(order => order.id === this.currentOrder.id);
            if (orderIndex !== -1) {
                orders[orderIndex].status = 'cancelled';
                Helpers.saveToStorage('passengerOrders', orders);
            }
            
            // Останавливаем таймер
            if (this.orderTimer) {
                clearInterval(this.orderTimer);
                this.orderTimer = null;
            }
            
            // Скрываем активный заказ
            const activeOrder = document.getElementById('active-order');
            if (activeOrder) {
                activeOrder.classList.add('hidden');
            }
            
            // Сбрасываем текущий заказ
            this.currentOrder = null;
            
            App.showNotification('Заказ отменен', 'info');
        }
    },

    // Принятие заказа водителем
    acceptOrder: function(driverInfo) {
        if (!this.currentOrder) return;
        
        this.currentOrder.status = 'accepted';
        this.currentOrder.driver = driverInfo;
        
        // Обновляем в хранилище
        let orders = Helpers.loadFromStorage('passengerOrders') || [];
        const orderIndex = orders.findIndex(order => order.id === this.currentOrder.id);
        if (orderIndex !== -1) {
            orders[orderIndex].status = 'accepted';
            orders[orderIndex].driver = driverInfo;
            Helpers.saveToStorage('passengerOrders', orders);
        }
        
        // Обновляем отображение
        this.updateOrderStatus('accepted', driverInfo);
        
        App.showNotification(`Водитель ${driverInfo.name} принял ваш заказ!`, 'success');
    },

    // Обновление статуса заказа
    updateOrderStatus: function(status, driverInfo = null) {
        const statusBadge = document.getElementById('order-timer');
        if (!statusBadge) return;
        
        const statusText = {
            'waiting': 'Ожидает водителя',
            'accepted': 'Водитель в пути',
            'completed': 'Поездка завершена',
            'cancelled': 'Заказ отменен'
        };
        
        statusBadge.className = 'status-badge';
        statusBadge.classList.add(status);
        statusBadge.innerHTML = `${statusText[status]} • <span id="timer">${this.getTimerText()}</span>`;
        
        // Если есть водитель, показываем информацию
        if (driverInfo && status === 'accepted') {
            const driverName = document.getElementById('driver-name');
            if (driverName) {
                driverName.textContent = driverInfo.name;
            }
        }
    },

    // Получение текста таймера
    getTimerText: function() {
        const minutes = Math.floor(this.timerSeconds / 60);
        const seconds = this.timerSeconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    },

    // Очистка при разгрузке модуля
    cleanup: function() {
        if (this.orderTimer) {
            clearInterval(this.orderTimer);
            this.orderTimer = null;
        }
    }
};

// Глобальная функция для загрузки модуля пассажира
window.loadPassenger = () => Passenger.load();