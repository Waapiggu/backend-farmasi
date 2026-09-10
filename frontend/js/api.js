/**
 * api.js – API Layer
 * Mode: MOCK (data lokal) | Mudah diganti ke live backend dengan ubah USE_MOCK = false
 */

const API = (() => {
  const USE_MOCK = true;           // Ganti false jika backend sudah siap
  const BASE_URL = 'http://localhost:3000/api';
  const DELAY    = 300;            // simulasi network delay (ms)

  const delay = (ms) => new Promise(r => setTimeout(r, ms));

  // Helper live fetch
  async function liveFetch(method, path, body = null) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Auth.getToken()}` }
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(BASE_URL + path, opts);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Server error' }));
      throw new Error(err.message || 'Request failed');
    }
    return res.json();
  }

  // ─── AUTH ─────────────────────────────────────────────
  async function login(email, password, role) {
    // Bypassing MOCK untuk menghubungkan dengan API Backend
    const res = await liveFetch('POST', '/login', { email, password });
    return {
      token: res.token,
      user: {
        email: email,
        role: res.role,
        name: res.role === 'dokter' ? 'Dokter (Backend)' : 'Apoteker (Backend)'
      }
    };
  }

  // ─── MEDICATIONS ─────────────────────────────────────
  async function getMedications({ search = '', low_stock = false } = {}) {
    if (USE_MOCK) {
      await delay(DELAY);
      let data = [...MOCK_DATA.medications];
      if (search) {
        const q = search.toLowerCase();
        data = data.filter(m => m.name.toLowerCase().includes(q) || m.kfa_code_93.includes(q) || m.generic_name.toLowerCase().includes(q));
      }
      if (low_stock) data = data.filter(m => m.stock <= m.min_stock);
      return data;
    }
    const params = new URLSearchParams({ search, low_stock });
    return liveFetch('GET', `/medications?${params}`);
  }

  async function getMedication(id) {
    if (USE_MOCK) {
      await delay(DELAY);
      const med = MOCK_DATA.medications.find(m => m.id === id);
      if (!med) throw new Error('Obat tidak ditemukan');
      return med;
    }
    return liveFetch('GET', `/medications/${id}`);
  }

  // ─── PATIENTS ────────────────────────────────────────
  async function searchPatient(nik) {
    if (USE_MOCK) {
      await delay(DELAY);
      const patient = MOCK_DATA.patients.find(p => p.nik === nik);
      if (!patient) throw new Error('Pasien dengan NIK tersebut tidak ditemukan.');
      return patient;
    }
    return liveFetch('GET', `/patients/search?nik=${nik}`);
  }

  // ─── PRESCRIPTIONS ───────────────────────────────────
  async function getPrescriptions({ status = '', doctor_id = '' } = {}) {
    if (USE_MOCK) {
      await delay(DELAY);
      let data = [...MOCK_DATA.prescriptions];
      if (status) data = data.filter(p => p.status === status);
      if (doctor_id) data = data.filter(p => p.requester_id === doctor_id);
      return data;
    }
    const params = new URLSearchParams({ status, doctor_id });
    return liveFetch('GET', `/prescriptions?${params}`);
  }

  async function getPrescription(id) {
    if (USE_MOCK) {
      await delay(DELAY);
      const p = MOCK_DATA.prescriptions.find(x => x.id === id);
      if (!p) throw new Error('Resep tidak ditemukan');
      return p;
    }
    return liveFetch('GET', `/prescriptions/${id}`);
  }

  async function createPrescription(data) {
    // Bypassing MOCK untuk menghubungkan dengan API Backend (/api/resep)
    const res = await liveFetch('POST', '/resep', {
      medication_id: data.medication_id,
      quantity: data.quantity
    });
    
    // Tetap buat mock ID agar UI frontend tidak error jika membutuhkan data balikan
    const newId = 'MR-L-' + Date.now().toString().slice(-4);
    return { success: true, data: { id: newId }, message: res.pesan || 'Resep berhasil dikirim' };
  }

  async function cancelPrescription(id, reason) {
    if (USE_MOCK) {
      await delay(DELAY);
      const p = MOCK_DATA.prescriptions.find(x => x.id === id);
      if (!p) throw new Error('Resep tidak ditemukan');
      if (p.status !== 'active') throw new Error('Hanya resep aktif yang dapat dibatalkan');
      p.status = 'cancelled';
      p.status_reason = reason;
      return { success: true, message: 'Resep berhasil dibatalkan.' };
    }
    return liveFetch('PATCH', `/prescriptions/${id}/cancel`, { reason });
  }

  // ─── DISPENSE ────────────────────────────────────────
  async function getDispenses() {
    if (USE_MOCK) {
      await delay(DELAY);
      return [...MOCK_DATA.dispenses];
    }
    return liveFetch('GET', '/dispenses');
  }

  async function createDispense(data) {
    // Bypassing MOCK untuk menghubungkan dengan API Backend (/api/dispense)
    const res = await liveFetch('POST', '/dispense', {
      prescription_id: data.prescription_id
    });
    
    const newId = 'MD-L-' + Date.now().toString().slice(-4);
    return { success: true, data: { id: newId }, message: res.pesan || 'Obat berhasil diserahkan' };
  }

  // ─── DASHBOARD STATS ─────────────────────────────────
  async function getDashboardStats(role) {
    if (USE_MOCK) {
      await delay(200);
      return MOCK_DATA.dashboard_stats[role] || {};
    }
    return liveFetch('GET', `/dashboard/stats?role=${role}`);
  }

  // Public API
  return { login, getMedications, getMedication, searchPatient, getPrescriptions, getPrescription, createPrescription, cancelPrescription, getDispenses, createDispense, getDashboardStats };
})();
