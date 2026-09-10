const express = require('express');
const mysql = require('mysql2');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const {
    syncPatientToSatuSehat,
    syncPrescriptionToSatuSehat,
    syncDispenseToSatuSehat
} = require('./services/satusehat/integrationManager');

const app = express();
app.use(express.json());
app.use(cors());

// 1. KONEKSI KE KULKAS (DATABASE MySQL)
let isDbConnected = false;
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'db_farmasi'
});

db.connect(err => {
    if (err) {
        console.log("--> [PERINGATAN] Gagal konek ke kulkas (MySQL):", err.message);
        console.log("--> Sistem otomatis mengaktifkan In-Memory Store SATUSEHAT agar API tetap melayani frontend.");
    } else {
        isDbConnected = true;
        console.log("Kulkas (Database MySQL) berhasil tersambung!");
    }
});

// ─────────────────────────────────────────────────────────────
// DATA CADANGAN / IN-MEMORY FALLBACK (Aktif jika MySQL belum running)
// ─────────────────────────────────────────────────────────────
const memStore = {
    users: [
        { id: 'USR-ADM', name: 'Administrator Farmasi', email: 'admin@farmasi.id', password: 'admin123', role: 'admin', phone: '081122334455' },
        { id: 'USR-001', name: 'dr. Ahmad Fauzi, Sp.PD', email: 'dokter@farmasi.id', password: 'dokter123', role: 'dokter', npa: '1234567', phone: '081234567890' },
        { id: 'USR-003', name: 'dr. Sinta Maharani, Sp.A', email: 'sinta@farmasi.id', password: 'dokter123', role: 'dokter', npa: '7654321', phone: '081298765432' },
        { id: 'USR-002', name: 'apt. Siti Nurhaliza, S.Farm.', email: 'apoteker@farmasi.id', password: 'apoteker123', role: 'apoteker', sipa: 'SIPA-001/2024', phone: '089876543210' },
        { id: 'USR-004', name: 'apt. Dimas Anggara, S.Farm.', email: 'dimas@farmasi.id', password: 'apoteker123', role: 'apoteker', sipa: 'SIPA-002/2024', phone: '089812345678' },
        { id: 'USR-PAT-001', name: 'Budi Santoso', email: 'budi@pasien.id', password: 'pasien123', role: 'pasien', nik: '3201234567890001', ihs_number: 'P02478375304', phone: '081311112222' },
        { id: 'USR-PAT-002', name: 'Siti Rahayu', email: 'siti@pasien.id', password: 'pasien123', role: 'pasien', nik: '3201234567890002', ihs_number: 'P02478375305', phone: '081333334444' },
        { id: 'USR-PAT-003', name: 'Rizky Pratama', email: 'andi@pasien.id', password: 'pasien123', role: 'pasien', nik: '3201234567890005', ihs_number: 'P02478375308', phone: '081355556666' }
    ],
    patients: [
        { nik: '3201234567890001', ihs_number: 'P02478375304', name: 'Budi Santoso', gender: 'L', dob: '1985-03-15', address: 'Jl. Merdeka No.12, Jakarta Pusat' },
        { nik: '3201234567890002', ihs_number: 'P02478375305', name: 'Siti Rahayu', gender: 'P', dob: '1990-07-22', address: 'Jl. Sudirman No.45, Jakarta Selatan' },
        { nik: '3201234567890003', ihs_number: 'P02478375306', name: 'Hendra Wijaya', gender: 'L', dob: '1975-11-08', address: 'Jl. Gatot Subroto No.88, Jakarta' },
        { nik: '3201234567890004', ihs_number: 'P02478375307', name: 'Dewi Kusuma', gender: 'P', dob: '1998-02-14', address: 'Jl. Veteran No.3, Bogor' },
        { nik: '3201234567890005', ihs_number: 'P02478375308', name: 'Rizky Pratama', gender: 'L', dob: '2001-09-30', address: 'Jl. Diponegoro No.21, Depok' }
    ],
    medications: [
        { id: 'MED-001', kfa_code_92: '92000511', kfa_code_93: '93002205', name: 'Paracetamol 120mg/5mL Sirup (ERPHAMOL)', generic_name: 'Paracetamol', form: 'Sirup', manufacturer: 'Erlimpex', stock: 150, unit: 'Botol', price: 25000, min_stock: 20 },
        { id: 'MED-002', kfa_code_92: '92000210', kfa_code_93: '93000105', name: 'Amoxicillin 500mg Kapsul', generic_name: 'Amoxicillin', form: 'Kapsul', manufacturer: 'Kimia Farma', stock: 8, unit: 'Strip (10 kapsul)', price: 15000, min_stock: 20 },
        { id: 'MED-003', kfa_code_92: '92001450', kfa_code_93: '93001234', name: 'Metformin 500mg Tablet', generic_name: 'Metformin', form: 'Tablet', manufacturer: 'Kalbe Farma', stock: 320, unit: 'Strip (10 tablet)', price: 5000, min_stock: 30 },
        { id: 'MED-004', kfa_code_92: '92002100', kfa_code_93: '93005678', name: 'Omeprazole 20mg Kapsul', generic_name: 'Omeprazole', form: 'Kapsul', manufacturer: 'Sanbe Farma', stock: 0, unit: 'Kotak (30 kapsul)', price: 18000, min_stock: 15 },
        { id: 'MED-005', kfa_code_92: '92003300', kfa_code_93: '93009999', name: 'Amlodipine 5mg Tablet', generic_name: 'Amlodipine', form: 'Tablet', manufacturer: 'Dexa Medica', stock: 200, unit: 'Strip (10 tablet)', price: 8000, min_stock: 30 },
        { id: 'MED-006', kfa_code_92: '92004100', kfa_code_93: '93011200', name: 'Azithromycin 500mg Tablet Salut Selaput', generic_name: 'Azithromycin', form: 'Tablet', manufacturer: 'Pfizer', stock: 12, unit: 'Strip (3 tablet)', price: 35000, min_stock: 20 },
        { id: 'MED-007', kfa_code_92: 'KFA_CODE_DUMMY_001', kfa_code_93: 'KFA_CODE_DUMMY_001_POA', name: 'Cetirizine HCl 10mg Tablet (KFA Dummy)', generic_name: 'Cetirizine', form: 'Tablet', manufacturer: 'Generik', stock: 95, unit: 'Strip (10 tablet)', price: 6000, min_stock: 20 }
    ],
    prescriptions: [
        { id: 'MR-001', prescription_number: 'RX-2026-0001', prescription_item_number: 'RXI-2026-0001', patient_nik: '3201234567890001', patient_ihs_number: 'P02478375304', patient_name: 'Budi Santoso', medication_id: 'MED-003', medication_kfa: '92001450', medication_name: 'Metformin 500mg Tablet', medication_form: 'Tablet', dosage_route: { code: '26643006', display: 'Oral' }, dosage_value: 1, dosage_unit: 'tablet', dosage_timing_code: 'BID', dosage_additional_instruction: 'Diminum setelah makan', quantity: 60, quantity_unit: 'tablet', payment_type: 'BPJS-K', requester_id: 'USR-001', requester_name: 'dr. Ahmad Fauzi, Sp.PD', status: 'active', authored_on_display: '09 Sep 2026, 10:30 WIB' },
        { id: 'MR-002', prescription_number: 'RX-2026-0001', prescription_item_number: 'RXI-2026-0002', patient_nik: '3201234567890001', patient_ihs_number: 'P02478375304', patient_name: 'Budi Santoso', medication_id: 'MED-005', medication_kfa: '92003300', medication_name: 'Amlodipine 5mg Tablet', medication_form: 'Tablet', dosage_route: { code: '26643006', display: 'Oral' }, dosage_value: 1, dosage_unit: 'tablet', dosage_timing_code: 'QD', dosage_additional_instruction: 'Diminum pagi hari', quantity: 30, quantity_unit: 'tablet', payment_type: 'BPJS-K', requester_id: 'USR-001', requester_name: 'dr. Ahmad Fauzi, Sp.PD', status: 'active', authored_on_display: '09 Sep 2026, 10:30 WIB' },
        { id: 'MR-003', prescription_number: 'RX-2026-0002', prescription_item_number: 'RXI-2026-0003', patient_nik: '3201234567890002', patient_ihs_number: 'P02478375305', patient_name: 'Siti Rahayu', medication_id: 'MED-001', medication_kfa: '92000511', medication_name: 'Paracetamol 120mg/5mL Sirup (ERPHAMOL)', medication_form: 'Sirup', dosage_route: { code: '26643006', display: 'Oral' }, dosage_value: 5, dosage_unit: 'mL', dosage_timing_code: 'TID', dosage_additional_instruction: 'Kocok sebelum diminum', quantity: 2, quantity_unit: 'Botol', payment_type: 'Biaya-Sendiri', requester_id: 'USR-001', requester_name: 'dr. Ahmad Fauzi, Sp.PD', status: 'completed', authored_on_display: '08 Sep 2026, 11:15 WIB' }
    ],
    dispenses: [
        { id: 'MD-001', prescription_id: 'MR-003', prescription_number: 'RX-2026-0002', patient_name: 'Siti Rahayu', patient_ihs_number: 'P02478375305', medication_id: 'MED-001', medication_kfa: '93002205', medication_name: 'Paracetamol 120mg/5mL Sirup (ERPHAMOL)', medication_form: 'Sirup', quantity: 2, quantity_unit: 'Botol', dosage_value: 5, dosage_unit: 'mL', dosage_timing_code: 'TID', total_price: 50000, payment_type: 'Biaya-Sendiri', dispensed_by_id: 'USR-002', dispensed_by_name: 'apt. Siti Nurhaliza, S.Farm.', dispensed_at_display: '08 Sep 2026, 13:30 WIB', status: 'completed' }
    ],
    activities: [
        { id: 1, actor: 'dr. Ahmad Fauzi, Sp.PD', role: 'dokter', action: 'CREATE_PRESCRIPTION', description: 'Menerbitkan resep RX-2026-0001 untuk Budi Santoso', type: 'info', time_display: 'Hari ini' },
        { id: 2, actor: 'apt. Siti Nurhaliza, S.Farm.', role: 'apoteker', action: 'DISPENSE_MEDICATION', description: 'Menyerahkan obat Paracetamol untuk Siti Rahayu (MD-001)', type: 'success', time_display: 'Kemarin' },
        { id: 3, actor: 'SATUSEHAT Sandbox', role: 'system', action: 'SYNC_SATUSEHAT', description: 'Sinkronisasi 3 resource MedicationRequest berhasil', type: 'info', time_display: 'Kemarin' }
    ]
};

// ─────────────────────────────────────────────────────────────
// 2. PINTU MASUK / SATPAM (LOGIN) – DUKUNG DOKTER, APOTEKER, ADMIN, PASIEN
// ─────────────────────────────────────────────────────────────
app.post('/api/login', (req, res) => {
    const { email, password, role } = req.body;
    
    if (isDbConnected) {
        // Query MySQL jika koneksi aktif
        const sql = "SELECT * FROM users WHERE (email = ? OR nik = ?) AND password = ?";
        db.query(sql, [email, email, password], (err, result) => {
            if (!err && result.length > 0) {
                const user = result[0];
                delete user.password;
                const token = jwt.sign({ id: user.id, role: user.role }, 'KUNCI_RAHASIA');
                return res.json({ pesan: "Login Berhasil", token: token, role: user.role, user: user });
            }
            // Jika di MySQL tidak ditemukan tapi ada di fallback
            checkFallbackLogin(email, password, res);
        });
    } else {
        checkFallbackLogin(email, password, res);
    }
});

function checkFallbackLogin(identifier, password, res) {
    const user = memStore.users.find(u => 
        (u.email === identifier || u.nik === identifier) && u.password === password
    );
    if (user) {
        const token = jwt.sign({ id: user.id, role: user.role }, 'KUNCI_RAHASIA');
        const safeUser = { ...user };
        delete safeUser.password;
        res.json({ pesan: "Login Berhasil", token: token, role: user.role, user: safeUser });
    } else {
        res.status(401).json({ pesan: "Email/NIK atau Password salah!" });
    }
}

// ─────────────────────────────────────────────────────────────
// REGISTRASI (DAFTAR AKUN BARU)
// ─────────────────────────────────────────────────────────────
app.post('/api/register', (req, res) => {
    const data = req.body;
    
    if (isDbConnected) {
        db.query("SELECT id FROM users WHERE email = ?", [data.email], (err, results) => {
            if (err) return res.status(500).json({ pesan: err.message });
            if (results.length > 0) return res.status(400).json({ pesan: "Email sudah terdaftar!" });
            
            insertUserDb(data, res);
        });
    } else {
        const exists = memStore.users.find(u => u.email.toLowerCase() === data.email.toLowerCase());
        if (exists) return res.status(400).json({ pesan: "Email sudah terdaftar!" });
        
        insertUserMemStore(data, res);
    }
});

function insertUserDb(data, res) {
    const newId = 'USR-' + Date.now();
    
    db.beginTransaction(err => {
        if (err) return res.status(500).json({ pesan: err.message });
        
        let npa = null, sipa = null, nik = null, ihs_number = null;
        if (data.role === 'dokter') npa = data.npa;
        if (data.role === 'apoteker') sipa = data.sipa;
        if (data.role === 'pasien') {
            nik = data.nik;
            ihs_number = data.ihs_number || ('P0' + Math.floor(Math.random()*1000000000));
        }

        const sqlUser = "INSERT INTO users (id, name, email, password, role, npa, sipa, nik, ihs_number, phone) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        db.query(sqlUser, [newId, data.name, data.email, data.password, data.role, npa, sipa, nik, ihs_number, data.phone], (err) => {
            if (err) {
                return db.rollback(() => res.status(500).json({ pesan: err.message }));
            }
            
            if (data.role === 'pasien') {
                const sqlPatient = "INSERT INTO patients (nik, ihs_number, name, gender, dob, address) VALUES (?, ?, ?, ?, ?, ?)";
                db.query(sqlPatient, [nik, ihs_number, data.name, data.gender, data.dob, data.address], (err) => {
                    if (err) {
                        return db.rollback(() => res.status(500).json({ pesan: err.message }));
                    }
                    db.commit(err => {
                        if (err) return db.rollback(() => res.status(500).json({ pesan: err.message }));
                        insertUserMemStore(data, res, true); 
                    });
                });
            } else {
                db.commit(err => {
                    if (err) return db.rollback(() => res.status(500).json({ pesan: err.message }));
                    insertUserMemStore(data, res, true);
                });
            }
        });
    });
}

function insertUserMemStore(data, res, isFromDb = false) {
    const newId = 'USR-' + String(memStore.users.length + 1).padStart(3, '0');
    
    let npa = null, sipa = null, nik = null, ihs_number = null;
    if (data.role === 'dokter') npa = data.npa;
    if (data.role === 'apoteker') sipa = data.sipa;
    if (data.role === 'pasien') {
        nik = data.nik;
        ihs_number = data.ihs_number || ('P0' + Math.floor(Math.random()*1000000000));
        
        memStore.patients.push({
            nik, ihs_number, name: data.name, gender: data.gender, dob: data.dob, address: data.address
        });
    }

    const newUser = {
        id: newId, name: data.name, email: data.email, password: data.password, role: data.role,
        npa, sipa, nik, ihs_number, phone: data.phone
    };
    
    memStore.users.push(newUser);
    
    if (!isFromDb) {
        res.json({ success: true, message: "Pendaftaran berhasil", user: newUser });
    } else {
        res.json({ success: true, message: "Pendaftaran berhasil (tersimpan di DB)", user: newUser });
    }
}

// ─────────────────────────────────────────────────────────────
// 3. MASTER OBAT & KFA (MEDICATIONS)
// ─────────────────────────────────────────────────────────────
app.get('/api/medications', (req, res) => {
    const { search = '', low_stock = false } = req.query;

    if (isDbConnected) {
        let sql = "SELECT * FROM medications WHERE 1=1";
        const params = [];
        if (search) {
            sql += " AND (name LIKE ? OR generic_name LIKE ? OR kfa_code_92 LIKE ? OR kfa_code_93 LIKE ?)";
            const s = `%${search}%`;
            params.push(s, s, s, s);
        }
        if (low_stock === 'true') {
            sql += " AND stock <= min_stock";
        }
        db.query(sql, params, (err, rows) => {
            if (!err) return res.json(rows);
            return res.json(filterMemMedications(search, low_stock));
        });
    } else {
        res.json(filterMemMedications(search, low_stock));
    }
});

function filterMemMedications(search, low_stock) {
    let list = [...memStore.medications];
    if (search) {
        const q = search.toLowerCase();
        list = list.filter(m => m.name.toLowerCase().includes(q) || m.generic_name.toLowerCase().includes(q) || (m.kfa_code_92 && m.kfa_code_92.includes(q)));
    }
    if (low_stock === 'true') {
        list = list.filter(m => m.stock <= m.min_stock);
    }
    return list;
}

app.get('/api/medications/:id', (req, res) => {
    const med = memStore.medications.find(m => m.id === req.params.id);
    if (!med) return res.status(404).json({ pesan: "Obat tidak ditemukan" });
    res.json(med);
});

// ─────────────────────────────────────────────────────────────
// 4. DATA PASIEN (PATIENTS)
// ─────────────────────────────────────────────────────────────
app.get('/api/patients', (req, res) => {
    if (isDbConnected) {
        db.query("SELECT * FROM patients", (err, rows) => {
            if (!err) return res.json(rows);
            return res.json(memStore.patients);
        });
    } else {
        res.json(memStore.patients);
    }
});

app.get('/api/patients/search', (req, res) => {
    const { nik } = req.query;
    if (isDbConnected) {
        db.query("SELECT * FROM patients WHERE nik = ? OR ihs_number = ?", [nik, nik], (err, rows) => {
            if (!err && rows.length > 0) return res.json(rows[0]);
            const p = memStore.patients.find(x => x.nik === nik || x.ihs_number === nik);
            if (p) return res.json(p);
            return res.status(404).json({ pesan: "Pasien tidak ditemukan" });
        });
    } else {
        const p = memStore.patients.find(x => x.nik === nik || x.ihs_number === nik);
        if (!p) return res.status(404).json({ pesan: "Pasien tidak ditemukan" });
        res.json(p);
    }
});

// ─────────────────────────────────────────────────────────────
// 5. RESEP DOKTER / MedicationRequest (PRESCRIPTIONS)
// ─────────────────────────────────────────────────────────────
app.get('/api/prescriptions', (req, res) => {
    const { status, doctor_id, patient_nik, patient_ihs } = req.query;

    if (isDbConnected) {
        let sql = "SELECT * FROM prescriptions WHERE 1=1";
        const params = [];
        if (status) { sql += " AND status = ?"; params.push(status); }
        if (doctor_id) { sql += " AND requester_id = ?"; params.push(doctor_id); }
        if (patient_nik) { sql += " AND patient_nik = ?"; params.push(patient_nik); }
        if (patient_ihs) { sql += " AND patient_ihs_number = ?"; params.push(patient_ihs); }
        sql += " ORDER BY id DESC";

        db.query(sql, params, (err, rows) => {
            if (!err) return res.json(rows);
            return res.json(filterMemPrescriptions(status, doctor_id, patient_nik, patient_ihs));
        });
    } else {
        res.json(filterMemPrescriptions(status, doctor_id, patient_nik, patient_ihs));
    }
});

function filterMemPrescriptions(status, doctor_id, patient_nik, patient_ihs) {
    let list = [...memStore.prescriptions];
    if (status) list = list.filter(p => p.status === status);
    if (doctor_id) list = list.filter(p => p.requester_id === doctor_id);
    if (patient_nik) list = list.filter(p => p.patient_nik === patient_nik);
    if (patient_ihs) list = list.filter(p => p.patient_ihs_number === patient_ihs);
    return list;
}

app.get('/api/prescriptions/:id', (req, res) => {
    const p = memStore.prescriptions.find(x => x.id === req.params.id);
    if (!p) return res.status(404).json({ pesan: "Resep tidak ditemukan" });
    res.json(p);
});

// STANDAR BARU: POST /api/prescriptions (Mendukung data lengkap Dokter -> SATUSEHAT)
app.post('/api/prescriptions', (req, res) => {
    const data = req.body;
    const newId = 'MR-' + String(memStore.prescriptions.length + 1).padStart(3, '0');
    const num = 'RX-2026-' + String(memStore.prescriptions.length + 1).padStart(4, '0');

    const record = {
        id: newId,
        prescription_number: num,
        prescription_item_number: 'RXI-2026-' + String(memStore.prescriptions.length + 1).padStart(4, '0'),
        status: 'active',
        authored_on: new Date().toISOString(),
        authored_on_display: new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) + ' WIB',
        ...data
    };

    memStore.prescriptions.unshift(record);

    // Catat log aktivitas
    memStore.activities.unshift({
        id: memStore.activities.length + 1,
        actor: data.requester_name || 'Dokter',
        role: 'dokter',
        action: 'CREATE_PRESCRIPTION',
        description: `Menerbitkan resep ${num} untuk ${record.patient_name} (${record.medication_name})`,
        type: 'info',
        time_display: 'Baru saja'
    });

    res.status(201).json({ success: true, data: record, message: "Resep berhasil dikirim ke Apoteker!" });
});

// ENDPOINT LAMA: POST /api/resep (Tetap dijaga agar kode rekan tim Anda tidak rusak)
app.post('/api/resep', (req, res) => {
    const { medication_id, quantity } = req.body;

    if (isDbConnected) {
        const sql = "INSERT INTO prescriptions (medication_id, quantity, status) VALUES (?, ?, 'PENDING')";
        db.query(sql, [medication_id, quantity], (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ pesan: "Resep berhasil dikirim ke Apoteker!" });
        });
    } else {
        const newId = 'MR-' + String(memStore.prescriptions.length + 1).padStart(3, '0');
        memStore.prescriptions.unshift({
            id: newId,
            prescription_number: 'RX-' + Date.now(),
            medication_id,
            quantity,
            status: 'PENDING',
            patient_name: 'Pasien Umum',
            medication_name: 'Obat Resep'
        });
        res.json({ pesan: "Resep berhasil dikirim ke Apoteker!" });
    }
});

// Pembatalan Resep
app.patch('/api/prescriptions/:id/cancel', (req, res) => {
    const { reason } = req.body;
    const p = memStore.prescriptions.find(x => x.id === req.params.id);
    if (!p) return res.status(404).json({ pesan: "Resep tidak ditemukan" });
    p.status = 'cancelled';
    p.status_reason = reason;

    memStore.activities.unshift({
        id: memStore.activities.length + 1,
        actor: 'Dokter / Staf',
        role: 'dokter',
        action: 'CANCEL_PRESCRIPTION',
        description: `Membatalkan resep ${p.prescription_number} (${p.patient_name}) - Alasan: ${reason}`,
        type: 'warning',
        time_display: 'Baru saja'
    });

    res.json({ success: true, message: "Resep berhasil dibatalkan." });
});

// ─────────────────────────────────────────────────────────────
// 6. LOKET APOTEKER / PENGELUARAN OBAT (DISPENSES)
// ─────────────────────────────────────────────────────────────
app.get('/api/dispenses', (req, res) => {
    const { patient } = req.query;
    let list = [...memStore.dispenses];
    if (patient) {
        list = list.filter(d => d.patient_ihs_number === patient || d.patient_name?.toLowerCase() === patient.toLowerCase());
    }
    res.json(list);
});

// LOKET APOTEKER (SERAHKAN OBAT / DISPENSE) – DIPERLUAS DENGAN PENCATATAN DETAIL
app.post('/api/dispense', (req, res) => {
    const { prescription_id, quantity, medication_id } = req.body;

    const presc = memStore.prescriptions.find(p => p.id === prescription_id);
    if (presc) presc.status = 'completed';

    const medId = medication_id || (presc ? presc.medication_id : null);
    const qty = quantity || (presc ? presc.quantity : 1);

    const med = memStore.medications.find(m => m.id === medId);
    if (med) med.stock = Math.max(0, med.stock - qty);

    const newDispense = {
        id: 'MD-' + String(memStore.dispenses.length + 1).padStart(3, '0'),
        prescription_id: prescription_id,
        prescription_number: presc ? presc.prescription_number : 'RX-2026',
        patient_name: presc ? presc.patient_name : (req.body.patient_name || 'Pasien'),
        patient_ihs_number: presc ? presc.patient_ihs_number : (req.body.patient_ihs_number || '-'),
        medication_id: medId,
        medication_kfa: req.body.medication_kfa || (med ? med.kfa_code_93 : '93002205'),
        medication_name: presc ? presc.medication_name : (med ? med.name : 'Obat'),
        quantity: qty,
        dispensed_at_display: new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) + ' WIB',
        dispensed_by_name: req.body.dispensed_by_name || 'apt. Siti Nurhaliza, S.Farm.',
        status: 'completed',
        ...req.body
    };

    memStore.dispenses.unshift(newDispense);

    memStore.activities.unshift({
        id: memStore.activities.length + 1,
        actor: req.body.dispensed_by_name || 'Apoteker',
        role: 'apoteker',
        action: 'DISPENSE_MEDICATION',
        description: `Menyerahkan obat ${newDispense.medication_name} (${qty} item) untuk ${newDispense.patient_name}`,
        type: 'success',
        time_display: 'Baru saja'
    });

    console.log("--> [INFO] SATUSEHAT Integration Layer: Data siap disinkronkan ke Kemenkes:", newDispense);
    res.json({ pesan: "Obat berhasil diserahkan, stok berkurang otomatis!", success: true, data: newDispense });
});

// ─────────────────────────────────────────────────────────────
// 7. ADMIN, STATISTIK & AUDIT TRAIL
// ─────────────────────────────────────────────────────────────
app.get('/api/dashboard/stats', (req, res) => {
    const { role } = req.query;

    if (role === 'admin') {
        return res.json({
            total_patients: memStore.patients.length,
            total_prescriptions: memStore.prescriptions.length,
            pending_prescriptions: memStore.prescriptions.filter(p => p.status === 'active' || p.status === 'PENDING').length,
            dispensed_prescriptions: memStore.dispenses.length,
            satusehat_sync_rate: '98.5%'
        });
    } else if (role === 'apoteker') {
        return res.json({
            total_prescriptions_today: memStore.prescriptions.length,
            total_dispensed_today: memStore.dispenses.length,
            pending_queue: memStore.prescriptions.filter(p => p.status === 'active').length,
            low_stock_count: memStore.medications.filter(m => m.stock <= m.min_stock).length
        });
    } else {
        // Dokter
        return res.json({
            my_prescriptions_today: memStore.prescriptions.length,
            active_prescriptions: memStore.prescriptions.filter(p => p.status === 'active').length,
            completed_prescriptions: memStore.prescriptions.filter(p => p.status === 'completed').length,
            cancelled_prescriptions: memStore.prescriptions.filter(p => p.status === 'cancelled').length
        });
    }
});

app.get('/api/users', (req, res) => {
    const safeUsers = memStore.users.map(u => {
        const copy = { ...u };
        delete copy.password;
        return copy;
    });
    res.json(safeUsers);
});

app.get('/api/activities', (req, res) => {
    res.json(memStore.activities);
});
// ==========================================
// API SIMPAN RESEP + OTOMATIS KIRIM KE SATUSEHAT
// ==========================================
app.post('/api/prescriptions', async (req, res) => {
    const { nomor_resep, patient_ihs_number, medication_kfa } = req.body;

    // 1. Simpan ke database MySQL (Tabel buatan Varel)
    const sql = "INSERT INTO prescriptions (nomor_resep, patient_ihs_number, medication_kfa) VALUES (?, ?, ?)";
    
    db.query(sql, [nomor_resep, patient_ihs_number, medication_kfa], async (err, result) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        // 2. Bungkus data untuk dikirim ke fungsi Naira
        const dataResep = {
            nomor_resep: nomor_resep,
            ihs_patient_id: patient_ihs_number,
            id_kfa_obat: medication_kfa
        };

        // 3. Kirim ke SATUSEHAT lewat fungsi Naira
        const hasilSatuSehat = await syncPrescriptionToSatuSehat(dataResep);

        if (hasilSatuSehat.success) {
            console.log("Sukses masuk SATUSEHAT! ID:", hasilSatuSehat.satusehat_id);
        } else {
            console.error("Gagal kirim ke SATUSEHAT:", hasilSatuSehat.raw_error);
        }

        // 4. Respon balik ke Frontend (Sheren/Kajil)
        res.json({
            message: "Resep berhasil disimpan",
            prescription_id: result.insertId,
            satusehat: hasilSatuSehat
        });
    });
});
// Menyalakan Server Backend di Port 3000
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Dapur (Backend) sudah buka dan berjalan di http://localhost:${PORT}`);
    console.log(`--> Endpoint tersedia untuk Role: Dokter, Apoteker, Admin, dan Pasien.`);
});