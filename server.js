'use strict';
require('dotenv').config();

const express = require('express');
const mysql   = require('mysql2');
const jwt     = require('jsonwebtoken');
const bcrypt  = require('bcrypt');
const cors    = require('cors');
const path    = require('path');

const {
    syncPatientToSatuSehat,
    syncPrescriptionToSatuSehat,
    syncDispenseToSatuSehat
} = require('./services/satusehat/integrationManager');

const app = express();
app.use(express.json());
app.use(cors());

// Melayani file frontend (HTML, CSS, JS) secara langsung
app.use(express.static(path.join(__dirname, 'frontend')));

// ─────────────────────────────────────────────────────────────
// 1. KONEKSI DATABASE — sistem_resep (MySQL Pool)
// ─────────────────────────────────────────────────────────────
const db = mysql.createPool({
    host:             process.env.DB_HOST     || 'localhost',
    user:             process.env.DB_USER     || 'root',
    password:         process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '',
    database:         process.env.DB_NAME     || 'sistem_resep',
    waitForConnections: true,
    connectionLimit:  10,
    queueLimit:       0
});

// Tes koneksi awal
db.getConnection((err, connection) => {
    if (err) {
        console.error('--> [ERROR] Gagal konek ke database MySQL:', err.message);
        console.error('--> Pastikan service MySQL berjalan dan periksa kredensial di file .env');
    } else {
        console.log(`--> [SUKSES] Berhasil terhubung ke database MySQL: ${process.env.DB_NAME || 'sistem_resep'}`);
        connection.release();
    }
});

// Promise wrapper untuk async/await
const dbQ = db.promise();

// ─────────────────────────────────────────────────────────────
// 2. JWT MIDDLEWARE
// ─────────────────────────────────────────────────────────────
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Format: Bearer <token>

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Akses ditolak. Token autentikasi tidak ditemukan.'
        });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
        return res.status(500).json({
            success: false,
            message: 'Konfigurasi server error: JWT_SECRET belum disetel.'
        });
    }

    jwt.verify(token, secret, (err, decoded) => {
        if (err) {
            return res.status(401).json({
                success: false,
                message: 'Token tidak valid atau telah kedaluwarsa.'
            });
        }
        req.user = decoded; // { user_id, username, role }
        next();
    });
};

// Middleware otorisasi role
const requireRole = (...roles) => {
    const allowed = roles.flat().map(r => String(r).toUpperCase());
    return (req, res, next) => {
        if (!req.user || !req.user.role) {
            return res.status(401).json({
                success: false,
                message: 'Akses ditolak. Informasi kredensial tidak ditemukan.'
            });
        }
        if (!allowed.includes(String(req.user.role).toUpperCase())) {
            return res.status(403).json({
                success: false,
                message: `Akses ditolak. Role '${req.user.role}' tidak memiliki izin untuk resource ini.`
            });
        }
        next();
    };
};

// ─────────────────────────────────────────────────────────────
// 3. POST /api/login
// ─────────────────────────────────────────────────────────────
app.post('/api/login', async (req, res) => {
    const username = (req.body.username || req.body.email || '').trim();
    const password = req.body.password;

    if (!username || !password) {
        return res.status(400).json({
            success: false,
            message: 'Username dan password wajib diisi.'
        });
    }

    try {
        // Cari user berdasarkan username
        const [rows] = await dbQ.query(
            'SELECT user_id, username, password_hash, role, status FROM users WHERE username = ? LIMIT 1',
            [username]
        );

        if (rows.length === 0) {
            return res.status(401).json({ success: false, message: 'Username atau password salah.' });
        }

        const user = rows[0];

        // Cek status akun
        if (user.status !== 'AKTIF') {
            return res.status(403).json({
                success: false,
                message: 'Akun nonaktif. Silakan hubungi administrator.'
            });
        }

        // Verifikasi password dengan bcrypt
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Username atau password salah.' });
        }

        // Ambil data profil sesuai role
        let profile = {};
        if (user.role === 'DOKTER') {
            const [dRows] = await dbQ.query(
                'SELECT dokter_id, nama_dokter, spesialisasi, no_str, no_telepon FROM dokter WHERE user_id = ? LIMIT 1',
                [user.user_id]
            );
            if (dRows.length > 0) profile = dRows[0];
        } else if (user.role === 'APOTEKER') {
            const [aRows] = await dbQ.query(
                'SELECT apoteker_id, nama_apoteker, no_sipa, no_telepon FROM apoteker WHERE user_id = ? LIMIT 1',
                [user.user_id]
            );
            if (aRows.length > 0) profile = aRows[0];
        } else if (user.role === 'PASIEN') {
            const [pRows] = await dbQ.query(
                'SELECT pasien_id, no_rm, nik, ihs_number, nama_pasien, tanggal_lahir, jenis_kelamin, alamat, no_telepon FROM pasien WHERE user_id = ? LIMIT 1',
                [user.user_id]
            );
            if (pRows.length > 0) profile = pRows[0];
        }

        // Generate JWT (payload: user_id, username, role)
        const payload = {
            user_id:  user.user_id,
            username: user.username,
            role:     user.role
        };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });

        return res.status(200).json({
            success: true,
            message: 'Login berhasil',
            token,
            user: {
                user_id:  user.user_id,
                username: user.username,
                role:     user.role,
                ...profile  // data profil sesuai role (tanpa password_hash)
            }
        });

    } catch (err) {
        console.error('[LOGIN ERROR]', err.message);
        return res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server saat proses login.',
            error: err.message
        });
    }
});

// ─────────────────────────────────────────────────────────────
// 4. POST /api/register — Registrasi Pasien Baru
// ─────────────────────────────────────────────────────────────
app.post('/api/register', async (req, res) => {
    const {
        username, password, nama_pasien, nik,
        tanggal_lahir, jenis_kelamin, alamat, no_telepon,
        no_rm, ihs_number
    } = req.body;

    // Validasi field wajib
    if (!username || !password || !nama_pasien || !nik || !tanggal_lahir || !jenis_kelamin) {
        return res.status(400).json({
            success: false,
            message: 'Field wajib: username, password, nama_pasien, nik, tanggal_lahir, jenis_kelamin.'
        });
    }

    let conn;
    try {
        conn = await dbQ.getConnection();

        // Cek username sudah dipakai
        const [existUser] = await conn.query(
            'SELECT user_id FROM users WHERE username = ? LIMIT 1', [username]
        );
        if (existUser.length > 0) {
            conn.release();
            return res.status(400).json({ success: false, message: 'Username sudah digunakan.' });
        }

        // Cek NIK sudah terdaftar
        const [existNik] = await conn.query(
            'SELECT pasien_id FROM pasien WHERE nik = ? LIMIT 1', [nik]
        );
        if (existNik.length > 0) {
            conn.release();
            return res.status(400).json({ success: false, message: 'NIK sudah terdaftar.' });
        }

        // Hash password
        const password_hash = await bcrypt.hash(password, 10);

        // Transaksi: insert users → insert pasien
        await conn.beginTransaction();

        const [userResult] = await conn.query(
            "INSERT INTO users (username, password_hash, role, status, created_at, updated_at) VALUES (?, ?, 'PASIEN', 'AKTIF', NOW(), NOW())",
            [username, password_hash]
        );
        const newUserId  = userResult.insertId;
        const finalNoRm  = no_rm || ('RM-' + String(newUserId).padStart(6, '0'));

        await conn.query(
            `INSERT INTO pasien
                (user_id, no_rm, nik, ihs_number, nama_pasien, tanggal_lahir, jenis_kelamin, alamat, no_telepon)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [newUserId, finalNoRm, nik, ihs_number || null, nama_pasien, tanggal_lahir, jenis_kelamin, alamat || null, no_telepon || null]
        );

        await conn.commit();
        conn.release();

        return res.status(201).json({
            success: true,
            message: 'Registrasi pasien berhasil.',
            user: {
                user_id: newUserId,
                username,
                role:    'PASIEN',
                nama_pasien,
                no_rm:   finalNoRm,
                nik
            }
        });

    } catch (err) {
        if (conn) { try { await conn.rollback(); } catch (_) {} conn.release(); }
        console.error('[REGISTER ERROR]', err.message);
        return res.status(500).json({
            success: false,
            message: 'Gagal mendaftarkan pasien.',
            error: err.message
        });
    }
});

// ─────────────────────────────────────────────────────────────
// 5. GET /api/me — Profil user yang sedang login
// ─────────────────────────────────────────────────────────────
app.get('/api/me', authenticateToken, async (req, res) => {
    try {
        const [users] = await dbQ.query(
            'SELECT user_id, username, role, status, created_at FROM users WHERE user_id = ? LIMIT 1',
            [req.user.user_id]
        );
        if (users.length === 0) {
            return res.status(404).json({ success: false, message: 'User tidak ditemukan.' });
        }

        const user = users[0];
        let profile = {};

        if (user.role === 'DOKTER') {
            const [rows] = await dbQ.query(
                'SELECT dokter_id, nama_dokter, spesialisasi, no_str, no_telepon FROM dokter WHERE user_id = ? LIMIT 1',
                [user.user_id]
            );
            if (rows.length > 0) profile = rows[0];
        } else if (user.role === 'APOTEKER') {
            const [rows] = await dbQ.query(
                'SELECT apoteker_id, nama_apoteker, no_sipa, no_telepon FROM apoteker WHERE user_id = ? LIMIT 1',
                [user.user_id]
            );
            if (rows.length > 0) profile = rows[0];
        } else if (user.role === 'PASIEN') {
            const [rows] = await dbQ.query(
                'SELECT pasien_id, no_rm, nik, ihs_number, nama_pasien, tanggal_lahir, jenis_kelamin, alamat, no_telepon FROM pasien WHERE user_id = ? LIMIT 1',
                [user.user_id]
            );
            if (rows.length > 0) profile = rows[0];
        }

        return res.status(200).json({ success: true, data: { ...user, ...profile } });

    } catch (err) {
        return res.status(500).json({
            success: false,
            message: 'Gagal mengambil data profil.',
            error: err.message
        });
    }
});

// ─────────────────────────────────────────────────────────────
// 6. GET /api/users — Daftar semua user (Hanya ADMIN)
// ─────────────────────────────────────────────────────────────
app.get('/api/users', authenticateToken, requireRole('ADMIN'), async (req, res) => {
    try {
        const [rows] = await dbQ.query(`
            SELECT
                u.user_id,
                u.username,
                u.role,
                u.status,
                CASE
                    WHEN u.role = 'DOKTER'   THEN d.nama_dokter
                    WHEN u.role = 'APOTEKER' THEN a.nama_apoteker
                    WHEN u.role = 'PASIEN'   THEN p.nama_pasien
                    ELSE 'Administrator'
                END AS nama,
                u.created_at
            FROM users u
            LEFT JOIN dokter   d ON d.user_id = u.user_id
            LEFT JOIN apoteker a ON a.user_id = u.user_id
            LEFT JOIN pasien   p ON p.user_id = u.user_id
            ORDER BY u.user_id ASC
        `);
        return res.status(200).json(rows);
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: 'Gagal mengambil data pengguna.',
            error: err.message
        });
    }
});

// ─────────────────────────────────────────────────────────────
// 7. MASTER OBAT — GET /api/obat & /api/medications
// ─────────────────────────────────────────────────────────────

// Query utama obat dengan total stok dari batch aktif
const SQL_OBAT_BASE = `
    SELECT
        o.obat_id,
        o.kode_kfa,
        o.nama_obat,
        o.bentuk_sediaan,
        o.kekuatan,
        o.satuan,
        o.status,
        COALESCE(SUM(CASE WHEN b.status = 'AKTIF' THEN b.jumlah_stok ELSE 0 END), 0) AS total_stok
    FROM obat o
    LEFT JOIN batch_obat b ON b.obat_id = o.obat_id
    GROUP BY o.obat_id, o.kode_kfa, o.nama_obat, o.bentuk_sediaan, o.kekuatan, o.satuan, o.status
`;

app.get('/api/obat', async (req, res) => {
    try {
        const [rows] = await dbQ.query(SQL_OBAT_BASE + ' ORDER BY o.nama_obat ASC');
        return res.status(200).json(rows);
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: "Gagal mengambil data dari tabel 'obat'.",
            error: err.message
        });
    }
});

app.get('/api/medications', async (req, res) => {
    const { search = '', low_stock } = req.query;
    try {
        // Bungkus query dasar sebagai subquery untuk memfilter hasil agregasi
        let sql = `SELECT * FROM (${SQL_OBAT_BASE}) AS sub WHERE 1=1`;
        const params = [];

        if (search) {
            sql += ' AND (nama_obat LIKE ? OR kode_kfa LIKE ? OR bentuk_sediaan LIKE ?)';
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }
        if (low_stock === 'true') {
            sql += ' AND total_stok <= 10'; // threshold stok rendah (tidak ada kolom stok_minimum di schema)
        }
        sql += ' ORDER BY nama_obat ASC';

        const [rows] = await dbQ.query(sql, params);
        return res.status(200).json(rows);
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: 'Gagal mengambil data obat.',
            error: err.message
        });
    }
});

app.get('/api/medications/:id', async (req, res) => {
    try {
        const [rows] = await dbQ.query(
            `SELECT * FROM (${SQL_OBAT_BASE}) AS sub WHERE obat_id = ? LIMIT 1`,
            [req.params.id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Obat tidak ditemukan.' });
        }
        return res.status(200).json(rows[0]);
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: 'Gagal mengambil data obat.',
            error: err.message
        });
    }
});

// ─────────────────────────────────────────────────────────────
// 8. BATCH OBAT — GET /api/batch-obat
// ─────────────────────────────────────────────────────────────
app.get('/api/batch-obat', authenticateToken, requireRole('ADMIN', 'APOTEKER'), async (req, res) => {
    const { obat_id } = req.query;
    try {
        let sql = `
            SELECT
                b.batch_id, b.batch_number, b.tanggal_kadaluarsa,
                b.jumlah_stok, b.tanggal_masuk, b.status,
                o.obat_id, o.nama_obat, o.kode_kfa, o.satuan
            FROM batch_obat b
            JOIN obat o ON o.obat_id = b.obat_id
            WHERE b.status = 'AKTIF'
        `;
        const params = [];
        if (obat_id) {
            sql += ' AND b.obat_id = ?';
            params.push(obat_id);
        }
        sql += ' ORDER BY b.tanggal_kadaluarsa ASC';

        const [rows] = await dbQ.query(sql, params);
        return res.status(200).json(rows);
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: 'Gagal mengambil data batch obat.',
            error: err.message
        });
    }
});

// ─────────────────────────────────────────────────────────────
// 9. DATA PASIEN — GET /api/patients & /api/pasien
// ─────────────────────────────────────────────────────────────
app.get('/api/patients', authenticateToken, requireRole('ADMIN', 'DOKTER', 'APOTEKER'), async (req, res) => {
    const { search = '' } = req.query;
    try {
        let sql = `
            SELECT pasien_id, no_rm, nik, ihs_number, nama_pasien,
                   tanggal_lahir, jenis_kelamin, alamat, no_telepon
            FROM pasien WHERE 1=1
        `;
        const params = [];
        if (search) {
            sql += ' AND (nama_pasien LIKE ? OR nik LIKE ? OR no_rm LIKE ?)';
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }
        sql += ' ORDER BY nama_pasien ASC';

        const [rows] = await dbQ.query(sql, params);
        return res.status(200).json(rows);
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: 'Gagal mengambil data pasien.',
            error: err.message
        });
    }
});

// Alias kompatibilitas /api/pasien
app.get('/api/pasien', authenticateToken, requireRole('ADMIN', 'DOKTER', 'APOTEKER'), async (req, res) => {
    const { search = '' } = req.query;
    try {
        let sql = `
            SELECT pasien_id, no_rm, nik, ihs_number, nama_pasien,
                   tanggal_lahir, jenis_kelamin, alamat, no_telepon
            FROM pasien WHERE 1=1
        `;
        const params = [];
        if (search) {
            sql += ' AND (nama_pasien LIKE ? OR nik LIKE ? OR no_rm LIKE ?)';
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }
        sql += ' ORDER BY nama_pasien ASC';

        const [rows] = await dbQ.query(sql, params);
        return res.status(200).json(rows);
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: 'Gagal mengambil data pasien.',
            error: err.message
        });
    }
});

app.get('/api/patients/search', authenticateToken, requireRole('ADMIN', 'DOKTER', 'APOTEKER'), async (req, res) => {
    const { nik, no_rm, ihs_number } = req.query;
    if (!nik && !no_rm && !ihs_number) {
        return res.status(400).json({
            success: false,
            message: 'Parameter pencarian (nik / no_rm / ihs_number) diperlukan.'
        });
    }
    try {
        const [rows] = await dbQ.query(
            'SELECT * FROM pasien WHERE nik = ? OR no_rm = ? OR ihs_number = ? LIMIT 1',
            [nik || null, no_rm || null, ihs_number || null]
        );
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Pasien tidak ditemukan.' });
        }
        return res.status(200).json(rows[0]);
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: 'Gagal mencari pasien.',
            error: err.message
        });
    }
});

// ─────────────────────────────────────────────────────────────
// 10. DAFTAR DOKTER & APOTEKER
// ─────────────────────────────────────────────────────────────
app.get('/api/dokter', authenticateToken, async (req, res) => {
    try {
        const [rows] = await dbQ.query(`
            SELECT d.dokter_id, d.nama_dokter, d.spesialisasi, d.no_str, d.no_telepon,
                   u.username, u.status
            FROM dokter d
            JOIN users u ON u.user_id = d.user_id
            ORDER BY d.nama_dokter ASC
        `);
        return res.status(200).json(rows);
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: 'Gagal mengambil data dokter.',
            error: err.message
        });
    }
});

app.get('/api/apoteker', authenticateToken, async (req, res) => {
    try {
        const [rows] = await dbQ.query(`
            SELECT a.apoteker_id, a.nama_apoteker, a.no_sipa, a.no_telepon,
                   u.username, u.status
            FROM apoteker a
            JOIN users u ON u.user_id = a.user_id
            ORDER BY a.nama_apoteker ASC
        `);
        return res.status(200).json(rows);
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: 'Gagal mengambil data apoteker.',
            error: err.message
        });
    }
});

// ─────────────────────────────────────────────────────────────
// 11. RESEP — GET /api/prescriptions
//     Relasi: resep → rekam_medis → kunjungan → pasien
// ─────────────────────────────────────────────────────────────
app.get('/api/prescriptions', authenticateToken, requireRole('ADMIN', 'DOKTER', 'APOTEKER'), async (req, res) => {
    const { status, dokter_id, pasien_id } = req.query;
    try {
        let sql = `
            SELECT
                r.resep_id,
                r.nomor_resep,
                r.tanggal_resep,
                r.status_resep,
                d.dokter_id,
                d.nama_dokter,
                d.spesialisasi,
                p.pasien_id,
                p.nama_pasien,
                p.nik,
                p.no_rm,
                p.ihs_number,
                k.kunjungan_id,
                k.tanggal_kunjungan,
                k.jenis_kunjungan
            FROM resep r
            JOIN dokter     d  ON d.dokter_id      = r.dokter_id
            JOIN rekam_medis rm ON rm.rekam_medis_id = r.rekam_medis_id
            JOIN kunjungan  k  ON k.kunjungan_id   = rm.kunjungan_id
            JOIN pasien     p  ON p.pasien_id       = k.pasien_id
            WHERE 1=1
        `;
        const params = [];
        if (status)    { sql += ' AND r.status_resep = ?'; params.push(status); }
        if (dokter_id) { sql += ' AND r.dokter_id = ?';    params.push(dokter_id); }
        if (pasien_id) { sql += ' AND p.pasien_id = ?';    params.push(pasien_id); }
        sql += ' ORDER BY r.tanggal_resep DESC';

        const [rows] = await dbQ.query(sql, params);
        return res.status(200).json(rows);
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: 'Gagal mengambil data resep.',
            error: err.message
        });
    }
});

app.get('/api/prescriptions/:id', authenticateToken, requireRole('ADMIN', 'DOKTER', 'APOTEKER', 'PASIEN'), async (req, res) => {
    try {
        // Header resep
        const [rows] = await dbQ.query(`
            SELECT
                r.resep_id, r.nomor_resep, r.tanggal_resep, r.status_resep,
                d.nama_dokter, d.spesialisasi,
                p.nama_pasien, p.nik, p.no_rm, p.ihs_number,
                k.tanggal_kunjungan, k.jenis_kunjungan
            FROM resep r
            JOIN dokter     d  ON d.dokter_id       = r.dokter_id
            JOIN rekam_medis rm ON rm.rekam_medis_id  = r.rekam_medis_id
            JOIN kunjungan  k  ON k.kunjungan_id    = rm.kunjungan_id
            JOIN pasien     p  ON p.pasien_id        = k.pasien_id
            WHERE r.resep_id = ?
            LIMIT 1
        `, [req.params.id]);

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Resep tidak ditemukan.' });
        }

        // Detail item obat dalam resep
        const [details] = await dbQ.query(`
            SELECT
                dr.detail_resep_id,
                dr.jumlah,
                dr.dosis,
                dr.frekuensi,
                dr.aturan_pakai,
                dr.catatan,
                o.obat_id,
                o.nama_obat,
                o.kode_kfa,
                o.bentuk_sediaan,
                o.kekuatan,
                o.satuan
            FROM detail_resep dr
            JOIN obat o ON o.obat_id = dr.obat_id
            WHERE dr.resep_id = ?
            ORDER BY dr.detail_resep_id ASC
        `, [req.params.id]);

        return res.status(200).json({ ...rows[0], detail_obat: details });
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: 'Gagal mengambil detail resep.',
            error: err.message
        });
    }
});

// Batalkan resep (ubah status)
app.patch('/api/prescriptions/:id/cancel', authenticateToken, requireRole('ADMIN', 'DOKTER'), async (req, res) => {
    try {
        const [result] = await dbQ.query(
            "UPDATE resep SET status_resep = 'TERTUNDA' WHERE resep_id = ?",
            [req.params.id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Resep tidak ditemukan.' });
        }
        return res.status(200).json({ success: true, message: 'Status resep diubah menjadi TERTUNDA.' });
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: 'Gagal membatalkan resep.',
            error: err.message
        });
    }
});

// ─────────────────────────────────────────────────────────────
// 12. DISPENSING — GET /api/dispenses
// ─────────────────────────────────────────────────────────────
app.get('/api/dispenses', authenticateToken, requireRole('ADMIN', 'APOTEKER'), async (req, res) => {
    const { pasien_id, status } = req.query;
    try {
        let sql = `
            SELECT
                dis.dispensing_id,
                dis.tanggal_dispensing,
                dis.status_dispensing,
                dis.catatan,
                a.nama_apoteker,
                r.resep_id,
                r.nomor_resep,
                p.pasien_id,
                p.nama_pasien,
                p.no_rm,
                p.ihs_number
            FROM dispensing dis
            JOIN apoteker   a  ON a.apoteker_id     = dis.apoteker_id
            JOIN resep      r  ON r.resep_id         = dis.resep_id
            JOIN rekam_medis rm ON rm.rekam_medis_id  = r.rekam_medis_id
            JOIN kunjungan  k  ON k.kunjungan_id     = rm.kunjungan_id
            JOIN pasien     p  ON p.pasien_id         = k.pasien_id
            WHERE 1=1
        `;
        const params = [];
        if (pasien_id) { sql += ' AND p.pasien_id = ?';         params.push(pasien_id); }
        if (status)    { sql += ' AND dis.status_dispensing = ?'; params.push(status); }
        sql += ' ORDER BY dis.tanggal_dispensing DESC';

        const [rows] = await dbQ.query(sql, params);
        return res.status(200).json(rows);
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: 'Gagal mengambil data dispensing.',
            error: err.message
        });
    }
});

// ─────────────────────────────────────────────────────────────
// 13. DASHBOARD STATS — GET /api/dashboard/stats
// ─────────────────────────────────────────────────────────────
app.get('/api/dashboard/stats', authenticateToken, async (req, res) => {
    try {
        const [[{ total_pasien }]]     = await dbQ.query('SELECT COUNT(*) AS total_pasien FROM pasien');
        const [[{ total_resep }]]      = await dbQ.query('SELECT COUNT(*) AS total_resep FROM resep');
        const [[{ menunggu_resep }]]   = await dbQ.query(
            "SELECT COUNT(*) AS menunggu_resep FROM resep WHERE status_resep IN ('DIBUAT','TERTUNDA')"
        );
        const [[{ total_dispensing }]] = await dbQ.query('SELECT COUNT(*) AS total_dispensing FROM dispensing');
        const [[{ total_obat }]]       = await dbQ.query(
            "SELECT COUNT(*) AS total_obat FROM obat WHERE status = 'AKTIF'"
        );
        const [[{ stok_rendah }]]      = await dbQ.query(`
            SELECT COUNT(*) AS stok_rendah FROM (
                SELECT o.obat_id,
                       COALESCE(SUM(CASE WHEN b.status = 'AKTIF' THEN b.jumlah_stok ELSE 0 END), 0) AS total_stok
                FROM obat o
                LEFT JOIN batch_obat b ON b.obat_id = o.obat_id
                WHERE o.status = 'AKTIF'
                GROUP BY o.obat_id
                HAVING total_stok <= 10 AND total_stok > 0
            ) AS sub_stok
        `);
        const [[{ stok_habis }]]      = await dbQ.query(`
            SELECT COUNT(*) AS stok_habis FROM (
                SELECT o.obat_id,
                       COALESCE(SUM(CASE WHEN b.status = 'AKTIF' THEN b.jumlah_stok ELSE 0 END), 0) AS total_stok
                FROM obat o
                LEFT JOIN batch_obat b ON b.obat_id = o.obat_id
                WHERE o.status = 'AKTIF'
                GROUP BY o.obat_id
                HAVING total_stok = 0
            ) AS sub_stok_habis
        `);

        const role = req.user.role;

        if (role === 'ADMIN') {
            return res.status(200).json({
                total_pasien, total_resep, menunggu_resep,
                total_dispensing, total_obat, stok_rendah
            });
        }

        if (role === 'APOTEKER') {
            return res.status(200).json({
                total_resep, menunggu_resep, total_dispensing, stok_rendah,
                out_of_stock_count: stok_habis, low_stock_count: stok_rendah,
                total_prescriptions_today: total_resep,
                total_dispensed_today: total_dispensing,
                pending_queue: menunggu_resep
            });
        }

        if (role === 'DOKTER') {
            // Hanya resep yang dibuat oleh dokter ini
            const [dRows] = await dbQ.query(
                'SELECT dokter_id FROM dokter WHERE user_id = ? LIMIT 1',
                [req.user.user_id]
            );
            if (dRows.length > 0) {
                const [[{ resep_saya }]] = await dbQ.query(
                    'SELECT COUNT(*) AS resep_saya FROM resep WHERE dokter_id = ?',
                    [dRows[0].dokter_id]
                );
                const [[{ aktif_saya }]] = await dbQ.query(
                    "SELECT COUNT(*) AS aktif_saya FROM resep WHERE dokter_id = ? AND status_resep = 'DIBUAT'",
                    [dRows[0].dokter_id]
                );
                return res.status(200).json({
                    total_pasien,
                    resep_saya,
                    aktif_saya,
                    menunggu_resep
                });
            }
            return res.status(200).json({ total_pasien, total_resep, menunggu_resep });
        }

        // PASIEN — resep milik pasien yang login
        if (role === 'PASIEN') {
            const [pRows] = await dbQ.query(
                'SELECT pasien_id FROM pasien WHERE user_id = ? LIMIT 1',
                [req.user.user_id]
            );
            if (pRows.length === 0) return res.status(200).json({});
            const pasien_id = pRows[0].pasien_id;

            const [[{ resep_saya }]] = await dbQ.query(`
                SELECT COUNT(*) AS resep_saya FROM resep r
                JOIN rekam_medis rm ON rm.rekam_medis_id = r.rekam_medis_id
                JOIN kunjungan k    ON k.kunjungan_id    = rm.kunjungan_id
                WHERE k.pasien_id = ?
            `, [pasien_id]);

            return res.status(200).json({ resep_saya });
        }

        return res.status(200).json({});

    } catch (err) {
        return res.status(500).json({
            success: false,
            message: 'Gagal mengambil statistik dashboard.',
            error: err.message
        });
    }
});

// ─────────────────────────────────────────────────────────────
// 14. SATUSEHAT INTEGRATION — Endpoint sinkronisasi (TIDAK DIUBAH)
// ─────────────────────────────────────────────────────────────

// Sinkronisasi resep ke SATUSEHAT
app.post('/api/satusehat/sync-prescription', authenticateToken, async (req, res) => {
    const { nomor_resep, patient_ihs_number, medication_kfa } = req.body;
    const dataResep = {
        nomor_resep,
        ihs_patient_id: patient_ihs_number,
        id_kfa_obat:    medication_kfa
    };
    try {
        const hasil = await syncPrescriptionToSatuSehat(dataResep);
        if (hasil.success) {
            console.log('[SATUSEHAT] Resep sinkron OK, ID:', hasil.satusehat_id);
        } else {
            console.error('[SATUSEHAT] Gagal sync resep:', hasil.raw_error);
        }
        return res.status(200).json({ success: true, satusehat: hasil });
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: 'Gagal sinkronisasi resep ke SATUSEHAT.',
            error: err.message
        });
    }
});

// Sinkronisasi dispensing ke SATUSEHAT
app.post('/api/satusehat/sync-dispense', authenticateToken, async (req, res) => {
    try {
        const hasil = await syncDispenseToSatuSehat(req.body);
        return res.status(200).json({ success: true, satusehat: hasil });
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: 'Gagal sinkronisasi dispensing ke SATUSEHAT.',
            error: err.message
        });
    }
});

// Sinkronisasi pasien ke SATUSEHAT
app.post('/api/satusehat/sync-patient', authenticateToken, async (req, res) => {
    try {
        const hasil = await syncPatientToSatuSehat(req.body);
        return res.status(200).json({ success: true, satusehat: hasil });
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: 'Gagal sinkronisasi pasien ke SATUSEHAT.',
            error: err.message
        });
    }
});

// ─────────────────────────────────────────────────────────────
// 15. JALANKAN SERVER
// ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`--> Server berjalan di http://localhost:${PORT}`);
    console.log('--> Endpoint Role: ADMIN, DOKTER, APOTEKER, PASIEN');
    console.log(`--> [Phase 1] GET  http://localhost:${PORT}/api/obat`);
    console.log(`--> [Phase 2] POST http://localhost:${PORT}/api/login`);
    console.log(`--> [Phase 2] GET  http://localhost:${PORT}/api/users  (ADMIN only)`);
    console.log(`--> [Phase 2] GET  http://localhost:${PORT}/api/me`);
});