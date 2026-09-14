# Compras App — Web

React + Vite + Tailwind (ligero) + FastAPI. Tag `mobile-v1` conserva versión Expo.

## Requisitos
Node 22, Python 3.12

## API
```sh
pip install -r api/requirements.txt
cp api/.env.example api/.env
uvicorn api.main:app --host 0.0.0.0 --port 9000
```

## Web
```sh
cd web
cp .env.example .env
npm install
npm run dev    # http://localhost:5173 proxy /api -> 9000
npm run build  # -> web/dist
```

Env: `VITE_API_URL` y `VITE_API_TOKEN` (Bearer).
