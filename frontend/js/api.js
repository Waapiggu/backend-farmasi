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
    if (USE_MOCK) {
      await delay(DELAY);
      const user = MOCK_DATA.users.find(u => u.email === email && u.password === password && u.role === role);
      if (!user) throw new Error('Email, password, atau role tidak sesuai.');
      return { token: 'mock-jwt-' + user.role, user };
    }
    return liveFetch('POST', '/login', { email, password });
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
    if (USE_MOCK) {
      await delay(DELAY);
      const newId = 'MR-' + String(MOCK_DATA.prescriptions.length + 1).padStart(3, '0');
      const num   = 'RX-2026-' + String(MOCK_DATA.prescriptions.length + 1).padStart(4, '0');
      const record = {
        id: newId,
        prescription_number: num,
        prescription_item_number: 'RXI-2026-' + String(MOCK_DATA.prescriptions.length + 1).padStart(4, '0'),
        status: 'active',
        authored_on: Utils.nowUTC(),
        authored_on_display: Utils.formatDateTime(new Date().toISOString()),
        ...data
      };
      MOCK_DATA.prescriptions.push(record);
      return { success: true, data: record, message: 'Resep berhasil dikirim ke Apoteker!' };
    }
    return liveFetch('POST', '/prescriptions', data);
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
    if (USE_MOCK) {
      await delay(DELAY);
      // Update prescription status
      const presc = MOCK_DATA.prescriptions.find(p => p.id === data.prescription_id);
      if (presc) presc.status = 'completed';
      // Kurangi stok
      const med = MOCK_DATA.medications.find(m => m.id === data.medication_id);
      if (med) med.stock = Math.max(0, med.stock - data.quantity);

      const newDispense = {
        id: 'MD-' + String(MOCK_DATA.dispenses.length + 1).padStart(3, '0'),
        dispensed_at: Utils.nowUTC(),
        dispensed_at_display: Utils.formatDateTime(new Date().toISOString()),
        status: 'completed',
        ...data
      };
      MOCK_DATA.dispenses.push(newDispense);
      return { success: true, data: newDispense, message: 'Obat berhasil diserahkan!' };
    }
    return liveFetch('POST', '/dispense', data);
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
