# Exuberant (Vercel + Upstash Redis + Resend)

## Deploy
1) Create Upstash Redis (REST) and Resend API key.
2) Add Vercel Environment Variables (Project Settings → Environment Variables):

- UPSTASH_REDIS_REST_URL
- UPSTASH_REDIS_REST_TOKEN
- JWT_SECRET (random long string)
- RESEND_API_KEY
- RESEND_FROM (example: Exuberant <auth@exuberant.pw>)

3) Deploy to Vercel.

## Notes
- Hobby plan limit (12 functions) solved: all API is inside `api/index.js`.
- Auth: email+password, verify code via email (Gmail only in MVP).
- Chats: DM by username, unread counters, last message preview (polling on client).
- Feed: create posts, list, like toggle.
- Settings: profile edit + allow DM toggle.
