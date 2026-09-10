/**
 * auth.js – Authentication & Session Management
 * Mendukung role: dokter, apoteker, admin, pasien
 */

const Auth = {
  // Simpan sesi login ke localStorage
  login(userData, token) {
    localStorage.setItem('farmasi_user', JSON.stringify(userData));
    localStorage.setItem('farmasi_token', token || ('mock-jwt-token-' + userData.role));
  },

  logout() {
    const user = this.getUser();
    const isPatient = user && user.role === 'pasien';
    localStorage.removeItem('farmasi_user');
    localStorage.removeItem('farmasi_token');
    if (isPatient) {
      window.location.href = this.getPatientLoginPath();
    } else {
      window.location.href = this.getLoginPath();
    }
  },

  getUser() {
    const data = localStorage.getItem('farmasi_user');
    return data ? JSON.parse(data) : null;
  },

  getToken() {
    return localStorage.getItem('farmasi_token');
  },

  isLoggedIn() {
    return !!this.getToken();
  },

  getRole() {
    const user = this.getUser();
    return user ? user.role : null;
  },

  // Hitung path ke index login staf berdasarkan kedalaman folder
  getLoginPath() {
    const path = window.location.pathname.replace(/\\/g, '/');
    if (path.includes('/pasien/')) {
      return '../index.html';
    }
    if (path.includes('/dokter/') || path.includes('/apoteker/') || path.includes('/admin/')) {
      return '../index.html';
    }
    return 'index.html';
  },

  // Hitung path ke login pasien
  getPatientLoginPath() {
    const path = window.location.pathname.replace(/\\/g, '/');
    if (path.includes('/pasien/')) {
      return 'login.html';
    }
    return 'pasien/login.html';
  },

  // Guard – redirect jika belum login atau role salah
  requireAuth(expectedRole) {
    if (!this.isLoggedIn()) {
      if (expectedRole === 'pasien') {
        window.location.href = this.getPatientLoginPath();
      } else {
        window.location.href = this.getLoginPath();
      }
      return false;
    }

    const currentRole = this.getRole();
    const allowed = Array.isArray(expectedRole) 
      ? expectedRole.includes(currentRole) 
      : (!expectedRole || currentRole === expectedRole);

    if (!allowed) {
      if (typeof Utils !== 'undefined' && Utils.toast) {
        Utils.toast('error', 'Akses Ditolak', 'Anda tidak memiliki izin untuk halaman ini.');
      }
      if (currentRole === 'pasien') {
        window.location.href = this.getPatientLoginPath();
      } else {
        window.location.href = this.getLoginPath();
      }
      return false;
    }
    return true;
  },

  // Isi komponen sidebar/header user info
  renderUserInfo() {
    const user = this.getUser();
    if (!user) return;

    const nameEl   = document.getElementById('sidebar-user-name');
    const roleEl   = document.getElementById('sidebar-user-role');
    const avatarEl = document.getElementById('sidebar-user-avatar');

    const roleLabels = {
      'dokter':   'Dokter',
      'apoteker': 'Apoteker',
      'admin':    'Administrator',
      'pasien':   'Pasien'
    };

    if (nameEl)   nameEl.textContent   = user.name;
    if (roleEl)   roleEl.textContent   = roleLabels[user.role] || user.role;
    if (avatarEl && typeof Utils !== 'undefined') avatarEl.textContent = Utils.initials(user.name);
  },

  // Ambil profil pasien jika user yang login adalah pasien
  getPatientProfile() {
    const user = this.getUser();
    if (!user || user.role !== 'pasien') return null;
    if (typeof MOCK_DATA !== 'undefined' && MOCK_DATA.patients) {
      return MOCK_DATA.patients.find(p => p.nik === user.nik || p.ihs_number === user.ihs_number) || user;
    }
    return user;
  }
};

