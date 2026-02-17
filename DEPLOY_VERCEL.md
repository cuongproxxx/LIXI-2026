# Deploy LIXI-2026 Lên Vercel và Hướng Dẫn Sử Dụng

## 1) Yêu Cầu
- Tài khoản GitHub có repo: `https://github.com/cuongproxxx/LIXI-2026.git`
- Tài khoản Vercel
- Biến môi trường bắt buộc:
  - `ADMIN_PASSWORD`

## 2) Deploy Bằng Vercel Dashboard
1. Mở Vercel Dashboard: `https://vercel.com/new`
2. Import repo `cuongproxxx/LIXI-2026`
3. Vercel sẽ tự nhận Next.js, giữ mặc định:
   - Build Command: `npm run build`
   - Output: `.next`
4. Thêm Environment Variable:
   - Key: `ADMIN_PASSWORD`
   - Value: mật khẩu admin bạn muốn đặt
5. Bấm `Deploy`
6. Deploy xong, mở domain Vercel để kiểm tra.

## 3) Deploy Bằng Vercel CLI (Tùy Chọn)
```bash
npm i -g vercel
vercel login
vercel link
vercel env add ADMIN_PASSWORD production
vercel --prod
```

## 4) Hướng Dẫn Sử Dụng Sau Khi Deploy

### Public (`/`)
1. Vào trang chủ.
2. Vuốt ngang để rê chọn lá.
3. Bấm `Chọn lá này` hoặc vuốt lên để chốt.
4. Xem kết quả trong dialog full-screen.
5. Bấm:
   - `Chơi tiếp`: chơi tiếp với số lá còn lại.
   - `Chơi lại`: xào lại UI.

### Admin (`/admin`)
1. Vào `/admin`
2. Đăng nhập bằng `ADMIN_PASSWORD`
3. Quản lý deck:
   - `Amount`: mệnh giá
   - `Quantity`: tổng số tờ
   - `Remaining`: số lượt còn lại
4. Bấm `Save deck` để lưu.
5. Dùng `Reset remaining` nếu muốn đặt `remaining = quantity`.

## 5) Chạy Local
```bash
npm i
cp .env.example .env.local
# Sửa ADMIN_PASSWORD trong .env.local
npm run dev
```

## 6) Lưu Ý Quan Trọng Khi Chạy Trên Vercel
- Dự án hiện tại đang lưu deck bằng file `data/deck.json` trên filesystem server.
- Trên Vercel (serverless), filesystem không đảm bảo ghi bền vững trong production.
- Nghĩa là:
  - Có thể lỗi lưu deck trên `/admin`
  - Hoặc dữ liệu bị reset giữa các lần invoke/deploy

Để chạy production ổn định, nên đổi storage deck sang DB/KV (ví dụ: Vercel KV, Upstash Redis, Supabase, Neon).

## 7) Checklist Sau Deploy
- `/` mở được, animation chạy bình thường
- `/admin` đăng nhập được bằng `ADMIN_PASSWORD`
- Save deck không lỗi
- Rút lì xì trả kết quả đúng và giảm `remaining`
