# Hướng dẫn Setup Localhost - ClawQuest

Tài liệu này giúp anh em trong team tự cài đặt môi trường phát triển (localhost) để phối hợp làm việc.

## 1. Yêu cầu hệ thống
- **Node.js**: >= 20.0.0
- **pnpm**: (Khuyên dùng) `npm install -g pnpm`

## 2. Các biến môi trường (.env)
Để chạy được project, anh em cần có các file `.env` chứa thông tin kết nối Database và API Key.

### API (Backend)
Tạo file `apps/api/.env` với nội dung sau (lấy từ Brian/trưởng nhóm):
- `DATABASE_URL`: Connection string của Supabase.
- `JWT_SECRET`: Key để mã hóa token.
- `TELEGRAM_BOT_TOKEN`: Token của bot test.
- `SUPABASE_SERVICE_ROLE_KEY`: Key quản trị Supabase.

### Dashboard (Frontend)
Tạo file `.env.local` ở **thư mục gốc** (root) và trong `apps/dashboard/` với nội dung:
```bash
VITE_API_URL="http://localhost:3000"
VITE_SUPABASE_URL="https://fzuvaymfnwexchocqaos.supabase.co"
VITE_SUPABASE_ANON_KEY="..." # Lấy từ Brian
```

## 3. Cài đặt và Chạy
Mở terminal tại thư mục gốc của project:

```bash
# Cài đặt dependencies
pnpm install

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

## 5. Troubleshooting
- **Lỗi pnpm**: Đảm bảo dùng đúng version Node 20+.
- **Không kết nối được API**: Kiểm tra xem `apps/api` đã start thành công chưa (check log terminal).
- **Lỗi Auth**: Đảm bảo `VITE_SUPABASE_URL` và `ANON_KEY` trong file env là chính xác.
