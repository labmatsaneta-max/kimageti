/**
 * BACKEND KBIHU KI MAGETI (v2.5 - Login Fleksibel & NIK Opsional)
 * Engine: Google Apps Script + Google Sheets
 */

function doGet(e) {
  return ContentService.createTextOutput("KBIHU KI Mageti API v2.5 Running...")
    .setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (err) {
    return respondJSON({ status: 'error', message: 'Server sibuk, silakan coba lagi.' });
  }

  try {
    const requestData = JSON.parse(e.postData.contents);
    const action = requestData.action;
    const payload = requestData.payload;

    initSheets();

    let result = {};
    switch (action) {
      case 'LOGIN':
        result = handleLogin(payload);
        break;
      case 'READ_ALL':
        result = readAllData();
        break;
      case 'READ_PUBLIC_JADWAL':
        result = readPublicJadwal();
        break;
      case 'SAVE_JAMAAH':
        result = saveData('Jamaah', payload, ['nik']);
        break;
      case 'DELETE_JAMAAH':
        result = deleteData('Jamaah', payload.nik, 0);
        break;
      case 'SAVE_BERKAS':
        result = saveData('Berkas', payload, ['nik']);
        break;
      case 'SAVE_TRANSAKSI':
        result = saveData('Pembayaran', payload, ['id_transaksi']);
        break;
      case 'SAVE_JADWAL':
        result = saveData('Jadwal', payload, ['id_jadwal']);
        break;
      case 'DELETE_JADWAL':
        result = deleteData('Jadwal', payload.id_jadwal, 0);
        break;
      case 'SAVE_SETTING':
        result = saveSetting(payload);
        break;
      default:
        result = { status: 'error', message: 'Aksi tidak valid' };
    }

    return respondJSON({ status: 'success', data: result });

  } catch (error) {
    return respondJSON({ status: 'error', message: error.toString() });
  } finally {
    lock.releaseLock();
  }
}

function respondJSON(object) {
  return ContentService.createTextOutput(JSON.stringify(object))
    .setMimeType(ContentService.MimeType.JSON);
}

function initSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const jamaahHeaders = [
    'nik', 'no_porsi', 'nama', 'nama_ayah', 'jk', 
    'tempat_lahir', 'tgl_lahir', 'usia', 'alamat', 'desa', 
    'kecamatan', 'wa', 'hp_keluarga', 'riwayat_sakit', 'pengalaman_haji', 'created_at'
  ];

  const sheets = {
    'Jamaah': jamaahHeaders,
    'Berkas': ['nik', 'ktp', 'kk', 'spph', 'paspor', 'vaksin'],
    'Pembayaran': ['id_transaksi', 'tanggal', 'nik', 'nama', 'kategori', 'jenis', 'nominal', 'keterangan'],
    'Jadwal': ['id_jadwal', 'hari', 'tanggal', 'jam', 'tempat', 'materi', 'pemateri'],
    'Setting': ['key', 'value']
  };

  for (let name in sheets) {
    let sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
      sheet.appendRow(sheets[name]);
      
      if (name === 'Setting') {
        sheet.appendRow(['admin_pass', 'admin123']);
        sheet.appendRow(['nama_kbihu', 'KBIHU KI MAGETI']);
        sheet.appendRow(['tahun', '1448 H / 2027 M']);
        sheet.appendRow(['alamat', 'Jl. Raya Magetan - Maospati, Magetan, Jawa Timur']);
        sheet.appendRow(['pimpinan', 'KH. Ahmad Mageti']);
        sheet.appendRow(['bendahara', 'Hj. Siti Aminah']);
        sheet.appendRow(['tempat_ttd', 'Magetan']);
      }
    } else if (name === 'Jamaah') {
      sheet.getRange(1, 1, 1, jamaahHeaders.length).setValues([jamaahHeaders]);
    }
  }
}

function handleLogin(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const { username, password } = payload;

  if (username === 'admin') {
    const settingSheet = ss.getSheetByName('Setting').getDataRange().getValues();
    let adminPass = 'admin123';
    settingSheet.forEach(r => {
      if (r[0] === 'admin_pass') adminPass = r[1];
    });

    if (String(password) === String(adminPass)) {
      return { role: 'admin', user: { nama: 'Administrator KBIHU', nik: 'ADMIN' } };
    } else {
      throw new Error('Password Admin Salah!');
    }
  } else {
    const jamaahSheet = ss.getSheetByName('Jamaah').getDataRange().getValues();
    if (jamaahSheet.length <= 1) throw new Error('Data Jamaah Belum Terdaftar!');

    const headers = jamaahSheet[0];
    const nikIdx = headers.indexOf('nik');
    const waIdx = headers.indexOf('wa');
    const namaIdx = headers.indexOf('nama');
    const porsiIdx = headers.indexOf('no_porsi');

    for (let i = 1; i < jamaahSheet.length; i++) {
      const row = jamaahSheet[i];
      const nik = String(row[nikIdx]);
      const wa = String(row[waIdx]);
      const porsi = porsiIdx !== -1 ? String(row[porsiIdx]) : '';

      const inputUser = String(username).trim();
      const inputPass = String(password).trim();

      const matchUser = (inputUser === nik || inputUser === wa || (porsi && inputUser === porsi));
      const matchPass = (inputPass === nik || inputPass === wa || (porsi && inputPass === porsi));

      if (matchUser && matchPass) {
        return {
          role: 'jamaah',
          user: { nik: nik, no_porsi: porsi, nama: row[namaIdx], wa: wa }
        };
      }
    }
    throw new Error('No. Porsi / No. WA / NIK tidak ditemukan!');
  }
}

function readAllData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const result = {};
  const sheetNames = ['Jamaah', 'Berkas', 'Pembayaran', 'Jadwal', 'Setting'];

  sheetNames.forEach(name => {
    const sheet = ss.getSheetByName(name);
    if (!sheet) {
      result[name] = [];
      return;
    }
    const values = sheet.getDataRange().getValues();
    if (values.length <= 1) {
      result[name] = [];
      return;
    }

    const headers = values[0];
    const rows = values.slice(1);
    result[name] = rows.map(row => {
      let obj = {};
      headers.forEach((h, i) => obj[h] = row[i]);
      return obj;
    });
  });

  return result;
}

function readPublicJadwal() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Jadwal');
  if (!sheet) return [];
  
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];

  const headers = values[0];
  const rows = values.slice(1);
  return rows.map(row => {
    let obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
}

function saveData(sheetName, item, keyFields) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  const values = sheet.getDataRange().getValues();
  const headers = values[0];

  let rowIndex = -1;
  if (values.length > 1) {
    for (let i = 1; i < values.length; i++) {
      let match = keyFields.every(kf => {
        let colIdx = headers.indexOf(kf);
        return String(values[i][colIdx]) === String(item[kf]);
      });
      if (match) {
        rowIndex = i + 1;
        break;
      }
    }
  }

  const rowData = headers.map(h => item[h] !== undefined ? item[h] : '');

  if (rowIndex > 0) {
    sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }
  return { updated: true };
}

function deleteData(sheetName, keyValue, colIndex) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  const values = sheet.getDataRange().getValues();

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][colIndex]) === String(keyValue)) {
      sheet.deleteRow(i + 1);
      return { deleted: true };
    }
  }
  return { deleted: false };
}

function saveSetting(settingObj) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Setting');
  sheet.clear();
  sheet.appendRow(['key', 'value']);

  for (let k in settingObj) {
    sheet.appendRow([k, settingObj[k]]);
  }
  return { success: true };
}
