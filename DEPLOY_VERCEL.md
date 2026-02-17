# Deploy Rut Li Xi 2026 Len Vercel

## 1) Yeu cau
- Tai khoan GitHub co repo du an
- Tai khoan Vercel
- Khong co env bat buoc

Env optional:
- `DRAW_LOCK_SECRET`

## 2) Deploy bang Vercel Dashboard
1. Mo `https://vercel.com/new`
2. Import repo
3. Giu cau hinh Next.js mac dinh
4. (Optional) them env `DRAW_LOCK_SECRET`
5. Bam `Deploy`

## 3) Deploy bang Vercel CLI
```bash
npm i -g vercel
vercel login
vercel link
vercel env add DRAW_LOCK_SECRET production
vercel --prod
```

## 4) Su dung sau khi deploy
### Public (`/`)
1. Rut li xi tren man hinh chinh
2. Neu can nap them, dung form `Bo tien vao li xi`
3. Nhap `Menh gia` va `So to`, bam submit

## 5) Chay local
```bash
npm i
cp .env.example .env.local
npm run dev
```

## 6) Luu y production
- Du an dang luu deck vao `data/deck.json` tren filesystem server
- Tren Vercel serverless, filesystem khong dam bao ben vung
- Neu can on dinh lau dai, nen doi sang DB/KV (Vercel KV, Upstash, Supabase, Neon)

## 7) Checklist sau deploy
- `/` mo duoc va rut li xi duoc
- Form `Bo tien vao li xi` hoat dong
- `remaining` tang sau khi nap tien
