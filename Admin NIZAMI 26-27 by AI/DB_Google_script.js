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
  folderGalleryID: '18wD2brS3QZ8-oW_zeNONyJbpYMg2NSGJvTQ-9TG0GNM' 
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
  const act = e.parameter.action;
  
  // POST HANYA UNTUK UPLOAD FILE (Karena butuh body besar)
  if(act === 'uploadImage') return uploadImageToDrive(e);

  return responseJSON({error: 'Invalid Action (POST)'});
}

// --- 2. FUNGSI UTAMA ---

function daftarPeserta(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.sheetPeserta);
  
  const urutan = sheet.getLastRow(); 
  const idPeserta = 'NZM-26-' + String(urutan).padStart(3, '0');
  
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

function tambahMitraBaru(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.sheetMitra);
  const id = 'MITRA-' + String(sheet.getLastRow()).padStart(3, '0');
  sheet.appendRow([id, data.nama, "'" + data.hp, data.alamat, 0]);
  return responseJSON({success: true});
}

function tambahPesertaBaru(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.sheetPeserta);
  const urutan = sheet.getLastRow(); 
  const idPeserta = 'NZM-26-' + String(urutan).padStart(3, '0');
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
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.sheetMitra);
  const data = sheet.getDataRange().getValues();
  let list = [];
  
  // Mulai dari baris ke-1 (skip header)
  for(let i=1; i<data.length; i++) {
    list.push({
      id: data[i][0],      // ID Mitra
      nama: data[i][1],    // Nama
      hp: data[i][2],      // HP
      alamat: data[i][3]   // Alamat
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

function getAdminStats() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetPeserta = ss.getSheetByName(CONFIG.sheetPeserta);
  const sheetTrx = ss.getSheetByName(CONFIG.sheetTransaksi);
  const totalPeserta = Math.max(0, sheetPeserta.getLastRow() - 1);
  const dataTrx = sheetTrx.getDataRange().getValues();
  let totalUang = 0; let trxHariIni = 0; const todayStr = new Date().toDateString();
  for(let i=1; i<dataTrx.length; i++){
    if(dataTrx[i][2] === 'MASUK') {
      totalUang += Number(dataTrx[i][4] || 0);
      if(new Date(dataTrx[i][1]).toDateString() === todayStr) trxHariIni++;
    }
  }
  return responseJSON({peserta: totalPeserta, uang: totalUang, trxToday: trxHariIni});
}

// --- GANTI FUNGSI cariPeserta DI FILE DB_Google_script.js ---

// --- UPDATE FUNGSI INI DI DB_Google_script.js ---

// --- UPDATE FUNGSI INI DI DB_Google_script.js ---

function cariPeserta(query) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetPeserta = ss.getSheetByName(CONFIG.sheetPeserta);
  const sheetTrx = ss.getSheetByName(CONFIG.sheetTransaksi);
  
  const dataPeserta = sheetPeserta.getDataRange().getValues();
  const dataTrx = sheetTrx.getDataRange().getValues();
  
  let hasil = [];
  const q = String(query).toLowerCase();
  
  // Cache Frekuensi Setoran agar tidak looping berulang kali (Optimasi)
  let freqMap = {};
  for(let j=1; j<dataTrx.length; j++){
    if(String(dataTrx[j][2]) === 'MASUK') {
      let idP = String(dataTrx[j][8]);
      if(!freqMap[idP]) freqMap[idP] = 0;
      freqMap[idP]++;
    }
  }

  // Loop Cari Peserta
  let countFound = 0;
  for(let i=1; i<dataPeserta.length; i++){
    let id = String(dataPeserta[i][0]);
    let nama = String(dataPeserta[i][2]).toLowerCase();
    let mitra = String(dataPeserta[i][5]).toLowerCase(); 
    
    if(nama.includes(q) || mitra.includes(q)) {
      
      // Ambil Harga dari Kolom H (Index 7)
      // Pastikan di Spreadsheet Kolom H isinya ANGKA (contoh: 5000, bukan "Rp 5.000")
      let rawHarga = dataPeserta[i][7]; 
      let harga = Number(rawHarga) || 0; 

      // Ambil Frekuensi dari Cache
      let frekuensi = freqMap[id] || 0;

      hasil.push({
        id: dataPeserta[i][0],
        nama: dataPeserta[i][2],
        mitra: dataPeserta[i][5],
        paket: dataPeserta[i][6],
        harga: harga,    
        freq: frekuensi  
      });
      
      countFound++;
      if(countFound >= 20) break; 
    }
  }
  return responseJSON(hasil);
}

function cekStatusDetail(id) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dataP = ss.getSheetByName(CONFIG.sheetPeserta).getDataRange().getValues();
  let info = null;
  for(let i=1; i<dataP.length; i++){
    if(String(dataP[i][0]) === String(id)) {
      info = {id: dataP[i][0], nama: dataP[i][2], hp: dataP[i][3], alamat: dataP[i][4], mitra: dataP[i][5], paket: dataP[i][6]};
      break;
    }
  }
  if(!info) return responseJSON({error: "Tidak ditemukan"});
  const dataT = ss.getSheetByName(CONFIG.sheetTransaksi).getDataRange().getValues();
  let totalMasuk = 0; let riwayat = [];
  for(let i=dataT.length-1; i>=1; i--){
    if(String(dataT[i][8]) === String(id)) {
      totalMasuk += Number(dataT[i][6]);
      if(riwayat.length < 5) riwayat.push({tgl: new Date(dataT[i][1]).toLocaleDateString(), nominal: dataT[i][4]});
    }
  }
  info.saldo = totalMasuk; info.riwayat = riwayat;
  return responseJSON(info);
}

function cekSaldoPeserta(id) { // Tambahan agar cek-status.html jalan
  const res = cekStatusDetail(id); // Reuse logic
  return res;
}

function uploadImageToDrive(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var base64Data = data.fileData.split(",")[1];
    var blob = Utilities.newBlob(Utilities.base64Decode(base64Data), data.fileData.substring(5, data.fileData.indexOf(';')), data.fileName);
    var folder = DriveApp.getFolderById(CONFIG.folderGalleryID);
    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    var fileUrl = "https://drive.google.com/uc?export=view&id=" + file.getId();
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.sheetGallery);
    sheet.appendRow([file.getId(), fileUrl, data.fileName, new Date()]);
    return responseJSON({success: true, url: fileUrl});
  } catch (err) { return responseJSON({error: err.toString()}); }
}

function responseJSON(data) { return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON); }