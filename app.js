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
        script_url: '',
        admin_pass: 'admin123',
        nama_kbihu: 'KBIHU KI MAGETI',
        tahun: '1448 H / 2027 M',
        alamat: 'Jl. Raya Magetan - Maospati, Magetan, Jawa Timur',
        pimpinan: 'KH. Ahmad Mageti',
        bendahara: 'Hj. Siti Aminah',
        tempat_ttd: 'Magetan'
    }
};

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
        btnJamaah.className = 'flex-1 py-2 rounded-lg transition text-emerald-800 bg-white shadow-sm font-bold';
        btnAdmin.className = 'flex-1 py-2 rounded-lg transition text-slate-600';
        lblUser.innerText = 'NIK ATAU NO. WHATSAPP';
        lblPass.innerText = 'PASSWORD (MASUKKAN NIK)';
        inpUser.placeholder = 'Contoh: 3520123456780001';
        inpPass.placeholder = 'Masukkan NIK Anda';
    } else {
        btnAdmin.className = 'flex-1 py-2 rounded-lg transition text-emerald-800 bg-white shadow-sm font-bold';
        btnJamaah.className = 'flex-1 py-2 rounded-lg transition text-slate-600';
        lblUser.innerText = 'USERNAME ADMIN';
        lblPass.innerText = 'PASSWORD ADMIN';
        inpUser.placeholder = 'admin';
        inpPass.placeholder = 'Password admin';
    }
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
    } else {
        container.innerHTML = `
            <div class="p-3 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
                <div class="bg-emerald-100 text-emerald-800 font-bold p-2 rounded-lg text-center min-w-[48px] shrink-0">
                    <span class="block text-[10px] uppercase">AGU</span>
                    <span class="text-base sm:text-lg leading-none">12</span>
                </div>
                <div class="min-w-0">
                    <h3 class="text-xs sm:text-sm font-semibold text-slate-800 truncate">Manasik Teori: Thawaf & Sa'i</h3>
                    <p class="text-[11px] text-slate-500 mt-0.5 truncate">📍 Gedung KBIHU • ⏰ 08:00 WIB</p>
                </div>
            </div>
            <div class="p-3 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
                <div class="bg-emerald-100 text-emerald-800 font-bold p-2 rounded-lg text-center min-w-[48px] shrink-0">
                    <span class="block text-[10px] uppercase">AGU</span>
                    <span class="text-base sm:text-lg leading-none">26</span>
                </div>
                <div class="min-w-0">
                    <h3 class="text-xs sm:text-sm font-semibold text-slate-800 truncate">Praktik Lapangan Peragaan Ihram</h3>
                    <p class="text-[11px] text-slate-500 mt-0.5 truncate">📍 Alun-Alun Magetan • ⏰ 06:30 WIB</p>
                </div>
            </div>
        `;
    }
}

function renderPublicJadwalList(list) {
    const container = document.getElementById('public-jadwal-list');
    container.innerHTML = '';

    if (!list || list.length === 0) {
        container.innerHTML = '<div class="text-center text-xs text-slate-400 py-3">Belum ada agenda jadwal manasik.</div>';
        return;
    }

    const topJadwal = list.slice(0, 3);
    topJadwal.forEach(j => {
        const div = document.createElement('div');
        div.className = 'p-3 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center gap-3';
        div.innerHTML = `
            <div class="bg-emerald-100 text-emerald-800 font-bold p-2 rounded-lg text-center min-w-[48px] shrink-0">
                <span class="block text-[10px] uppercase">${j.hari || 'JDW'}</span>
                <span class="text-xs font-extrabold leading-none">${j.tanggal ? j.tanggal.split('-')[2] || j.tanggal : '•'}</span>
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

    document.getElementById('user-badge-role').innerText = CurrentRole === 'admin' ? '🔑 Admin' : '👥 Jamaah';
    document.querySelectorAll('.admin-only').forEach(el => {
        if (CurrentRole === 'admin') el.classList.remove('hidden');
        else el.classList.add('hidden');
    });

    document.getElementById('app-header-title').innerText = DB.Setting.nama_kbihu || 'KBIHU KI MAGETI';
    document.getElementById('app-header-subtitle').innerText = 'Tahun ' + (DB.Setting.tahun || '1448 H / 2027 M');

    // Penyesuaian UI khusus Jamaah vs Admin
    if (CurrentRole === 'jamaah') {
        document.getElementById('dash-stat-kas-label').innerText = 'TOTAL PEMBAYARAN SAYA';
        document.getElementById('nav-pembayaran-title').innerText = '💳 Riwayat Pembayaran';
        document.getElementById('pembayaran-table-title').innerText = 'Catatan Pembayaran Anda';
    } else {
        document.getElementById('dash-stat-kas-label').innerText = 'TOTAL SISA KAS KBIHU';
        document.getElementById('nav-pembayaran-title').innerText = '💰 Kas & Pembayaran';
        document.getElementById('pembayaran-table-title').innerText = 'Riwayat Transaksi Keuangan';
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
    document.getElementById('cfg-script-url').value = DB.Setting.script_url || '';
    document.getElementById('cfg-nama-kbihu').value = DB.Setting.nama_kbihu || 'KBIHU KI MAGETI';
    document.getElementById('cfg-tahun').value = DB.Setting.tahun || '1448 H / 2027 M';
    document.getElementById('cfg-alamat').value = DB.Setting.alamat || '';
    document.getElementById('cfg-pimpinan').value = DB.Setting.pimpinan || '';
    document.getElementById('cfg-bendahara').value = DB.Setting.bendahara || '';
    document.getElementById('cfg-tempat-ttd').value = DB.Setting.tempat_ttd || 'Magetan';
    document.getElementById('login-title-kbihu').innerText = DB.Setting.nama_kbihu || 'KBIHU KI MAGETI';
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

    document.getElementById('tab-' + tabId).classList.remove('hidden');
    if(btn) {
        btn.classList.add('active', 'border-b-2', 'border-emerald-400', 'text-white');
        btn.classList.remove('text-emerald-200');
    }
}

function renderAll() {
    renderDashboard();
    renderJamaah();
    renderBerkas();
    renderPembayaran();
    renderJadwal();
}

function renderDashboard() {
    if (!CurrentUser) return;

    document.getElementById('dash-welcome-user').innerText = `Selamat Datang, ${CurrentUser.nama}`;
    document.getElementById('dash-stat-jamaah').innerText = `${DB.Jamaah.length} Jamaah`;
    document.getElementById('dash-stat-jadwal').innerText = `${DB.Jadwal.length} Agenda`;

    if (CurrentRole === 'jamaah') {
        // PERUBAHAN: Menghitung total pembayaran milik Jamaah bersangkutan saja
        let totalBayarJamaah = 0;
        DB.Pembayaran.forEach(p => {
            if (String(p.nik) === String(CurrentUser.nik) && p.jenis === 'Masuk') {
                totalBayarJamaah += parseFloat(p.nominal) || 0;
            }
        });
        document.getElementById('dash-stat-kas').innerText = 'Rp ' + totalBayarJamaah.toLocaleString('id-ID');
    } else {
        // Mode Admin: Sisa Kas
        let mas = 0, kel = 0;
        DB.Pembayaran.forEach(p => {
            if (p.jenis === 'Masuk') mas += parseFloat(p.nominal) || 0;
            if (p.jenis === 'Keluar') kel += parseFloat(p.nominal) || 0;
        });
        document.getElementById('dash-stat-kas').innerText = 'Rp ' + (mas - kel).toLocaleString('id-ID');
    }

    const container = document.getElementById('dash-jadwal-container');
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
                <span>📅 ${j.hari}, ${j.tanggal}</span>
                <span class="bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-md text-[10px]">${j.jam}</span>
            </div>
            <h4 class="font-bold text-slate-800 text-sm sm:text-base mt-1">${j.materi}</h4>
            <p class="text-xs text-slate-600">📍 Tempat: ${j.tempat}</p>
            <p class="text-xs text-slate-600">👤 Pemateri: ${j.pemateri}</p>
        `;
        container.appendChild(div);
    });
}

function renderJamaah() {
    const tbody = document.getElementById('table-jamaah-body');
    tbody.innerHTML = '';

    if (DB.Jamaah.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="p-4 text-center text-slate-400">Belum ada data jamaah.</td></tr>';
        return;
    }

    DB.Jamaah.forEach(j => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50 transition border-b border-slate-100';
        tr.innerHTML = `
            <td class="p-3 sm:p-4 font-semibold text-slate-700">${j.nik}</td>
            <td class="p-3 sm:p-4 font-medium text-slate-800">${j.nama}</td>
            <td class="p-3 sm:p-4"><span class="px-2 py-1 rounded text-[10px] sm:text-xs font-semibold ${j.jk==='L'?'bg-blue-100 text-blue-700':'bg-pink-100 text-pink-700'}">${j.jk==='L'?'Laki-laki':'Perempuan'}</span></td>
            <td class="p-3 sm:p-4">${j.alamat}</td>
            <td class="p-3 sm:p-4 text-emerald-600 font-medium"><a href="https://wa.me/${j.wa}" target="_blank">📱 ${j.wa}</a></td>
            <td class="p-3 sm:p-4 text-center">
                <button type="button" onclick="deleteJamaah('${j.nik}')" class="text-rose-600 hover:text-rose-800 font-semibold text-xs bg-rose-50 px-2.5 py-1 rounded-md">Hapus</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function renderBerkas() {
    const tbody = document.getElementById('table-berkas-body');
    tbody.innerHTML = '';

    let list = DB.Jamaah;
    if (CurrentRole === 'jamaah' && CurrentUser) {
        list = DB.Jamaah.filter(j => String(j.nik) === String(CurrentUser.nik));
    }

    if (list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="p-4 text-center text-slate-400">Data berkas tidak ditemukan.</td></tr>';
        return;
    }

    list.forEach(j => {
        const b = DB.Berkas.find(item => String(item.nik) === String(j.nik)) || {
            ktp: false, kk: false, spph: false, paspor: false, vaksin: false
        };

        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50 border-b border-slate-100';
        tr.innerHTML = `
            <td class="p-3 sm:p-4 font-semibold text-slate-800">${j.nama}<br><span class="text-xs text-slate-400 font-normal">NIK: ${j.nik}</span></td>
            ${renderBerkasStatus(j.nik, 'ktp', b.ktp)}
            ${renderBerkasStatus(j.nik, 'kk', b.kk)}
            ${renderBerkasStatus(j.nik, 'spph', b.spph)}
            ${renderBerkasStatus(j.nik, 'paspor', b.paspor)}
            ${renderBerkasStatus(j.nik, 'vaksin', b.vaksin)}
            <td class="p-3 sm:p-4 text-center admin-only">
                <button type="button" onclick="toggleAllBerkas('${j.nik}')" class="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1 rounded hover:bg-emerald-100">Set Lengkap</button>
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
    tbody.innerHTML = '';

    let totalMasuk = 0, totalKeluar = 0;

    let list = DB.Pembayaran;
    if (CurrentRole === 'jamaah' && CurrentUser) {
        list = DB.Pembayaran.filter(t => String(t.nik) === String(CurrentUser.nik));
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
                <div class="text-[10px] sm:text-xs text-slate-400">${t.tanggal}</div>
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

    document.getElementById('dash-pemasukan').innerText = 'Rp ' + totalMasuk.toLocaleString('id-ID');
    document.getElementById('dash-pengeluaran').innerText = 'Rp ' + totalKeluar.toLocaleString('id-ID');
    document.getElementById('dash-sisa').innerText = 'Rp ' + (totalMasuk - totalKeluar).toLocaleString('id-ID');
}

function renderJadwal() {
    const container = document.getElementById('jadwal-cards-container');
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
                    <span class="text-xs font-bold text-emerald-600 uppercase tracking-wider">${j.hari}, ${j.tanggal}</span>
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
    const payload = {
        nik: document.getElementById('j-nik').value,
        nama: document.getElementById('j-nama').value,
        jk: document.getElementById('j-jk').value,
        alamat: document.getElementById('j-alamat').value,
        wa: document.getElementById('j-wa').value,
        created_at: new Date().toISOString()
    };

    const idx = DB.Jamaah.findIndex(x => x.nik === payload.nik);
    if (idx >= 0) DB.Jamaah[idx] = payload;
    else DB.Jamaah.push(payload);

    saveLocalStorage();
    renderJamaah();
    closeModal('modal-jamaah');
    document.getElementById('form-jamaah').reset();

    Swal.fire({ title: 'Menyimpan...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    await apiCall('SAVE_JAMAAH', payload);
    Swal.fire('Tersimpan', 'Data jamaah diperbarui.', 'success');
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
            DB.Jamaah = DB.Jamaah.filter(x => x.nik !== nik);
            saveLocalStorage();
            renderJamaah();
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
            selectJamaah.innerHTML += `<option value="${j.nik}">${j.nama} (${j.nik})</option>`;
        });
    }

    openModal('modal-transaksi');
}

function updateNamaJamaah() {
    const nik = document.getElementById('t-nik').value;
    const jamaah = DB.Jamaah.find(j => j.nik === nik);
    document.getElementById('t-nama').value = jamaah ? jamaah.nama : '';
}

async function submitTransaksi(e) {
    e.preventDefault();
    const kategori = document.getElementById('t-kategori').value;
    const jenis = kategori === 'Pengeluaran' ? 'Keluar' : 'Masuk';
    
    const payload = {
        id_transaksi: 'TRX-' + Date.now(),
        tanggal: new Date().toLocaleDateString('id-ID'),
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

function importJamaahExcel(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(evt) {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, {type: 'array'});
        const sheetName = workbook.SheetNames[0];
        const importedData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

        if (importedData.length > 0) {
            importedData.forEach(row => {
                if (row.nik && row.nama) {
                    const payload = {
                        nik: String(row.nik),
                        nama: String(row.nama),
                        jk: row.jk || 'L',
                        alamat: row.alamat || '-',
                        wa: String(row.wa || ''),
                        created_at: new Date().toISOString()
                    };
                    const idx = DB.Jamaah.findIndex(x => x.nik === payload.nik);
                    if (idx >= 0) DB.Jamaah[idx] = payload;
                    else DB.Jamaah.push(payload);

                    apiCall('SAVE_JAMAAH', payload);
                }
            });
            saveLocalStorage();
            renderJamaah();
            Swal.fire('Import Berhasil', `${importedData.length} data diproses.`, 'success');
        }
    };
    reader.readAsArrayBuffer(file);
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
    doc.text(`Tgl Pembayaran: ${trx.tanggal}`, 130, 42);

    doc.rect(15, 47, 180, 45);
    doc.text(`Telah Diterima Dari : ${trx.nama} (NIK: ${trx.nik})`, 20, 56);
    doc.text(`Uang Sejumlah      : Rp ${parseFloat(trx.nominal).toLocaleString('id-ID')}`, 20, 66);
    doc.text(`Untuk Pembayaran    : ${trx.kategori} - ${trx.keterangan}`, 20, 76);

    const ttdY = 100;
    doc.text(`${DB.Setting.tempat_ttd}, ${trx.tanggal}`, 140, ttdY);
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
        list = DB.Pembayaran.filter(t => String(t.nik) === String(CurrentUser.nik));
    }

    const tableData = list.map(t => [
        t.id_transaksi,
        t.tanggal,
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
    doc.text(`${DB.Setting.tempat_ttd}, ${new Date().toLocaleDateString('id-ID')}`, 130, finalY);
    doc.text('Pimpinan KBIHU,', 130, finalY + 5);
    doc.text(`( ${DB.Setting.pimpinan} )`, 130, finalY + 25);

    doc.save(`Laporan_Keuangan_KBIHU_${Date.now()}.pdf`);
}