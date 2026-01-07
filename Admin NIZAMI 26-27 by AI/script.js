// ===========================================
// CORE SCRIPT - PAKET NIZAMI 2026 (SHARED)
// ===========================================

// ⚠️ PASTIIN URL INI BENAR ⚠️
const API_URL = 'https://script.google.com/macros/s/AKfycby9V1MW26UXVNY_fXurJnwZsMbgNMZAzfbgDfnAxjk9_BmQB__afxhcUgSbIi82s_CN0A/exec'; 

// 1. Format Rupiah
const formatRupiah = (angka) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);
};

// 2. Fungsi Fetch Data Universal
async function fetchData(action, params = {}) {
  const url = new URL(API_URL);
  url.searchParams.append('action', action);
  for (const key in params) {
    url.searchParams.append(key, params[key]);
  }

  try {
    const response = await fetch(url);
    return await response.json();
  } catch (error) {
    console.error("Gagal mengambil data:", error);
    showToast("Gagal koneksi ke server", "error");
    return null;
  }
}

// 3. Global Toast Notification (Agar bisa dipanggil di semua halaman)
function showToast(msg, type = 'success') {
    // Buat container jika belum ada
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = "position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%); z-index: 1000; display: flex; flex-direction: column; gap: 10px; width: 90%; max-width: 400px;";
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    const icon = type === 'success' ? 'check-circle' : 'exclamation-circle';
    const color = type === 'success' ? '#ffd700' : '#ff5252'; // Gold or Red
    
    toast.style.cssText = `background: rgba(30, 30, 30, 0.95); backdrop-filter: blur(10px); color: white; padding: 15px 20px; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); display: flex; align-items: center; gap: 12px; border-left: 4px solid ${color}; animation: slideUpFade 0.4s ease;`;
    toast.innerHTML = `<i class="fas fa-${icon}" style="color:${color}; font-size:1.2rem;"></i> <span>${msg}</span>`;
    
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.remove();
    }, 3000);
}

// Tambahkan CSS Animation untuk Toast secara global
const styleSheet = document.createElement("style");
styleSheet.innerText = `@keyframes slideUpFade { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }`;
document.head.appendChild(styleSheet);
