import express from "express";
  import cors from "cors";
  import bcrypt from "bcryptjs";
  import jwt from "jsonwebtoken";
  import { Pool } from "pg";

  const app = express();
  const PORT = process.env.PORT || 3000;
  const JWT_SECRET = process.env.JWT_SECRET || "geonode-secret";

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
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS friends (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(id),
        friend_id INT NOT NULL REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS friend_requests (
        id SERIAL PRIMARY KEY,
        dari_id INT NOT NULL REFERENCES users(id),
        ke_id INT NOT NULL REFERENCES users(id),
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        from_id INT NOT NULL REFERENCES users(id),
        to_id INT NOT NULL REFERENCES users(id),
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
        group_id INT NOT NULL REFERENCES groups(id),
        user_id INT NOT NULL REFERENCES users(id),
        role VARCHAR(20) DEFAULT 'member',
        joined_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS group_messages (
        id SERIAL PRIMARY KEY,
        group_id INT NOT NULL REFERENCES groups(id),
        from_id INT NOT NULL REFERENCES users(id),
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS locations (
        id SERIAL PRIMARY KEY,
        user_id INT UNIQUE NOT NULL REFERENCES users(id),
        lat DOUBLE PRECISION NOT NULL,
        lng DOUBLE PRECISION NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
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

  function auth(req: any, res: any, next: any) {
    const h = req.headers.authorization;
    if (!h?.startsWith("Bearer ")) { res.status(401).json({ error: "Unauthorized" }); return; }
    try {
      const d = jwt.verify(h.slice(7), JWT_SECRET) as any;
      req.userId = d.userId;
      next();
    } catch { res.status(401).json({ error: "Invalid token" }); }
  }

  // ── Routes ────────────────────────────────────────────────────────────────────

  app.get("/api/healthz", (_req, res) => res.json({ status: "ok" }));

  // Auth
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

  app.post("/api/auth/logout", auth, (_req, res) => res.json({ message: "Logged out" }));

  // Friends
  app.get("/api/friends", auth, async (req: any, res) => {
    try {
      const r = await pool.query(
        `SELECT u.id,u.nama,u.kode,u.avatar_warna,
          CASE WHEN l.updated_at > NOW()-INTERVAL '5 minutes' THEN true ELSE false END as online,
          l.updated_at as last_seen
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
      const t = await pool.query("SELECT id FROM users WHERE kode=$1", [kode]);
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
      await pool.query("INSERT INTO friends(user_id,friend_id) VALUES($1,$2),($3,$4) ON CONFLICT DO NOTHING",
        [req.userId, fr.dari_id, fr.dari_id, req.userId]);
      res.json({ message: "Diterima" });
    } catch(e:any) { console.error(e); res.status(500).json({ error: "Server error" }); }
  });

  app.post("/api/friends/requests/:id/reject", auth, async (req: any, res) => {
    try {
      await pool.query("UPDATE friend_requests SET status='rejected' WHERE id=$1 AND ke_id=$2", [Number(req.params.id), req.userId]);
      res.json({ message: "Ditolak" });
    } catch(e:any) { console.error(e); res.status(500).json({ error: "Server error" }); }
  });

  // Location
  app.post("/api/location/update", auth, async (req: any, res) => {
    try {
      const { lat, lng } = req.body;
      await pool.query(
        `INSERT INTO locations(user_id,lat,lng,updated_at) VALUES($1,$2,$3,NOW())
         ON CONFLICT(user_id) DO UPDATE SET lat=$2,lng=$3,updated_at=NOW()`,
        [req.userId, lat, lng]
      );
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

  // Chat
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
      const r = await pool.query(
        "INSERT INTO messages(from_id,to_id,content) VALUES($1,$2,$3) RETURNING id,content,created_at",
        [req.userId, friend_id, content]
      );
      res.json({ ...r.rows[0], is_mine: true });
    } catch(e:any) { console.error(e); res.status(500).json({ error: "Server error" }); }
  });

  // Groups
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
      const kode = await uniqueKode("groups");
      const r = await pool.query(
        "INSERT INTO groups(nama,kode,created_by) VALUES($1,$2,$3) RETURNING id,nama,kode,created_at",
        [nama, kode, req.userId]
      );
      const g = r.rows[0];
      await pool.query("INSERT INTO group_members(group_id,user_id,role) VALUES($1,$2,'admin')", [g.id, req.userId]);
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
        `SELECT u.id as user_id,u.nama,u.kode,u.avatar_warna,gm.role
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

  app.get("/api/ws", auth, (_req, res) => res.json({ events: [] }));

  // ── Start ─────────────────────────────────────────────────────────────────────
  initDB().then(() => {
    app.listen(PORT, () => console.log(`GeoNode server running on port ${PORT}`));
  }).catch(e => { console.error("DB init failed:", e); process.exit(1); });
  