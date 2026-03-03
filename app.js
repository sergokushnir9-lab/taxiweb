// ==============================================
// ОСНОВНОЙ JAVASCRIPT ДЛЯ НОВЫХ ФУНКЦИЙ
// ==============================================

// Инициализация
document.addEventListener('DOMContentLoaded', function() {
    initApp();
});

function initApp() {
    // Инициализация таймера для активного заказа
    startOrderTimer();
    
    // Загрузка истории поездок
    loadHistory();
    
    // Загрузка заказов для водителя
    loadDriverOrders();
    
    // Загрузка уведомлений
    loadNotifications();
    
    // Загрузка семейных данных
    loadFamilyData();
}

// ========================
// ОБЩИЕ ФУНКЦИИ
// ========================

// Таймер ожидания заказа
let orderTimerInterval;
function startOrderTimer() {
    let seconds = 0;
    orderTimerInterval = setInterval(() => {
        seconds++;
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        document.getElementById('timer').textContent = 
            `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }, 1000);
}

// Уведомления
function toggleNotifications() {
    document.getElementById('notifications-modal').style.display = 'flex';
}

function clearAllNotifications() {
    document.getElementById('notifications-list').innerHTML = 
        '<div class="no-notifications">Нет уведомлений</div>';
    document.getElementById('notification-count').textContent = '0';
    document.getElementById('notifications-modal').style.display = 'none';
}

function loadNotifications() {
    // В реальном приложении здесь запрос к API
    const notifications = [
        {
            icon: 'fas fa-car',
            title: 'Новый заказ рядом',
            text: 'ул. Ленина → ул. Пушкина за 480 ₽',
            time: '2 мин назад',
            new: true
        },
        {
            icon: 'fas fa-wallet',
            title: 'Пополнение баланса',
            text: '+500 ₽ зачислено на счет',
            time: '1 час назад',
            new: true
        }
    ];
    
    const list = document.querySelector('.notifications-list');
    list.innerHTML = notifications.map(notification => `
        <div class="notification-item ${notification.new ? 'new' : ''}">
            <div class="notification-icon">
                <i class="${notification.icon}"></i>
            </div>
            <div class="notification-content">
                <div class="notification-title">${notification.title}</div>
                <div class="notification-text">${notification.text}</div>
                <div class="notification-time">${notification.time}</div>
            </div>
        </div>
    `).join('');
}

// ========================
// ПАССАЖИРСКИЕ ФУНКЦИИ
// ========================

// Быстрые адреса
function setQuickAddress(type, label, address) {
    if (type === 'home' || type === 'work') {
        document.getElementById('from').value = address;
        document.getElementById('from').focus();
    } else if (type === 'airport') {
        document.getElementById('to').value = address;
        document.getElementById('to').focus();
    }
}

// Настройки поездки
function openSettingsModal() {
    document.getElementById('trip-settings-modal').style.display = 'flex';
}

function closeSettingsModal() {
    document.getElementById('trip-settings-modal').style.display = 'none';
}

function setTemperature(temp) {
    // Удаляем активный класс у всех кнопок
    document.querySelectorAll('.temp-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    // Добавляем активный класс к выбранной кнопке
    event.target.closest('.temp-btn').classList.add('active');
    
    // Сохраняем настройку
    localStorage.setItem('temperature', temp);
}

function selectMusic(type) {
    document.querySelectorAll('.music-option').forEach(opt => {
        opt.classList.remove('active');
    });
    event.target.closest('.music-option').classList.add('active');
    localStorage.setItem('music', type);
}

function setLighting(type) {
    document.querySelectorAll('.lighting-option').forEach(opt => {
        opt.classList.remove('active');
    });
    event.target.closest('.lighting-option').classList.add('active');
    localStorage.setItem('lighting', type);
}

function saveTripSettings() {
    const temperature = document.querySelector('.temp-btn.active').dataset.temp;
    const music = document.querySelector('.music-option.active').dataset.music;
    const lighting = document.querySelector('.lighting-option.active').dataset.light;
    const conversation = document.getElementById('conversation-toggle').checked;
    const ac = document.getElementById('ac-toggle').checked;
    const traffic = document.getElementById('traffic-toggle').checked;
    
    const settings = {
        temperature,
        music,
        lighting,
        conversation,
        ac,
        traffic
    };
    
    localStorage.setItem('tripSettings', JSON.stringify(settings));
    closeSettingsModal();
    alert('Настройки поездки сохранены!');
}

// История поездок
function loadHistory() {
    const history = [
        {
            date: 'Сегодня, 14:30',
            status: 'completed',
            route: 'ул. Ленина → ТЦ "Молл"',
            price: '520 ₽',
            driver: 'Алексей В.',
            rating: '4.8'
        },
        {
            date: 'Вчера, 18:15',
            status: 'cancelled',
            route: 'Дом → Аэропорт',
            price: '850 ₽',
            driver: '-',
            rating: '-'
        }
    ];
    
    const list = document.querySelector('.history-list');
    list.innerHTML = history.map(item => `
        <div class="history-item ${item.status}" onclick="viewTripDetails()">
            <div class="history-header">
                <span class="history-date">${item.date}</span>
                <span class="history-status ${item.status}">
                    ${item.status === 'completed' ? 'Завершено' : 'Отменен'}
                </span>
            </div>
            <div class="history-route">${item.route}</div>
            <div class="history-info">
                <span class="history-price">${item.price}</span>
                <span class="history-driver">${item.driver}</span>
                <span class="history-rating">
                    ${item.rating !== '-' ? `<i class="fas fa-star"></i> ${item.rating}` : '-'}
                </span>
            </div>
        </div>
    `).join('');
}

function viewAllHistory() {
    alert('Показана вся история поездок');
    // В реальном приложении здесь загрузка полной истории
}

function viewTripDetails() {
    openRatingModal();
}

// Оценка поездки
function openRatingModal() {
    document.getElementById('rating-modal').style.display = 'flex';
}

function closeRatingModal() {
    document.getElementById('rating-modal').style.display = 'none';
}

function rateTrip(stars) {
    // Устанавливаем рейтинг
    const starElements = document.querySelectorAll('.star-rating i');
    starElements.forEach((star, index) => {
        if (index < stars) {
            star.classList.add('active');
        } else {
            star.classList.remove('active');
        }
    });
}

function submitRating() {
    const rating = document.querySelectorAll('.star-rating i.active').length;
    const comment = document.getElementById('trip-comment').value;
    
    // Здесь отправка оценки на сервер
    alert(`Спасибо! Ваша оценка: ${rating} звезд${comment ? ' с комментарием' : ''}`);
    closeRatingModal();
}

// ========================
// ВОДИТЕЛЬСКИЕ ФУНКЦИИ
// ========================

// Статус водителя
function toggleDriverStatus() {
    const toggle = document.getElementById('driver-toggle');
    const indicator = document.getElementById('driver-status-indicator');
    const statusText = document.getElementById('driver-status-text');
    
    if (toggle.checked) {
        indicator.className = 'status-indicator online';
        statusText.textContent = 'В сети';
        alert('Вы теперь онлайн и видите заказы');
    } else {
        indicator.className = 'status-indicator offline';
        statusText.textContent = 'Не в сети';
        alert('Вы теперь оффлайн');
    }
}

// Фильтрация заказов
function filterOrders(type) {
    // Убираем активный класс у всех тегов
    document.querySelectorAll('.filter-tag').forEach(tag => {
        tag.classList.remove('active');
    });
    // Добавляем активный класс к выбранному тегу
    event.target.classList.add('active');
    
    // Здесь логика фильтрации заказов
    console.log('Фильтр:', type);
}

function sortOrders(value) {
    // Здесь логика сортировки заказов
    console.log('Сортировка:', value);
}

function loadDriverOrders() {
    const orders = [
        {
            id: '#1243',
            price: '480 ₽',
            route: 'ул. Ленина → ул. Пушкина',
            distance: '2.8 км',
            features: ['child-seat', 'luggage']
        },
        {
            id: '#1244',
            price: '620 ₽',
            route: 'ТЦ "Молл" → Аэропорт',
            distance: '8.5 км',
            features: ['family']
        }
    ];
    
    const feed = document.getElementById('orders-feed');
    feed.innerHTML = orders.map(order => `
        <div class="order-item">
            <div class="order-title">${order.id} • <strong>${order.price}</strong></div>
            <div class="order-meta">${order.route} • ${order.distance}</div>
            <div class="order-features">
                ${order.features.includes('child-seat') ? '<span class="feature-badge child"><i class="fas fa-baby"></i> Дети</span>' : ''}
                ${order.features.includes('luggage') ? '<span class="feature-badge luggage"><i class="fas fa-suitcase"></i> Багаж</span>' : ''}
                ${order.features.includes('family') ? '<span class="feature-badge family"><i class="fas fa-users"></i> Семья</span>' : ''}
            </div>
            <div class="order-contact">
                <i class="fas fa-phone"></i> <span class="contact-phone">+7 XXX XXX-XX-XX</span>
            </div>
            <div class="driver-actions">
                <button class="btn accept full-width" onclick="acceptOrder('${order.id}')">
                    Взять за ${order.price}
                </button>
                <button class="btn primary full-width" onclick="openDriverPriceModal('${order.id}')">
                    Предложить свою
                </button>
            </div>
        </div>
    `).join('');
}

// ========================
// СЕМЕЙНЫЕ ФУНКЦИИ
// ========================

function loadFamilyData() {
    // Загрузка семейных данных
    const familyTrips = [
        {
            member: 'Мария',
            route: 'Дом → Школа',
            price: '320 ₽',
            time: 'Сегодня, 08:00'
        },
        {
            member: 'Анна',
            route: 'Школа → Спортзал',
            price: '280 ₽',
            time: 'Вчера, 16:30'
        }
    ];
    
    const list = document.querySelector('.family-trips-list');
    if (list) {
        list.innerHTML = familyTrips.map(trip => `
            <div class="family-trip-item">
                <div class="trip-member">
                    <i class="fas fa-user"></i>
                    <span>${trip.member}</span>
                </div>
                <div class="trip-details">
                    <div class="trip-route">${trip.route}</div>
                    <div class="trip-info">
                        <span>${trip.price}</span>
                        <span>${trip.time}</span>
                    </div>
                </div>
            </div>
        `).join('');
    }
}

function callTaxiForMember(member) {
    alert(`Вызываем такси для ${member}`);
    // В реальном приложении здесь API вызов такси
}

function trackMember(member) {
    alert(`Отслеживание местоположения ${member}`);
    // В реальном приложении здесь карта с местоположением
}

function addFamilyMember() {
    const name = prompt('Введите имя нового члена семьи:');
    if (name) {
        const phone = prompt('Введите номер телефона:');
        if (phone) {
            alert(`Член семьи ${name} добавлен!`);
            // В реальном приложении здесь API запрос
        }
    }
}

function addFamilyFunds() {
    openTopUpModal();
}

// ========================
// ПЛАНИРОВАНИЕ ПОЕЗДОК
// ========================

function createNewPlan() {
    alert('Создание новой запланированной поездки');
    // В реальном приложении здесь форма создания
}

function editPlan(id) {
    alert(`Редактирование поездки #${id}`);
    // В реальном приложении здесь форма редактирования
}

// ========================
// ОПЛАТА И БАЛАНС
// ========================

function openTopUpModal() {
    document.getElementById('topup-modal').style.display = 'flex';
}

let selectedAmount = 300;
function selectAmount(amount) {
    selectedAmount = amount;
    
    // Убираем активный класс у всех опций
    document.querySelectorAll('.amount-option').forEach(opt => {
        opt.classList.remove('active');
    });
    
    // Добавляем активный класс к выбранной опции
    event.target.classList.add('active');
    
    // Обновляем отображаемую сумму
    document.getElementById('selected-amount').textContent = amount;
}

function enableCustomAmount() {
    const customInput = document.getElementById('custom-amount');
    customInput.focus();
    customInput.addEventListener('input', function(e) {
        selectedAmount = parseInt(e.target.value) || 0;
        document.getElementById('selected-amount').textContent = selectedAmount;
    });
}

function processPayment() {
    const amount = selectedAmount;
    const autoTopup = document.getElementById('auto-topup-toggle').checked;
    
    if (amount < 100) {
        alert('Минимальная сумма пополнения - 100 ₽');
        return;
    }
    
    // Здесь запрос к платежному шлюзу
    alert(`Пополнение на ${amount} ₽ ${autoTopup ? 'с включенным автопополнением' : ''}`);
    
    // Обновляем баланс
    const currentBalance = parseInt(document.getElementById('balance').textContent) || 0;
    document.getElementById('balance').textContent = (currentBalance + amount) + ' ₽';
    
    document.getElementById('topup-modal').style.display = 'none';
}

// ========================
// ЧАТ
// ========================

function openChat() {
    document.getElementById('chat-modal').style.display = 'flex';
}

function closeChat() {
    document.getElementById('chat-modal').style.display = 'none';
}

function sendMessage() {
    const input = document.getElementById('message-input');
    const message = input.value.trim();
    
    if (message) {
        const messagesDiv = document.querySelector('.chat-messages');
        const time = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        messagesDiv.innerHTML += `
            <div class="message sent">
                <div class="message-text">${message}</div>
                <div class="message-time">${time}</div>
            </div>
        `;
        
        input.value = '';
        
        // Прокрутка вниз
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
        
        // Имитация ответа
        setTimeout(() => {
            messagesDiv.innerHTML += `
                <div class="message received">
                    <div class="message-text">Понял, скоро буду</div>
                    <div class="message-time">${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                </div>
            `;
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }, 1000);
    }
}

// ========================
// ПРОФИЛЬ И НАСТРОЙКИ
// ========================

function openPaymentMethods() {
    alert('Открытие способов оплаты');
}

function openAutoTopUp() {
    openTopUpModal();
}

function openFamilySettings() {
    switchSection('family');
}

function openPlannedTrips() {
    switchSection('planned');
}

function openHistory() {
    // Показываем историю
    alert('Просмотр истории поездок');
}

function openSettings() {
    alert('Открытие настроек приложения');
}

function logout() {
    if (confirm('Вы уверены, что хотите выйти?')) {
        alert('Выход из аккаунта');
        // В реальном приложении здесь очистка данных и редирект
    }
}

// ========================
// УНИВЕРСАЛЬНЫЕ ФУНКЦИИ
// ========================

function toggleOption(option) {
    const toggle = document.getElementById(`${option}-toggle`);
    toggle.checked = !toggle.checked;
    
    const event = new Event('change');
    toggle.dispatchEvent(event);
}

// Форматирование телефона (добавляем к существующей функции)
function formatPhoneNumber(phone) {
    const cleaned = phone.replace(/\D/g, '');
    
    if (cleaned.length === 11) {
        return `+${cleaned[0]} (${cleaned.substring(1, 4)}) ${cleaned.substring(4, 7)}-${cleaned.substring(7, 9)}-${cleaned.substring(9)}`;
    } else if (cleaned.length === 10) {
        return `+7 (${cleaned.substring(0, 3)}) ${cleaned.substring(3, 6)}-${cleaned.substring(6, 8)}-${cleaned.substring(8)}`;
    }
    
    return phone;
}

// Обновляем функцию публикации заказа
function publishOrder() {
    const from = document.getElementById('from').value.trim();
    const to = document.getElementById('to').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const price = document.getElementById('offer-price').value.trim();
    const childSeat = document.getElementById('child-seat-toggle').checked;
    const luggage = document.getElementById('luggage-toggle').checked;
    
    // Проверка обязательных полей
    let errorMessage = '';
    
    if (!from) {
        errorMessage = 'Пожалуйста, укажите адрес отправления';
        document.getElementById('from').focus();
    } else if (!to) {
        errorMessage = 'Пожалуйста, укажите адрес назначения';
        document.getElementById('to').focus();
    } else if (!phone) {
        errorMessage = 'Пожалуйста, укажите номер телефона';
        document.getElementById('phone').focus();
    } else if (!validatePhoneNumber(phone)) {
        errorMessage = 'Пожалуйста, введите корректный номер телефона';
        document.getElementById('phone').focus();
    } else if (!price) {
        errorMessage = 'Пожалуйста, укажите цену';
        document.getElementById('offer-price').focus();
    } else if (isNaN(parseInt(price)) || parseInt(price) < 100) {
        errorMessage = 'Минимальная цена - 100 ₽';
        document.getElementById('offer-price').focus();
    }
    
    if (errorMessage) {
        alert(errorMessage);
        return;
    }

    // Сохраняем данные
    document.getElementById('active-from').textContent = from;
    document.getElementById('active-to').textContent = to;
    document.getElementById('active-phone').textContent = formatPhoneNumber(phone);
    document.getElementById('active-price').textContent = price + ' ₽';
    
    // Показываем детали
    document.querySelector('.order-details').innerHTML = `
        ${childSeat ? `<div class="detail-item">
            <i class="fas fa-baby"></i>
            <span>Детское кресло: <strong>Да</strong></span>
        </div>` : ''}
        ${luggage ? `<div class="detail-item">
            <i class="fas fa-suitcase"></i>
            <span>Багаж: <strong>Да</strong></span>
        </div>` : ''}
    `;
    
    document.getElementById('active-order').classList.remove('hidden');

    alert('Заказ опубликован! Ожидайте откликов водителей.');
}