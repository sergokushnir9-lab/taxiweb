# taxiweb

Мини‑приложение такси с фронтендом и Express-бэкендом.

## Запуск

```bash
npm install
npm start
```

Сервер поднимется на `http://localhost:3000` и будет раздавать фронтенд из этого же репозитория.

## API

- `GET /api/health` — статус сервера.
- `GET /api/profile` — профиль и балансы.
- `GET /api/notifications` — уведомления.
- `GET /api/admin/config` — получить данные администратора.
- `POST /api/admin/config` — сохранить данные администратора.
- `GET /api/driver/profile?userId=...` — получить профиль водителя.
- `POST /api/driver/register` — регистрация/обновление анкеты водителя.
- `GET /api/passenger/quick-addresses` — быстрые адреса пассажира.
- `POST /api/passenger/orders` — создать заказ пассажира.
- `GET /api/driver/orders` — список заказов водителя.
- `PATCH /api/driver/orders/:id/accept` — принять заказ водителем.
- `POST /api/delivery/requests` — создать заявку на доставку.
- `GET /api/planned/rides` — список запланированных поездок.
- `POST /api/planned/rides` — создать запланированную поездку.

Данные сохраняются в `backend/data/db.json`.


Данные администратора и регистрации водителей сохраняются в `backend/data/db.json` в полях `admin` и `drivers`.
