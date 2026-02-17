# Rút Lì Xì 2026

Refactor theo deck mệnh giá (không dùng Telegram, không form thông tin người nhận).

## Chạy local

```bash
npm i
cp .env.example .env.local
# cập nhật ADMIN_PASSWORD trong .env.local
npm run dev
```

## Biến môi trường

- `ADMIN_PASSWORD`: mật khẩu bảo vệ route `/admin`.

## Dữ liệu deck

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

- `GET /api/config`: public deck + tổng remaining.
- `POST /api/draw`: rút theo weighted random từ remaining, chống rút lại 24h (cookie signed).
- `GET /api/admin/status`: trạng thái đăng nhập admin + deck hiện tại.
- `POST /api/admin/deck`: lưu deck mới.
- `POST /api/admin/login`: đăng nhập admin.
- `POST /api/admin/logout`: đăng xuất admin.

## Chống rút lại

- Client: `localStorage` 24h (`lixi_2026_draw_record`).
- Server: cookie ký `lixi_draw_lock` 24h.
