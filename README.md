# TaxiWeb

Полноценное демо-приложение такси с реальным Node.js backend и SPA-фронтендом.

## Что реализовано

- Регистрация с ролями: `passenger`, `driver`, `admin`.
- Поддержка Telegram WebApp (`source=tg`) и веб-регистрации.
- Заявка водителя + модерация админом.
- Заказы пассажиров с торгом по цене и почасовыми тарифами.
- Скрытие контактов клиента/водителя до этапа:
  1) согласование цены,
  2) назначение водителя на заказ.
- Админ-панель:
  - модерация водителей,
  - добавление городов,
  - назначение водителя по офферу.
- Уведомления в приложении + очередь в Telegram (`telegramOutbox`) для пользователей, пришедших из TG.

## Запуск

```bash
npm install
npm start
```

Откроется на `http://localhost:3000`.

## API (основное)

- `GET /api/bootstrap?userId=...`
- `POST /api/auth/register`
- `GET /api/driver/applications`
- `PATCH /api/admin/driver-applications/:id`
- `GET /api/admin/cities`
- `POST /api/admin/cities`
- `PATCH /api/drivers/:id/tariff`
- `POST /api/orders`
- `GET /api/orders/passenger?passengerId=...`
- `GET /api/orders/driver?cityId=...`
- `POST /api/orders/:id/offers`
- `POST /api/orders/:id/accept-offer`
- `POST /api/orders/:id/assign`
- `GET /api/admin/orders`
- `GET /api/notifications?userId=...`
- `GET /api/telegram/outbox`
