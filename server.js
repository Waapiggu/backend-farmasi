const express = require('express');
const mysql = require('mysql2');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// 1. KONEKSI KE KULKAS (DATABASE MySQL)
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'db_farmasi'
});

db.connect(err => {
    if (err) console.log("Gagal konek ke kulkas:", err);
    else console.log("Kulkas (Database) berhasil tersambung!");
});

// 2. PINTU MASUK / SATPAM (LOGIN)
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    
    db.query("SELECT * FROM users WHERE email = ? AND password = ?", [email, password], (err, result) => {
        if (result.length > 0) {
            const user = result[0];
            const token = jwt.sign({ role: user.role }, 'KUNCI_RAHASIA');
            res.json({ pesan: "Login Berhasil", token: token, role: user.role });
        } else {
            res.status(401).json({ pesan: "Email atau Password salah!" });
        }
    });
});

// 3. LOKET DOKTER (KIRIM RESEP)
app.post('/api/resep', (req, res) => {
    const { medication_id, quantity } = req.body;

    const sql = "INSERT INTO prescriptions (medication_id, quantity, status) VALUES (?, ?, 'PENDING')";
    db.query(sql, [medication_id, quantity], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ pesan: "Resep berhasil dikirim ke Apoteker!" });
    });
});

// 4. LOKET APOTEKER (SERAHKAN OBAT / DISPENSE)
app.post('/api/dispense', (req, res) => {
    const { prescription_id } = req.body;

    db.query("SELECT * FROM prescriptions WHERE id = ?", [prescription_id], (err, resep) => {
        if (resep.length === 0) return res.status(404).json({ pesan: "Resep tidak ditemukan" });
        
        const dataResep = resep[0];

        const sqlKurangiStok = "UPDATE medications SET stock = stock - ? WHERE id = ?";
        db.query(sqlKurangiStok, [dataResep.quantity, dataResep.medication_id], (err) => {
            db.query("UPDATE prescriptions SET status = 'DISPENSED' WHERE id = ?", [prescription_id], () => {
                console.log("--> [INFO] Anggota 5: Kirim data resep ini ke Kemenkes:", dataResep);
                res.json({ pesan: "Obat berhasil diserahkan, stok berkurang otomatis!" });
            });
        });
    });
});

// Menyalakan Server Backend di Port 3000
app.listen(3000, () => {
    console.log("Dapur (Backend) sudah buka dan berjalan di http://localhost:3000");
});