/**
 * api.js – API Layer Terintegrasi
 * Menghubungkan Frontend (Admin, Pasien, Dokter, Apoteker) ke Backend http://localhost:3000/api
 * Dilengkapi graceful fallback ke data simulasi jika backend belum dinyalakan.
 */

const API = (() => {
  let USE_MOCK = false; // Prioritaskan Backend Live (http://localhost:3000/api)
  const BASE_URL = 'http://localhost:3000/api';
  const DELAY    = 250; // simulasi network delay (ms) saat fallback

  const delay = (ms) => new Promise(r => setTimeout(r, ms));

  // Helper live fetch dengan graceful fallback
  async function liveFetch(method, path, body = null) {
    if (USE_MOCK) return null; // Paksa mock

    try {
      const opts = {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${typeof Auth !== 'undefined' ? Auth.getToken() : ''}`
        }
      };
      if (body) opts.body = JSON.stringify(body);
      
      const res = await fetch(BASE_URL + path, opts);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Server error: ' + res.status }));
        throw new Error(err.pesan || err.message || 'Request gagal');
      }
      return await res.json();
    } catch (err) {
      // Jika server backend offline / koneksi gagal, aktifkan fallback transparan
      console.warn(`[API Live Offline] Beralih ke data lokal untuk: ${method} ${path}`, err.message);
      return null;
    }
  }

  // ─── AUTH ─────────────────────────────────────────────
  async function login(email, password, role) {
    const live = await liveFetch('POST', '/login', { email, password, role });
    if (live) {
      return {
        token: live.token,
        user: live.user || {
          email: email,
          role: live.role,
          name: live.role === 'dokter' ? 'Dokter (Backend)' : live.role === 'apoteker' ? 'Apoteker (Backend)' : live.role === 'admin' ? 'Administrator' : 'Pasien'
        }
      };
    }

    // Fallback Mock
    await delay(DELAY);
    const user = MOCK_DATA.users.find(u => 
      (u.email.toLowerCase() === email.toLowerCase() || u.nik === email) && 
      u.password === password && 
      (!role || u.role === role)
    );
    if (!user) throw new Error('Email, password, atau role tidak sesuai.');
    return { token: 'mock-jwt-' + user.role, user };
  }

  // ─── MEDICATIONS ─────────────────────────────────────
  async function getMedications({ search = '', low_stock = false } = {}) {
    const params = new URLSearchParams({ search, low_stock });
    const live = await liveFetch('GET', `/medications?${params}`);
    if (live) return live;

    // Fallback Mock
    await delay(DELAY);
    let data = [...MOCK_DATA.medications];
    if (search) {
      const q = search.toLowerCase();
      data = data.filter(m => m.name.toLowerCase().includes(q) || (m.kfa_code_93 && m.kfa_code_93.includes(q)) || m.generic_name.toLowerCase().includes(q));
    }
    if (low_stock) data = data.filter(m => m.stock <= m.min_stock);
    return data;
  }

  async function getMedication(id) {
    const live = await liveFetch('GET', `/medications/${id}`);
    if (live) return live;

    await delay(DELAY);
    const med = MOCK_DATA.medications.find(m => m.id === id);
    if (!med) throw new Error('Obat tidak ditemukan');
    return med;
  }

  // ─── PATIENTS ────────────────────────────────────────
  async function getPatients() {
    const live = await liveFetch('GET', '/patients');
    if (live) return live;

    await delay(DELAY);
    return [...MOCK_DATA.patients];
  }

  async function searchPatient(query) {
    const live = await liveFetch('GET', `/patients/search?nik=${query}`);
    if (live) return live;

    await delay(DELAY);
    const q = String(query).trim().toLowerCase();
    const patient = MOCK_DATA.patients.find(p => p.nik === q || p.name.toLowerCase().includes(q) || p.ihs_number === q);
    if (!patient) throw new Error('Pasien tidak ditemukan.');
    return patient;
  }

  // ─── PRESCRIPTIONS ───────────────────────────────────
  async function getPrescriptions({ status = '', doctor_id = '', patient_nik = '', patient_ihs = '' } = {}) {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (doctor_id) params.append('doctor_id', doctor_id);
    if (patient_nik) params.append('patient_nik', patient_nik);
    if (patient_ihs) params.append('patient_ihs', patient_ihs);

    const live = await liveFetch('GET', `/prescriptions?${params}`);
    if (live) return live;

    await delay(DELAY);
    let data = [...MOCK_DATA.prescriptions];
    if (status) data = data.filter(p => p.status === status);
    if (doctor_id) data = data.filter(p => p.requester_id === doctor_id);
    if (patient_nik) data = data.filter(p => p.patient_nik === patient_nik);
    if (patient_ihs) data = data.filter(p => p.patient_ihs_number === patient_ihs);
    return data;
  }

  async function getPrescription(id) {
    const live = await liveFetch('GET', `/prescriptions/${id}`);
    if (live) return live;

    await delay(DELAY);
    const p = MOCK_DATA.prescriptions.find(x => x.id === id);
    if (!p) throw new Error('Resep tidak ditemukan');
    return p;
  }

  async function getPatientPrescriptions(patientNikOrIhs) {
    const live = await liveFetch('GET', `/prescriptions?patient_nik=${patientNikOrIhs}`);
    if (live) return live;

    await delay(DELAY);
    return MOCK_DATA.prescriptions.filter(p => 
      p.patient_nik === patientNikOrIhs || p.patient_ihs_number === patientNikOrIhs
    );
  }

  async function createPrescription(data) {
    // Mencoba kirim data lengkap ke /prescriptions atau fallback ke /resep
    let live = await liveFetch('POST', '/prescriptions', data);
    if (!live) {
      live = await liveFetch('POST', '/resep', {
        medication_id: data.medication_id,
        quantity: data.quantity
      });
    }

    if (live) {
      if (typeof SATUSEHATService !== 'undefined') {
        SATUSEHATService.createMedicationRequest(live.data || data).catch(console.error);
      }
      return live;
    }

    // Fallback Mock
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
    MOCK_DATA.prescriptions.unshift(record);

    if (MOCK_DATA.system_activities) {
      MOCK_DATA.system_activities.unshift({
        id: 'ACT-' + String(MOCK_DATA.system_activities.length + 1).padStart(3, '0'),
        time: Utils.nowUTC(),
        time_display: Utils.formatDateTime(new Date().toISOString()),
        actor: data.requester_name || 'Dokter',
        role: 'dokter',
        action: 'CREATE_PRESCRIPTION',
        description: `Menerbitkan resep ${num} untuk ${record.patient_name} (${record.medication_name})`,
        type: 'info'
      });
    }

    if (typeof SATUSEHATService !== 'undefined') {
      SATUSEHATService.createMedicationRequest(record).catch(console.error);
    }

    return { success: true, data: record, message: 'Resep berhasil dikirim ke Apoteker!' };
  }

  async function cancelPrescription(id, reason) {
    const live = await liveFetch('PATCH', `/prescriptions/${id}/cancel`, { reason });
    if (live) return live;

    await delay(DELAY);
    const p = MOCK_DATA.prescriptions.find(x => x.id === id);
    if (!p) throw new Error('Resep tidak ditemukan');
    if (p.status !== 'active') throw new Error('Hanya resep aktif yang dapat dibatalkan');
    p.status = 'cancelled';
    p.status_reason = reason;

    if (MOCK_DATA.system_activities) {
      MOCK_DATA.system_activities.unshift({
        id: 'ACT-' + String(MOCK_DATA.system_activities.length + 1).padStart(3, '0'),
        time: Utils.nowUTC(),
        time_display: Utils.formatDateTime(new Date().toISOString()),
        actor: typeof Auth !== 'undefined' ? Auth.getUser()?.name : 'Dokter',
        role: 'dokter',
        action: 'CANCEL_PRESCRIPTION',
        description: `Membatalkan resep ${p.prescription_number} (${p.patient_name}) - Alasan: ${reason}`,
        type: 'warning'
      });
    }

    return { success: true, message: 'Resep berhasil dibatalkan.' };
  }

  // ─── DISPENSE ────────────────────────────────────────
  async function getDispenses() {
    const live = await liveFetch('GET', '/dispenses');
    if (live) return live;

    await delay(DELAY);
    return [...MOCK_DATA.dispenses];
  }

  async function getPatientDispenses(patientNikOrIhs) {
    const live = await liveFetch('GET', `/dispenses?patient=${patientNikOrIhs}`);
    if (live) return live;

    await delay(DELAY);
    return MOCK_DATA.dispenses.filter(d => 
      d.patient_ihs_number === patientNikOrIhs || d.patient_name?.toLowerCase() === patientNikOrIhs?.toLowerCase()
    );
  }

  async function createDispense(data) {
    const live = await liveFetch('POST', '/dispense', data);
    if (live) {
      if (typeof SATUSEHATService !== 'undefined') {
        SATUSEHATService.createMedicationDispense(live.data || data).catch(console.error);
      }
      return live;
    }

    // Fallback Mock
    await delay(DELAY);
    const presc = MOCK_DATA.prescriptions.find(p => p.id === data.prescription_id);
    if (presc) presc.status = 'completed';

    const med = MOCK_DATA.medications.find(m => m.id === data.medication_id);
    if (med) med.stock = Math.max(0, med.stock - data.quantity);

    const newDispense = {
      id: 'MD-' + String(MOCK_DATA.dispenses.length + 1).padStart(3, '0'),
      dispensed_at: Utils.nowUTC(),
      dispensed_at_display: Utils.formatDateTime(new Date().toISOString()),
      status: 'completed',
      ...data
    };
    MOCK_DATA.dispenses.unshift(newDispense);

    if (MOCK_DATA.system_activities) {
      MOCK_DATA.system_activities.unshift({
        id: 'ACT-' + String(MOCK_DATA.system_activities.length + 1).padStart(3, '0'),
        time: Utils.nowUTC(),
        time_display: Utils.formatDateTime(new Date().toISOString()),
        actor: data.dispensed_by_name || 'Apoteker',
        role: 'apoteker',
        action: 'DISPENSE_MEDICATION',
        description: `Menyerahkan obat ${data.medication_name} (${data.quantity} ${data.quantity_unit}) untuk ${data.patient_name}`,
        type: 'success'
      });
    }

    if (typeof SATUSEHATService !== 'undefined') {
      SATUSEHATService.createMedicationDispense(newDispense).catch(console.error);
    }

    return { success: true, data: newDispense, message: 'Obat berhasil diserahkan!' };
  }

  // ─── DASHBOARD STATS ─────────────────────────────────
  async function getDashboardStats(role) {
    const live = await liveFetch('GET', `/dashboard/stats?role=${role}`);
    if (live) return live;

    await delay(150);
    return MOCK_DATA.dashboard_stats[role] || {};
  }

  // ─── ADMIN & USERS ───────────────────────────────────
  async function getAllUsers() {
    const live = await liveFetch('GET', '/users');
    if (live) return live;

    await delay(DELAY);
    return [...MOCK_DATA.users];
  }

  async function getSystemActivities() {
    const live = await liveFetch('GET', '/activities');
    if (live) return live;

    await delay(DELAY);
    return [...(MOCK_DATA.system_activities || [])];
  }

  // Public API
  return { 
    login, 
    getMedications, 
    getMedication, 
    getPatients, 
    searchPatient, 
    getPrescriptions, 
    getPrescription, 
    getPatientPrescriptions,
    createPrescription, 
    cancelPrescription, 
    getDispenses, 
    getPatientDispenses,
    createDispense, 
    getDashboardStats,
    getAllUsers,
    getSystemActivities
  };
})();
