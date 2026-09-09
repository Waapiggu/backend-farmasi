/**
 * auth.js – Authentication & Session Management
 */

const Auth = {
  // Simpan sesi login ke localStorage
  login(userData) {
    localStorage.setItem('farmasi_user', JSON.stringify(userData));
    localStorage.setItem('farmasi_token', 'mock-jwt-token-' + userData.role);
  },

  logout() {
    localStorage.removeItem('farmasi_user');
    localStorage.removeItem('farmasi_token');
    window.location.href = this.getLoginPath();
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

  // Hitung path ke index berdasarkan kedalaman folder
  getLoginPath() {
    const path = window.location.pathname;
    const depth = (path.match(/\//g) || []).length - 1;
    return '../'.repeat(depth) + 'index.html';
  },

  // Guard – redirect jika belum login atau role salah
  requireAuth(expectedRole) {
    if (!this.isLoggedIn()) {
      window.location.href = this.getLoginPath();
      return false;
    }
    if (expectedRole && this.getRole() !== expectedRole) {
      Utils.toast('error', 'Akses Ditolak', 'Anda tidak memiliki izin untuk halaman ini.');
      window.location.href = this.getLoginPath();
      return false;
    }
    return true;
  },

  // Isi komponen sidebar user info
  renderUserInfo() {
    const user = this.getUser();
    if (!user) return;

    const nameEl   = document.getElementById('sidebar-user-name');
    const roleEl   = document.getElementById('sidebar-user-role');
    const avatarEl = document.getElementById('sidebar-user-avatar');

    if (nameEl)   nameEl.textContent   = user.name;
    if (roleEl)   roleEl.textContent   = user.role === 'dokter' ? 'Dokter' : 'Apoteker';
    if (avatarEl) avatarEl.textContent = Utils.initials(user.name);
  }
};
