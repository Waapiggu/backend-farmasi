/**
 * utils.js – Helper functions
 */

const Utils = {

  // ─── Format Tanggal & Waktu ──────────────────────────
  formatDate(isoString) {
    if (!isoString) return '-';
    const d = new Date(isoString);
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  },

  formatDateTime(isoString) {
    if (!isoString) return '-';
    const d = new Date(isoString);
    return d.toLocaleString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta'
    }) + ' WIB';
  },

  formatTime(isoString) {
    if (!isoString) return '-';
    const d = new Date(isoString);
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }) + ' WIB';
  },

  // Konversi WIB → UTC+00 untuk dikirim ke SatuSehat
  toUTC(dateString) {
    const d = new Date(dateString);
    return d.toISOString().replace('.000Z', '+00:00');
  },

  // Waktu sekarang dalam format UTC+00
  nowUTC() {
    return new Date().toISOString().replace('.000Z', '+00:00');
  },

  // ─── Status Badge ────────────────────────────────────
  statusBadge(status) {
    const map = {
      'active':     { cls: 'badge-active',    label: 'Aktif' },
      'completed':  { cls: 'badge-completed', label: 'Selesai' },
      'cancelled':  { cls: 'badge-cancelled', label: 'Dibatalkan' },
      'on-hold':    { cls: 'badge-on-hold',   label: 'Ditahan' },
      'stopped':    { cls: 'badge-stopped',   label: 'Dihentikan' },
      'in-progress':{ cls: 'badge-active',    label: 'Diproses' }
    };
    const s = map[status] || { cls: 'badge-stopped', label: status };
    return `<span class="badge ${s.cls}">${s.label}</span>`;
  },

  stockBadge(stock, minStock) {
    if (stock === 0)           return `<span class="badge badge-empty">Habis</span>`;
    if (stock <= minStock)     return `<span class="badge badge-low">Menipis</span>`;
    return `<span class="badge badge-ok">Aman</span>`;
  },

  simpleStockBadge(stock, minStock) {
    if (stock === 0)           return `<span class="badge badge-empty">Kosong</span>`;
    if (stock <= minStock)     return `<span class="badge badge-low">Stok Terbatas</span>`;
    return `<span class="badge badge-ok">Tersedia</span>`;
  },

  paymentBadge(type) {
    const map = {
      'BPJS-K':          { cls: 'badge-active',    label: 'BPJS-K' },
      'Biaya-Sendiri':   { cls: 'badge-stopped',   label: 'Umum' },
      'Biaya-Perusahaan':{ cls: 'badge-on-hold',   label: 'Perusahaan' },
      'Asuransi-Swasta': { cls: 'badge-completed', label: 'Asuransi' }
    };
    const s = map[type] || { cls: 'badge-stopped', label: type };
    return `<span class="badge ${s.cls}">${s.label}</span>`;
  },

  timingLabel(code) {
    const map = {
      'QD': '1x sehari',
      'BID': '2x sehari',
      'TID': '3x sehari',
      'QID': '4x sehari',
      'Q6H': 'Tiap 6 jam',
      'Q8H': 'Tiap 8 jam',
      'Q12H': 'Tiap 12 jam',
      'AM': 'Pagi hari',
      'PM': 'Malam hari',
      'PRN': 'Bila perlu'
    };
    return map[code] || code;
  },

  // ─── Format Angka & Mata Uang ────────────────────────
  formatCurrency(amount) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount);
  },

  formatNumber(n) {
    return new Intl.NumberFormat('id-ID').format(n);
  },

  // ─── KFA Code Display ────────────────────────────────
  kfaTag(code) {
    if (!code) return '-';
    return `<span class="td-mono">${code}</span>`;
  },

  // ─── Initials Avatar ─────────────────────────────────
  initials(name) {
    if (!name) return '?';
    return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  },

  // ─── Toast Notification ──────────────────────────────
  toast(type, title, message = '') {
    const container = document.getElementById('toast-container') || (() => {
      const el = document.createElement('div');
      el.id = 'toast-container';
      document.body.appendChild(el);
      return el;
    })();

    const icons = {
      success: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
      error: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
      warning: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
      info: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--teal-500)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
    };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${icons[type] || icons.info}</span>
      <div class="toast-msg"><strong>${title}</strong>${message ? `<span>${message}</span>` : ''}</div>
    `;
    container.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateX(100%)'; toast.style.transition = 'all 0.3s'; setTimeout(() => toast.remove(), 300); }, 3500);
  },

  // ─── Modal ──────────────────────────────────────────
  openModal(id) {
    const el = document.getElementById(id);
    if (el) { el.classList.add('open'); document.body.style.overflow = 'hidden'; }
  },

  closeModal(id) {
    const el = document.getElementById(id);
    if (el) { el.classList.remove('open'); document.body.style.overflow = ''; }
  },

  // ─── Confirm Dialog ──────────────────────────────────
  confirm(message, onYes) {
    if (window.confirm(message)) onYes();
  },

  // ─── Real-time Clock ─────────────────────────────────
  startClock(elementId) {
    const update = () => {
      const el = document.getElementById(elementId);
      if (!el) return;
      const now = new Date();
      el.textContent = now.toLocaleString('id-ID', {
        weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        timeZone: 'Asia/Jakarta'
      }) + ' WIB';
    };
    update();
    setInterval(update, 1000);
  },

  // ─── Debounce ────────────────────────────────────────
  debounce(fn, delay = 300) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
  },

  // ─── Empty State Row ─────────────────────────────────
  emptyRow(colSpan, message = 'Tidak ada data') {
    return `<tr><td colspan="${colSpan}"><div class="empty-state"><div class="empty-icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div><p>${message}</p></div></td></tr>`;
  }
};
