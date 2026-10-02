# VandyCare Doctor Portal

React + Vite Doctor Web Portal, ready for local testing and Hostinger static hosting.

## Production API

```env
VITE_API_BASE_URL=https://vandycareapis.vandytrust.com/v1
```

The frontend API client uses this production base URL by default when deployed.

## Local setup

```bash
npm install
```

For local development, create `.env`:

```env
VITE_API_BASE_URL=https://vandycareapis.vandytrust.com/v1

Run:

```bash
npm run dev
```

Build:

```bash
npm run build
```

Upload the contents of `dist/` to Hostinger `public_html/`.

## Current API paths

POST `/doctor/login`
POST `/doctor/register`
GET `/doctor/profile`
GET `/doctor/appointments`
GET `/doctor/patients`
PUT `/doctor/profile`
PATCH `/doctor/appointments/:id/status`

All API paths are isolated in `src/api.ts` so they can be changed if the backend route names differ.

Expected business flow:

Doctor Registration -> PENDING -> Admin Review -> APPROVED -> Doctor Login.
