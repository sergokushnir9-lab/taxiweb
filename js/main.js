const state = {
  tg: window.Telegram?.WebApp || null,
  source: 'web',
  user: null,
  cities: [],
  notifications: []
};

const app = document.getElementById('app');
const contextEl = document.getElementById('context');

const api = async (url, options = {}) => {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Ошибка API');
  return data;
};

const init = async () => {
  if (state.tg) {
    state.source = 'tg';
    state.tg.ready?.();
    state.tg.expand?.();
  }
  const saved = localStorage.getItem('taxi_user_id');
  if (saved) {
    const boot = await api(`/api/bootstrap?userId=${saved}`);
    state.user = boot.user;
    state.cities = boot.cities;
    state.notifications = boot.notifications;
  } else {
    const boot = await api('/api/bootstrap');
    state.cities = boot.cities;
  }
  render();
};

const render = () => {
  contextEl.textContent = `Источник: ${state.source === 'tg' ? 'Telegram WebApp' : 'Сайт'}`;
  if (!state.user) return renderRegistration();
  if (state.user.role === 'passenger') return renderPassenger();
  if (state.user.role === 'driver') return renderDriver();
  return renderAdmin();
};

const renderRegistration = () => {
  app.innerHTML = `
  <div class="grid">
    <section class="card">
      <h3>Регистрация</h3>
      <label>Роль</label>
      <select id="role"><option value="passenger">Пассажир</option><option value="driver">Водитель</option><option value="admin">Админ</option></select>
      <label>ФИО</label><input id="fullName"/>
      <label>Телефон</label><input id="phone" placeholder="+79990001122"/>
      <label>Контакт (tg @username или email)</label><input id="contact"/>
      <button id="registerBtn">Создать аккаунт</button>
    </section>
  </div>`;

  document.getElementById('registerBtn').onclick = async () => {
    const body = {
      role: document.getElementById('role').value,
      fullName: document.getElementById('fullName').value,
      phone: document.getElementById('phone').value,
      contact: document.getElementById('contact').value,
      source: state.source,
      tgUserId: state.tg?.initDataUnsafe?.user?.id || null
    };
    const user = await api('/api/auth/register', { method: 'POST', body: JSON.stringify(body) });
    localStorage.setItem('taxi_user_id', user.id);
    state.user = user;
    const boot = await api(`/api/bootstrap?userId=${user.id}`);
    state.notifications = boot.notifications;
    state.cities = boot.cities;
    render();
  };
};

const notificationsHtml = () => `<div class="card"><h3>Уведомления</h3>${state.notifications.map((n) => `<div class="order"><b>${n.title}</b><div>${n.text}</div><div class="muted">${n.channel}</div></div>`).join('') || '<div class="muted">Пока пусто</div>'}</div>`;

const renderPassenger = async () => {
  const orders = await api(`/api/orders/passenger?passengerId=${state.user.id}`);
  app.innerHTML = `
  <div class="grid">
    <section class="card">
      <h3>Новый заказ пассажира</h3>
      <label>Город</label>
      <select id="cityId">${state.cities.map((c) => `<option value="${c.id}">${c.name}</option>`).join('')}</select>
      <label>Откуда</label><input id="from"/>
      <label>Куда</label><input id="to"/>
      <label>Бюджет</label><input id="budget" type="number"/>
      <button id="createOrder">Создать заказ</button>
    </section>
    <section class="card"><h3>Мои заказы</h3>
      ${orders.map((o) => `<div class="order">
        <div><b>${o.from}</b> → <b>${o.to}</b></div>
        <div class="badge">${o.status}</div>
        <div class="muted">Контакт водителя: ${o.driverContact ? `${o.driverContact.phone} / ${o.driverContact.contact}` : 'скрыт до согласования цены и назначения'}</div>
        ${(o.offers || []).map((of) => `<div class="order">${of.driverName}: ${of.price} ₽ ${of.type === 'hourly' ? `(почасовой, ${of.hours}ч)` : ''}<button data-accept="${o.id}|${of.id}">Принять цену</button></div>`).join('')}
      </div>`).join('') || '<div class="muted">Нет заказов</div>'}
    </section>
    ${notificationsHtml()}
  </div>`;

  document.getElementById('createOrder').onclick = async () => {
    await api('/api/orders', {
      method: 'POST',
      body: JSON.stringify({
        passengerId: state.user.id,
        cityId: document.getElementById('cityId').value,
        from: document.getElementById('from').value,
        to: document.getElementById('to').value,
        budget: document.getElementById('budget').value
      })
    });
    await refreshNotifications();
    renderPassenger();
  };

  document.querySelectorAll('[data-accept]').forEach((btn) => {
    btn.onclick = async () => {
      const [orderId, offerId] = btn.dataset.accept.split('|');
      await api(`/api/orders/${orderId}/accept-offer`, {
        method: 'POST',
        body: JSON.stringify({ passengerId: state.user.id, offerId })
      });
      await refreshNotifications();
      renderPassenger();
    };
  });
};

const renderDriver = async () => {
  const orders = await api(`/api/orders/driver?cityId=${state.cities[0]?.id || ''}`);
  app.innerHTML = `<div class="grid">
    <section class="card">
      <h3>Профиль водителя</h3>
      <div>Статус модерации: <span class="badge">${state.user.driverApproved ? 'одобрен' : 'ожидает'}</span></div>
      <label>Почасовой тариф, ₽/час</label><input id="hourlyRate" type="number" value="${state.user.hourlyRate || ''}"/>
      <button id="saveTariff">Сохранить тариф</button>
    </section>
    <section class="card">
      <h3>Открытые заказы</h3>
      ${orders.map((o) => `<div class="order">
        <div>${o.from} → ${o.to}</div><div>Бюджет: ${o.budget} ₽</div>
        <label>Цена</label><input id="price_${o.id}" type="number" value="${o.budget}"/>
        <label>Тип</label><select id="type_${o.id}"><option value="fixed">Фикс</option><option value="hourly">Почасовой</option></select>
        <label>Часы (для почасового)</label><input id="hours_${o.id}" type="number" value="1"/>
        <button data-offer="${o.id}">Отправить предложение</button>
        <div class="muted">Контакты пассажира: ${o.passengerContact ? `${o.passengerContact.phone} / ${o.passengerContact.contact}` : 'скрыты до назначения'}</div>
      </div>`).join('') || '<div class="muted">Нет заказов</div>'}
    </section>
    ${notificationsHtml()}
  </div>`;

  document.getElementById('saveTariff').onclick = async () => {
    const user = await api(`/api/drivers/${state.user.id}/tariff`, { method: 'PATCH', body: JSON.stringify({ hourlyRate: document.getElementById('hourlyRate').value }) });
    state.user = user;
    renderDriver();
  };

  document.querySelectorAll('[data-offer]').forEach((btn) => {
    btn.onclick = async () => {
      const id = btn.dataset.offer;
      await api(`/api/orders/${id}/offers`, {
        method: 'POST',
        body: JSON.stringify({
          driverId: state.user.id,
          price: document.getElementById(`price_${id}`).value,
          type: document.getElementById(`type_${id}`).value,
          hours: document.getElementById(`hours_${id}`).value
        })
      });
      await refreshNotifications();
      renderDriver();
    };
  });
};

const renderAdmin = async () => {
  const [apps, cities, orders] = await Promise.all([
    api('/api/driver/applications'),
    api('/api/admin/cities'),
    api('/api/admin/orders')
  ]);

  app.innerHTML = `<div class="grid">
    <section class="card">
      <h3>Города</h3>
      <ul>${cities.map((c) => `<li>${c.name}</li>`).join('')}</ul>
      <label>Новый город</label><input id="newCity"/>
      <button id="addCity">Добавить город</button>
    </section>
    <section class="card">
      <h3>Модерация водителей</h3>
      ${apps.map((a) => `<div class="order">${a.user?.fullName || a.userId} - ${a.status}
        <button class="secondary" data-app-approve="${a.id}">Одобрить</button>
        <button class="secondary" data-app-reject="${a.id}">Отклонить</button>
      </div>`).join('') || '<div class="muted">Нет заявок</div>'}
    </section>
    <section class="card">
      <h3>Назначение водителя</h3>
      ${orders.map((o) => `<div class="order"><div>${o.from} → ${o.to} <span class="badge">${o.status}</span></div>
      <div class="muted">Офферов: ${(o.offers || []).length}</div>
      ${(o.offers || []).map((of) => `<button data-assign="${o.id}|${of.driverId}">Назначить ${of.driverName}</button>`).join('')}
      </div>`).join('')}
    </section>
  </div>`;

  document.getElementById('addCity').onclick = async () => {
    await api('/api/admin/cities', { method: 'POST', body: JSON.stringify({ name: document.getElementById('newCity').value }) });
    renderAdmin();
  };

  document.querySelectorAll('[data-app-approve], [data-app-reject]').forEach((btn) => {
    btn.onclick = async () => {
      const id = btn.dataset.appApprove || btn.dataset.appReject;
      const status = btn.dataset.appApprove ? 'approved' : 'rejected';
      await api(`/api/admin/driver-applications/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
      renderAdmin();
    };
  });

  document.querySelectorAll('[data-assign]').forEach((btn) => {
    btn.onclick = async () => {
      const [orderId, driverId] = btn.dataset.assign.split('|');
      await api(`/api/orders/${orderId}/assign`, { method: 'POST', body: JSON.stringify({ driverId }) });
      renderAdmin();
    };
  });
};

const refreshNotifications = async () => {
  if (!state.user) return;
  state.notifications = await api(`/api/notifications?userId=${state.user.id}`);
};

init().catch((e) => {
  app.innerHTML = `<pre>${e.message}</pre>`;
});
