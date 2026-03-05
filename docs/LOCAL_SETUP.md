# Hướng dẫn Setup Localhost - ClawQuest

Tài liệu này giúp anh em trong team tự cài đặt môi trường phát triển (localhost) để phối hợp làm việc.

## 1. Yêu cầu hệ thống
- **Node.js**: >= 20.0.0
- **pnpm**: (Khuyên dùng) `npm install -g pnpm`

## 2. Các biến môi trường (.env)
Để chạy được project, anh em cần có các file `.env` chứa thông tin kết nối Database và API Key.

### API (Backend)
Tạo file `apps/api/.env` với nội dung sau (lấy từ Brian/trưởng nhóm):
- `DATABASE_URL`: Connection string của Supabase (pooling).
- `DIRECT_URL`: Connection string trực tiếp (dùng cho migration).
- `JWT_SECRET`: Key để mã hóa token.
- `TELEGRAM_BOT_TOKEN`: Token của bot test.
- `SUPABASE_SERVICE_ROLE_KEY`: Key quản trị Supabase.

#### Stripe (tuỳ chọn — server chạy bình thường nếu không có)
- `STRIPE_SECRET_KEY`: Secret key từ Stripe Dashboard (`sk_test_...`).
- `STRIPE_WEBHOOK_SECRET`: Webhook signing secret (`whsec_...`).
- `STRIPE_PLATFORM_FEE_PERCENT`: Phí platform trên distribution (mặc định `0`).

### Dashboard (Frontend)
Tạo file `.env.local` ở **thư mục gốc** (root) và trong `apps/dashboard/` với nội dung:
```bash
VITE_API_URL="http://localhost:3000"
VITE_SUPABASE_URL="https://fzuvaymfnwexchocqaos.supabase.co"
VITE_SUPABASE_ANON_KEY="..." # Lấy từ Brian
VITE_STRIPE_PUBLISHABLE_KEY="..." # Publishable key từ Stripe (pk_test_...), tuỳ chọn
```

## 3. Cài đặt và Chạy
Mở terminal tại thư mục gốc của project:

```bash
# Cài đặt dependencies
pnpm install

# Build shared package (cần chạy trước lần đầu)
pnpm --filter @clawquest/shared build

# Chạy Prisma migration (nếu có thay đổi schema)
cd apps/api && source .env && pnpm prisma migrate dev && cd ../..

# Chạy cả Backend và Frontend cùng lúc
pnpm dev
```

Sau khi chạy xong:
- **Dashboard**: http://localhost:5173
- **API**: http://localhost:3000
- **API Docs**: http://localhost:3000/docs (nếu có)

## 4. Lưu ý về Database
Hiện tại team đang dùng chung Database test trên **Supabase**. Anh em không cần cài PostgreSQL local trừ khi muốn test riêng biệt.
- Database URL có dạng: `postgresql://postgres.[ID]:[PASS]@aws-1-...`

## 5. Stripe (Thanh toán Fiat — tuỳ chọn)
Nếu cần test tính năng thanh toán bằng thẻ:

1. Tạo tài khoản tại [stripe.com](https://stripe.com), bật **Connect**
2. Thêm env vars vào `apps/api/.env`: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
3. Thêm `VITE_STRIPE_PUBLISHABLE_KEY` vào `apps/dashboard/.env.local`
4. Test webhook local: cài [Stripe CLI](https://stripe.com/docs/stripe-cli), chạy:
```bash
stripe listen --forward-to localhost:3000/stripe/webhook
```
5. Test card: `4242 4242 4242 4242` (ngày hết hạn bất kỳ, CVC bất kỳ)

> **Lưu ý**: Server chạy bình thường không cần Stripe config. Các endpoint `/stripe/*` sẽ trả về 503 nếu chưa cấu hình.

## 6. Troubleshooting
- **Lỗi pnpm**: Đảm bảo dùng đúng version Node 20+.
- **Không kết nối được API**: Kiểm tra xem `apps/api` đã start thành công chưa (check log terminal).
- **Lỗi Auth**: Đảm bảo `VITE_SUPABASE_URL` và `ANON_KEY` trong file env là chính xác.
- **Lỗi Prisma migration**: Đảm bảo `DATABASE_URL` và `DIRECT_URL` đã có trong `apps/api/.env`.
- **Lỗi `source .env`**: File `.env` nằm trong `apps/api/`, không phải root. Chạy `cd apps/api` trước.
