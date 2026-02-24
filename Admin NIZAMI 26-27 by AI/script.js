// ==============================================================
// 1. KONFIGURASI URL API (GANTI URL DI SINI JIKA ADA UPDATE)
// ==============================================================
const URL_API =
  "https://script.google.com/macros/s/AKfycbzjg4pcWcClvEhpO_1X2ZLgkFwYvA5t-wtTCltqMz019XuS9phR2d2_IHE9Ouvw3-umwg/exec";

// ==============================================================
// 2. FUNGSI PENGAMBILAN DATA (FETCH)
// ==============================================================
async function fetchData(action, params = {}) {
  const queryString = new URLSearchParams({ action, ...params }).toString();
  try {
    const response = await fetch(`${URL_API}?${queryString}`);
    return await response.json();
  } catch (error) {
    console.error("Gagal terhubung ke server:", error);
    return null;
  }
}

// ==============================================================
// 3. SISTEM KERANJANG BELANJA (GLOBAL CART)
// ==============================================================
let globalCart = JSON.parse(localStorage.getItem("nizami_global_cart") || "[]");

function saveGlobalCart() {
  localStorage.setItem("nizami_global_cart", JSON.stringify(globalCart));
  updateGlobalCartBadge();

  // Jika fungsi render UI ada di halaman tersebut, jalankan
  if (typeof renderCartUI === "function") renderCartUI();
  if (typeof renderRegCartSummary === "function") renderRegCartSummary();
}

function updateGlobalCartBadge() {
  let total = 0;
  globalCart.forEach((item) => (total += item.qty));
  const badges = document.querySelectorAll(".cart-badge"); // Update semua badge di halaman

  badges.forEach((badge) => {
    badge.innerText = total;
    if (total > 0) {
      badge.style.display = "flex";
      badge.style.animation = "bounceIn 0.5s";
      setTimeout(() => (badge.style.animation = ""), 500);
    } else {
      badge.style.display = "none";
    }
  });
}

// Tambah barang dari halaman mana saja
window.addToGlobalCart = function (paketName, price = 0) {
  let existing = globalCart.find((item) => item.name === paketName);
  if (existing) {
    existing.qty++;
  } else {
    globalCart.push({ name: paketName, price: price, qty: 1 });
  }
  saveGlobalCart();
  showToast("Disimpan ke keranjang!");
};

function updateCartItem(paketName, change) {
  let existing = globalCart.find((item) => item.name === paketName);
  if (existing) {
    existing.qty += change;
    if (existing.qty <= 0) {
      globalCart = globalCart.filter((item) => item.name !== paketName);
    }
  }
  saveGlobalCart();
}

// ==============================================================
// 4. UTILITIES & HELPER
// ==============================================================

function formatRupiah(angka) {
  return "Rp " + parseInt(angka).toLocaleString("id-ID");
}

function showToast(msg) {
  let toast = document.getElementById("toast");
  if (!toast) return; // Cegah error jika elemen tidak ada

  document.getElementById("toastMsg").innerText = msg;
  toast.style.display = "flex";
  setTimeout(() => (toast.style.opacity = "1"), 10);
  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => (toast.style.display = "none"), 300);
  }, 2000);
}

function kirimWA(nomor, pesan) {
  window.open(`https://wa.me/${nomor}?text=${pesan}`, "_blank");
}

// Membaca link GDrive agar jadi Thumbnail kebal blokir (RESOLUSI TINGGI)
function getDriveThumbnail(url) {
  if (!url) return "";
  if (url.includes("drive.google.com/uc")) {
    const match = url.match(/id=([a-zA-Z0-9_-]+)/);
    // Rahasianya ada di "&sz=w1000" -> Memaksa Google mengirim gambar resolusi tinggi (lebar 1000px)
    if (match)
      return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1000`;
  }
  return url;
}

// Saat file diload, perbarui angka di keranjang
document.addEventListener("DOMContentLoaded", () => {
  updateGlobalCartBadge();
});
