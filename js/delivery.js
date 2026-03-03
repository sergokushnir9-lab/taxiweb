// ==============================================
// МОДУЛЬ ДОСТАВКИ
// ==============================================

const Delivery = {
    // Конфигурация модуля
    config: {
        maxChars: 500,
        maxPrice: 10000,
        minPrice: 100,
        defaultPrice: 300
    },
    
    // Состояние модуля
    state: {
        isFragile: false,
        isCold: false,
        isFast: false,
        currentAddressType: null,
        activeOrder: null
    },
    
    // Быстрые адреса
    quickAddresses: {
        "home": {
            address: "ул. Ленина, 15, кв. 42",
            hint: "Домашний адрес",
            icon: "home"
        },
        "work": {
            address: "ул. Пушкина, 42, офис 305",
            hint: "Рабочий адрес",
            icon: "briefcase"
        },
        "market": {
            address: "ул. Торговая, 8, супермаркет 'Продукты'",
            hint: "Ближайший магазин",
            icon: "shopping-cart"
        },
        "friend": {
            address: "пр. Мира, 25, подъезд 3",
            hint: "К другу",
            icon: "user-friends"
        }
    },

    // Загрузка модуля
    load: function() {
        App.loadComponent("delivery", () => {
            this.init();
            App.currentSection = "delivery";
            
            // Показываем TaxiLoader на 1 секунду для имитации загрузки
            if (typeof TaxiLoader !== 'undefined') {
                TaxiLoader.show('Загружаем модуль доставки...', 1000);
            }
        });
    },

    // Инициализация модуля
    init: function() {
        this.initElements();
        this.initEvents();
        this.loadUserPreferences();
        this.setupPriceInput();
        this.updateCharCounter(); // Инициализация счетчика
    },

    // Инициализация элементов DOM
    initElements: function() {
        this.elements = {
            addressInput: document.getElementById("delivery-address"),
            phoneInput: document.getElementById("delivery-phone"),
            itemsTextarea: document.getElementById("delivery-items"),
            priceInput: document.getElementById("delivery-price"),
            charCounter: document.getElementById("delivery-char-counter"),
            publishBtn: document.getElementById("publish-delivery-btn"),
            fragileToggle: document.getElementById("delivery-fragile-toggle"),
            coldToggle: document.getElementById("delivery-cold-toggle"),
            fastToggle: document.getElementById("delivery-fast-toggle"),
            quickAddresses: document.querySelectorAll(".quick-address"),
            quickAddressesContainer: document.querySelector(".quick-addresses"),
            priceHint: document.querySelector(".price-hint strong")
        };
    },

    // Инициализация событий
    initEvents: function() {
        // Быстрые адреса
        if (this.elements.quickAddresses) {
            this.elements.quickAddresses.forEach(address => {
                address.addEventListener("click", (e) => {
                    const type = e.currentTarget.dataset.type;
                    if (type) {
                        this.setQuickAddress(type);
                    }
                });
            });
        }

        // Переключатели опций
        document.querySelectorAll(".option-toggle").forEach(toggle => {
            toggle.addEventListener("click", (e) => {
                const option = e.currentTarget.dataset.option;
                if (option) {
                    this.toggleOption(option);
                }
            });
        });

        // События для тогглов
        if (this.elements.fragileToggle) {
            this.elements.fragileToggle.addEventListener("change", (e) => {
                this.state.isFragile = e.target.checked;
                this.updatePriceHint();
            });
        }
        
        if (this.elements.coldToggle) {
            this.elements.coldToggle.addEventListener("change", (e) => {
                this.state.isCold = e.target.checked;
                this.updatePriceHint();
            });
        }
        
        if (this.elements.fastToggle) {
            this.elements.fastToggle.addEventListener("change", (e) => {
                this.state.isFast = e.target.checked;
                this.updatePriceHint();
            });
        }

        // Счетчик символов
        if (this.elements.itemsTextarea) {
            this.elements.itemsTextarea.addEventListener("input", this.updateCharCounter.bind(this));
            this.elements.itemsTextarea.addEventListener("focus", this.handleTextareaFocus.bind(this));
            this.elements.itemsTextarea.addEventListener("blur", this.handleTextareaBlur.bind(this));
        }

        // Кнопка публикации
        if (this.elements.publishBtn) {
            this.elements.publishBtn.addEventListener("click", this.publishDelivery.bind(this));
        }

        // Валидация поля цены
        if (this.elements.priceInput) {
            this.elements.priceInput.addEventListener("input", this.validatePrice.bind(this));
            this.elements.priceInput.addEventListener("blur", this.formatPrice.bind(this));
        }

        // Валидация телефона
        if (this.elements.phoneInput) {
            this.elements.phoneInput.addEventListener("input", this.formatPhone.bind(this));
        }

        // Валидация адреса
        if (this.elements.addressInput) {
            this.elements.addressInput.addEventListener("input", this.validateAddress.bind(this));
        }
    },

    // Загрузка предпочтений пользователя
    loadUserPreferences: function() {
        try {
            const savedAddress = localStorage.getItem('delivery_last_address');
            const savedPhone = localStorage.getItem('delivery_last_phone');
            
            if (savedAddress && this.elements.addressInput) {
                this.elements.addressInput.value = savedAddress;
            }
            
            if (savedPhone && this.elements.phoneInput) {
                this.elements.phoneInput.value = savedPhone;
            }
            
            // Загрузка настроек опций
            const savedFragile = localStorage.getItem('delivery_fragile') === 'true';
            const savedCold = localStorage.getItem('delivery_cold') === 'true';
            const savedFast = localStorage.getItem('delivery_fast') === 'true';
            
            if (this.elements.fragileToggle) {
                this.elements.fragileToggle.checked = savedFragile;
                this.state.isFragile = savedFragile;
            }
            
            if (this.elements.coldToggle) {
                this.elements.coldToggle.checked = savedCold;
                this.state.isCold = savedCold;
            }
            
            if (this.elements.fastToggle) {
                this.elements.fastToggle.checked = savedFast;
                this.state.isFast = savedFast;
            }
            
        } catch (e) {
            console.warn('Не удалось загрузить настройки доставки:', e);
        }
    },

    // Настройка поля цены
    setupPriceInput: function() {
        if (this.elements.priceInput) {
            // Устанавливаем placeholder с рекомендованной ценой
            this.elements.priceInput.placeholder = `Цена за доставку* (рекомендуемо: ${this.config.defaultPrice}₽)`;
            
            // Автозаполнение цены
            this.elements.priceInput.addEventListener("focus", () => {
                if (!this.elements.priceInput.value) {
                    this.elements.priceInput.value = this.config.defaultPrice;
                    this.formatPrice();
                }
            });
            
            this.updatePriceHint();
        }
    },

    // Обновление подсказки цены
    updatePriceHint: function() {
        if (!this.elements.priceHint) return;
        
        let baseMin = 200;
        let baseMax = 500;
        
        // Увеличиваем цену в зависимости от опций
        if (this.state.isFragile) {
            baseMin += 100;
            baseMax += 150;
        }
        
        if (this.state.isCold) {
            baseMin += 50;
            baseMax += 100;
        }
        
        if (this.state.isFast) {
            baseMin += 200;
            baseMax += 300;
        }
        
        this.elements.priceHint.textContent = `${baseMin}–${baseMax} ₽`;
    },

    // Установка быстрого адреса
    setQuickAddress: function(type) {
        const addressData = this.quickAddresses[type];
        if (addressData && this.elements.addressInput) {
            // Сбрасываем предыдущий активный адрес
            this.elements.quickAddresses.forEach(addr => {
                addr.classList.remove('active');
            });
            
            // Устанавливаем новый активный адрес
            const selectedAddress = document.querySelector(`.quick-address[data-type="${type}"]`);
            if (selectedAddress) {
                selectedAddress.classList.add('active');
            }
            
            this.elements.addressInput.value = addressData.address;
            this.state.currentAddressType = type;
            
            // Сохраняем в локальное хранилище
            try {
                localStorage.setItem('delivery_last_address_type', type);
                localStorage.setItem('delivery_last_address', addressData.address);
            } catch (e) {
                console.warn('Не удалось сохранить адрес:', e);
            }
            
            App.showNotification(`Установлен ${addressData.hint}`, "info");
            
            // Фокус на следующее поле
            if (this.elements.phoneInput) {
                this.elements.phoneInput.focus();
            }
        }
    },

    // Переключение опции
    toggleOption: function(option) {
        const toggleId = option + "-toggle";
        const toggle = document.getElementById(toggleId);
        
        if (toggle) {
            const isChecked = !toggle.checked;
            toggle.checked = isChecked;
            
            // Обновляем состояние
            switch(option) {
                case 'delivery-fragile':
                    this.state.isFragile = isChecked;
                    localStorage.setItem('delivery_fragile', isChecked);
                    break;
                case 'delivery-cold':
                    this.state.isCold = isChecked;
                    localStorage.setItem('delivery_cold', isChecked);
                    break;
                case 'delivery-fast':
                    this.state.isFast = isChecked;
                    localStorage.setItem('delivery_fast', isChecked);
                    break;
            }
            
            // Визуальная обратная связь
            const toggleElement = toggle.closest('.option-toggle');
            if (toggleElement) {
                if (isChecked) {
                    toggleElement.classList.add('active');
                } else {
                    toggleElement.classList.remove('active');
                }
            }
            
            this.updatePriceHint();
        }
    },

    // Обновление счетчика символов
    updateCharCounter: function() {
        if (!this.elements.itemsTextarea || !this.elements.charCounter) return;
        
        const length = this.elements.itemsTextarea.value.length;
        const remaining = this.config.maxChars - length;
        
        this.elements.charCounter.textContent = `${length}/${this.config.maxChars} символов`;
        
        // Сбрасываем классы
        this.elements.charCounter.className = "char-counter";
        
        // Добавляем классы в зависимости от количества символов
        if (remaining < 50) {
            this.elements.charCounter.classList.add("warning");
        }
        if (remaining < 10) {
            this.elements.charCounter.classList.add("error");
        }
        
        // Обновляем placeholder если поле пустое
        if (length === 0) {
            this.elements.itemsTextarea.placeholder = "Напишите список товаров (например: Пицца Маргарита - 2 шт, Кола 1.5л - 3 шт, Салат Цезарь - 1 порция)";
        }
    },

    // Обработка фокуса на textarea
    handleTextareaFocus: function() {
        const textarea = this.elements.itemsTextarea;
        if (textarea) {
            textarea.parentElement.classList.add('focused');
            
            // Показываем подсказку о формате
            if (!textarea.value) {
                this.showFormatHint();
            }
        }
    },

    // Обработка потери фокуса на textarea
    handleTextareaBlur: function() {
        const textarea = this.elements.itemsTextarea;
        if (textarea) {
            textarea.parentElement.classList.remove('focused');
        }
    },

    // Показ подсказки о формате
    showFormatHint: function() {
        App.showNotification("Укажите товары в формате: Название - количество - детали", "info", 3000);
    },

    // Форматирование телефона
    formatPhone: function(e) {
        const input = e.target;
        let value = input.value.replace(/\D/g, '');
        
        if (value.length > 0) {
            if (value[0] === '7' || value[0] === '8') {
                value = value.substring(1);
            }
            
            let formatted = '+7 ';
            
            if (value.length > 0) {
                formatted += '(' + value.substring(0, 3);
            }
            if (value.length > 3) {
                formatted += ') ' + value.substring(3, 6);
            }
            if (value.length > 6) {
                formatted += '-' + value.substring(6, 8);
            }
            if (value.length > 8) {
                formatted += '-' + value.substring(8, 10);
            }
            
            input.value = formatted;
        }
    },

    // Валидация цены
    validatePrice: function(e) {
        const input = e.target;
        let value = input.value.replace(/\D/g, '');
        
        // Ограничиваем максимальную цену
        if (parseInt(value) > this.config.maxPrice) {
            value = this.config.maxPrice.toString();
        }
        
        input.value = value;
        
        // Подсветка поля если цена слишком низкая
        if (parseInt(value) < this.config.minPrice) {
            input.classList.add('warning');
        } else {
            input.classList.remove('warning');
        }
    },

    // Форматирование цены
    formatPrice: function() {
        const input = this.elements.priceInput;
        if (!input || !input.value) return;
        
        let value = input.value.replace(/\D/g, '');
        if (value) {
            input.value = parseInt(value).toLocaleString('ru-RU') + ' ₽';
        }
    },

    // Валидация адреса
    validateAddress: function(e) {
        const input = e.target;
        const value = input.value.trim();
        
        // Сбрасываем активный быстрый адрес если пользователь вводит вручную
        if (value && this.state.currentAddressType) {
            const selectedAddress = document.querySelector(`.quick-address[data-type="${this.state.currentAddressType}"]`);
            if (selectedAddress) {
                selectedAddress.classList.remove('active');
            }
            this.state.currentAddressType = null;
        }
        
        // Валидация минимальной длины адреса
        if (value.length > 0 && value.length < 5) {
            input.classList.add('warning');
        } else {
            input.classList.remove('warning');
        }
    },

    // Валидация формы
    validateForm: function() {
        const errors = [];
        
        if (!this.elements.addressInput.value.trim()) {
            errors.push("Укажите адрес доставки");
            this.elements.addressInput.classList.add('error');
        } else {
            this.elements.addressInput.classList.remove('error');
        }
        
        if (!this.elements.phoneInput.value.trim() || this.elements.phoneInput.value.replace(/\D/g, '').length < 10) {
            errors.push("Введите корректный номер телефона");
            this.elements.phoneInput.classList.add('error');
        } else {
            this.elements.phoneInput.classList.remove('error');
        }
        
        if (!this.elements.itemsTextarea.value.trim()) {
            errors.push("Добавьте список товаров");
            this.elements.itemsTextarea.classList.add('error');
        } else if (this.elements.itemsTextarea.value.trim().length < 10) {
            errors.push("Список товаров слишком короткий");
            this.elements.itemsTextarea.classList.add('error');
        } else {
            this.elements.itemsTextarea.classList.remove('error');
        }
        
        const price = parseInt(this.elements.priceInput.value.replace(/\D/g, '') || '0');
        if (!price || price < this.config.minPrice) {
            errors.push(`Минимальная цена доставки: ${this.config.minPrice}₽`);
            this.elements.priceInput.classList.add('error');
        } else if (price > this.config.maxPrice) {
            errors.push(`Максимальная цена доставки: ${this.config.maxPrice}₽`);
            this.elements.priceInput.classList.add('error');
        } else {
            this.elements.priceInput.classList.remove('error');
        }
        
        return errors;
    },

    // Публикация доставки
    publishDelivery: async function() {
        // Валидация формы
        const errors = this.validateForm();
        if (errors.length > 0) {
            errors.forEach(error => {
                App.showNotification(error, "error");
            });
            return;
        }

        // Показываем лоадер
        if (typeof TaxiLoader !== 'undefined') {
            TaxiLoader.show('Ищем курьера для доставки...');
        }

        // Подготовка данных
        const deliveryData = {
            address: this.elements.addressInput.value.trim(),
            phone: this.elements.phoneInput.value.trim(),
            items: this.elements.itemsTextarea.value.trim(),
            price: parseInt(this.elements.priceInput.value.replace(/\D/g, '')),
            options: {
                fragile: this.state.isFragile,
                cold: this.state.isCold,
                fast: this.state.isFast
            },
            timestamp: new Date().toISOString(),
            status: 'waiting'
        };

        try {
            // Сохраняем в историю
            this.saveToHistory(deliveryData);
            
            // Сохраняем предпочтения пользователя
            this.saveUserPreferences();
            
            // Имитация API запроса
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Скрываем лоадер
            if (typeof TaxiLoader !== 'undefined') {
                TaxiLoader.hide();
            }
            
            // Показываем успешное уведомление
            App.showNotification("Заказ на доставку опубликован! Ищем курьера...", "success");
            
            // Сохраняем активный заказ
            this.state.activeOrder = deliveryData;
            
            // Перенаправляем на страницу активных заказов
            setTimeout(() => {
                if (typeof App !== 'undefined') {
                    App.loadSection('passenger');
                }
            }, 1500);
            
        } catch (error) {
            console.error('Ошибка при публикации доставки:', error);
            
            if (typeof TaxiLoader !== 'undefined') {
                TaxiLoader.hide();
            }
            
            App.showNotification("Ошибка при публикации заказа. Попробуйте еще раз.", "error");
        }
    },

    // Сохранение в историю
    saveToHistory: function(deliveryData) {
        try {
            const history = JSON.parse(localStorage.getItem('delivery_history') || '[]');
            history.unshift({
                ...deliveryData,
                id: Date.now(),
                completed: false
            });
            
            // Ограничиваем историю 50 записями
            if (history.length > 50) {
                history.pop();
            }
            
            localStorage.setItem('delivery_history', JSON.stringify(history));
        } catch (e) {
            console.warn('Не удалось сохранить историю доставки:', e);
        }
    },

    // Сохранение предпочтений пользователя
    saveUserPreferences: function() {
        try {
            localStorage.setItem('delivery_last_address', this.elements.addressInput.value.trim());
            localStorage.setItem('delivery_last_phone', this.elements.phoneInput.value.trim());
            localStorage.setItem('delivery_fragile', this.state.isFragile);
            localStorage.setItem('delivery_cold', this.state.isCold);
            localStorage.setItem('delivery_fast', this.state.isFast);
        } catch (e) {
            console.warn('Не удалось сохранить настройки:', e);
        }
    },

    // Получение активного заказа
    getActiveOrder: function() {
        return this.state.activeOrder;
    },

    // Очистка формы
    clearForm: function() {
        if (this.elements.addressInput) this.elements.addressInput.value = '';
        if (this.elements.phoneInput) this.elements.phoneInput.value = '';
        if (this.elements.itemsTextarea) this.elements.itemsTextarea.value = '';
        if (this.elements.priceInput) this.elements.priceInput.value = '';
        
        // Сброс тогглов
        if (this.elements.fragileToggle) {
            this.elements.fragileToggle.checked = false;
            this.state.isFragile = false;
        }
        
        if (this.elements.coldToggle) {
            this.elements.coldToggle.checked = false;
            this.state.isCold = false;
        }
        
        if (this.elements.fastToggle) {
            this.elements.fastToggle.checked = false;
            this.state.isFast = false;
        }
        
        // Сброс активных быстрых адресов
        this.elements.quickAddresses.forEach(addr => {
            addr.classList.remove('active');
        });
        
        this.state.currentAddressType = null;
        this.updateCharCounter();
        this.updatePriceHint();
    }
};