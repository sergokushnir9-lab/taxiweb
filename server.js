const http = require('http');
const fs = require('fs/promises');
const path = require('path');
const { URL } = require('url');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const DB_PATH = path.join(ROOT, 'backend', 'data', 'db.json');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8'
};

const createId = (prefix) => `${prefix}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

const defaultDb = () => ({
  users: [],
  driverApplications: [],
  cities: [
    { id: 'city_1', name: 'Москва' },
    { id: 'city_2', name: 'Санкт-Петербург' }
  ],
  orders: [],
  notifications: [],
  telegramOutbox: []
});

const ensureDbShape = (db) => ({ ...defaultDb(), ...db });

const readDb = async () => {
  try {
    const raw = await fs.readFile(DB_PATH, 'utf-8');
    return ensureDbShape(JSON.parse(raw));
  } catch {
    const db = defaultDb();
    await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
    await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2));
    return db;
  }
};

const writeDb = async (db) => fs.writeFile(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');

const sendJson = (res, statusCode, data) => {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data));
};

const parseBody = (req) => new Promise((resolve, reject) => {
  let body = '';
  req.on('data', (chunk) => { body += chunk; });
  req.on('end', () => {
    if (!body) return resolve({});
    try {
      resolve(JSON.parse(body));
    } catch (error) {
      reject(error);
    }
  });
  req.on('error', reject);
});

const pushNotification = (db, { userId, title, text, sendTelegram = false }) => {
  const user = db.users.find((u) => u.id === userId);
  const item = {
    id: createId('n'),
    userId,
    title,
    text,
    createdAt: new Date().toISOString(),
    channel: sendTelegram && user?.source === 'tg' ? 'in_app,tg' : 'in_app'
  };
  db.notifications.unshift(item);
  if (sendTelegram && user?.source === 'tg' && user.tgUserId) {
    db.telegramOutbox.unshift({
      id: createId('tg'),
      tgUserId: user.tgUserId,
      text: `${title}\n${text}`,
      createdAt: item.createdAt,
      status: 'queued'
    });
  }
};

const serializeOrder = (order, role) => {
  const base = {
    id: order.id,
    cityId: order.cityId,
    from: order.from,
    to: order.to,
    budget: order.budget,
    status: order.status,
    createdAt: order.createdAt,
    assignedDriverId: order.assignedDriverId || null,
    acceptedOfferId: order.acceptedOfferId || null,
    offers: order.offers || []
  };

  const revealContacts = order.status === 'assigned';
  if (role === 'passenger') {
    return {
      ...base,
      passengerContact: { phone: order.passengerPhone, contact: order.passengerContact },
      driverContact: revealContacts ? order.driverContact || null : null
    };
  }

  if (role === 'driver') {
    return {
      ...base,
      passengerContact: revealContacts ? { phone: order.passengerPhone, contact: order.passengerContact } : null,
      driverContact: order.driverContact || null
    };
  }

  return {
    ...base,
    passengerContact: { phone: order.passengerPhone, contact: order.passengerContact },
    driverContact: order.driverContact || null
  };
};

const serveStatic = async (pathname, res) => {
  const safePath = path.normalize(path.join(ROOT, pathname));
  if (!safePath.startsWith(ROOT)) return sendJson(res, 403, { message: 'Forbidden' });
  let filePath = safePath;

  try {
    const stat = await fs.stat(filePath);
    if (stat.isDirectory()) filePath = path.join(filePath, 'index.html');
    const data = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    res.end(data);
  } catch {
    const index = await fs.readFile(path.join(ROOT, 'index.html'));
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(index);
  }
};

const server = http.createServer(async (req, res) => {
  try {
    const requestUrl = new URL(req.url, `http://${req.headers.host}`);
    const pathname = requestUrl.pathname;

    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      });
      return res.end();
    }

    if (pathname === '/api/health' && req.method === 'GET') return sendJson(res, 200, { status: 'ok' });

    if (pathname === '/api/bootstrap' && req.method === 'GET') {
      const db = await readDb();
      const userId = requestUrl.searchParams.get('userId');
      const user = db.users.find((u) => u.id === userId) || null;
      return sendJson(res, 200, {
        user,
        cities: db.cities,
        notifications: userId ? db.notifications.filter((n) => n.userId === userId).slice(0, 30) : []
      });
    }

    if (pathname === '/api/auth/register' && req.method === 'POST') {
      const db = await readDb();
      const { role, fullName, phone, contact, source = 'web', tgUserId } = await parseBody(req);
      if (!role || !fullName) return sendJson(res, 400, { message: 'role и fullName обязательны.' });
      if (!phone || !contact) return sendJson(res, 400, { message: 'phone и contact обязательны.' });
      if (!['passenger', 'driver', 'admin'].includes(role)) return sendJson(res, 400, { message: 'Некорректная роль.' });

      const user = {
        id: createId('u'),
        role,
        fullName,
        phone,
        contact,
        source,
        tgUserId: tgUserId || null,
        driverApproved: role !== 'driver',
        hourlyRate: role === 'driver' ? 0 : null,
        createdAt: new Date().toISOString()
      };
      db.users.unshift(user);

      if (role === 'driver') {
        db.driverApplications.unshift({
          id: createId('app'),
          userId: user.id,
          status: 'pending',
          createdAt: new Date().toISOString()
        });
      }

      pushNotification(db, {
        userId: user.id,
        title: 'Регистрация завершена',
        text: role === 'driver' ? 'Заявка водителя отправлена на модерацию.' : 'Профиль успешно создан.',
        sendTelegram: true
      });

      await writeDb(db);
      return sendJson(res, 201, user);
    }

    if (pathname === '/api/driver/applications' && req.method === 'GET') {
      const db = await readDb();
      const enriched = db.driverApplications.map((a) => ({ ...a, user: db.users.find((u) => u.id === a.userId) || null }));
      return sendJson(res, 200, enriched);
    }

    if (pathname.startsWith('/api/admin/driver-applications/') && req.method === 'PATCH') {
      const db = await readDb();
      const id = pathname.split('/')[4];
      const { status } = await parseBody(req);
      const app = db.driverApplications.find((a) => a.id === id);
      if (!app) return sendJson(res, 404, { message: 'Заявка не найдена.' });
      if (!['approved', 'rejected'].includes(status)) return sendJson(res, 400, { message: 'status должен быть approved или rejected.' });

      app.status = status;
      app.updatedAt = new Date().toISOString();
      const user = db.users.find((u) => u.id === app.userId);
      if (user) {
        user.driverApproved = status === 'approved';
        pushNotification(db, {
          userId: user.id,
          title: status === 'approved' ? 'Вас одобрили как водителя' : 'Заявка отклонена',
          text: status === 'approved' ? 'Теперь вам доступны заказы.' : 'Обратитесь в поддержку для повторной заявки.',
          sendTelegram: true
        });
      }
      await writeDb(db);
      return sendJson(res, 200, app);
    }

    if (pathname === '/api/admin/cities' && req.method === 'GET') {
      const db = await readDb();
      return sendJson(res, 200, db.cities);
    }

    if (pathname === '/api/admin/cities' && req.method === 'POST') {
      const db = await readDb();
      const { name } = await parseBody(req);
      if (!name) return sendJson(res, 400, { message: 'name обязателен.' });
      const city = { id: createId('city'), name };
      db.cities.push(city);
      await writeDb(db);
      return sendJson(res, 201, city);
    }

    if (pathname.startsWith('/api/drivers/') && pathname.endsWith('/tariff') && req.method === 'PATCH') {
      const db = await readDb();
      const id = pathname.split('/')[3];
      const { hourlyRate } = await parseBody(req);
      const user = db.users.find((u) => u.id === id && u.role === 'driver');
      if (!user) return sendJson(res, 404, { message: 'Водитель не найден.' });
      user.hourlyRate = Number(hourlyRate) || 0;
      await writeDb(db);
      return sendJson(res, 200, user);
    }

    if (pathname === '/api/orders' && req.method === 'POST') {
      const db = await readDb();
      const { passengerId, cityId, from, to, budget } = await parseBody(req);
      const passenger = db.users.find((u) => u.id === passengerId && u.role === 'passenger');
      if (!passenger) return sendJson(res, 404, { message: 'Пассажир не найден.' });
      if (!cityId || !from || !to || !budget) return sendJson(res, 400, { message: 'cityId, from, to, budget обязательны.' });

      const order = {
        id: createId('ord'),
        passengerId,
        cityId,
        from,
        to,
        budget: Number(budget),
        passengerPhone: passenger.phone,
        passengerContact: passenger.contact,
        status: 'open',
        offers: [],
        acceptedOfferId: null,
        assignedDriverId: null,
        driverContact: null,
        createdAt: new Date().toISOString()
      };
      db.orders.unshift(order);
      await writeDb(db);
      return sendJson(res, 201, serializeOrder(order, 'passenger'));
    }

    if (pathname === '/api/orders/passenger' && req.method === 'GET') {
      const db = await readDb();
      const passengerId = requestUrl.searchParams.get('passengerId');
      const orders = db.orders.filter((o) => o.passengerId === passengerId).map((o) => serializeOrder(o, 'passenger'));
      return sendJson(res, 200, orders);
    }

    if (pathname === '/api/orders/driver' && req.method === 'GET') {
      const db = await readDb();
      const cityId = requestUrl.searchParams.get('cityId');
      const orders = db.orders
        .filter((o) => o.status !== 'assigned' && (!cityId || o.cityId === cityId))
        .map((o) => serializeOrder(o, 'driver'));
      return sendJson(res, 200, orders);
    }

    if (pathname.includes('/offers') && req.method === 'POST') {
      const db = await readDb();
      const id = pathname.split('/')[3];
      const { driverId, price, type = 'fixed', hours = null } = await parseBody(req);
      const order = db.orders.find((o) => o.id === id);
      const driver = db.users.find((u) => u.id === driverId && u.role === 'driver');
      if (!order || !driver) return sendJson(res, 404, { message: 'Заказ или водитель не найден.' });
      if (!driver.driverApproved) return sendJson(res, 403, { message: 'Водитель не прошел модерацию.' });

      const offer = {
        id: createId('offer'),
        driverId,
        driverName: driver.fullName,
        price: Number(price),
        type,
        hours: type === 'hourly' ? Number(hours || 1) : null,
        createdAt: new Date().toISOString()
      };
      order.offers.push(offer);
      order.status = 'negotiation';
      pushNotification(db, {
        userId: order.passengerId,
        title: 'Новое предложение от водителя',
        text: `${driver.fullName}: ${offer.price} ₽${offer.type === 'hourly' ? ` (${offer.hours} ч)` : ''}`,
        sendTelegram: true
      });
      await writeDb(db);
      return sendJson(res, 201, offer);
    }

    if (pathname.includes('/accept-offer') && req.method === 'POST') {
      const db = await readDb();
      const id = pathname.split('/')[3];
      const { passengerId, offerId } = await parseBody(req);
      const order = db.orders.find((o) => o.id === id && o.passengerId === passengerId);
      if (!order) return sendJson(res, 404, { message: 'Заказ не найден.' });
      const offer = order.offers.find((o) => o.id === offerId);
      if (!offer) return sendJson(res, 404, { message: 'Оффер не найден.' });

      order.acceptedOfferId = offerId;
      order.status = 'offer_accepted_waiting_assignment';
      pushNotification(db, {
        userId: offer.driverId,
        title: 'Пассажир согласовал вашу цену',
        text: 'Ожидайте назначения администратором.',
        sendTelegram: true
      });
      await writeDb(db);
      return sendJson(res, 200, serializeOrder(order, 'passenger'));
    }

    if (pathname.includes('/assign') && req.method === 'POST') {
      const db = await readDb();
      const id = pathname.split('/')[3];
      const { driverId } = await parseBody(req);
      const order = db.orders.find((o) => o.id === id);
      const driver = db.users.find((u) => u.id === driverId && u.role === 'driver');
      if (!order || !driver) return sendJson(res, 404, { message: 'Заказ или водитель не найден.' });
      if (!order.acceptedOfferId) return sendJson(res, 400, { message: 'Сначала нужно согласовать цену.' });

      order.assignedDriverId = driverId;
      order.status = 'assigned';
      order.driverContact = { phone: driver.phone, contact: driver.contact };
      pushNotification(db, {
        userId: order.passengerId,
        title: 'Водитель назначен',
        text: `Контакты открыты. Водитель: ${driver.fullName}`,
        sendTelegram: true
      });
      pushNotification(db, {
        userId: driverId,
        title: 'Вам назначен заказ',
        text: 'Контакты пассажира открыты.',
        sendTelegram: true
      });
      await writeDb(db);
      return sendJson(res, 200, serializeOrder(order, 'admin'));
    }

    if (pathname === '/api/admin/orders' && req.method === 'GET') {
      const db = await readDb();
      return sendJson(res, 200, db.orders.map((o) => serializeOrder(o, 'admin')));
    }

    if (pathname === '/api/notifications' && req.method === 'GET') {
      const db = await readDb();
      const userId = requestUrl.searchParams.get('userId');
      const list = userId ? db.notifications.filter((n) => n.userId === userId) : db.notifications;
      return sendJson(res, 200, list.slice(0, 50));
    }

    if (pathname === '/api/telegram/outbox' && req.method === 'GET') {
      const db = await readDb();
      return sendJson(res, 200, db.telegramOutbox.slice(0, 50));
    }

    await serveStatic(pathname, res);
  } catch (error) {
    console.error(error);
    sendJson(res, 500, { message: 'Внутренняя ошибка сервера.' });
  }
});

server.listen(PORT, () => {
  console.log(`Server started: http://localhost:${PORT}`);
});
