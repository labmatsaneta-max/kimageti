// Modal Global Helpers
window.openModal = function(id) {
    const el = document.getElementById(id);
    if(el) el.classList.remove('hidden');
};
window.closeModal = function(id) {
    const el = document.getElementById(id);
    if(el) el.classList.add('hidden');
};

window.openUrlConfigModal = function() {
    const currentUrl = DB.Setting.script_url || '';
    const input = document.getElementById('input-quick-url');
    if(input) input.value = currentUrl;
    openModal('modal-config-url');
};

let CurrentRole = 'jamaah';
let CurrentUser = null;

let DB = {
    Jamaah: [],
    Berkas: [],
    Pembayaran: [],
    Jadwal: [],
    Setting: {
        script_url: 'https://script.google.com/macros/s/AKfycby4jn-8gqWEC6oMNX9L0qXzCkgXOOhB7wKNjMekuO6GWoRQuueYj6lqSsm6oDDObECs/exec',
        admin_pass: 'admin123',
        nama_kbihu: 'KBIHU KI MAGETI',
        tahun: '1448 H / 2027 M',
        alamat: 'Jl. Raya Magetan - Maospati, Magetan, Jawa Timur',
        pimpinan: 'KH. Ahmad Mageti',
        bendahara: 'Hj. Siti Aminah',
        tempat_ttd: 'Magetan'
    }
};

// HELPER FORMATTER TANGGAL INDONESIA WIB (Asia/Jakarta / GMT+7)
function formatDateWIB(dateStr) {
    if (!dateStr || dateStr === '-') return '-';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) {
            const parts = dateStr.split('T')[0].split('-');
            if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
            return dateStr;
        }
        return new Intl.DateTimeFormat('id-ID', {
            timeZone: 'Asia/Jakarta',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        }).format(d).replace(/\//g, '-');
    } catch (e) {
        return dateStr;
    }
}

function formatDayNumberWIB(dateStr) {
    if (!dateStr || dateStr === '-') return '•';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) {
            const parts = dateStr.split('T')[0].split('-');
            if (parts.length === 3) return parts[2];
            return dateStr;
        }
        return new Intl.DateTimeFormat('id-ID', {
            timeZone: 'Asia/Jakarta',
            day: '2-digit'
        }).format(d);
    } catch (e) {
        return '•';
    }
}

window.addEventListener('DOMContentLoaded', () => {
    loadLocalStorage();
    checkAuthSession();
    fetchPublicJadwal();
});

function setLoginRole(role) {
    CurrentRole = role;
    const btnJamaah = document.getElementById('btn-role-jamaah');
    const btnAdmin = document.getElementById('btn-role-admin');
    const lblUser = document.getElementById('lbl-username');
    const lblPass = document.getElementById('lbl-password');
    const inpUser = document.getElementById('login-username');
    const inpPass = document.getElementById('login-password');

    if (role === 'jamaah') {
        if(btnJamaah) btnJamaah.className = 'flex-1 py-2 rounded-lg transition text-emerald-800 bg-white shadow-sm font-bold';
        if(btnAdmin) btnAdmin.className = 'flex-1 py-2 rounded-lg transition text-slate-600';
        if(lblUser) lblUser.innerText = 'NO. PORSI / NO. WA / NIK';
        if(lblPass) lblPass.innerText = 'PASSWORD (NO. PORSI / NO. WA / NIK)';
        if(inpUser) inpUser.placeholder = 'Masukkan No. Porsi / WA / NIK';
        if(inpPass) inpPass.placeholder = 'Masukkan No. Porsi / WA / NIK';
    } else {
        if(btnAdmin) btnAdmin.className = 'flex-1 py-2 rounded-lg transition text-emerald-800 bg-white shadow-sm font-bold';
        if(btnJamaah) btnJamaah.className = 'flex-1 py-2 rounded-lg transition text-slate-600';
        if(lblUser) lblUser.innerText = 'USERNAME ADMIN';
        if(lblPass) lblPass.innerText = 'PASSWORD ADMIN';
        if(inpUser) inpUser.placeholder = 'admin';
        if(inpPass) inpPass.placeholder = 'Password admin';
    }
}

function getBerkasKurangFromObj(berkasObj) {
    if (!berkasObj) return ['KTP', 'KK', 'SPPH', 'Paspor', 'Vaksin'];

    const kurang = [];
    if (berkasObj.ktp !== true && berkasObj.ktp !== 'true') kurang.push('KTP');
    if (berkasObj.kk !== true && berkasObj.kk !== 'true') kurang.push('KK');
    if (berkasObj.spph !== true && berkasObj.spph !== 'true') kurang.push('SPPH');
    if (berkasObj.paspor !== true && berkasObj.paspor !== 'true') kurang.push('Paspor');
    if (berkasObj.vaksin !== true && berkasObj.vaksin !== 'true') kurang.push('Vaksin');

    return kurang;
}

// 1. FITUR PENCARIAN PUBLIK REAL-TIME (HALAMAN DEPAN)
let publicSearchTimer = null;
function searchJamaahPublic() {
    clearTimeout(publicSearchTimer);
    const queryEl = document.getElementById('public-search-input');
    const resultsContainer = document.getElementById('public-search-results');

    if (!queryEl || !resultsContainer) return;

    const query = queryEl.value.trim();

    if (query.length < 2) {
        resultsContainer.classList.add('hidden');
        resultsContainer.innerHTML = '';
        return;
    }

    resultsContainer.classList.remove('hidden');
    resultsContainer.innerHTML = '<div class="text-center text-xs text-emerald-100 py-2 font-medium animate-pulse">🔎 Mencari data jamaah...</div>';

    publicSearchTimer = setTimeout(async () => {
        const res = await apiCall('SEARCH_JAMAAH_PUBLIC', { query });
        resultsContainer.innerHTML = '';

        if (res && res.status === 'success' && res.data && res.data.length > 0) {
            res.data.forEach(item => {
                const j = item.jamaah;
                const berkasKurang = getBerkasKurangFromObj(item.berkas);
                const berkasHtml = berkasKurang.length > 0 
                    ? `<span class="bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded border border-rose-300">Kurang: ${berkasKurang.join(', ')}</span>`
                    : `<span class="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-300">✓ Berkas Lengkap</span>`;

                const div = document.createElement('div');
                div.className = 'bg-white text-slate-800 p-3 rounded-xl shadow-sm text-xs space-y-1';
                div.innerHTML = `
                    <div class="flex justify-between items-start gap-2">
                        <div>
                            <h4 class="font-extrabold text-emerald-800 text-sm">${j.nama || j.NAMA}</h4>
                            <p class="text-[10px] text-slate-500">Porsi: <span class="font-mono font-bold text-slate-700">${j.no_porsi || j.NO_PORSI || '-'}</span> | NIK: ${j.nik && !String(j.nik).startsWith('TEMP-') ? j.nik : '-'}</p>
                        </div>
                        ${berkasHtml}
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-1 pt-1 text-[11px] text-slate-600 border-t border-slate-100">
                        <div><b>Nama Ayah:</b> ${j.nama_ayah || j.NAMA_AYAH || '-'}</div>
                        <div><b>Alamat:</b> ${j.alamat || j.ALAMAT || '-'} (Ds. ${j.desa || j.DESA || '-'}, Kec. ${j.kecamatan || j.KECAMATAN || '-'})</div>
                        <div><b>No. HP Jamaah:</b> 📱 ${j.wa || j.WA || '-'}</div>
                        <div><b>No. HP Keluarga:</b> 📞 ${j.hp_keluarga || j.HP_KELUARGA || '-'}</div>
                    </div>
                `;
                resultsContainer.appendChild(div);
            });
        } else {
            resultsContainer.innerHTML = '<div class="text-center text-xs text-emerald-100 py-2">Data jamaah tidak ditemukan.</div>';
        }
    }, 300);
}

// 2. FITUR PENCARIAN ADMIN DASHBOARD UTAMA
function searchJamaahAdminDash() {
    const inputEl = document.getElementById('admin-dash-search');
    const resultsContainer = document.getElementById('admin-dash-search-results');

    if (!inputEl || !resultsContainer) return;

    const query = inputEl.value.trim().toLowerCase();

    if (query.length < 1) {
        resultsContainer.classList.add('hidden');
        resultsContainer.innerHTML = '';
        return;
    }

    const matched = DB.Jamaah.filter(j => {
        const nama = String(j.nama || j.NAMA || '').toLowerCase();
        const porsi = String(j.no_porsi || j.NO_PORSI || '').toLowerCase();
        const wa = String(j.wa || j.WA || '').toLowerCase();
        const nik = String(j.nik || j.NIK || '').toLowerCase();
        return nama.includes(query) || porsi.includes(query) || wa.includes(query) || nik.includes(query);
    });

    resultsContainer.classList.remove('hidden');
    resultsContainer.innerHTML = '';

    if (matched.length === 0) {
        resultsContainer.innerHTML = '<div class="text-center text-xs text-slate-400 py-3">Tidak ditemukan jamaah dengan kata kunci tersebut.</div>';
        return;
    }

    matched.slice(0, 5).forEach(j => {
        const jNik = j.nik || j.NIK;
        const berkasObj = DB.Berkas.find(b => String(b.nik) === String(jNik));
        const berkasKurang = getBerkasKurangFromObj(berkasObj);
        const berkasBadge = berkasKurang.length > 0 
            ? `<span class="bg-rose-100 text-rose-700 font-bold px-2 py-0.5 rounded text-[10px] border border-rose-200">Berkas Kurang: ${berkasKurang.join(', ')}</span>`
            : `<span class="bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded text-[10px] border border-emerald-200">✓ Berkas Lengkap</span>`;

        const div = document.createElement('div');
        div.className = 'bg-slate-50 border border-slate-200 p-3.5 rounded-xl space-y-1 text-xs';
        div.innerHTML = `
            <div class="flex flex-wrap justify-between items-center gap-2">
                <div>
                    <span class="font-mono font-bold text-emerald-700">Porsi: ${j.no_porsi || j.NO_PORSI || '-'}</span>
                    <h4 class="font-bold text-slate-800 text-sm leading-tight">${j.nama || j.NAMA}</h4>
                </div>
                ${berkasBadge}
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2 text-slate-600 border-t border-slate-200/60">
                <div><b>Nama Ayah:</b> ${j.nama_ayah || j.NAMA_AYAH || '-'}</div>
                <div><b>Alamat:</b> ${j.alamat || j.ALAMAT || '-'} (Ds. ${j.desa || j.DESA || '-'}, Kec. ${j.kecamatan || j.KECAMATAN || '-'})</div>
                <div><b>No. HP Jamaah:</b> <a href="https://wa.me/${j.wa || j.WA}" target="_blank" class="text-emerald-600 font-medium">📱 ${j.wa || j.WA || '-'}</a></div>
                <div><b>No. HP Keluarga:</b> 📞 ${j.hp_keluarga || j.HP_KELUARGA || '-'}</div>
            </div>
            <div class="pt-2 flex justify-end">
                <button type="button" onclick="openModalJamaah('${jNik}')" class="text-xs bg-blue-600 text-white px-3 py-1 rounded-lg font-semibold hover:bg-blue-700">Edit Data Jamaah Ini</button>
            </div>
        `;
        resultsContainer.appendChild(div);
    });
}

// 3. FITUR PENCARIAN & FILTER REAL-TIME PADA MENU TAB JAMAAH (ADMIN)
function filterJamaahTable() {
    const input = document.getElementById('tab-jamaah-search-input');
    const filterKeyword = input ? input.value.trim().toLowerCase() : '';
    renderJamaah(filterKeyword);
}

function clearFilterJamaah() {
    const input = document.getElementById('tab-jamaah-search-input');
    if (input) input.value = '';
    renderJamaah('');
}

function hitungsUsiaOtomatis() {
    const tglLahirInput = document.getElementById('j-tgl-lahir').value;
    const inputUsia = document.getElementById('j-usia');

    if (!tglLahirInput) {
        inputUsia.value = '';
        return;
    }

    const birthDate = new Date(tglLahirInput);
    const today = new Date();

    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }

    inputUsia.value = age > 0 ? `${age} Tahun` : '0 Tahun';
}

function openModalJamaah(nik = null) {
    const form = document.getElementById('form-jamaah');
    if (!form) return;
    form.reset();

    document.getElementById('j-usia').value = '';
    document.getElementById('j-edit-original-nik').value = '';

    if (nik) {
        const j = DB.Jamaah.find(x => String(x.nik || x.NIK) === String(nik));
        if (j) {
            const jNik = j.nik || j.NIK;
            document.getElementById('modal-jamaah-title').innerText = 'Edit Data Jamaah';
            document.getElementById('j-edit-original-nik').value = jNik || '';
            document.getElementById('j-nik').value = (jNik && !String(jNik).startsWith('TEMP-')) ? jNik : '';
            document.getElementById('j-porsi').value = j.no_porsi || j.NO_PORSI || '';
            document.getElementById('j-nama').value = j.nama || j.NAMA || '';
            document.getElementById('j-nama-ayah').value = j.nama_ayah || j.NAMA_AYAH || '';
            document.getElementById('j-jk').value = j.jk || j.JK || 'L';
            document.getElementById('j-tempat-lahir').value = j.tempat_lahir || j.TEMPAT_LAHIR || '';
            document.getElementById('j-tgl-lahir').value = j.tgl_lahir || j.TGL_LAHIR || '';
            document.getElementById('j-usia').value = j.usia || j.USIA || '';
            document.getElementById('j-desa').value = j.desa || j.DESA || '';
            document.getElementById('j-kecamatan').value = j.kecamatan || j.KECAMATAN || '';
            document.getElementById('j-alamat').value = j.alamat || j.ALAMAT || '';
            document.getElementById('j-wa').value = j.wa || j.WA || '';
            document.getElementById('j-hp-keluarga').value = j.hp_keluarga || j.HP_KELUARGA || '';
            document.getElementById('j-riwayat-sakit').value = j.riwayat_sakit || j.RIWAYAT_SAKIT || '';
            document.getElementById('j-pengalaman-haji').value = j.pengalaman_haji || j.PENGALAMAN_HAJI || 'Belum Pernah';

            if ((j.tgl_lahir || j.TGL_LAHIR) && !(j.usia || j.USIA)) hitungsUsiaOtomatis();
        }
    } else {
        document.getElementById('modal-jamaah-title').innerText = 'Tambah Data Jamaah';
    }

    openModal('modal-jamaah');
}

function downloadExcelTemplate() {
    const templateData = [
        {
            nik: "3520123456780001",
            no_porsi: "1300123456",
            nama: "Ahmad Mujtaba",
            nama_ayah: "Hasan Bisri",
            jk: "L",
            tempat_lahir: "Magetan",
            tgl_lahir: "1980-05-12",
            usia: "46 Tahun",
            alamat: "Jl. Pemuda No. 12 RT 02 RW 01",
            desa: "Selosari",
            kecamatan: "Magetan",
            wa: "6281234567890",
            hp_keluarga: "6281987654321",
            riwayat_sakit: "Hipertensi",
            pengalaman_haji: "Belum Pernah"
        }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template_Jamaah");
    XLSX.writeFile(wb, "Template_Import_Jamaah_KBIHU.xlsx");
}

function importJamaahExcel(e) {
    const file = e.target.files[0];
    if (!file) return;

    Swal.fire({ title: 'Membaca File Excel...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    const reader = new FileReader();
    reader.onload = async function(evt) {
        try {
            const data = new Uint8Array(evt.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            
            const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '-' });

            if (!rows || rows.length === 0) {
                Swal.fire('Gagal Import', 'File Excel kosong atau format tidak sesuai.', 'error');
                return;
            }

            let countSuccess = 0;

            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];

                const findVal = (keys) => {
                    for (let k of keys) {
                        const foundKey = Object.keys(row).find(rk => rk.trim().toLowerCase() === k.toLowerCase());
                        if (foundKey && row[foundKey] !== undefined && row[foundKey] !== null) {
                            return String(row[foundKey]).trim();
                        }
                    }
                    return '';
                };

                const nama = findVal(['nama', 'nama_jamaah', 'nama jamaah']);
                let nik = findVal(['nik']);
                let noPorsi = findVal(['no_porsi', 'noporsi', 'no porsi']);

                if (nama || nik || noPorsi) {
                    if (!nik || nik === '-') {
                        nik = 'TEMP-' + Date.now() + '-' + i;
                    }

                    const payload = {
                        nik: nik,
                        no_porsi: noPorsi || '-',
                        nama: nama || 'Jamaah Baru',
                        nama_ayah: findVal(['nama_ayah', 'nama ayah', 'ayah']) || '-',
                        jk: (findVal(['jk', 'l/p', 'jenis_kelamin']).toUpperCase().includes('P')) ? 'P' : 'L',
                        tempat_lahir: findVal(['tempat_lahir', 'tempat lahir']) || '-',
                        tgl_lahir: findVal(['tgl_lahir', 'tgl lahir', 'ttl']) || '',
                        usia: findVal(['usia']) || '-',
                        alamat: findVal(['alamat']) || '-',
                        desa: findVal(['desa', 'kelurahan']) || '-',
                        kecamatan: findVal(['kecamatan', 'kec']) || '-',
                        wa: findVal(['wa', 'no_hp', 'hp', 'whatsapp']) || '-',
                        hp_keluarga: findVal(['hp_keluarga', 'no_hp_keluarga']) || '-',
                        riwayat_sakit: findVal(['riwayat_sakit', 'sakit']) || '-',
                        pengalaman_haji: findVal(['pengalaman_haji', 'pengalaman']) || 'Belum Pernah',
                        created_at: new Date().toISOString()
                    };

                    const idx = DB.Jamaah.findIndex(x => String(x.nik || x.NIK) === String(payload.nik));
                    if (idx >= 0) DB.Jamaah[idx] = payload;
                    else DB.Jamaah.push(payload);

                    await apiCall('SAVE_JAMAAH', payload);
                    countSuccess++;
                }
            }

            saveLocalStorage();
            filterJamaahTable();
            e.target.value = '';
            Swal.fire('Import Berhasil', `${countSuccess} data jamaah berhasil diimport & tersimpan!`, 'success');

        } catch (err) {
            console.error(err);
            Swal.fire('Gagal Import', 'Terjadi kesalahan saat memproses file Excel.', 'error');
        }
    };
    reader.readAsArrayBuffer(file);
}

async function fetchPublicJadwal() {
    const container = document.getElementById('public-jadwal-list');
    if (!container) return;

    if (DB.Jadwal && DB.Jadwal.length > 0) {
        renderPublicJadwalList(DB.Jadwal);
    } else if (DB.Setting.script_url) {
        const res = await apiCall('READ_PUBLIC_JADWAL');
        if (res && res.status === 'success' && res.data) {
            DB.Jadwal = res.data;
            renderPublicJadwalList(DB.Jadwal);
        } else {
            container.innerHTML = '<div class="text-center text-xs text-slate-400 py-3">Belum ada agenda jadwal manasik.</div>';
        }
    }
}

function renderPublicJadwalList(list) {
    const container = document.getElementById('public-jadwal-list');
    if (!container) return;
    container.innerHTML = '';

    if (!list || list.length === 0) {
        container.innerHTML = '<div class="text-center text-xs text-slate-400 py-3">Belum ada agenda jadwal manasik.</div>';
        return;
    }

    const topJadwal = list.slice(0, 3);
    topJadwal.forEach(j => {
        const dayNum = formatDayNumberWIB(j.tanggal);
        const div = document.createElement('div');
        div.className = 'p-3 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center gap-3';
        div.innerHTML = `
            <div class="bg-emerald-100 text-emerald-800 font-bold p-2 rounded-lg text-center min-w-[48px] shrink-0">
                <span class="block text-[10px] uppercase">${j.hari || 'JDW'}</span>
                <span class="text-xs font-extrabold leading-none">${dayNum}</span>
            </div>
            <div class="min-w-0">
                <h3 class="text-xs sm:text-sm font-semibold text-slate-800 truncate">${j.materi}</h3>
                <p class="text-[11px] text-slate-500 mt-0.5 truncate">📍 ${j.tempat} • ⏰ ${j.jam}</p>
            </div>
        `;
        container.appendChild(div);
    });
}

async function processLogin(e) {
    e.preventDefault();
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value.trim();

    if (!DB.Setting.script_url) {
        Swal.fire({
            title: 'URL Belum Ditentukan',
            text: 'Silakan atur URL Google Apps Script terlebih dahulu.',
            icon: 'warning',
            confirmButtonText: 'Atur URL Sekarang'
        }).then(() => {
            openUrlConfigModal();
        });
        return;
    }

    Swal.fire({ title: 'Verifikasi Login...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    const res = await apiCall('LOGIN', { username, password });
    if (res && res.status === 'success') {
        CurrentUser = res.data.user;
        CurrentRole = res.data.role;

        localStorage.setItem('KBIHU_AUTH', JSON.stringify({ role: CurrentRole, user: CurrentUser }));
        
        Swal.fire({ icon: 'success', title: 'Login Berhasil', text: `Selamat datang, ${CurrentUser.nama}`, timer: 1500, showConfirmButton: false });
        
        await syncData();
        showMainApp();
    } else {
        Swal.fire('Gagal Login', res ? res.message : 'Gagal memverifikasi akun.', 'error');
    }
}

function checkAuthSession() {
    const session = localStorage.getItem('KBIHU_AUTH');
    if (session) {
        try {
            const parsed = JSON.parse(session);
            CurrentRole = parsed.role;
            CurrentUser = parsed.user;
            showMainApp();
            syncData();
            return;
        } catch(e){}
    }
    showLoginView();
}

function processLogout() {
    localStorage.removeItem('KBIHU_AUTH');
    CurrentUser = null;
    showLoginView();
}

function showLoginView() {
    document.getElementById('view-login').classList.remove('hidden');
    document.getElementById('view-app').classList.add('hidden');
    fetchPublicJadwal();
}

function showMainApp() {
    document.getElementById('view-login').classList.add('hidden');
    document.getElementById('view-app').classList.remove('hidden');

    const badgeRole = document.getElementById('user-badge-role');
    if(badgeRole) badgeRole.innerText = CurrentRole === 'admin' ? '🔑 Admin' : '👥 Jamaah';

    document.querySelectorAll('.admin-only').forEach(el => {
        if (CurrentRole === 'admin') el.classList.remove('hidden');
        else el.classList.add('hidden');
    });

    const headerTitle = document.getElementById('app-header-title');
    const headerSub = document.getElementById('app-header-subtitle');

    if(headerTitle) headerTitle.innerText = DB.Setting.nama_kbihu || 'KBIHU KI MAGETI';
    if(headerSub) headerSub.innerText = 'Tahun ' + (DB.Setting.tahun || '1448 H / 2027 M');

    if (CurrentRole === 'jamaah') {
        const lblKas = document.getElementById('dash-stat-kas-label');
        const navPemb = document.getElementById('nav-pembayaran-title');
        const tblPemb = document.getElementById('pembayaran-table-title');
        if(lblKas) lblKas.innerText = 'TOTAL PEMBAYARAN SAYA';
        if(navPemb) navPemb.innerText = '💳 Riwayat Pembayaran';
        if(tblPemb) tblPemb.innerText = 'Catatan Pembayaran Anda';
    } else {
        const lblKas = document.getElementById('dash-stat-kas-label');
        const navPemb = document.getElementById('nav-pembayaran-title');
        const tblPemb = document.getElementById('pembayaran-table-title');
        if(lblKas) lblKas.innerText = 'TOTAL SISA KAS KBIHU';
        if(navPemb) navPemb.innerText = '💰 Kas & Pembayaran';
        if(tblPemb) tblPemb.innerText = 'Riwayat Transaksi Keuangan';
    }

    renderAll();
}

async function apiCall(action, payload = {}) {
    const url = DB.Setting.script_url;
    if (!url) return null;

    try {
        const res = await fetch(url, {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({ action, payload })
        });
        return await res.json();
    } catch (err) {
        console.error(err);
        return null;
    }
}

async function syncData() {
    const icon = document.getElementById('sync-icon');
    if(icon) icon.classList.add('animate-spin');

    const res = await apiCall('READ_ALL');
    if(icon) icon.classList.remove('animate-spin');

    if (res && res.status === 'success') {
        const data = res.data;
        DB.Jamaah = data.Jamaah || [];
        DB.Berkas = data.Berkas || [];
        DB.Pembayaran = data.Pembayaran || [];
        DB.Jadwal = data.Jadwal || [];

        if (data.Setting) {
            data.Setting.forEach(s => { if (s.key) DB.Setting[s.key] = s.value; });
        }

        saveLocalStorage();
        renderAll();
    }
}

function saveLocalStorage() {
    localStorage.setItem('KBIHU_DB', JSON.stringify(DB));
}

function loadLocalStorage() {
    const data = localStorage.getItem('KBIHU_DB');
    if (data) {
        try { DB = JSON.parse(data); } catch(e){}
    }
    const cfgUrl = document.getElementById('cfg-script-url');
    const cfgNama = document.getElementById('cfg-nama-kbihu');
    const cfgThn = document.getElementById('cfg-tahun');
    const cfgAlamat = document.getElementById('cfg-alamat');
    const cfgPim = document.getElementById('cfg-pimpinan');
    const cfgBen = document.getElementById('cfg-bendahara');
    const cfgTtd = document.getElementById('cfg-tempat-ttd');
    const titleKbihu = document.getElementById('login-title-kbihu');

    if(cfgUrl) cfgUrl.value = DB.Setting.script_url || '';
    if(cfgNama) cfgNama.value = DB.Setting.nama_kbihu || 'KBIHU KI MAGETI';
    if(cfgThn) cfgThn.value = DB.Setting.tahun || '1448 H / 2027 M';
    if(cfgAlamat) cfgAlamat.value = DB.Setting.alamat || '';
    if(cfgPim) cfgPim.value = DB.Setting.pimpinan || '';
    if(cfgBen) cfgBen.value = DB.Setting.bendahara || '';
    if(cfgTtd) cfgTtd.value = DB.Setting.tempat_ttd || 'Magetan';
    if(titleKbihu) titleKbihu.innerText = DB.Setting.nama_kbihu || 'KBIHU KI MAGETI';
}

function saveQuickUrl() {
    const url = document.getElementById('input-quick-url').value.trim();
    if (url) {
        DB.Setting.script_url = url;
        saveLocalStorage();
        closeModal('modal-config-url');
        Swal.fire('Tersimpan', 'URL Apps Script berhasil dikonfigurasi.', 'success');
        fetchPublicJadwal();
    } else {
        Swal.fire('Peringatan', 'Harap masukkan URL yang valid.', 'warning');
    }
}

function resetLocalData() {
    Swal.fire({
        title: 'Reset Data Lokal?',
        text: "Data lokal di browser akan dikosongkan.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Ya, Reset'
    }).then((result) => {
        if (result.isConfirmed) {
            localStorage.removeItem('KBIHU_DB');
            localStorage.removeItem('KBIHU_AUTH');
            location.reload();
        }
    });
}

function switchTab(tabId, btn) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.nav-btn').forEach(el => {
        el.classList.remove('active', 'border-b-2', 'border-emerald-400', 'text-white');
        el.classList.add('text-emerald-200');
    });

    const targetTab = document.getElementById('tab-' + tabId);
    if(targetTab) targetTab.classList.remove('hidden');

    if(btn) {
        btn.classList.add('active', 'border-b-2', 'border-emerald-400', 'text-white');
        btn.classList.remove('text-emerald-200');
    }
}

function renderAll() {
    renderDashboard();
    filterJamaahTable(); // Menjaga filter kata kunci yang sedang diketik
    renderBerkas();
    renderPembayaran();
    renderJadwal();
}

function renderDashboard() {
    if (!CurrentUser) return;

    const welcomeUser = document.getElementById('dash-welcome-user');
    const statJamaah = document.getElementById('dash-stat-jamaah');
    const statJadwal = document.getElementById('dash-stat-jadwal');
    const statKas = document.getElementById('dash-stat-kas');

    if(welcomeUser) welcomeUser.innerText = `Selamat Datang, ${CurrentUser.nama}`;
    if(statJamaah) statJamaah.innerText = `${DB.Jamaah.length} Jamaah`;
    if(statJadwal) statJadwal.innerText = `${DB.Jadwal.length} Agenda`;

    if (CurrentRole === 'jamaah') {
        let totalBayarJamaah = 0;
        DB.Pembayaran.forEach(p => {
            const pNik = p.nik || p.NIK;
            const uNik = CurrentUser.nik || CurrentUser.NIK;
            if (String(pNik) === String(uNik) && p.jenis === 'Masuk') {
                totalBayarJamaah += parseFloat(p.nominal) || 0;
            }
        });
        if(statKas) statKas.innerText = 'Rp ' + totalBayarJamaah.toLocaleString('id-ID');
    } else {
        let mas = 0, kel = 0;
        DB.Pembayaran.forEach(p => {
            if (p.jenis === 'Masuk') mas += parseFloat(p.nominal) || 0;
            if (p.jenis === 'Keluar') kel += parseFloat(p.nominal) || 0;
        });
        if(statKas) statKas.innerText = 'Rp ' + (mas - kel).toLocaleString('id-ID');
    }

    const container = document.getElementById('dash-jadwal-container');
    if (!container) return;
    container.innerHTML = '';

    if (DB.Jadwal.length === 0) {
        container.innerHTML = '<div class="col-span-2 text-center text-slate-400 text-xs sm:text-sm py-4">Belum ada agenda manasik terdekat.</div>';
        return;
    }

    const topJadwal = DB.Jadwal.slice(0, 2);
    topJadwal.forEach(j => {
        const div = document.createElement('div');
        div.className = 'p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 space-y-1';
        div.innerHTML = `
            <div class="flex justify-between items-center text-xs font-bold text-emerald-800">
                <span>📅 ${j.hari}, ${formatDateWIB(j.tanggal)}</span>
                <span class="bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-md text-[10px]">${j.jam}</span>
            </div>
            <h4 class="font-bold text-slate-800 text-sm sm:text-base mt-1">${j.materi}</h4>
            <p class="text-xs text-slate-600">📍 Tempat: ${j.tempat}</p>
            <p class="text-xs text-slate-600">👤 Pemateri: ${j.pemateri}</p>
        `;
        container.appendChild(div);
    });
}

// RENDER TABEL JAMAAH (SERBA AMAN & PERSISI FITUR PENCARIAN)
function renderJamaah(filterKeyword = '') {
    const tbody = document.getElementById('table-jamaah-body');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (!DB.Jamaah || DB.Jamaah.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="p-4 text-center text-slate-400">Belum ada data jamaah.</td></tr>';
        return;
    }

    let list = DB.Jamaah;

    // Filter langsung
    if (filterKeyword) {
        const q = filterKeyword.toLowerCase();
        list = list.filter(j => {
            const nama = String(j.nama || j.NAMA || '').toLowerCase();
            const porsi = String(j.no_porsi || j.NO_PORSI || '').toLowerCase();
            const wa = String(j.wa || j.WA || '').toLowerCase();
            const nik = String(j.nik || j.NIK || '').toLowerCase();
            const ayah = String(j.nama_ayah || j.NAMA_AYAH || '').toLowerCase();
            const desa = String(j.desa || j.DESA || '').toLowerCase();
            const kec = String(j.kecamatan || j.KECAMATAN || '').toLowerCase();

            return nama.includes(q) || porsi.includes(q) || wa.includes(q) || nik.includes(q) || ayah.includes(q) || desa.includes(q) || kec.includes(q);
        });
    }

    if (list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="p-4 text-center text-rose-500 font-semibold bg-rose-50/50 py-6">⚠️ Data jamaah dengan kata kunci "' + filterKeyword + '" tidak ditemukan.</td></tr>';
        return;
    }

    list.forEach(j => {
        const nik = j.nik || j.NIK || '-';
        const displayNik = (String(nik).startsWith('TEMP-')) ? 'Belum Ada NIK' : nik;
        const noPorsi = j.no_porsi || j.NO_PORSI || '-';
        const nama = j.nama || j.NAMA || '-';
        const namaAyah = j.nama_ayah || j.NAMA_AYAH || '-';
        const jk = j.jk || j.JK || 'L';
        const ttl = ((j.tempat_lahir || j.TEMPAT_LAHIR) ? (j.tempat_lahir || j.TEMPAT_LAHIR) + ', ' : '') + (formatDateWIB(j.tgl_lahir || j.TGL_LAHIR) || '-');
        const usia = j.usia || j.USIA || '-';
        const alamat = j.alamat || j.ALAMAT || '-';
        const desa = j.desa || j.DESA || '-';
        const kecamatan = j.kecamatan || j.KECAMATAN || '-';
        const wa = j.wa || j.WA || '-';
        const hpKel = j.hp_keluarga || j.HP_KELUARGA || '-';
        const riwayatSakit = j.riwayat_sakit || j.RIWAYAT_SAKIT || '-';
        const pengalamanHaji = j.pengalaman_haji || j.PENGALAMAN_HAJI || 'Belum Pernah';

        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50 transition border-b border-slate-100';
        tr.innerHTML = `
            <td class="p-3 sm:p-4 font-mono text-emerald-700 font-bold">${noPorsi}</td>
            <td class="p-3 sm:p-4 font-bold text-slate-800">
                ${nama}<br>
                <span class="text-[10px] text-slate-400 font-normal">NIK: ${displayNik}</span>
            </td>
            <td class="p-3 sm:p-4 text-slate-700">${namaAyah}</td>
            <td class="p-3 sm:p-4"><span class="px-2 py-0.5 rounded text-[10px] sm:text-xs font-bold ${jk==='L'?'bg-blue-100 text-blue-700':'bg-pink-100 text-pink-700'}">${jk}</span></td>
            <td class="p-3 sm:p-4">
                <span class="text-slate-700">${ttl}</span><br>
                <span class="text-[10px] font-bold text-emerald-600">${usia}</span>
            </td>
            <td class="p-3 sm:p-4">
                <span class="text-slate-800">${alamat}</span><br>
                <span class="text-[10px] text-slate-400">Ds. ${desa}, Kec. ${kecamatan}</span>
            </td>
            <td class="p-3 sm:p-4">
                <a href="https://wa.me/${wa}" target="_blank" class="text-emerald-600 font-medium block">📱 HP: ${wa}</a>
                <span class="text-[10px] text-slate-400">Kel: ${hpKel}</span>
            </td>
            <td class="p-3 sm:p-4 text-xs ${riwayatSakit!=='-'?'text-amber-700 font-semibold':''}">${riwayatSakit}</td>
            <td class="p-3 sm:p-4 text-xs"><span class="px-2 py-0.5 rounded ${pengalamanHaji==='Sudah Pernah'?'bg-emerald-100 text-emerald-800':'bg-slate-100 text-slate-600'}">${pengalamanHaji}</span></td>
            <td class="p-3 sm:p-4 text-center space-x-1">
                <button type="button" onclick="openModalJamaah('${nik}')" class="text-blue-600 hover:text-blue-800 font-semibold text-xs bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">✏️ Edit Cepat</button>
                <button type="button" onclick="deleteJamaah('${nik}')" class="text-rose-600 hover:text-rose-800 font-semibold text-xs bg-rose-50 px-2 py-1 rounded-md">Hapus</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function renderBerkas() {
    const tbody = document.getElementById('table-berkas-body');
    if(!tbody) return;
    tbody.innerHTML = '';

    let list = DB.Jamaah;
    if (CurrentRole === 'jamaah' && CurrentUser) {
        list = DB.Jamaah.filter(j => String(j.nik || j.NIK) === String(CurrentUser.nik || CurrentUser.NIK));
    }

    if (list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="p-4 text-center text-slate-400">Data berkas tidak ditemukan.</td></tr>';
        return;
    }

    list.forEach(j => {
        const jNik = j.nik || j.NIK;
        const b = DB.Berkas.find(item => String(item.nik) === String(jNik)) || {
            ktp: false, kk: false, spph: false, paspor: false, vaksin: false
        };

        const displayNik = (jNik && !String(jNik).startsWith('TEMP-')) ? jNik : 'Belum ada NIK';

        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50 border-b border-slate-100';
        tr.innerHTML = `
            <td class="p-3 sm:p-4 font-semibold text-slate-800">
                ${j.nama || j.NAMA}<br>
                <span class="text-xs text-slate-400 font-normal">NIK: ${displayNik} | Porsi: ${j.no_porsi || j.NO_PORSI || '-'}</span>
            </td>
            ${renderBerkasStatus(jNik, 'ktp', b.ktp)}
            ${renderBerkasStatus(jNik, 'kk', b.kk)}
            ${renderBerkasStatus(jNik, 'spph', b.spph)}
            ${renderBerkasStatus(jNik, 'paspor', b.paspor)}
            ${renderBerkasStatus(jNik, 'vaksin', b.vaksin)}
            <td class="p-3 sm:p-4 text-center admin-only">
                <button type="button" onclick="toggleAllBerkas('${jNik}')" class="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1 rounded hover:bg-emerald-100">Set Lengkap</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function renderBerkasStatus(nik, field, status) {
    const isDone = status === true || status === 'true';
    return `
        <td class="p-3 sm:p-4 text-center ${CurrentRole==='admin'?'cursor-pointer':''}" onclick="${CurrentRole==='admin'?`toggleBerkas('${nik}', '${field}', ${!isDone})`:''}">
            <span class="inline-block w-6 h-6 rounded-full text-xs leading-6 ${isDone ? 'bg-emerald-100 text-emerald-600 font-bold' : 'bg-slate-100 text-slate-300'}">
                ${isDone ? '✓' : '✗'}
            </span>
        </td>
    `;
}

async function toggleBerkas(nik, field, newValue) {
    if (CurrentRole !== 'admin') return;
    let berkasObj = DB.Berkas.find(b => String(b.nik) === String(nik));
    if (!berkasObj) {
        berkasObj = { nik: nik, ktp: false, kk: false, spph: false, paspor: false, vaksin: false };
        DB.Berkas.push(berkasObj);
    }
    berkasObj[field] = newValue;
    saveLocalStorage();
    renderBerkas();
    await apiCall('SAVE_BERKAS', berkasObj);
}

async function toggleAllBerkas(nik) {
    if (CurrentRole !== 'admin') return;
    let berkasObj = DB.Berkas.find(b => String(b.nik) === String(nik));
    if (!berkasObj) {
        berkasObj = { nik: nik };
        DB.Berkas.push(berkasObj);
    }
    berkasObj.ktp = true; berkasObj.kk = true; berkasObj.spph = true; berkasObj.paspor = true; berkasObj.vaksin = true;
    saveLocalStorage();
    renderBerkas();
    await apiCall('SAVE_BERKAS', berkasObj);
}

function renderPembayaran() {
    const tbody = document.getElementById('table-transaksi-body');
    if(!tbody) return;
    tbody.innerHTML = '';

    let totalMasuk = 0, totalKeluar = 0;

    let list = DB.Pembayaran;
    if (CurrentRole === 'jamaah' && CurrentUser) {
        list = DB.Pembayaran.filter(t => String(t.nik) === String(CurrentUser.nik || CurrentUser.NIK));
    }

    DB.Pembayaran.forEach(t => {
        const nominal = parseFloat(t.nominal) || 0;
        if (t.jenis === 'Masuk') totalMasuk += nominal;
        if (t.jenis === 'Keluar') totalKeluar += nominal;
    });

    if (list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="p-4 text-center text-slate-400">Belum ada riwayat transaksi.</td></tr>';
        return;
    }

    list.forEach(t => {
        const nominal = parseFloat(t.nominal) || 0;
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50 border-b border-slate-100';
        tr.innerHTML = `
            <td class="p-3 sm:p-4">
                <span class="font-mono text-[11px] sm:text-xs font-semibold text-slate-500">${t.id_transaksi}</span>
                <div class="text-[10px] sm:text-xs text-slate-400">${formatDateWIB(t.tanggal)}</div>
            </td>
            <td class="p-3 sm:p-4"><span class="px-2 py-0.5 rounded text-[10px] sm:text-xs font-semibold ${t.jenis==='Masuk'?'bg-emerald-100 text-emerald-700':'bg-rose-100 text-rose-700'}">${t.kategori}</span></td>
            <td class="p-3 sm:p-4 font-medium text-slate-800">${t.nama || '-'}</td>
            <td class="p-3 sm:p-4 font-semibold ${t.jenis==='Masuk'?'text-emerald-600':'text-rose-600'}">
                ${t.jenis==='Masuk'?'+':'-'} Rp ${nominal.toLocaleString('id-ID')}
            </td>
            <td class="p-3 sm:p-4 text-xs text-slate-500">${t.keterangan || '-'}</td>
            <td class="p-3 sm:p-4 text-center">
                ${t.jenis==='Masuk' ? `<button type="button" onclick="cetakKuitansi('${t.id_transaksi}')" class="bg-slate-100 hover:bg-slate-200 border text-slate-700 px-2.5 py-1 rounded text-xs font-semibold">Kuitansi (A5)</button>` : '-'}
            </td>
        `;
        tbody.appendChild(tr);
    });

    const dMasuk = document.getElementById('dash-pemasukan');
    const dKeluar = document.getElementById('dash-pengeluaran');
    const dSisa = document.getElementById('dash-sisa');

    if(dMasuk) dMasuk.innerText = 'Rp ' + totalMasuk.toLocaleString('id-ID');
    if(dKeluar) dKeluar.innerText = 'Rp ' + totalKeluar.toLocaleString('id-ID');
    if(dSisa) dSisa.innerText = 'Rp ' + (totalMasuk - totalKeluar).toLocaleString('id-ID');
}

function renderJadwal() {
    const container = document.getElementById('jadwal-cards-container');
    if(!container) return;
    container.innerHTML = '';

    if (DB.Jadwal.length === 0) {
        container.innerHTML = '<div class="col-span-2 text-center p-8 bg-white rounded-2xl text-slate-400 text-xs sm:text-sm">Belum ada agenda jadwal manasik.</div>';
        return;
    }

    DB.Jadwal.forEach(j => {
        const card = document.createElement('div');
        card.className = 'bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-200 space-y-3 relative';
        card.innerHTML = `
            <div class="flex justify-between items-start border-b pb-2">
                <div>
                    <span class="text-xs font-bold text-emerald-600 uppercase tracking-wider">${j.hari}, ${formatDateWIB(j.tanggal)}</span>
                    <h4 class="text-base sm:text-lg font-bold text-slate-800 mt-0.5">${j.materi}</h4>
                </div>
                ${CurrentRole==='admin'? `<button type="button" onclick="deleteJadwal('${j.id_jadwal}')" class="text-rose-500 hover:text-rose-700 text-xs font-bold">Hapus</button>` : ''}
            </div>
            <div class="space-y-1 text-xs sm:text-sm text-slate-600">
                <div class="flex items-center gap-2">🕒 <span>${j.jam}</span></div>
                <div class="flex items-center gap-2">📍 <span>${j.tempat}</span></div>
                <div class="flex items-center gap-2">👤 <span class="font-medium text-slate-700">Pemateri: ${j.pemateri}</span></div>
            </div>
        `;
        container.appendChild(card);
    });
}

async function submitJamaah(e) {
    e.preventDefault();
    const originalNik = document.getElementById('j-edit-original-nik').value;
    let inputNik = document.getElementById('j-nik').value.trim();

    if (!inputNik) {
        inputNik = originalNik || ('TEMP-' + Date.now());
    }

    const payload = {
        nik: inputNik,
        no_porsi: document.getElementById('j-porsi').value || '-',
        nama: document.getElementById('j-nama').value,
        nama_ayah: document.getElementById('j-nama-ayah').value || '-',
        jk: document.getElementById('j-jk').value,
        tempat_lahir: document.getElementById('j-tempat-lahir').value || '-',
        tgl_lahir: document.getElementById('j-tgl-lahir').value || '',
        usia: document.getElementById('j-usia').value || '-',
        alamat: document.getElementById('j-alamat').value || '-',
        desa: document.getElementById('j-desa').value || '-',
        kecamatan: document.getElementById('j-kecamatan').value || '-',
        wa: document.getElementById('j-wa').value || '-',
        hp_keluarga: document.getElementById('j-hp-keluarga').value || '-',
        riwayat_sakit: document.getElementById('j-riwayat-sakit').value || '-',
        pengalaman_haji: document.getElementById('j-pengalaman-haji').value || 'Belum Pernah',
        created_at: new Date().toISOString()
    };

    if (originalNik && originalNik !== payload.nik) {
        DB.Jamaah = DB.Jamaah.filter(x => String(x.nik || x.NIK) !== String(originalNik));
    }

    const idx = DB.Jamaah.findIndex(x => String(x.nik || x.NIK) === String(payload.nik));
    if (idx >= 0) DB.Jamaah[idx] = payload;
    else DB.Jamaah.push(payload);

    saveLocalStorage();
    filterJamaahTable();
    closeModal('modal-jamaah');

    Swal.fire({ title: 'Menyimpan...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    await apiCall('SAVE_JAMAAH', payload);
    Swal.fire('Tersimpan', 'Data jamaah berhasil diperbarui.', 'success');
}

async function deleteJamaah(nik) {
    Swal.fire({
        title: 'Hapus Jamaah?',
        text: "Data jamaah akan dihapus permanen.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Hapus'
    }).then(async (result) => {
        if (result.isConfirmed) {
            DB.Jamaah = DB.Jamaah.filter(x => String(x.nik || x.NIK) !== String(nik));
            saveLocalStorage();
            filterJamaahTable();
            await apiCall('DELETE_JAMAAH', { nik });
            Swal.fire('Terhapus', 'Data jamaah berhasil dihapus.', 'success');
        }
    });
}

function openModalBayar(kategori) {
    document.getElementById('t-kategori').value = kategori;
    document.getElementById('modal-transaksi-title').innerText = 'Entri ' + kategori;
    
    const selectContainer = document.getElementById('container-select-jamaah');
    const selectJamaah = document.getElementById('t-nik');

    if (kategori === 'Pengeluaran') {
        selectContainer.classList.add('hidden');
        selectJamaah.removeAttribute('required');
    } else {
        selectContainer.classList.remove('hidden');
        selectJamaah.setAttribute('required', 'required');
        selectJamaah.innerHTML = '<option value="">-- Pilih Jamaah --</option>';
        DB.Jamaah.forEach(j => {
            const jNik = j.nik || j.NIK;
            selectJamaah.innerHTML += `<option value="${jNik}">${j.nama || j.NAMA} (Porsi: ${j.no_porsi || j.NO_PORSI || '-'})</option>`;
        });
    }

    openModal('modal-transaksi');
}

function updateNamaJamaah() {
    const nik = document.getElementById('t-nik').value;
    const jamaah = DB.Jamaah.find(j => String(j.nik || j.NIK) === String(nik));
    document.getElementById('t-nama').value = jamaah ? (jamaah.nama || jamaah.NAMA) : '';
}

async function submitTransaksi(e) {
    e.preventDefault();
    const kategori = document.getElementById('t-kategori').value;
    const jenis = kategori === 'Pengeluaran' ? 'Keluar' : 'Masuk';
    
    const today = new Date();
    const wibFormattedDate = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Jakarta' }).format(today);

    const payload = {
        id_transaksi: 'TRX-' + Date.now(),
        tanggal: wibFormattedDate,
        nik: document.getElementById('t-nik').value || '-',
        nama: document.getElementById('t-nama').value || 'Pengeluaran Kas',
        kategori: kategori,
        jenis: jenis,
        nominal: parseFloat(document.getElementById('t-nominal').value),
        keterangan: document.getElementById('t-keterangan').value
    };

    DB.Pembayaran.unshift(payload);
    saveLocalStorage();
    renderPembayaran();
    closeModal('modal-transaksi');
    document.getElementById('form-transaksi').reset();

    Swal.fire({ title: 'Memproses...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    await apiCall('SAVE_TRANSAKSI', payload);
    Swal.fire('Berhasil', 'Transaksi telah dicatat.', 'success');
}

async function submitJadwal(e) {
    e.preventDefault();
    const payload = {
        id_jadwal: 'JDW-' + Date.now(),
        hari: document.getElementById('jd-hari').value,
        tanggal: document.getElementById('jd-tanggal').value,
        jam: document.getElementById('jd-jam').value,
        tempat: document.getElementById('jd-tempat').value,
        materi: document.getElementById('jd-materi').value,
        pemateri: document.getElementById('jd-pemateri').value
    };

    DB.Jadwal.push(payload);
    saveLocalStorage();
    renderJadwal();
    fetchPublicJadwal();
    closeModal('modal-jadwal');
    document.getElementById('form-jadwal').reset();

    await apiCall('SAVE_JADWAL', payload);
    Swal.fire('Tersimpan', 'Jadwal manasik ditambahkan.', 'success');
}

async function deleteJadwal(id_jadwal) {
    DB.Jadwal = DB.Jadwal.filter(x => x.id_jadwal !== id_jadwal);
    saveLocalStorage();
    renderJadwal();
    fetchPublicJadwal();
    await apiCall('DELETE_JADWAL', { id_jadwal });
}

async function saveSettings(e) {
    e.preventDefault();
    DB.Setting = {
        script_url: document.getElementById('cfg-script-url').value,
        admin_pass: document.getElementById('cfg-admin-pass').value || DB.Setting.admin_pass || 'admin123',
        nama_kbihu: document.getElementById('cfg-nama-kbihu').value,
        tahun: document.getElementById('cfg-tahun').value,
        alamat: document.getElementById('cfg-alamat').value,
        pimpinan: document.getElementById('cfg-pimpinan').value,
        bendahara: document.getElementById('cfg-bendahara').value,
        tempat_ttd: document.getElementById('cfg-tempat-ttd').value
    };

    saveLocalStorage();
    loadLocalStorage();
    
    Swal.fire({ title: 'Menyimpan Pengaturan...', didOpen: () => Swal.showLoading() });
    await apiCall('SAVE_SETTING', DB.Setting);
    Swal.fire('Berhasil', 'Pengaturan berhasil diperbarui.', 'success');
}

function exportJamaahExcel() {
    if(DB.Jamaah.length === 0) return Swal.fire('Info', 'Data Jamaah Kosong', 'info');
    const ws = XLSX.utils.json_to_sheet(DB.Jamaah);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data Jamaah");
    XLSX.writeFile(wb, "Data_Jamaah_KBIHU.xlsx");
}

function generateStempelCanvas(textMain, textSub) {
    const canvas = document.createElement('canvas');
    canvas.width = 200; canvas.height = 200;
    const ctx = canvas.getContext('2d');

    ctx.strokeStyle = '#047857'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(100, 100, 90, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(100, 100, 82, 0, Math.PI * 2); ctx.stroke();

    ctx.fillStyle = '#047857'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(textMain, 100, 85);
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText(textSub, 100, 120);

    ctx.beginPath(); ctx.moveTo(25, 100); ctx.lineTo(175, 100); ctx.stroke();
    return canvas.toDataURL('image/png');
}

async function cetakKuitansi(id_transaksi) {
    const trx = DB.Pembayaran.find(t => t.id_transaksi === id_transaksi);
    if (!trx) return;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a5' });

    const qrContainer = document.getElementById('qr-hidden-container');
    qrContainer.innerHTML = '';
    new QRCode(qrContainer, { text: `VALIDASI-KBIHU:${trx.id_transaksi}:${trx.nominal}`, width: 80, height: 80 });
    await new Promise(r => setTimeout(r, 300));
    const qrImage = qrContainer.querySelector('canvas').toDataURL('image/png');

    const stempelImage = generateStempelCanvas(DB.Setting.nama_kbihu, 'PENGURUS');

    doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.setTextColor(4, 120, 87);
    doc.text(DB.Setting.nama_kbihu, 15, 15);
    doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(100);
    doc.text(DB.Setting.alamat, 15, 21);
    doc.line(15, 24, 195, 24);

    doc.setFontSize(14); doc.setFont('helvetica', 'bold'); doc.setTextColor(0);
    doc.text('KUITANSI PEMBAYARAN', 105, 33, { align: 'center' });

    doc.setFontSize(10); doc.setFont('helvetica', 'normal');
    doc.text(`No. Transaksi : ${trx.id_transaksi}`, 15, 42);
    doc.text(`Tgl Pembayaran: ${formatDateWIB(trx.tanggal)}`, 130, 42);

    doc.rect(15, 47, 180, 45);
    doc.text(`Telah Diterima Dari : ${trx.nama} (NIK: ${trx.nik})`, 20, 56);
    doc.text(`Uang Sejumlah      : Rp ${parseFloat(trx.nominal).toLocaleString('id-ID')}`, 20, 66);
    doc.text(`Untuk Pembayaran    : ${trx.kategori} - ${trx.keterangan}`, 20, 76);

    const ttdY = 100;
    doc.text(`${DB.Setting.tempat_ttd}, ${formatDateWIB(trx.tanggal)}`, 140, ttdY);
    doc.text('Bendahara KBIHU,', 140, ttdY + 5);

    doc.addImage(stempelImage, 'PNG', 125, ttdY + 2, 30, 30);
    doc.addImage(qrImage, 'PNG', 20, ttdY, 25, 25);
    doc.setFontSize(7);
    doc.text('Scan untuk verifikasi keaslian', 20, ttdY + 28);

    doc.setFontSize(10); doc.setFont('helvetica', 'bold');
    doc.text(`( ${DB.Setting.bendahara} )`, 140, ttdY + 30);

    doc.save(`Kuitansi_${trx.id_transaksi}.pdf`);
}

function cetakLaporanKeuangan() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.setTextColor(4, 120, 87);
    doc.text(DB.Setting.nama_kbihu, 14, 15);
    doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(100);
    
    if (CurrentRole === 'jamaah' && CurrentUser) {
        doc.text(`CATATAN PEMBAYARAN JAMAAH (${CurrentUser.nama})`, 14, 21);
    } else {
        doc.text(`LAPORAN KAS & PEMBAYARAN JAMAAH - TAHUN ${DB.Setting.tahun}`, 14, 21);
    }
    doc.line(14, 24, 196, 24);

    let list = DB.Pembayaran;
    if (CurrentRole === 'jamaah' && CurrentUser) {
        list = DB.Pembayaran.filter(t => String(t.nik) === String(CurrentUser.nik || CurrentUser.NIK));
    }

    const tableData = list.map(t => [
        t.id_transaksi,
        formatDateWIB(t.tanggal),
        t.kategori,
        t.nama,
        t.jenis,
        `Rp ${parseFloat(t.nominal).toLocaleString('id-ID')}`
    ]);

    doc.autoTable({
        startY: 28,
        head: [['ID', 'Tanggal', 'Kategori', 'Nama/Detail', 'Jenis', 'Nominal']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [4, 120, 87] },
        styles: { fontSize: 8 }
    });

    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(0);
    doc.text(`${DB.Setting.tempat_ttd}, ${formatDateWIB(new Date().toISOString())}`, 130, finalY);
    doc.text('Pimpinan KBIHU,', 130, finalY + 5);
    doc.text(`( ${DB.Setting.pimpinan} )`, 130, finalY + 25);

    doc.save(`Laporan_Keuangan_KBIHU_${Date.now()}.pdf`);
}
