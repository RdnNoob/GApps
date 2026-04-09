import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Pool } from "pg";

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "geonode-secret";
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || "geonode-admin-secret";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL wajib diisi");
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

app.use(cors());
app.use(express.json());

// ── Init DB ───────────────────────────────────────────────────────────────────
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      nama VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password TEXT NOT NULL,
      kode VARCHAR(10) UNIQUE NOT NULL,
      avatar_warna VARCHAR(20),
      is_online BOOLEAN DEFAULT false,
      last_seen TIMESTAMP DEFAULT NOW(),
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS friends (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      friend_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id, friend_id)
    );
    CREATE TABLE IF NOT EXISTS friend_requests (
      id SERIAL PRIMARY KEY,
      dari_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      ke_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status VARCHAR(20) DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      from_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      to_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS groups (
      id SERIAL PRIMARY KEY,
      nama VARCHAR(255) NOT NULL,
      kode VARCHAR(10) UNIQUE NOT NULL,
      created_by INT NOT NULL REFERENCES users(id),
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS group_members (
      id SERIAL PRIMARY KEY,
      group_id INT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role VARCHAR(20) DEFAULT 'member',
      joined_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(group_id, user_id)
    );
    CREATE TABLE IF NOT EXISTS group_messages (
      id SERIAL PRIMARY KEY,
      group_id INT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      from_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS locations (
      id SERIAL PRIMARY KEY,
      user_id INT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      lat DOUBLE PRECISION NOT NULL,
      lng DOUBLE PRECISION NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS public_keys (
      id SERIAL PRIMARY KEY,
      user_id INT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      public_key TEXT NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS activity_logs (
      id SERIAL PRIMARY KEY,
      user_id INT REFERENCES users(id) ON DELETE SET NULL,
      aksi VARCHAR(100) NOT NULL,
      detail TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS settings (
      key VARCHAR(100) PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS admin (
      id SERIAL PRIMARY KEY,
      username VARCHAR(100) UNIQUE NOT NULL,
      kata_sandi TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // Insert default settings
  await pool.query(`
    INSERT INTO settings(key, value) VALUES('maintenance_mode', '0')
    ON CONFLICT(key) DO NOTHING;
  `);

  // Seed admin user: username=admin, password=admin!@#
  const adminHash = "$2b$10$zmJvC/DAlSKAZa27QzTsQOxa7xb/pV3eM6zAo6Zr2BCHwzzrUo0zq";
  await pool.query(`
    INSERT INTO admin(username, kata_sandi) VALUES('admin', $1)
    ON CONFLICT(username) DO UPDATE SET kata_sandi = EXCLUDED.kata_sandi;
  `, [adminHash]);

  console.log("DB tables ready");
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const COLORS = ["#6366f1","#ec4899","#f59e0b","#14b8a6","#8b5cf6","#ef4444","#22c55e","#3b82f6","#f97316","#a855f7"];
function randomColor() { return COLORS[Math.floor(Math.random() * COLORS.length)]; }
function genKode() {
  const c = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return "#" + Array.from({length:6}, () => c[Math.floor(Math.random()*c.length)]).join("");
}
async function uniqueKode(table: string) {
  let kode = genKode();
  while (true) {
    const r = await pool.query(`SELECT id FROM ${table} WHERE kode=$1`, [kode]);
    if (r.rows.length === 0) return kode;
    kode = genKode();
  }
}
function token(userId: number) { return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "30d" }); }
function adminToken(adminId: number, username: string) {
  return jwt.sign({ adminId, username }, ADMIN_JWT_SECRET, { expiresIn: "8h" });
}

async function logActivity(userId: number | null, aksi: string, detail?: string) {
  try {
    await pool.query(
      "INSERT INTO activity_logs(user_id,aksi,detail) VALUES($1,$2,$3)",
      [userId, aksi, detail || null]
    );
  } catch {}
}

function auth(req: any, res: any, next: any) {
  const h = req.headers.authorization;
  if (!h?.startsWith("Bearer ")) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const d = jwt.verify(h.slice(7), JWT_SECRET) as any;
    req.userId = d.userId;
    next();
  } catch { res.status(401).json({ error: "Invalid token" }); }
}

function adminAuth(req: any, res: any, next: any) {
  const h = req.headers.authorization;
  if (!h?.startsWith("Bearer ")) { res.status(401).json({ error: "Akses admin diperlukan" }); return; }
  try {
    const d = jwt.verify(h.slice(7), ADMIN_JWT_SECRET) as any;
    req.adminId = d.adminId;
    req.adminUsername = d.username;
    next();
  } catch { res.status(401).json({ error: "Token admin tidak valid" }); }
}

// ── Routes ────────────────────────────────────────────────────────────────────

app.get("/api/healthz", (_req, res) => res.json({ status: "ok" }));

// ── Auth ──────────────────────────────────────────────────────────────────────
app.post("/api/auth/register", async (req, res) => {
  try {
    const { nama, email, password } = req.body;
    if (!nama || !email || !password) { res.status(400).json({ error: "Isi semua kolom" }); return; }
    const ex = await pool.query("SELECT id FROM users WHERE email=$1", [email]);
    if (ex.rows.length > 0) { res.status(400).json({ error: "Email sudah terdaftar" }); return; }
    const hash = await bcrypt.hash(password, 10);
    const kode = await uniqueKode("users");
    const r = await pool.query(
      "INSERT INTO users(nama,email,password,kode,avatar_warna) VALUES($1,$2,$3,$4,$5) RETURNING id,nama,email,kode,avatar_warna",
      [nama, email, hash, kode, randomColor()]
    );
    const u = r.rows[0];
    await logActivity(u.id, "register", `${nama} mendaftar`);
    res.json({ token: token(u.id), user: u });
  } catch(e:any) { console.error(e); res.status(500).json({ error: "Server error" }); }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { kode_atau_email, password } = req.body;
    if (!kode_atau_email || !password) { res.status(400).json({ error: "Isi semua kolom" }); return; }
    const r = await pool.query("SELECT * FROM users WHERE email=$1 OR kode=$1", [kode_atau_email]);
    if (r.rows.length === 0) { res.status(401).json({ error: "Invalid credentials" }); return; }
    const u = r.rows[0];
    if (!await bcrypt.compare(password, u.password)) { res.status(401).json({ error: "Invalid credentials" }); return; }
    await pool.query("UPDATE users SET is_online=true,last_seen=NOW() WHERE id=$1", [u.id]);
    await logActivity(u.id, "login", `${u.nama} masuk`);
    res.json({ token: token(u.id), user: { id:u.id, nama:u.nama, email:u.email, kode:u.kode, avatar_warna:u.avatar_warna } });
  } catch(e:any) { console.error(e); res.status(500).json({ error: "Server error" }); }
});

app.get("/api/auth/me", auth, async (req: any, res) => {
  try {
    const r = await pool.query("SELECT id,nama,email,kode,avatar_warna FROM users WHERE id=$1", [req.userId]);
    if (r.rows.length === 0) { res.status(404).json({ error: "Not found" }); return; }
    res.json(r.rows[0]);
  } catch(e:any) { console.error(e); res.status(500).json({ error: "Server error" }); }
});

app.post("/api/auth/logout", auth, async (req: any, res) => {
  try {
    await pool.query("UPDATE users SET is_online=false,last_seen=NOW() WHERE id=$1", [req.userId]);
    await logActivity(req.userId, "logout", "Pengguna keluar");
    res.json({ message: "Logged out" });
  } catch { res.json({ message: "Logged out" }); }
});

// ── Friends ───────────────────────────────────────────────────────────────────
app.get("/api/friends", auth, async (req: any, res) => {
  try {
    const r = await pool.query(
      `SELECT u.id,u.nama,u.kode,u.avatar_warna,u.is_online,u.last_seen,
        CASE WHEN l.updated_at > NOW()-INTERVAL '5 minutes' THEN true ELSE false END as location_online
       FROM friends f JOIN users u ON u.id=f.friend_id
       LEFT JOIN locations l ON l.user_id=f.friend_id
       WHERE f.user_id=$1`,
      [req.userId]
    );
    res.json(r.rows);
  } catch(e:any) { console.error(e); res.status(500).json({ error: "Server error" }); }
});

app.post("/api/friends", auth, async (req: any, res) => {
  try {
    const { kode } = req.body;
    const t = await pool.query("SELECT id,nama FROM users WHERE kode=$1", [kode]);
    if (t.rows.length === 0) { res.status(404).json({ error: "User tidak ditemukan" }); return; }
    const tid = t.rows[0].id;
    if (tid === req.userId) { res.status(400).json({ error: "Tidak bisa menambah diri sendiri" }); return; }
    const ex = await pool.query("SELECT id FROM friends WHERE user_id=$1 AND friend_id=$2", [req.userId, tid]);
    if (ex.rows.length > 0) { res.status(400).json({ error: "Sudah berteman" }); return; }
    const exr = await pool.query(
      "SELECT id FROM friend_requests WHERE ((dari_id=$1 AND ke_id=$2) OR (dari_id=$2 AND ke_id=$1)) AND status='pending'",
      [req.userId, tid]
    );
    if (exr.rows.length > 0) { res.status(400).json({ error: "Permintaan sudah ada" }); return; }
    await pool.query("INSERT INTO friend_requests(dari_id,ke_id) VALUES($1,$2)", [req.userId, tid]);
    await logActivity(req.userId, "friend_request", `Permintaan pertemanan ke ${t.rows[0].nama}`);
    res.json({ message: "Permintaan terkirim" });
  } catch(e:any) { console.error(e); res.status(500).json({ error: "Server error" }); }
});

app.get("/api/friends/requests", auth, async (req: any, res) => {
  try {
    const r = await pool.query(
      `SELECT fr.id,fr.dari_id,fr.ke_id,fr.created_at,
        u.nama as dari_nama,u.kode as dari_kode,u.avatar_warna as dari_avatar_warna
       FROM friend_requests fr JOIN users u ON u.id=fr.dari_id
       WHERE fr.ke_id=$1 AND fr.status='pending'`,
      [req.userId]
    );
    res.json(r.rows);
  } catch(e:any) { console.error(e); res.status(500).json({ error: "Server error" }); }
});

app.post("/api/friends/requests/:id/accept", auth, async (req: any, res) => {
  try {
    const id = Number(req.params.id);
    const r = await pool.query("SELECT * FROM friend_requests WHERE id=$1 AND ke_id=$2", [id, req.userId]);
    if (r.rows.length === 0) { res.status(404).json({ error: "Tidak ditemukan" }); return; }
    const fr = r.rows[0];
    await pool.query("UPDATE friend_requests SET status='accepted' WHERE id=$1", [id]);
    await pool.query(
      "INSERT INTO friends(user_id,friend_id) VALUES($1,$2),($3,$4) ON CONFLICT DO NOTHING",
      [req.userId, fr.dari_id, fr.dari_id, req.userId]
    );
    await logActivity(req.userId, "friend_accept", `Menerima permintaan pertemanan`);
    res.json({ message: "Diterima" });
  } catch(e:any) { console.error(e); res.status(500).json({ error: "Server error" }); }
});

app.post("/api/friends/requests/:id/reject", auth, async (req: any, res) => {
  try {
    await pool.query("UPDATE friend_requests SET status='rejected' WHERE id=$1 AND ke_id=$2", [Number(req.params.id), req.userId]);
    res.json({ message: "Ditolak" });
  } catch(e:any) { console.error(e); res.status(500).json({ error: "Server error" }); }
});

app.delete("/api/friends/:friendId", auth, async (req: any, res) => {
  try {
    const fid = Number(req.params.friendId);
    await pool.query(
      "DELETE FROM friends WHERE (user_id=$1 AND friend_id=$2) OR (user_id=$2 AND friend_id=$1)",
      [req.userId, fid]
    );
    res.json({ message: "Pertemanan dihapus" });
  } catch(e:any) { console.error(e); res.status(500).json({ error: "Server error" }); }
});

// ── Location ──────────────────────────────────────────────────────────────────
app.post("/api/location/update", auth, async (req: any, res) => {
  try {
    const { lat, lng } = req.body;
    if (lat === undefined || lng === undefined) { res.status(400).json({ error: "lat dan lng wajib diisi" }); return; }
    await pool.query(
      `INSERT INTO locations(user_id,lat,lng,updated_at) VALUES($1,$2,$3,NOW())
       ON CONFLICT(user_id) DO UPDATE SET lat=$2,lng=$3,updated_at=NOW()`,
      [req.userId, lat, lng]
    );
    await pool.query("UPDATE users SET is_online=true,last_seen=NOW() WHERE id=$1", [req.userId]);
    res.json({ message: "Lokasi diperbarui" });
  } catch(e:any) { console.error(e); res.status(500).json({ error: "Server error" }); }
});

app.get("/api/location/friends", auth, async (req: any, res) => {
  try {
    const r = await pool.query(
      `SELECT u.id,u.nama,u.kode,u.avatar_warna,l.lat,l.lng,l.updated_at as last_seen,
        CASE WHEN l.updated_at > NOW()-INTERVAL '5 minutes' THEN true ELSE false END as online
       FROM friends f JOIN users u ON u.id=f.friend_id
       LEFT JOIN locations l ON l.user_id=f.friend_id
       WHERE f.user_id=$1 AND l.lat IS NOT NULL`,
      [req.userId]
    );
    res.json(r.rows);
  } catch(e:any) { console.error(e); res.status(500).json({ error: "Server error" }); }
});

// ── Chat ──────────────────────────────────────────────────────────────────────
app.get("/api/chat/messages", auth, async (req: any, res) => {
  try {
    const fid = Number(req.query.friend_id);
    const r = await pool.query(
      `SELECT id,content,from_id=$1 as is_mine,created_at FROM messages
       WHERE (from_id=$1 AND to_id=$2) OR (from_id=$2 AND to_id=$1)
       ORDER BY created_at`,
      [req.userId, fid]
    );
    res.json(r.rows);
  } catch(e:any) { console.error(e); res.status(500).json({ error: "Server error" }); }
});

app.post("/api/chat/messages", auth, async (req: any, res) => {
  try {
    const { friend_id, content } = req.body;
    if (!content?.trim()) { res.status(400).json({ error: "Pesan tidak boleh kosong" }); return; }
    const r = await pool.query(
      "INSERT INTO messages(from_id,to_id,content) VALUES($1,$2,$3) RETURNING id,content,created_at",
      [req.userId, friend_id, content]
    );
    res.json({ ...r.rows[0], is_mine: true });
  } catch(e:any) { console.error(e); res.status(500).json({ error: "Server error" }); }
});

// ── Groups ────────────────────────────────────────────────────────────────────
app.get("/api/groups", auth, async (req: any, res) => {
  try {
    const r = await pool.query(
      `SELECT g.id,g.nama,g.kode,g.created_at,gm.role,
        (SELECT COUNT(*) FROM group_members WHERE group_id=g.id)::int as member_count
       FROM group_members gm JOIN groups g ON g.id=gm.group_id
       WHERE gm.user_id=$1`,
      [req.userId]
    );
    res.json(r.rows);
  } catch(e:any) { console.error(e); res.status(500).json({ error: "Server error" }); }
});

app.post("/api/groups", auth, async (req: any, res) => {
  try {
    const { nama } = req.body;
    if (!nama?.trim()) { res.status(400).json({ error: "Nama grup wajib diisi" }); return; }
    const kode = await uniqueKode("groups");
    const r = await pool.query(
      "INSERT INTO groups(nama,kode,created_by) VALUES($1,$2,$3) RETURNING id,nama,kode,created_at",
      [nama, kode, req.userId]
    );
    const g = r.rows[0];
    await pool.query("INSERT INTO group_members(group_id,user_id,role) VALUES($1,$2,'admin')", [g.id, req.userId]);
    await logActivity(req.userId, "group_create", `Membuat grup: ${nama}`);
    res.json({ ...g, role: "admin", member_count: 1 });
  } catch(e:any) { console.error(e); res.status(500).json({ error: "Server error" }); }
});

app.get("/api/groups/:id/messages", auth, async (req: any, res) => {
  try {
    const gid = Number(req.params.id);
    const mem = await pool.query("SELECT id FROM group_members WHERE group_id=$1 AND user_id=$2", [gid, req.userId]);
    if (mem.rows.length === 0) { res.status(403).json({ error: "Bukan anggota" }); return; }
    const r = await pool.query(
      `SELECT gm.id,gm.content,gm.created_at,gm.from_id=$1 as is_mine,u.nama as from_nama
       FROM group_messages gm JOIN users u ON u.id=gm.from_id
       WHERE gm.group_id=$2 ORDER BY gm.created_at`,
      [req.userId, gid]
    );
    res.json(r.rows);
  } catch(e:any) { console.error(e); res.status(500).json({ error: "Server error" }); }
});

app.post("/api/groups/:id/messages", auth, async (req: any, res) => {
  try {
    const gid = Number(req.params.id);
    const { content } = req.body;
    if (!content?.trim()) { res.status(400).json({ error: "Pesan tidak boleh kosong" }); return; }
    const mem = await pool.query("SELECT id FROM group_members WHERE group_id=$1 AND user_id=$2", [gid, req.userId]);
    if (mem.rows.length === 0) { res.status(403).json({ error: "Bukan anggota" }); return; }
    const r = await pool.query(
      "INSERT INTO group_messages(group_id,from_id,content) VALUES($1,$2,$3) RETURNING id,content,created_at",
      [gid, req.userId, content]
    );
    res.json({ ...r.rows[0], is_mine: true });
  } catch(e:any) { console.error(e); res.status(500).json({ error: "Server error" }); }
});

app.get("/api/groups/:id/members", auth, async (req: any, res) => {
  try {
    const gid = Number(req.params.id);
    const mem = await pool.query("SELECT id FROM group_members WHERE group_id=$1 AND user_id=$2", [gid, req.userId]);
    if (mem.rows.length === 0) { res.status(403).json({ error: "Bukan anggota" }); return; }
    const r = await pool.query(
      `SELECT u.id as user_id,u.nama,u.kode,u.avatar_warna,u.is_online,gm.role
       FROM group_members gm JOIN users u ON u.id=gm.user_id
       WHERE gm.group_id=$1`,
      [gid]
    );
    res.json(r.rows);
  } catch(e:any) { console.error(e); res.status(500).json({ error: "Server error" }); }
});

app.post("/api/groups/:id/members", auth, async (req: any, res) => {
  try {
    const gid = Number(req.params.id);
    const { kode } = req.body;
    const mem = await pool.query("SELECT id FROM group_members WHERE group_id=$1 AND user_id=$2", [gid, req.userId]);
    if (mem.rows.length === 0) { res.status(403).json({ error: "Bukan anggota" }); return; }
    const t = await pool.query("SELECT id FROM users WHERE kode=$1", [kode]);
    if (t.rows.length === 0) { res.status(404).json({ error: "User tidak ditemukan" }); return; }
    const tid = t.rows[0].id;
    const alr = await pool.query("SELECT id FROM group_members WHERE group_id=$1 AND user_id=$2", [gid, tid]);
    if (alr.rows.length > 0) { res.status(400).json({ error: "Sudah anggota" }); return; }
    await pool.query("INSERT INTO group_members(group_id,user_id,role) VALUES($1,$2,'member')", [gid, tid]);
    res.json({ message: "Anggota ditambahkan" });
  } catch(e:any) { console.error(e); res.status(500).json({ error: "Server error" }); }
});

app.get("/api/groups/:id/maps", auth, async (req: any, res) => {
  try {
    const gid = Number(req.params.id);
    const mem = await pool.query("SELECT id FROM group_members WHERE group_id=$1 AND user_id=$2", [gid, req.userId]);
    if (mem.rows.length === 0) { res.status(403).json({ error: "Bukan anggota" }); return; }
    const r = await pool.query(
      `SELECT u.id,u.nama,u.kode,u.avatar_warna,l.lat,l.lng,
        CASE WHEN l.updated_at > NOW()-INTERVAL '5 minutes' THEN true ELSE false END as online
       FROM group_members gm JOIN users u ON u.id=gm.user_id
       JOIN locations l ON l.user_id=gm.user_id
       WHERE gm.group_id=$1`,
      [gid]
    );
    res.json(r.rows);
  } catch(e:any) { console.error(e); res.status(500).json({ error: "Server error" }); }
});

// ── Keys (E2E Encryption) ─────────────────────────────────────────────────────
app.post("/api/keys/save", auth, async (req: any, res) => {
  try {
    const { public_key } = req.body;
    if (!public_key) { res.status(400).json({ error: "public_key wajib diisi" }); return; }
    await pool.query(
      `INSERT INTO public_keys(user_id,public_key,updated_at) VALUES($1,$2,NOW())
       ON CONFLICT(user_id) DO UPDATE SET public_key=$2,updated_at=NOW()`,
      [req.userId, public_key]
    );
    res.json({ message: "Kunci publik tersimpan" });
  } catch(e:any) { console.error(e); res.status(500).json({ error: "Server error" }); }
});

app.get("/api/keys/:userId", auth, async (req: any, res) => {
  try {
    const uid = Number(req.params.userId);
    const r = await pool.query("SELECT public_key FROM public_keys WHERE user_id=$1", [uid]);
    if (r.rows.length === 0) { res.status(404).json({ error: "Kunci tidak ditemukan" }); return; }
    res.json({ public_key: r.rows[0].public_key });
  } catch(e:any) { console.error(e); res.status(500).json({ error: "Server error" }); }
});

// ── Users ─────────────────────────────────────────────────────────────────────
app.get("/api/users/:id", auth, async (req: any, res) => {
  try {
    const uid = Number(req.params.id);
    const r = await pool.query(
      "SELECT id,nama,email,kode,avatar_warna,is_online,last_seen,created_at FROM users WHERE id=$1",
      [uid]
    );
    if (r.rows.length === 0) { res.status(404).json({ error: "Pengguna tidak ditemukan" }); return; }
    res.json(r.rows[0]);
  } catch(e:any) { console.error(e); res.status(500).json({ error: "Server error" }); }
});

app.patch("/api/auth/update", auth, async (req: any, res) => {
  try {
    const { nama, avatar_warna } = req.body;
    if (!nama?.trim()) { res.status(400).json({ error: "Nama tidak boleh kosong" }); return; }
    const r = await pool.query(
      "UPDATE users SET nama=$1,avatar_warna=COALESCE($2,avatar_warna) WHERE id=$3 RETURNING id,nama,email,kode,avatar_warna",
      [nama.trim(), avatar_warna || null, req.userId]
    );
    await logActivity(req.userId, "update_profile", `Perbarui profil: ${nama}`);
    res.json(r.rows[0]);
  } catch(e:any) { console.error(e); res.status(500).json({ error: "Server error" }); }
});

// ── Polling / Events ──────────────────────────────────────────────────────────
app.get("/api/ws", auth, async (req: any, res) => {
  try {
    const since = req.query.since as string || new Date(Date.now() - 10000).toISOString();
    const friend_id = req.query.friend_id ? Number(req.query.friend_id) : null;
    const group_id = req.query.group_id ? Number(req.query.group_id) : null;
    const events: any[] = [];

    // Update online status
    await pool.query("UPDATE users SET is_online=true,last_seen=NOW() WHERE id=$1", [req.userId]);

    // Pesan baru dari teman aktif
    if (friend_id) {
      const r = await pool.query(
        `SELECT id,content,from_id,to_id,created_at FROM messages
         WHERE ((from_id=$1 AND to_id=$2) OR (from_id=$2 AND to_id=$1)) AND created_at > $3
         ORDER BY created_at ASC LIMIT 50`,
        [req.userId, friend_id, since]
      );
      for (const m of r.rows) {
        events.push({ type: "new_message", payload: { ...m, is_mine: m.from_id === req.userId } });
      }
    }

    // Pesan baru di grup aktif
    if (group_id) {
      const mem = await pool.query("SELECT id FROM group_members WHERE group_id=$1 AND user_id=$2", [group_id, req.userId]);
      if (mem.rows.length > 0) {
        const r = await pool.query(
          `SELECT gm.id,gm.content,gm.created_at,gm.from_id,u.nama as from_nama,u.avatar_warna,
            gm.from_id=$1 as is_mine
           FROM group_messages gm JOIN users u ON u.id=gm.from_id
           WHERE gm.group_id=$2 AND gm.created_at > $3 AND gm.from_id!=$1
           ORDER BY gm.created_at ASC LIMIT 50`,
          [req.userId, group_id, since]
        );
        for (const m of r.rows) {
          events.push({ type: "group_message", payload: { ...m, is_mine: false } });
        }
      }
    }

    // Permintaan pertemanan baru
    const reqR = await pool.query(
      `SELECT fr.id,fr.dari_id,u.nama as dari_nama,u.avatar_warna as dari_avatar_warna
       FROM friend_requests fr JOIN users u ON u.id=fr.dari_id
       WHERE fr.ke_id=$1 AND fr.status='pending' AND fr.created_at > $2`,
      [req.userId, since]
    );
    for (const r of reqR.rows) {
      events.push({ type: "friend_request", payload: r });
    }

    // Pesan belum dibaca dari teman lain (notif unread)
    const unreadR = await pool.query(
      `SELECT DISTINCT from_id FROM messages
       WHERE to_id=$1 AND created_at > $2 AND from_id!=$3
       ORDER BY from_id`,
      [req.userId, since, friend_id ?? 0]
    );
    for (const u of unreadR.rows) {
      events.push({ type: "unread_message", payload: { from_user_id: u.from_id } });
    }

    // Update lokasi semua teman (selalu kirim, bukan hanya yang berubah)
    const locR = await pool.query(
      `SELECT u.id,u.nama,u.avatar_warna,u.is_online,u.last_seen,l.lat,l.lng,l.updated_at
       FROM friends f JOIN users u ON u.id=f.friend_id
       LEFT JOIN locations l ON l.user_id=f.friend_id
       WHERE f.user_id=$1`,
      [req.userId]
    );
    for (const l of locR.rows) {
      if (l.lat && l.lng) {
        events.push({ type: "location_update", payload: {
          user_id: l.id, nama: l.nama, avatar_warna: l.avatar_warna,
          lat: l.lat, lng: l.lng, is_online: l.is_online,
        }});
      } else {
        events.push({ type: "user_status", payload: {
          user_id: l.id, is_online: l.is_online,
        }});
      }
    }

    res.json({ events, timestamp: new Date().toISOString() });
  } catch { res.json({ events: [], timestamp: new Date().toISOString() }); }
});

// ── Admin: cek maintenance (publik) ──────────────────────────────────────────
app.get("/api/admin/check-maintenance", async (_req, res) => {
  try {
    const r = await pool.query("SELECT value FROM settings WHERE key='maintenance_mode'");
    const isMaintenance = r.rows.length > 0 && r.rows[0].value === "1";
    res.json({ maintenance: isMaintenance });
  } catch { res.json({ maintenance: false }); }
});

// ── Admin: login ──────────────────────────────────────────────────────────────
app.post("/api/admin/login", async (req, res) => {
  try {
    const { username, kata_sandi } = req.body;
    if (!username || !kata_sandi) { res.status(400).json({ error: "Username dan kata sandi wajib diisi" }); return; }
    const r = await pool.query("SELECT * FROM admin WHERE username=$1", [username]);
    if (r.rows.length === 0) { res.status(401).json({ error: "Username atau kata sandi salah" }); return; }
    const adm = r.rows[0];
    if (!await bcrypt.compare(kata_sandi, adm.kata_sandi)) {
      res.status(401).json({ error: "Username atau kata sandi salah" }); return;
    }
    await logActivity(null, "admin_login", `Admin ${username} masuk`);
    res.json({ token: adminToken(adm.id, adm.username), username: adm.username });
  } catch(e:any) { console.error(e); res.status(500).json({ error: "Server error" }); }
});

app.post("/api/admin/logout", adminAuth, async (_req, res) => {
  res.json({ message: "Logout berhasil" });
});

// ── Admin: stats ──────────────────────────────────────────────────────────────
app.get("/api/admin/stats", adminAuth, async (_req, res) => {
  try {
    const [totalUsers, onlineUsers, totalFriends, totalMessages, todayReg] = await Promise.all([
      pool.query("SELECT COUNT(*)::int as n FROM users"),
      pool.query("SELECT COUNT(*)::int as n FROM users WHERE is_online=true"),
      pool.query("SELECT COUNT(*)::int as n FROM friends"),
      pool.query("SELECT (SELECT COUNT(*) FROM messages) + (SELECT COUNT(*) FROM group_messages) as n"),
      pool.query("SELECT COUNT(*)::int as n FROM users WHERE created_at::date = CURRENT_DATE"),
    ]);
    const recentUsers = await pool.query(
      `SELECT id,nama,email,kode,avatar_warna,is_online,last_seen,created_at
       FROM users ORDER BY created_at DESC LIMIT 5`
    );
    const recentLogs = await pool.query(
      `SELECT al.id,al.user_id,al.aksi,al.detail,al.created_at,u.nama
       FROM activity_logs al LEFT JOIN users u ON al.user_id=u.id
       ORDER BY al.created_at DESC LIMIT 20`
    );
    res.json({
      total_pengguna: totalUsers.rows[0].n,
      pengguna_online: onlineUsers.rows[0].n,
      total_pertemanan: totalFriends.rows[0].n,
      total_pesan: Number(totalMessages.rows[0].n),
      pendaftaran_hari_ini: todayReg.rows[0].n,
      recent_users: recentUsers.rows,
      recent_logs: recentLogs.rows,
    });
  } catch(e:any) { console.error(e); res.status(500).json({ error: "Server error" }); }
});

// ── Admin: users ──────────────────────────────────────────────────────────────
app.get("/api/admin/users", adminAuth, async (req: any, res) => {
  try {
    const q = `%${(req.query.q as string || "")}%`;
    const r = await pool.query(
      `SELECT u.id,u.nama,u.email,u.kode,u.avatar_warna,u.is_online,u.last_seen,u.created_at,
        l.lat,l.lng,
        (SELECT COUNT(*)::int FROM friends WHERE user_id=u.id) as friend_count
       FROM users u LEFT JOIN locations l ON l.user_id=u.id
       WHERE u.nama ILIKE $1 OR u.email ILIKE $1
       ORDER BY u.created_at DESC LIMIT 500`,
      [q]
    );
    res.json(r.rows);
  } catch(e:any) { console.error(e); res.status(500).json({ error: "Server error" }); }
});

app.delete("/api/admin/users/:id", adminAuth, async (req: any, res) => {
  try {
    const uid = Number(req.params.id);
    const u = await pool.query("SELECT nama FROM users WHERE id=$1", [uid]);
    if (u.rows.length === 0) { res.status(404).json({ error: "User tidak ditemukan" }); return; }
    await pool.query("DELETE FROM users WHERE id=$1", [uid]);
    await logActivity(null, "admin_delete_user", `Admin hapus user: ${u.rows[0].nama}`);
    res.json({ message: "User dihapus" });
  } catch(e:any) { console.error(e); res.status(500).json({ error: "Server error" }); }
});

// ── Admin: force logout ───────────────────────────────────────────────────────
app.post("/api/admin/force-logout/:id", adminAuth, async (req: any, res) => {
  try {
    const uid = Number(req.params.id);
    await pool.query("UPDATE users SET is_online=false WHERE id=$1", [uid]);
    await logActivity(null, "admin_force_logout", `Admin force logout user id: ${uid}`);
    res.json({ message: "User telah di-logout" });
  } catch(e:any) { console.error(e); res.status(500).json({ error: "Server error" }); }
});

// ── Admin: maintenance ────────────────────────────────────────────────────────
app.get("/api/admin/maintenance", adminAuth, async (_req, res) => {
  try {
    const r = await pool.query("SELECT value FROM settings WHERE key='maintenance_mode'");
    const isMaintenance = r.rows.length > 0 && r.rows[0].value === "1";
    res.json({ maintenance: isMaintenance });
  } catch(e:any) { console.error(e); res.status(500).json({ error: "Server error" }); }
});

app.post("/api/admin/maintenance", adminAuth, async (req: any, res) => {
  try {
    const { aktif } = req.body;
    const mode = aktif ? "1" : "0";
    await pool.query(
      "INSERT INTO settings(key,value) VALUES('maintenance_mode',$1) ON CONFLICT(key) DO UPDATE SET value=$1",
      [mode]
    );
    if (aktif) {
      await pool.query("UPDATE users SET is_online=false");
      await logActivity(null, "maintenance_on", "Maintenance mode aktif");
    } else {
      await logActivity(null, "maintenance_off", "Maintenance mode dinonaktifkan");
    }
    res.json({ maintenance: aktif, message: aktif ? "Maintenance ON" : "Maintenance OFF" });
  } catch(e:any) { console.error(e); res.status(500).json({ error: "Server error" }); }
});

// ── Start ─────────────────────────────────────────────────────────────────────
initDB().then(() => {
  app.listen(PORT, () => console.log(`GeoNode server running on port ${PORT}`));
}).catch(e => { console.error("DB init failed:", e); process.exit(1); });
