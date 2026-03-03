// ==============================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ==============================================

const Helpers = {
    // Форматирование номера телефона
    formatPhoneNumber: function(phone) {
        const cleaned = phone.replace(/\D/g, '');
        
        if (cleaned.length === 11) {
            return `+${cleaned[0]} (${cleaned.substring(1, 4)}) ${cleaned.substring(4, 7)}-${cleaned.substring(7, 9)}-${cleaned.substring(9)}`;
        } else if (cleaned.length === 10) {
            return `+7 (${cleaned.substring(0, 3)}) ${cleaned.substring(3, 6)}-${cleaned.substring(6, 8)}-${cleaned.substring(8)}`;
        }
        
        return phone;
    },

    // Валидация номера телефона
    validatePhoneNumber: function(phone) {
        const cleaned = phone.replace(/\D/g, '');
        return cleaned.length >= 10 && cleaned.length <= 11;
    },

    // Форматирование цены
    formatPrice: function(price) {
        return parseInt(price).toLocaleString('ru-RU') + ' ₽';
    },

    // Экранирование HTML
    escapeHtml: function(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    // Генерация случайного ID
    generateId: function() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    // Сохранение в localStorage
    saveToStorage: function(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Ошибка сохранения в localStorage:', error);
            return false;
        }
    },

    // Загрузка из localStorage
    loadFromStorage: function(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Ошибка загрузки из localStorage:', error);
            return null;
        }
    },

    // Проверка обязательных полей
    validateRequiredFields: function(fields) {
        for (const field of fields) {
            if (!field.value || field.value.trim() === '') {
                return {
                    valid: false,
                    field: field.element,
                    message: `Поле "${field.label}" обязательно для заполнения`
                };
            }
        }
        return { valid: true };
    },

    // Проверка минимальной цены
    validateMinPrice: function(price, min = 100) {
        const priceValue = parseInt(price.replace(/\D/g, ''));
        return !isNaN(priceValue) && priceValue >= min;
    },

    // Проверка максимальной цены
    validateMaxPrice: function(price, max = 10000) {
        const priceValue = parseInt(price.replace(/\D/g, ''));
        return !isNaN(priceValue) && priceValue <= max;
    },

    // Анимация загрузки
    showLoading: function(element, show = true) {
        if (show) {
            element.classList.add('loading');
            element.disabled = true;
        } else {
            element.classList.remove('loading');
            element.disabled = false;
        }
    },

    // Копирование в буфер обмена
    copyToClipboard: function(text) {
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text).then(() => {
                if (App && App.showNotification) {
                    App.showNotification('Скопировано в буфер обмена', 'success');
                }
            }).catch(err => {
                console.error('Ошибка копирования:', err);
                if (App && App.showNotification) {
                    App.showNotification('Ошибка копирования', 'error');
                }
            });
        } else {
            // Fallback для старых браузеров
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
                document.execCommand('copy');
                if (App && App.showNotification) {
                    App.showNotification('Скопировано в буфер обмена', 'success');
                }
            } catch (err) {
                console.error('Ошибка копирования:', err);
            }
            document.body.removeChild(textArea);
        }
    }
};