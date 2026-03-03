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
  req.on('data', (chunk) => { body += chunk; });
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
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  } catch {
    try {
      const index = await fs.readFile(path.join(ROOT, 'index.html'));
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(index);
    } catch {
      sendJson(res, 500, { message: 'Не удалось загрузить index.html' });
    }
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
      res.end();
      return;
    }

    if (pathname === '/api/health' && req.method === 'GET') {
      sendJson(res, 200, { status: 'ok' });
      return;
    }

    if (pathname === '/api/profile' && req.method === 'GET') {
      const db = await readDb();
      sendJson(res, 200, db.profile);
      return;
    }

    if (pathname === '/api/notifications' && req.method === 'GET') {
      const db = await readDb();
      sendJson(res, 200, db.notifications);
      return;
    }

    if (pathname === '/api/admin/config' && req.method === 'GET') {
      const db = await readDb();
      sendJson(res, 200, db.admin || {});
      return;
    }

    if (pathname === '/api/admin/config' && req.method === 'POST') {
      const { name, phone, telegram } = await parseBody(req);
      if (!name || !phone) {
        sendJson(res, 400, { message: 'Поля name и phone обязательны.' });
        return;
      }

      const db = await readDb();
      db.admin = {
        name,
        phone,
        telegram: telegram || '',
        updatedAt: new Date().toISOString()
      };
      await writeDb(db);
      sendJson(res, 200, db.admin);
      return;
    }

    if (pathname === '/api/driver/profile' && req.method === 'GET') {
      const userId = requestUrl.searchParams.get('userId');
      if (!userId) {
        sendJson(res, 400, { message: 'Параметр userId обязателен.' });
        return;
      }

      const db = await readDb();
      const profile = (db.drivers || []).find((driver) => driver.userId === userId);
      if (!profile) {
        sendJson(res, 404, { message: 'Профиль водителя не найден.' });
        return;
      }
      sendJson(res, 200, profile);
      return;
    }

    if (pathname === '/api/driver/register' && req.method === 'POST') {
      const { userId, fullName, phone, carModel, carPlate, avatarPhoto, licensePhoto } = await parseBody(req);
      if (!userId || !fullName || !phone || !carModel || !carPlate || !avatarPhoto || !licensePhoto) {
        sendJson(res, 400, { message: 'Заполните все поля регистрации водителя.' });
        return;
      }

      const db = await readDb();
      if (!Array.isArray(db.drivers)) db.drivers = [];

      const existingIndex = db.drivers.findIndex((driver) => driver.userId === userId);
      const profile = {
        id: existingIndex >= 0 ? db.drivers[existingIndex].id : createId('driver-profile'),
        userId,
        fullName,
        phone,
        carModel,
        carPlate,
        avatarPhoto,
        licensePhoto,
        createdAt: existingIndex >= 0 ? db.drivers[existingIndex].createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (existingIndex >= 0) {
        db.drivers[existingIndex] = profile;
      } else {
        db.drivers.push(profile);
      }

      await writeDb(db);
      sendJson(res, 201, profile);
      return;
    }

    if (pathname === '/api/passenger/quick-addresses' && req.method === 'GET') {
      const db = await readDb();
      sendJson(res, 200, db.quickAddresses);
      return;
    }

    if (pathname === '/api/passenger/orders' && req.method === 'POST') {
      const { from, to, phone, price, comment } = await parseBody(req);
      if (!from || !to || !phone || !price) {
        sendJson(res, 400, { message: 'Поля from, to, phone и price обязательны.' });
        return;
      }
      const db = await readDb();
      const order = {
        id: createId('p'), from, to, phone, price: Number(price), comment: comment || '', status: 'published', createdAt: new Date().toISOString()
      };
      db.passengerOrders.unshift(order);
      db.driverOrders.unshift({ id: createId('d'), from, to, price: Number(price), status: 'open' });
      await writeDb(db);
      sendJson(res, 201, order);
      return;
    }

    if (pathname === '/api/driver/orders' && req.method === 'GET') {
      const db = await readDb();
      sendJson(res, 200, db.driverOrders);
      return;
    }

    if (pathname.startsWith('/api/driver/orders/') && pathname.endsWith('/accept') && req.method === 'PATCH') {
      const id = pathname.split('/')[4];
      const db = await readDb();
      const order = db.driverOrders.find((item) => item.id === id);
      if (!order) {
        sendJson(res, 404, { message: 'Заказ не найден.' });
        return;
      }
      order.status = 'accepted';
      order.acceptedAt = new Date().toISOString();
      await writeDb(db);
      sendJson(res, 200, order);
      return;
    }

    if (pathname === '/api/delivery/requests' && req.method === 'POST') {
      const { address, phone, description, price } = await parseBody(req);
      if (!address || !phone || !price) {
        sendJson(res, 400, { message: 'Поля address, phone и price обязательны.' });
        return;
      }
      const db = await readDb();
      const request = {
        id: createId('delivery'),
        address,
        phone,
        description: description || '',
        price: Number(price),
        status: 'new',
        createdAt: new Date().toISOString()
      };
      db.deliveryRequests.unshift(request);
      await writeDb(db);
      sendJson(res, 201, request);
      return;
    }

    if (pathname === '/api/planned/rides' && req.method === 'GET') {
      const db = await readDb();
      sendJson(res, 200, db.plannedRides);
      return;
    }

    if (pathname === '/api/planned/rides' && req.method === 'POST') {
      const { from, to, plannedAt, price } = await parseBody(req);
      if (!from || !to || !plannedAt || !price) {
        sendJson(res, 400, { message: 'Поля from, to, plannedAt и price обязательны.' });
        return;
      }
      const db = await readDb();
      const plannedRide = { id: createId('planned'), from, to, plannedAt, price: Number(price), status: 'scheduled' };
      db.plannedRides.unshift(plannedRide);
      await writeDb(db);
      sendJson(res, 201, plannedRide);
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
