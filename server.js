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
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const readDb = async () => JSON.parse(await fs.readFile(DB_PATH, 'utf-8'));
const writeDb = async (db) => fs.writeFile(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
const createId = (prefix) => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

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
  req.on('data', (chunk) => {
    body += chunk;
  });
  req.on('end', () => {
    if (!body) {
      resolve({});
      return;
    }
    try {
      resolve(JSON.parse(body));
    } catch (error) {
      reject(error);
    }
  });
  req.on('error', reject);
});

const serveStatic = async (pathname, res) => {
  const safePath = path.normalize(path.join(ROOT, pathname));
  if (!safePath.startsWith(ROOT)) {
    sendJson(res, 403, { message: 'Forbidden' });
    return;
  }

  let filePath = safePath;
  try {
    const stat = await fs.stat(filePath);
    if (stat.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }
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

const requireAdmin = (db, token) => db.sessions?.[token] && db.sessions[token].role === 'admin';

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
      res.end();
      return;
    }

    if (pathname === '/api/health' && req.method === 'GET') {
      sendJson(res, 200, { status: 'ok' });
      return;
    }

    if (pathname === '/api/bootstrap' && req.method === 'GET') {
      const db = await readDb();
      sendJson(res, 200, {
        drivers: db.drivers,
        passengers: db.passengers,
        orders: db.orders,
        pendingDrivers: db.drivers.filter((driver) => !driver.approved)
      });
      return;
    }

    if (pathname === '/api/auth/admin' && req.method === 'POST') {
      const { login, password } = await parseBody(req);
      const db = await readDb();
      const admin = db.admins.find((item) => item.login === login && item.password === password);
      if (!admin) {
        sendJson(res, 401, { message: 'Неверный логин или пароль.' });
        return;
      }
      const token = createId('admin-token');
      db.sessions[token] = { id: admin.id, role: 'admin', createdAt: new Date().toISOString() };
      await writeDb(db);
      sendJson(res, 200, { token, admin: { id: admin.id, name: admin.name } });
      return;
    }

    if (pathname === '/api/register/passenger' && req.method === 'POST') {
      const { name, phone, photo = '' } = await parseBody(req);
      if (!name || !phone) {
        sendJson(res, 400, { message: 'Укажите имя и телефон.' });
        return;
      }
      const db = await readDb();
      const passenger = { id: createId('passenger'), name, phone, photo, createdAt: new Date().toISOString() };
      db.passengers.unshift(passenger);
      await writeDb(db);
      sendJson(res, 201, passenger);
      return;
    }

    if (pathname === '/api/register/driver' && req.method === 'POST') {
      const { name, phone, car, photo } = await parseBody(req);
      if (!name || !phone || !car || !photo) {
        sendJson(res, 400, { message: 'Для водителя обязательны имя, телефон, авто и фото.' });
        return;
      }
      const db = await readDb();
      const driver = {
        id: createId('driver'),
        name,
        phone,
        car,
        photo,
        approved: false,
        status: 'offline',
        balance: 0,
        createdAt: new Date().toISOString()
      };
      db.drivers.unshift(driver);
      await writeDb(db);
      sendJson(res, 201, driver);
      return;
    }

    if (pathname === '/api/orders' && req.method === 'POST') {
      const { passengerId, from, to, phone, price, comment = '' } = await parseBody(req);
      if (!passengerId || !from || !to || !phone || !price) {
        sendJson(res, 400, { message: 'Не все поля заказа заполнены.' });
        return;
      }
      const db = await readDb();
      const passenger = db.passengers.find((item) => item.id === passengerId);
      if (!passenger) {
        sendJson(res, 404, { message: 'Пассажир не найден, сначала зарегистрируйтесь.' });
        return;
      }
      const order = {
        id: createId('order'),
        passengerId,
        driverId: null,
        from,
        to,
        phone,
        price: Number(price),
        comment,
        status: 'open',
        createdAt: new Date().toISOString()
      };
      db.orders.unshift(order);
      await writeDb(db);
      sendJson(res, 201, order);
      return;
    }

    if (pathname === '/api/orders' && req.method === 'GET') {
      const db = await readDb();
      const driverId = requestUrl.searchParams.get('driverId');
      let orders = db.orders;
      if (driverId) {
        orders = db.orders.filter((order) => order.status === 'open' || order.driverId === driverId);
      }
      sendJson(res, 200, orders);
      return;
    }

    if (pathname.startsWith('/api/orders/') && pathname.endsWith('/accept') && req.method === 'PATCH') {
      const id = pathname.split('/')[3];
      const { driverId } = await parseBody(req);
      const db = await readDb();
      const driver = db.drivers.find((item) => item.id === driverId && item.approved);
      if (!driver) {
        sendJson(res, 400, { message: 'Водитель не найден или не одобрен.' });
        return;
      }
      if (driver.status !== 'online') {
        sendJson(res, 400, { message: 'Сначала перейдите в статус "на линии".' });
        return;
      }
      const order = db.orders.find((item) => item.id === id);
      if (!order || order.status !== 'open') {
        sendJson(res, 404, { message: 'Заказ недоступен.' });
        return;
      }
      order.status = 'accepted';
      order.driverId = driver.id;
      order.acceptedAt = new Date().toISOString();
      await writeDb(db);
      sendJson(res, 200, order);
      return;
    }

    if (pathname.startsWith('/api/orders/') && pathname.endsWith('/cancel') && req.method === 'PATCH') {
      const id = pathname.split('/')[3];
      const { actor = 'passenger', reason = '' } = await parseBody(req);
      const db = await readDb();
      const order = db.orders.find((item) => item.id === id);
      if (!order) {
        sendJson(res, 404, { message: 'Заказ не найден.' });
        return;
      }
      if (order.status === 'cancelled') {
        sendJson(res, 400, { message: 'Заказ уже отменен.' });
        return;
      }
      order.status = 'cancelled';
      order.cancelledBy = actor;
      order.cancelReason = reason;
      order.cancelledAt = new Date().toISOString();
      await writeDb(db);
      sendJson(res, 200, order);
      return;
    }

    if (pathname.startsWith('/api/drivers/') && req.method === 'PATCH') {
      const driverId = pathname.split('/')[3];
      const db = await readDb();
      const token = requestUrl.searchParams.get('token') || '';
      if (!requireAdmin(db, token)) {
        sendJson(res, 403, { message: 'Только администратор.' });
        return;
      }
      const driver = db.drivers.find((item) => item.id === driverId);
      if (!driver) {
        sendJson(res, 404, { message: 'Водитель не найден.' });
        return;
      }
      const { approved, balance, status } = await parseBody(req);
      if (typeof approved === 'boolean') driver.approved = approved;
      if (typeof balance === 'number') driver.balance = balance;
      if (status === 'online' || status === 'offline') driver.status = status;
      await writeDb(db);
      sendJson(res, 200, driver);
      return;
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
