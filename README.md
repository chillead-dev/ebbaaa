# Exuberant (Vercel + Upstash Redis + Resend)

- **1 serverless функция**: `api/index.js` (лимит Hobby не превышается)
- Остальной серверный код в `server/` (много файлов — но это НЕ функции)
- Клиент разнесён на модули: `public/views/*`, `public/lib/*`

## ENV (Vercel → Settings → Environment Variables)
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
JWT_SECRET
RESEND_API_KEY
RESEND_FROM (Exuberant <auth@exuberant.pw>)
