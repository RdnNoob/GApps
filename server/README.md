# GeoNode Server

  Backend API untuk aplikasi GeoNode. Deploy ke Koyeb + Neon (keduanya gratis).

  ## Deploy ke Koyeb + Neon (Gratis, Tidak Tidur)

  ### 1. Buat database di Neon (neon.tech)
  1. Daftar di https://neon.tech (gratis, pakai GitHub)
  2. Buat project baru → copy **Connection String** (format: `postgresql://...neon.tech/neondb?sslmode=require`)

  ### 2. Deploy ke Koyeb (koyeb.com)
  1. Daftar di https://app.koyeb.com (gratis, pakai GitHub)
  2. Klik **"Create Service"** → pilih **GitHub**
  3. Pilih repo **GApps**, branch **main**
  4. Ubah **Root directory** ke `server`
  5. Build command: `npm install && npm run build`
  6. Start command: `npm start`
  7. Di bagian **Environment Variables**, tambahkan:
     - `DATABASE_URL` = Connection String dari Neon
     - `JWT_SECRET` = string acak (contoh: `geonode-rahasia-kuat-2024`)
     - `PORT` = `8000`
  8. Klik **Deploy**

  ### 3. Update URL di aplikasi
  Setelah deploy, Koyeb memberi URL seperti `https://xxx.koyeb.app`.
  Update `api/geonode.ts` baris pertama:
  ```
  const BASE_URL = "https://xxx.koyeb.app";
  ```

  ## Endpoint API
  - POST /api/auth/register
  - POST /api/auth/login
  - GET  /api/auth/me
  - GET  /api/friends
  - POST /api/friends
  - GET  /api/friends/requests
  - POST /api/friends/requests/:id/accept
  - POST /api/friends/requests/:id/reject
  - POST /api/location/update
  - GET  /api/location/friends
  - GET  /api/chat/messages?friend_id=X
  - POST /api/chat/messages
  - GET  /api/groups
  - POST /api/groups
  - GET  /api/groups/:id/messages
  - POST /api/groups/:id/messages
  - GET  /api/groups/:id/members
  - POST /api/groups/:id/members
  - GET  /api/groups/:id/maps
  