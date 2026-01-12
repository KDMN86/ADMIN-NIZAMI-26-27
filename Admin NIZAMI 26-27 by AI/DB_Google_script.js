// ==========================================
// 🚀 SYSTEM CORE PAKET NIZAMI (FINAL V5 - PROTOCOL FIX)
// ==========================================

const CONFIG = {
  sheetPeserta: 'DATA_PESERTA',
  sheetTransaksi: 'TRANSAKSI',
  sheetBarang: 'MASTER_BARANG',
  sheetPaket: 'MASTER_PAKET',
  sheetIsiPaket: 'MASTER_ISI_PAKET',
  sheetMitra: 'MASTER_MITRA',
  sheetRekap: 'REKAP_BELANJA',
  sheetGallery: 'GALLERY',
  folderGalleryID: '1a_hi_qgfrvLxhB1TaX6IpPe9f7YJreiK' 
};

// --- 1. API GATEWAY (PINTU MASUK DATA) ---

function doGet(e) {
  const act = e.parameter.action;

  // === DATA UMUM (GET) ===
  if(act === 'getMitra') return getListMitra();
  if(act === 'getPaket') return getListPaket();
  if(act === 'getBarang') return getListBarang();
  if(act === 'getGallery') return getGalleryData();
  if(act === 'cekSaldo') return cekSaldoPeserta(e.parameter.id);

  // === TRANSAKSI (DIPINDAHKAN KE GET AGAR SUPPORT SCRIPT.JS) ===
  // Ini perbaikan utamanya: daftarPeserta & inputSetoran dipindah ke sini
  if(act === 'daftarPeserta') return daftarPeserta(e.parameter);
  if(act === 'inputSetoran') return inputSetoran(e.parameter);

  // === ADMIN FEATURES ===
  if(act === 'getAdminStats') return getAdminStats();
  if(act === 'cariPeserta') return cariPeserta(e.parameter.q);
  if(act === 'updateHarga') return updateHargaBarang(e.parameter);
  if(act === 'tambahBarang') return tambahBarangBaru(e.parameter);
  if(act === 'tambahPeserta') return tambahPesertaBaru(e.parameter); 
  if(act === 'tambahMitra') return tambahMitraBaru(e.parameter);
  if(act === 'cekStatusDetail') return cekStatusDetail(e.parameter.id);
  if(act === 'getRekapBelanja') return hitungRekapBelanja();

  return responseJSON({error: 'Invalid Action (GET)'});
}



function doPost(e) {
  // 1. Coba parsing data JSON dari body request (Isi Paket)
  let requestBody = {};
  try {
    requestBody = JSON.parse(e.postData.contents);
  } catch(err) {
    // Jika gagal parse (bukan JSON), biarkan kosong
  }

  // 2. Cek Action: Prioritas dari URL Parameter, kalau tidak ada baru dari Body JSON
  const act = e.parameter.action || requestBody.action;
  
  // 3. Routing Action
  if(act === 'uploadImage') return uploadImageToDrive(e);

  return responseJSON({error: 'Invalid Action (POST) - Action not found'});
}

// --- 2. FUNGSI UTAMA ---

function daftarPeserta(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.sheetPeserta);
  
  // === LOGIKA BARU ID PESERTA (NAMA DEPAN + 4 DIGIT HP) ===
  
  // 1. Bersihkan Nama (Ambil nama depan, uppercase, hapus simbol aneh)
  let namaClean = data.nama.trim().toUpperCase().replace(/[^A-Z0-9 ]/g, '');
  let namaDepan = namaClean.split(' ')[0]; // Ambil kata pertama saja

  // 2. Ambil 4 Digit Terakhir HP
  let hpString = String(data.hp).replace(/\D/g, ''); // Pastikan hanya angka
  let last4 = hpString.length >= 4 ? hpString.slice(-4) : hpString.padEnd(4, '0');

  // 3. Gabungkan Jadi ID
  const idPeserta = namaDepan + "-" + last4;

  // ========================================================
  
  // Format: ID, Tgl, Nama, HP, Alamat, Mitra, Paket, Harga, Status, Rincian
  sheet.appendRow([
    idPeserta, new Date(), data.nama, "'" + data.hp, data.alamat, 
    data.mitra, data.paket, data.harga || 0, 'Aktif', data.rincian || '-'
  ]);
  
  return responseJSON({success: true, id: idPeserta, nama: data.nama});
}

function inputSetoran(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetTrx = ss.getSheetByName(CONFIG.sheetTransaksi);
  const sheetPeserta = ss.getSheetByName(CONFIG.sheetPeserta);
  const sheetPaket = ss.getSheetByName(CONFIG.sheetPaket);
  
  // Cari Jenis Paket Peserta
  const dataPeserta = sheetPeserta.getDataRange().getValues();
  let jenisPaket = '';
  for(let i=1; i<dataPeserta.length; i++){
    if(String(dataPeserta[i][0]) === String(data.idPeserta)) {
      jenisPaket = dataPeserta[i][6];
      break;
    }
  }
  
  if(!jenisPaket) return responseJSON({error: 'ID Peserta Tidak Ditemukan'});

  // Cek Fee Harian (Khusus Paket Uang)
  const dataMaster = sheetPaket.getDataRange().getValues();
  let fee = 0;
  for(let i=1; i<dataMaster.length; i++){
    if(dataMaster[i][0] === jenisPaket && dataMaster[i][2] === 'Uang') {
      fee = Number(dataMaster[i][3]); 
    }
  }

  const nominalFisik = Number(data.nominal);
  const nilaiEfektif = nominalFisik - fee;

  sheetTrx.appendRow([
    'TRX-' + Date.now(), new Date(), 'MASUK', 'Setoran Tabungan',
    nominalFisik, fee, nilaiEfektif, `Setoran ${jenisPaket}`, data.idPeserta
  ]);

  return responseJSON({success: true});
}

// --- FUNGSI ADMIN ---


function tambahPesertaBaru(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.sheetPeserta);

  // === LOGIKA BARU ID PESERTA (NAMA DEPAN + 4 DIGIT HP) ===
  
  // 1. Bersihkan Nama
  let namaClean = data.nama.trim().toUpperCase().replace(/[^A-Z0-9 ]/g, '');
  let namaDepan = namaClean.split(' ')[0];

  // 2. Ambil 4 Digit Terakhir HP
  let hpString = String(data.hp).replace(/\D/g, '');
  let last4 = hpString.length >= 4 ? hpString.slice(-4) : hpString.padEnd(4, '0');

  // 3. Gabungkan
  const idPeserta = namaDepan + "-" + last4;

  // ========================================================

  sheet.appendRow([idPeserta, new Date(), data.nama, "'" + data.hp, data.alamat, data.mitra, data.paket, 0, 'Aktif', 'Input Admin']);
  return responseJSON({success: true, id: idPeserta});
}

function tambahBarangBaru(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.sheetBarang);
  sheet.appendRow([data.kategori, data.nama, Number(data.harga), data.satuan]);
  return responseJSON({success: true});
}

function updateHargaBarang(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.sheetBarang);
  const rows = sheet.getDataRange().getValues();
  for(let i=1; i<rows.length; i++){
    if(String(rows[i][1]).trim().toLowerCase() === String(data.nama).trim().toLowerCase()) {
      sheet.getRange(i+1, 3).setValue(Number(data.hargaBaru));
      return responseJSON({success: true});
    }
  }
  return responseJSON({error: "Barang tidak ditemukan."});
}

function hitungRekapBelanja() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dataPeserta = ss.getSheetByName(CONFIG.sheetPeserta).getDataRange().getValues();
  let countPaket = {};
  for(let i=1; i<dataPeserta.length; i++){
    let namaPaket = dataPeserta[i][6];
    if(namaPaket) {
      if(!countPaket[namaPaket]) countPaket[namaPaket] = 0;
      countPaket[namaPaket]++;
    }
  }
  const sheetIsi = ss.getSheetByName(CONFIG.sheetIsiPaket);
  if(!sheetIsi) return responseJSON({paketCount: countPaket, belanja: []});
  
  const dataResep = sheetIsi.getDataRange().getValues();
  let rekap = {};
  
  for(let i=1; i<dataResep.length; i++){
    let pkt = dataResep[i][0];
    let brg = dataResep[i][1];
    let qty = Number(dataResep[i][2]);
    let sat = dataResep[i][3];
    
    if(countPaket[pkt] > 0) {
      let total = countPaket[pkt] * qty;
      if(!rekap[brg]) rekap[brg] = { qty: 0, satuan: sat };
      rekap[brg].qty += total;
    }
  }
  let hasil = [];
  for(let key in rekap) hasil.push({barang: key, total: rekap[key].qty, satuan: rekap[key].satuan});
  hasil.sort((a,b) => a.barang.localeCompare(b.barang));
  return responseJSON({paketCount: countPaket, belanja: hasil});
}

// --- FUNGSI HELPER & READ ---

// --- UPDATE FUNGSI INI DI DB_Google_script.js ---

function getListMitra() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. Ambil Data Mitra
  const dataMitra = ss.getSheetByName(CONFIG.sheetMitra).getDataRange().getValues();
  
  // 2. Ambil Data Peserta (untuk tahu siapa ikut mitra siapa)
  const dataPeserta = ss.getSheetByName(CONFIG.sheetPeserta).getDataRange().getValues();
  
  // 3. Ambil Data Transaksi (untuk tahu progress setoran)
  // Kita ambil kolom I (ID), L (Ke), M (Sisa). 
  // Ingat ArrayFormula sudah otomatis hitung di sheet Transaksi
  const sheetTrx = ss.getSheetByName(CONFIG.sheetTransaksi);
  const dataTrx = sheetTrx.getDataRange().getValues();
  
  // --- A. Mapping Progress Peserta Terkini ---
  let progressMap = {}; 
  // Loop dari bawah (transaksi terbaru) ke atas untuk ambil status terakhir
  for(let i=dataTrx.length-1; i>=1; i--){
    let idPeserta = String(dataTrx[i][8]); // Kolom I
    if(!progressMap[idPeserta]) {
      // Simpan data progress pertama kali ditemukan (artinya yg terbaru)
      progressMap[idPeserta] = {
        ke: dataTrx[i][11],  // Kolom L (Setoran Ke)
        sisa: dataTrx[i][12] // Kolom M (Sisa)
      };
    }
  }

  // --- B. Mapping Peserta ke Mitra ---
  let pesertaByMitra = {};
  for(let i=1; i<dataPeserta.length; i++){
    let mitraName = String(dataPeserta[i][5]).toLowerCase().trim(); // Kolom F (Mitra)
    let idP = dataPeserta[i][0];
    let namaP = dataPeserta[i][2];
    let paketP = dataPeserta[i][6];
    
    // Ambil progress dari map transaksi
    let prog = progressMap[idP] || {ke: 0, sisa: '-'};
    
    let infoPeserta = {
      id: idP,          // <--- TAMBAHKAN BARIS INI (PENTING!)
      nama: namaP,
      paket: paketP,
      ke: prog.ke,
      sisa: prog.sisa
    };

    if(!pesertaByMitra[mitraName]) pesertaByMitra[mitraName] = [];
    pesertaByMitra[mitraName].push(infoPeserta);
  }

  // --- C. Susun Hasil Akhir ---
  let list = [];
  for(let i=1; i<dataMitra.length; i++) {
    let namaMitra = String(dataMitra[i][1]); // Nama Mitra Asli
    let keyMitra = namaMitra.toLowerCase().trim();
    
    let anakBuah = pesertaByMitra[keyMitra] || [];
    
    list.push({
      id: dataMitra[i][0],
      nama: namaMitra,
      hp: dataMitra[i][2],
      alamat: dataMitra[i][3],
      total_peserta: anakBuah.length, // Jumlah Peserta
      list_peserta: anakBuah          // Detail Peserta
    });
  }
  
  return responseJSON(list);
}

function getListPaket() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.sheetPaket);
  const data = sheet.getDataRange().getValues();
  let list = [];
  for(let i=1; i<data.length; i++) list.push({nama: data[i][0], jenis: data[i][2]});
  return responseJSON(list);
}

function getListBarang() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.sheetBarang);
  const data = sheet.getDataRange().getValues();
  let list = [];
  for(let i=1; i<data.length; i++) {
    list.push({kategori: data[i][0], nama: data[i][1], harga: data[i][2], satuan: data[i][3]});
  }
  return responseJSON(list);
}

function getGalleryData() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.sheetGallery);
  if (!sheet) return responseJSON([]);
  var data = sheet.getDataRange().getValues();
  var result = [];
  for (var i = 1; i < data.length; i++) {
    result.push({url: data[i][1]});
  }
  return responseJSON(result);
}

// --- GANTI FUNGSI INI DI DB_Google_script.js ---

function getAdminStats() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetPeserta = ss.getSheetByName(CONFIG.sheetPeserta);
  const sheetTrx = ss.getSheetByName(CONFIG.sheetTransaksi);
  
  // 1. Ambil Data Peserta (Mapping ID -> Nama)
  const dataPeserta = sheetPeserta.getDataRange().getValues();
  let mapNama = {};
  const totalPeserta = Math.max(0, dataPeserta.length - 1);
  
  for(let i=1; i<dataPeserta.length; i++){
    // Kolom A (Index 0) = ID, Kolom C (Index 2) = Nama
    mapNama[String(dataPeserta[i][0])] = dataPeserta[i][2]; 
  }

  // 2. Hitung Transaksi & Cari 5 Terakhir
  const dataTrx = sheetTrx.getDataRange().getValues();
  let totalUang = 0; 
  let trxHariIni = 0; 
  const todayStr = new Date().toDateString();
  let recent = [];

  // Loop dari baris paling bawah (Data Terbaru) ke atas
  for(let i=dataTrx.length-1; i>=1; i--){
    const row = dataTrx[i];
    
    // Cek Status MASUK
    if(row[2] === 'MASUK') { 
      totalUang += Number(row[4] || 0); // Kolom E = Nominal
      
      // Cek apakah transaksi hari ini
      if(new Date(row[1]).toDateString() === todayStr) trxHariIni++;
      
      // Ambil 5 Data Terakhir untuk Dashboard
      if(recent.length < 5) {
        let idPeserta = String(row[8]); // Kolom I = ID Peserta
        recent.push({
          nama: mapNama[idPeserta] || 'Tanpa Nama',
          nominal: row[4],
          waktu: new Date(row[1]).toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'})
        });
      }
    }
  }
  
  return responseJSON({
    peserta: totalPeserta, 
    uang: totalUang, 
    trxToday: trxHariIni,
    recent: recent // Kirim data terbaru ke frontend
  });
}

// GANTI FUNGSI cariPeserta DI DB_Google_script.js

function cariPeserta(query) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetPeserta = ss.getSheetByName(CONFIG.sheetPeserta);
  const sheetPaket = ss.getSheetByName(CONFIG.sheetPaket);
  const sheetTrx = ss.getSheetByName(CONFIG.sheetTransaksi);
  
  // 1. Ambil Data Referensi Harga (Nominal Per Setoran) dari MASTER PAKET
  // Kolom A (0) = Nama Paket, Kolom E (4) = Nominal Per Setoran
  const dataPaket = sheetPaket.getDataRange().getValues();
  let mapHargaPaket = {};
  for(let i=1; i<dataPaket.length; i++){
    let namaP = String(dataPaket[i][0]).trim();
    let nominal = Number(dataPaket[i][4]); // Kolom E
    mapHargaPaket[namaP] = nominal;
  }

  // 2. Cache Frekuensi Setoran
  const dataTrx = sheetTrx.getDataRange().getValues();
  let freqMap = {};
  for(let j=1; j<dataTrx.length; j++){
    if(String(dataTrx[j][2]) === 'MASUK') {
      let idP = String(dataTrx[j][8]);
      if(!freqMap[idP]) freqMap[idP] = 0;
      freqMap[idP]++;
    }
  }

  // 3. Cari Peserta
  const dataPeserta = sheetPeserta.getDataRange().getValues();
  let hasil = [];
  const q = String(query).toLowerCase();
  
  let countFound = 0;
  for(let i=1; i<dataPeserta.length; i++){
    let id = String(dataPeserta[i][0]);
    let nama = String(dataPeserta[i][2]).toLowerCase();
    let mitra = String(dataPeserta[i][5]).toLowerCase(); 
    let namaPaket = String(dataPeserta[i][6]); // Nama Paket Peserta

    // Logika pencarian (Nama ATAU Mitra)
    if(nama.includes(q) || mitra.includes(q)) {
      
      // AMBIL HARGA DARI MAP MASTER PAKET
      // Jika paket tidak ditemukan di map, default ke 0
      let hargaPerSetor = mapHargaPaket[namaPaket.trim()] || 0;

      let frekuensi = freqMap[id] || 0;

      hasil.push({
        id: dataPeserta[i][0],
        nama: dataPeserta[i][2],
        mitra: dataPeserta[i][5],
        paket: namaPaket,
        harga: hargaPerSetor, // Ini yang dikirim ke Frontend
        freq: frekuensi  
      });
      
      countFound++;
      if(countFound >= 50) break; // Limit pencarian biar gak berat
    }
  }
  return responseJSON(hasil);
}



// GANTI FUNGSI 'cekStatusDetail' DENGAN VERSI LOGIKA BARU INI

function cekStatusDetail(id) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. Ambil Info Peserta & Paketnya
  const dataP = ss.getSheetByName(CONFIG.sheetPeserta).getDataRange().getValues();
  let info = null;
  
  for(let i=1; i<dataP.length; i++){
    if(String(dataP[i][0]) === String(id)) {
      info = {
        id: dataP[i][0], 
        nama: dataP[i][2], 
        mitra: dataP[i][5], 
        paket: dataP[i][6]
      };
      break;
    }
  }
  
  if(!info) return responseJSON({error: "ID Peserta Tidak Ditemukan"});

  // 2. Ambil Data Harga & Target dari MASTER PAKET
  // Kita butuh ini untuk membagi (Total Uang / Harga Per Setor)
  const sheetPaket = ss.getSheetByName(CONFIG.sheetPaket);
  const dataPaket = sheetPaket.getDataRange().getValues();
  
  let hargaPerSetor = 0;
  let targetTotal = 0;

  for(let i=1; i<dataPaket.length; i++){
    // Kolom A (0) = Nama Paket
    if(String(dataPaket[i][0]) === String(info.paket)) {
       hargaPerSetor = Number(dataPaket[i][4]); // Kolom E (Nominal Per Setoran)
       targetTotal = Number(dataPaket[i][5]);   // Kolom F (Total Kali Setor)
       break;
    }
  }

  // 3. Hitung Total Saldo Masuk dari Transaksi
  const sheetTrx = ss.getSheetByName(CONFIG.sheetTransaksi);
  const dataT = sheetTrx.getDataRange().getValues(); 
  
  let totalMasuk = 0; 
  let riwayat = [];
  
  // Loop dari bawah (terbaru)
  for(let i=dataT.length-1; i>=1; i--){
    // Cek ID Peserta (Kolom I / index 8)
    if(String(dataT[i][8]) === String(id) && dataT[i][2] === 'MASUK') { 
      
      let nominal = Number(dataT[i][6]); // Ambil Nilai Efektif (Kolom G)
      totalMasuk += nominal;

      // Riwayat (Limit 10)
      if(riwayat.length < 10) {
        riwayat.push({
          tgl: new Date(dataT[i][1]).toLocaleDateString('id-ID'), 
          nominal: nominal,
          ket: dataT[i][7] // Keterangan
        });
      }
    }
  }
  
  // 4. LOGIKA UTAMA (PERBAIKAN)
  // Hitung "Tercapai" berdasarkan Uang, BUKAN jumlah baris
  let tercapai = 0;
  if(hargaPerSetor > 0) {
    tercapai = Math.floor(totalMasuk / hargaPerSetor);
  } else {
    tercapai = 0; // Jaga-jaga jika harga 0/error
  }

  let sisaAngsuran = targetTotal - tercapai;
  if(sisaAngsuran < 0) sisaAngsuran = 0; // Jangan sampai minus

  // Masukkan data ke object response
  info.saldo = totalMasuk; 
  info.sisa_angsuran = sisaAngsuran;
  info.progress_text = `${tercapai} dari ${targetTotal}`;
  info.target = targetTotal; 
  info.tercapai = tercapai; // Ini yang akan membuat Kalender hijau sebanyak 10 kotak!
  info.riwayat = riwayat;
  
  return responseJSON(info);
}

function cekSaldoPeserta(id) { // Tambahan agar cek-status.html jalan
  const res = cekStatusDetail(id); // Reuse logic
  return res;
}

// ==========================================
// UPDATE 2 FUNGSI INI DI DB_Google_script.js
// ==========================================

function uploadImageToDrive(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var base64Data = data.fileData.split(",")[1];
    var blob = Utilities.newBlob(Utilities.base64Decode(base64Data), data.fileData.substring(5, data.fileData.indexOf(';')), data.fileName);
    
    // Simpan ke Folder
    var folder = DriveApp.getFolderById(CONFIG.folderGalleryID);
    var file = folder.createFile(blob);
    
    // WAJIB: Set agar bisa dilihat publik
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    // Buat Direct Link yang valid untuk HTML
    var fileUrl = "https://lh3.googleusercontent.com/d/" + file.getId(); 
    // ^ Trik pakai lh3.googleusercontent.com lebih cepat & stabil daripada drive.google.com/uc
    
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.sheetGallery);
    // Simpan ID, URL, Nama, Tanggal
    sheet.appendRow([file.getId(), fileUrl, data.fileName, new Date()]);
    
    return responseJSON({success: true, url: fileUrl});
  } catch (err) { 
    return responseJSON({error: err.toString()}); 
  }
}

function getGalleryData() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.sheetGallery);
  if (!sheet) return responseJSON([]);
  
  // Ambil semua data
  var data = sheet.getDataRange().getValues();
  var result = [];
  
  // Loop dari baris 1 (karena baris 0 itu header)
  for (var i = 1; i < data.length; i++) {
    // Kolom B (index 1) adalah URL, Kolom D (index 3) adalah Tanggal
    if(data[i][1]) {
      result.push({
        url: data[i][1],
        caption: data[i][2], // Nama File
        date: data[i][3]
      });
    }
  }
  return responseJSON(result);
}

function responseJSON(data) { return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON); }
