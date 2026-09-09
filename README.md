# Game Scoreboard

Web ghi điểm cho một nhóm chơi game. Màn hình chính là danh sách game, hiện tại có `Tá lả`; bấm vào game sẽ mở danh sách tour và bảng điểm như cũ.

## Chức năng

- Trang công khai xem danh sách game, danh sách tour, bảng xếp hạng và điểm từng ván.
- Quản trị bằng email/mật khẩu.
- Thêm, ẩn, khôi phục hoặc xoá người chơi chưa có lịch sử.
- Chọn game ở màn hình chính, rồi tạo tour và chọn người tham gia trong game đó.
- Thêm, sửa, xoá từng ván.
- Tự cân điểm người cuối để tổng bằng `0`.
- Kiểm tra tổng điểm ở cả giao diện và database.
- Giao diện responsive cho điện thoại và máy tính.

## Công nghệ

- React + Vite
- Supabase PostgreSQL, Auth và REST API
- Vercel để deploy frontend

Gói miễn phí là đủ cho một nhóm nhỏ. Dữ liệu điểm rất nhẹ nên không cần xoá tự động sau một tuần.

## 1. Chuẩn bị

Cần có:

- Node.js 20 trở lên
- Git
- Tài khoản GitHub
- Tài khoản Supabase
- Tài khoản Vercel

Kiểm tra trên Ubuntu:

```bash
node --version
npm --version
git --version
```

## 2. Tạo database Supabase

1. Mở <https://supabase.com/dashboard> và chọn **New project**.
2. Đặt tên project, tạo database password và chọn region gần Việt Nam, ví dụ Singapore.
3. Chờ project khởi tạo xong.
4. Mở **SQL Editor** → **New query**.
5. Copy toàn bộ nội dung file [`supabase/schema.sql`](supabase/schema.sql), dán vào SQL Editor rồi bấm **Run**.

Sau khi chạy thành công, Supabase sẽ có 5 bảng và 2 database function:

- `players`
- `tours`
- `tour_players`
- `games`
- `game_scores`
- `save_game`
- `delete_game`

### Tạo tài khoản quản trị

1. Trong Supabase mở **Authentication** → **Users**.
2. Chọn **Add user** → **Create new user**.
3. Nhập email và mật khẩu quản trị.
4. Bật tùy chọn xác nhận email tự động nếu dashboard hiển thị tùy chọn đó.
5. Không chia sẻ tài khoản này cho người chỉ cần xem điểm.

Nên mở **Authentication** → **Providers** → **Email** và tắt đăng ký công khai (`Allow new users to sign up`). Tài khoản quản trị tạo thủ công vẫn đăng nhập được.

### Lấy URL và anon key

Trong Supabase mở **Project Settings** → **API**:

- Copy **Project URL**.
- Copy **anon/public key**. Nếu giao diện mới chỉ hiển thị publishable key, dùng key publishable đó.

Anon key có thể xuất hiện trong frontend; quyền truy cập thật được bảo vệ bằng Row Level Security. Tuyệt đối không đưa `service_role` key vào file `.env`.

## 3. Chạy web trên Ubuntu

Mở terminal tại thư mục project:

```bash
cp .env.example .env
```

Mở `.env` và điền thông tin vừa copy:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_OR_PUBLISHABLE_KEY
```

Cài package và chạy:

```bash
npm install
npm run dev
```

Mở địa chỉ Vite in ra, thường là <http://localhost:5173>.

Kiểm tra lần lượt:

1. Mở mục **Quản trị** và đăng nhập.
2. Thêm ít nhất 2 người chơi.
3. Tạo tour và chọn người chơi.
4. Thêm ván Tá lả, ví dụ `An = 10`, `Bình = -10`.
5. Thử lưu game có tổng khác `0`; nút lưu phải bị khoá.
6. Sửa điểm game rồi kiểm tra bảng xếp hạng cập nhật.
7. Đăng xuất và xác nhận dữ liệu vẫn xem được nhưng không còn nút sửa.

Chạy test và build production:

```bash
npm test
npm run build
```

## 4. Đưa code lên GitHub

Tạo một repository trống trên GitHub, ví dụ `game-scoreboard`. Không chọn tạo README hoặc `.gitignore` trên GitHub vì project đã có sẵn.

Chạy tại thư mục project:

```bash
git init
git add .
git commit -m "Initial game scoreboard"
git branch -M main
git remote add origin https://github.com/TEN_GITHUB/game-scoreboard.git
git push -u origin main
```

File `.env` đã nằm trong `.gitignore`, vì vậy thông tin project không bị commit.

## 5. Deploy miễn phí lên Vercel

1. Mở <https://vercel.com> và đăng nhập bằng GitHub.
2. Chọn **Add New** → **Project**.
3. Import repository `game-scoreboard`.
4. Vercel sẽ tự nhận diện framework là **Vite**.
5. Mở phần **Environment Variables**, thêm:

   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

6. Chọn **Deploy**.

Sau vài phút sẽ có link dạng:

```text
https://game-scoreboard-ten-cua-ban.vercel.app
```

Mọi lần sau chỉ cần commit và push lên nhánh `main`; Vercel sẽ tự deploy phiên bản mới.

## 6. Quy tắc dữ liệu

- Mỗi tour cần ít nhất 2 người.
- Mỗi tour có một `game_key`; dữ liệu cũ và tour mới mặc định là `ta_la`.
- Một ván lưu điểm cho toàn bộ người thuộc tour.
- Điểm phải là số nguyên.
- Rule `Tá lả` hiện tại yêu cầu tổng điểm mỗi ván bằng `0`.
- Sửa ván sẽ thay toàn bộ bộ điểm trong một transaction.
- Xoá ván sẽ đánh lại số thứ tự `Ván 1`, `Ván 2`, ...
- Nếu người chơi đã tham gia tour, thao tác xoá sẽ chuyển người đó sang trạng thái ẩn để giữ lịch sử.
- Xoá tour sẽ xoá toàn bộ game và điểm thuộc tour đó.

## 7. Backup thủ công

Với bản MVP, có thể backup từ Supabase Dashboard hoặc dùng SQL Editor:

```sql
select * from players;
select * from tours;
select * from tour_players;
select * from games;
select * from game_scores;
```

Không nên tự động xoá dữ liệu sau 7 ngày. Nếu sau này thật sự muốn, có thể thêm job dọn dữ liệu cũ sau khi đã có cơ chế backup.

## Cấu trúc source

```text
game-scoreboard/
├── src/
│   ├── lib/
│   │   ├── scoring.js
│   │   └── supabase.js
│   ├── App.jsx
│   ├── main.jsx
│   └── styles.css
├── supabase/
│   └── schema.sql
├── test/
│   └── scoring.test.js
├── .env.example
├── index.html
├── package.json
└── vite.config.js
```

## Xử lý lỗi thường gặp

### Trang chỉ hiện “Kết nối Supabase để bắt đầu”

File `.env` chưa đúng hoặc chưa restart `npm run dev` sau khi sửa.

### Đăng nhập không được

Kiểm tra user trong **Authentication → Users**, xác nhận đúng email/mật khẩu và user đã được confirm.

### Xem được nhưng không thêm/sửa được

Phiên đăng nhập đã hết hạn hoặc chưa chạy đầy đủ `supabase/schema.sql`.

### Deploy Vercel hiện trang cấu hình

Hai biến môi trường chưa được thêm vào Vercel. Thêm biến rồi chọn **Redeploy**.

### Không lưu được game

Kiểm tra tổng điểm bằng `0`, điểm là số nguyên và tất cả người nhập điểm đều thuộc tour.
