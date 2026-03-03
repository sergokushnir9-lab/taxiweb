const TELEGRAM_ADMIN_URL = 'https://t.me/your_admin_username';

const state = {
  platform: 'web',
  adminToken: '',
  currentPassengerId: '',
  currentDriverId: ''
};

const app = document.getElementById('app');

const escapeHtml = (text = '') => text
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const fileToBase64 = (file) => new Promise((resolve) => {
  if (!file) {
    resolve('');
    return;
  }
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.readAsDataURL(file);
});

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Ошибка сервера');
  }
  return data;
}

function platformInit() {
  const tg = window.Telegram?.WebApp;
  if (tg) {
    tg.ready();
    tg.expand();
    state.platform = tg.platform || 'telegram';
  } else {
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('android')) state.platform = 'android';
    else if (ua.includes('iphone') || ua.includes('ipad')) state.platform = 'ios';
    else state.platform = 'desktop';
  }
  document.body.dataset.platform = state.platform;
}

function renderLayout() {
  app.innerHTML = `
    <main class="shell">
      <header class="topbar">
        <div>
          <h1>Taxi Web</h1>
          <p>Платформа: ${escapeHtml(state.platform)}</p>
        </div>
        <button id="open-admin" class="btn ghost">Вход админа</button>
      </header>

      <section class="grid">
        <article class="card">
          <h2>Регистрация пассажира</h2>
          <form id="passenger-form">
            <input required name="name" placeholder="Имя пассажира" />
            <input required name="phone" placeholder="Телефон" />
            <label class="photo-upload">
              <input type="file" name="photo" accept="image/*" />
              <span>Фото пассажира (по желанию)</span>
            </label>
            <button class="btn" type="submit">Зарегистрироваться</button>
          </form>
          <div id="passenger-result" class="muted"></div>
        </article>

        <article class="card">
          <h2>Регистрация водителя</h2>
          <form id="driver-form">
            <input required name="name" placeholder="Имя водителя" />
            <input required name="phone" placeholder="Телефон" />
            <input required name="car" placeholder="Автомобиль" />
            <label class="photo-upload required">
              <input type="file" name="photo" accept="image/*" required />
              <span>Фото водителя (обязательно)</span>
            </label>
            <button class="btn" type="submit">Отправить на модерацию</button>
          </form>
          <div id="driver-result" class="muted"></div>
        </article>

        <article class="card">
          <h2>Заказ пассажира</h2>
          <form id="order-form">
            <select id="passenger-select" required><option value="">Выберите пассажира</option></select>
            <input required name="from" placeholder="Откуда" />
            <input required name="to" placeholder="Куда" />
            <input required name="phone" placeholder="Телефон для связи" />
            <input required name="price" type="number" min="50" placeholder="Цена" />
            <textarea name="comment" placeholder="Комментарий"></textarea>
            <button class="btn" type="submit">Создать заказ</button>
          </form>
        </article>

        <article class="card">
          <h2>Кабинет водителя</h2>
          <div class="row">
            <select id="driver-select"><option value="">Выберите водителя</option></select>
            <a class="btn ghost" href="${TELEGRAM_ADMIN_URL}" target="_blank" rel="noreferrer">Пополнить</a>
          </div>
          <div id="driver-balance" class="muted">Баланс: —</div>
          <div id="orders-list" class="list"></div>
        </article>
      </section>

      <section class="card">
        <h2>Активные заказы</h2>
        <div id="public-orders" class="list"></div>
      </section>

      <section id="admin-panel" class="card hidden">
        <h2>Админ панель</h2>
        <div id="pending-list" class="list"></div>
        <div id="drivers-admin-list" class="list"></div>
      </section>
    </main>

    <dialog id="admin-dialog">
      <form method="dialog" id="admin-login-form" class="dialog-form">
        <h3>Вход администратора</h3>
        <input name="login" placeholder="Логин" required />
        <input name="password" placeholder="Пароль" type="password" required />
        <div class="row">
          <button type="submit" class="btn">Войти</button>
          <button type="button" class="btn ghost" id="close-admin">Отмена</button>
        </div>
      </form>
    </dialog>
  `;
}

async function reloadData() {
  const data = await api('/api/bootstrap');

  const passengerSelect = document.getElementById('passenger-select');
  passengerSelect.innerHTML = '<option value="">Выберите пассажира</option>' + data.passengers
    .map((item) => `<option value="${item.id}">${escapeHtml(item.name)} (${escapeHtml(item.phone)})</option>`).join('');

  const driverSelect = document.getElementById('driver-select');
  driverSelect.innerHTML = '<option value="">Выберите водителя</option>' + data.drivers
    .filter((driver) => driver.approved)
    .map((item) => `<option value="${item.id}">${escapeHtml(item.name)} • ${escapeHtml(item.car)}</option>`).join('');

  renderOrders(data.orders, data.drivers, data.passengers);

  if (state.adminToken) {
    document.getElementById('open-admin').textContent = 'Админ панель';
    document.getElementById('admin-panel').classList.remove('hidden');
    renderAdmin(data);
  }
}

function renderOrders(orders, drivers, passengers) {
  const publicOrders = document.getElementById('public-orders');
  publicOrders.innerHTML = '';

  orders.forEach((order) => {
    const driver = drivers.find((item) => item.id === order.driverId);
    const passenger = passengers.find((item) => item.id === order.passengerId);
    const item = document.createElement('div');
    item.className = 'item';
    item.innerHTML = `
      <div>
        <strong>${escapeHtml(order.from)} → ${escapeHtml(order.to)}</strong>
        <p>${escapeHtml(order.phone)} • ${order.price} ₽ • ${escapeHtml(order.status)}</p>
        <small>Пассажир: ${escapeHtml(passenger?.name || '—')} / Водитель: ${escapeHtml(driver?.name || '—')}</small>
      </div>
      <div class="row">
        ${order.status !== 'cancelled' ? `<button class="btn ghost" data-cancel="${order.id}">Отменить</button>` : ''}
      </div>
    `;
    publicOrders.appendChild(item);
  });

  const driverId = document.getElementById('driver-select').value;
  const ordersList = document.getElementById('orders-list');
  const currentDriver = drivers.find((item) => item.id === driverId);
  document.getElementById('driver-balance').textContent = currentDriver
    ? `Баланс: ${currentDriver.balance} ₽ • статус: ${currentDriver.status}`
    : 'Баланс: —';

  ordersList.innerHTML = orders
    .filter((order) => order.status === 'open' || order.driverId === driverId)
    .map((order) => `
      <div class="item">
        <div>
          <strong>${escapeHtml(order.from)} → ${escapeHtml(order.to)}</strong>
          <p>${order.price} ₽ • ${escapeHtml(order.status)}</p>
        </div>
        <div class="row">
          ${order.status === 'open' && driverId ? `<button class="btn" data-accept="${order.id}">Взять</button>` : ''}
        </div>
      </div>
    `).join('');
}

function renderAdmin(data) {
  const pending = document.getElementById('pending-list');
  pending.innerHTML = '<h3>Модерация водителей</h3>' + (data.pendingDrivers.length
    ? data.pendingDrivers.map((driver) => `
      <div class="item">
        <div>
          <strong>${escapeHtml(driver.name)}</strong>
          <p>${escapeHtml(driver.phone)} • ${escapeHtml(driver.car)}</p>
        </div>
        <button class="btn" data-approve="${driver.id}">Одобрить</button>
      </div>
    `).join('')
    : '<p class="muted">Новых заявок нет.</p>');

  const driversAdmin = document.getElementById('drivers-admin-list');
  driversAdmin.innerHTML = '<h3>Управление водителями</h3>' + data.drivers
    .filter((driver) => driver.approved)
    .map((driver) => `
      <div class="item">
        <div>
          <strong>${escapeHtml(driver.name)}</strong>
          <p>Баланс: ${driver.balance} ₽ • Статус: ${driver.status}</p>
        </div>
        <div class="row">
          <button class="btn ghost" data-online="${driver.id}">На линии</button>
          <button class="btn ghost" data-offline="${driver.id}">Оффлайн</button>
          <button class="btn" data-balance="${driver.id}">Изменить баланс</button>
        </div>
      </div>
    `).join('');
}

function bindEvents() {
  const dialog = document.getElementById('admin-dialog');
  document.getElementById('open-admin').addEventListener('click', () => {
    if (state.adminToken) {
      document.getElementById('admin-panel').scrollIntoView({ behavior: 'smooth' });
      return;
    }
    dialog.showModal();
  });

  document.getElementById('close-admin').addEventListener('click', () => dialog.close());

  document.getElementById('admin-login-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    try {
      const data = await api('/api/auth/admin', {
        method: 'POST',
        body: JSON.stringify(Object.fromEntries(formData.entries()))
      });
      state.adminToken = data.token;
      dialog.close();
      await reloadData();
    } catch (error) {
      alert(error.message);
    }
  });

  document.getElementById('passenger-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const photo = await fileToBase64(formData.get('photo'));
    try {
      const passenger = await api('/api/register/passenger', {
        method: 'POST',
        body: JSON.stringify({ name: formData.get('name'), phone: formData.get('phone'), photo })
      });
      state.currentPassengerId = passenger.id;
      document.getElementById('passenger-result').textContent = `Пассажир ${passenger.name} зарегистрирован.`;
      form.reset();
      await reloadData();
    } catch (error) {
      alert(error.message);
    }
  });

  document.getElementById('driver-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const photo = await fileToBase64(formData.get('photo'));
    try {
      await api('/api/register/driver', {
        method: 'POST',
        body: JSON.stringify({
          name: formData.get('name'),
          phone: formData.get('phone'),
          car: formData.get('car'),
          photo
        })
      });
      document.getElementById('driver-result').textContent = 'Заявка отправлена на модерацию администратору.';
      form.reset();
      await reloadData();
    } catch (error) {
      alert(error.message);
    }
  });

  document.getElementById('order-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    const payload = {
      passengerId: formData.get('passenger-select') || document.getElementById('passenger-select').value,
      from: formData.get('from'),
      to: formData.get('to'),
      phone: formData.get('phone'),
      price: Number(formData.get('price')),
      comment: formData.get('comment')
    };
    try {
      await api('/api/orders', { method: 'POST', body: JSON.stringify(payload) });
      event.target.reset();
      await reloadData();
    } catch (error) {
      alert(error.message);
    }
  });

  document.getElementById('driver-select').addEventListener('change', reloadData);

  document.addEventListener('click', async (event) => {
    const acceptId = event.target.dataset.accept;
    const cancelId = event.target.dataset.cancel;
    const approveId = event.target.dataset.approve;
    const onlineId = event.target.dataset.online;
    const offlineId = event.target.dataset.offline;
    const balanceId = event.target.dataset.balance;

    try {
      if (acceptId) {
        const driverId = document.getElementById('driver-select').value;
        await api(`/api/orders/${acceptId}/accept`, {
          method: 'PATCH',
          body: JSON.stringify({ driverId })
        });
      }

      if (cancelId) {
        await api(`/api/orders/${cancelId}/cancel`, {
          method: 'PATCH',
          body: JSON.stringify({ actor: 'passenger', reason: 'Отмена из приложения' })
        });
      }

      if (approveId) {
        await api(`/api/drivers/${approveId}?token=${state.adminToken}`, {
          method: 'PATCH',
          body: JSON.stringify({ approved: true, status: 'offline' })
        });
      }

      if (onlineId) {
        await api(`/api/drivers/${onlineId}?token=${state.adminToken}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'online' })
        });
      }

      if (offlineId) {
        await api(`/api/drivers/${offlineId}?token=${state.adminToken}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'offline' })
        });
      }

      if (balanceId) {
        const amount = Number(prompt('Новый баланс водителя:', '0'));
        if (!Number.isNaN(amount)) {
          await api(`/api/drivers/${balanceId}?token=${state.adminToken}`, {
            method: 'PATCH',
            body: JSON.stringify({ balance: amount })
          });
        }
      }

      if (acceptId || cancelId || approveId || onlineId || offlineId || balanceId) {
        await reloadData();
      }
    } catch (error) {
      alert(error.message);
    }
  });
}

async function init() {
  platformInit();
  renderLayout();
  bindEvents();
  await reloadData();
}

init();
