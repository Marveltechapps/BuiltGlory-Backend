# BuiltGlory Backend

Node.js Express API for BuiltGlory — auth, properties, enquiries, acquisitions, payments, uploads, and notifications.

## Stack

- **Node.js 20+**, **Express 5**
- **MongoDB** (Mongoose)
- **Redis** (production)
- **Socket.IO**, **Firebase Admin** (push), **AWS S3**, **Razorpay**

## Setup

```bash
npm install
cp .env.example .env
# Start MongoDB (and Redis in production), then:
npm run dev
```

API runs at `http://localhost:3000` by default. Swagger UI is available when the server is running.

## Environment

Copy `.env.example` to `.env`. Minimum for local dev:

| Variable | Description |
|----------|-------------|
| `MONGODB_URI` | MongoDB connection string |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` / `JWT_SECRET` | Auth signing secrets |
| `CORS_ORIGINS` | Allowed frontend origins (dashboard + Expo web) |

See `.env.example` for S3, Razorpay, SMTP, and Firebase options.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server with nodemon |
| `npm start` | Production server |
| `npm test` | Run tests |
| `npm run seed` | Seed admin user |
| `npm run migrate` | Run migrations |
| `npm run openapi` | Regenerate OpenAPI spec |

## Related repos

- **App** — `BuiltGlory-App` (customer mobile app)
- **Dashboard** — `builtglory-frontend-1.1` (admin UI)
