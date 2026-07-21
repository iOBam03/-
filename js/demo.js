/* ==========================================================================
   Demo Controller - Toggles between empty state and populated state
   ========================================================================== */

const DemoController = {
  STORAGE_KEY: 'proc_demo_state',

  isOn() {
    return sessionStorage.getItem(this.STORAGE_KEY) === '1';
  },

  set(on) {
    sessionStorage.setItem(this.STORAGE_KEY, on ? '1' : '0');
    // Trigger custom event for any page listening
    window.dispatchEvent(new CustomEvent('demoToggle', { detail: { on } }));
  },

  toggle() {
    this.set(!this.isOn());
    location.reload();
  },

  reset() {
    sessionStorage.removeItem(this.STORAGE_KEY);
    location.reload();
  },

  /* Inject the toggle button into the topbar */
  injectToggle(targetSelector) {
    const target = document.querySelector(targetSelector);
    if (!target) return;
    const on = this.isOn();
    const btn = document.createElement('button');
    btn.className = 'demo-toggle' + (on ? ' on' : '');
    btn.id = 'demo-toggle-btn';
    btn.innerHTML = `
      <span class="switch"></span>
      <span>${on ? 'ข้อมูลตัวอย่าง: เปิด' : 'โหลดข้อมูลตัวอย่าง'}</span>
    `;
    btn.addEventListener('click', () => this.toggle());
    target.appendChild(btn);
  },

  injectBanner() {
    if (!this.isOn()) return;
    const banner = document.createElement('div');
    banner.className = 'demo-banner';
    banner.innerHTML = `
      <div class="banner-text">
        <strong>โหมดข้อมูลตัวอย่าง</strong>
        <span style="opacity:.85">— ข้อมูลทั้งหมดเป็นข้อมูลจำลองเพื่อการสาธิต กดปุ่มสลับเพื่อดูสถานะว่าง</span>
      </div>
      <button onclick="DemoController.reset()">ปิดโหมดตัวอย่าง</button>
    `;
    const topbar = document.querySelector('.topbar');
    if (topbar && topbar.parentElement) {
      topbar.parentElement.insertBefore(banner, topbar);
    }
  }
};

/* Generic empty-state component */
function renderEmptyState({ icon, title, message }) {
  const iconSvg = icon || `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <path d="M3 9h18M9 3v18"/>
  </svg>`;
  return `
    <div class="empty-state">
      <div class="empty-icon">${iconSvg}</div>
      <h4>${title}</h4>
      <p>${message}</p>
      <button class="btn btn-primary" onclick="DemoController.toggle()">โหลดข้อมูลตัวอย่าง</button>
    </div>
  `;
}

/* Chart helpers - using Chart.js */
function createLineChart(canvasId, config) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return null;
  return new Chart(ctx, config);
}

const chartPalette = {
  primary: '#2563eb',
  primaryLight: 'rgba(37, 99, 235, 0.1)',
  secondary: '#1e3a5f',
  accent: '#0891b2',
  success: '#16a34a',
  successLight: 'rgba(22, 163, 74, 0.1)',
  warning: '#d97706',
  danger: '#dc2626',
  muted: '#94a3b8',
  grid: '#e2e8f0',
  text: '#475569',
};

const defaultChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: {
      position: 'top',
      align: 'end',
      labels: { boxWidth: 10, boxHeight: 10, font: { size: 12, family: 'Sarabun' }, color: chartPalette.text, usePointStyle: true, pointStyle: 'rectRounded' }
    },
    tooltip: {
      backgroundColor: '#0f172a',
      titleFont: { family: 'Sarabun', size: 12 },
      bodyFont: { family: 'Sarabun', size: 12 },
      padding: 10,
      cornerRadius: 6,
    }
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { color: chartPalette.text, font: { size: 11, family: 'Sarabun' } }
    },
    y: {
      grid: { color: chartPalette.grid, drawBorder: false },
      ticks: { color: chartPalette.text, font: { size: 11, family: 'Sarabun' } }
    }
  }
};
