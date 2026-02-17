# Rut Li Xi 2026 (Public)

Du an rut li xi chay public, khong co trang admin.
Nguoi dung co the tu bo tien vao bao li xi ngay tren client.

## Chay local

```bash
npm i
cp .env.example .env.local
npm run dev
```

## Bien moi truong

Khong co bien bat buoc.

- `DRAW_LOCK_SECRET` (optional): secret ky cookie draw-lock 24h.

## Du lieu deck

- File server: `data/deck.json`
- Format:

```json
{
  "deck": [
    { "amount": 10000, "quantity": 2, "remaining": 2 },
    { "amount": 20000, "quantity": 3, "remaining": 3 }
  ]
}
```

## API

- `GET /api/config`: lay danh sach menh gia con lai + tong so luot.
- `POST /api/draw`: rut ngau nhien theo so to con lai.
- `POST /api/deposit`: bo them tien vao li xi.
  - Body: `{ "amount": number, "quantity": number }`

## Ghi chu

- Luong admin da duoc go bo.
- Form "Bo tien vao li xi" nam tren trang public (`/`).
