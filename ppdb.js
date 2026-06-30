// Konfigurasi Layanan Eksternal
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwi4n8N6pHx8Nft8F2W0uXUPuts7ccxqUetPF6s94ya2PZEceCyibDNFQd7cWKmYoXXPQ/exec";
const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dug1h9lkg/auto/upload";
const CLOUDINARY_UPLOAD_PRESET = "ppdb_preset";

// ==========================================
// SINKRONISASI DATA SISFO (FIREBASE)
// ==========================================
window.profilLembaga = { nama: "YAYASAN PENDIDIKAN", tahun: "2024/2025", logo: "" };

window.sinkronisasiLembaga = async function() {
    try {
        const { db } = await import('./firebase-init.js');
        const { collection, getDocs } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
        const snap = await getDocs(collection(db, "Lembaga"));
        
        if (!snap.empty) {
            const data = snap.docs[0].data();
            window.profilLembaga.nama = data.namaLembaga || "YAYASAN PENDIDIKAN";
            window.profilLembaga.tahun = data.tahunAjaran || "2024/2025";
            window.profilLembaga.logo = data.logo || "";

            document.querySelectorAll('.text-nama-lembaga').forEach(el => el.innerText = window.profilLembaga.nama);
            document.querySelectorAll('.text-tahun-ajaran').forEach(el => el.innerText = window.profilLembaga.tahun);
            document.querySelectorAll('.img-logo-lembaga').forEach(el => {
                if(window.profilLembaga.logo) {
                    el.src = window.profilLembaga.logo;
                    el.classList.remove('hidden');
                }
            });
        }
    } catch (e) {
        console.warn("Jalur Standalone PPDB aktif (Tanpa Firebase).");
    }
};

// Variabel Global Multi-Step
let currentStep = 1;
const totalSteps = 4;

// ==========================================
// SIMPAN DRAFT OTOMATIS (Local Storage)
// ==========================================
const saveDraft = () => {
    const inputs = document.querySelectorAll('#form-ppdb input:not([type="file"]), #form-ppdb select, #form-ppdb textarea');
    const draft = {};
    inputs.forEach(i => { if(i.id) draft[i.id] = i.value; });
    localStorage.setItem('ppdb_draft', JSON.stringify(draft));
};

window.addEventListener('DOMContentLoaded', () => {
    window.sinkronisasiLembaga();
    document.querySelectorAll('#form-ppdb input:not([type="file"]), #form-ppdb select, #form-ppdb textarea').forEach(i => i.addEventListener('input', saveDraft));
    const draft = JSON.parse(localStorage.getItem('ppdb_draft'));
    if(draft) {
        Object.keys(draft).forEach(id => {
            const el = document.getElementById(id);
            if(el) el.value = draft[id];
        });
    }
});

// ==========================================
// LOGIKA MULTI-STEP FORM
// ==========================================
window.nextStep = async function(stepTujuan) {
    if(stepTujuan === 2) {
        const nik = document.getElementById('ppdb-nik').value;
        if(nik.length !== 16) return Swal.fire({ icon: 'error', text: 'NIK wajib 16 digit angka!', confirmButtonColor: '#1e293b' });

        const btn = document.querySelector('#step-1 button');
        const oriText = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Mengecek Data...';
        btn.disabled = true;

        try {
            const res = await fetch(`${APPS_SCRIPT_URL}?action=cekNIK&nik=${nik}`);
            const data = await res.json();
            btn.innerHTML = oriText;
            btn.disabled = false;

            if(data.exists) {
                return Swal.fire({
                    icon: 'warning',
                    title: 'NIK Sudah Terdaftar!',
                    text: `Calon siswa atas nama ${data.nama} sudah melakukan pendaftaran sebelumnya.`,
                    confirmButtonText: 'Cek Status Kelulusan',
                    confirmButtonColor: '#f59e0b',
                    showCancelButton: true,
                    cancelButtonText: 'Tutup'
                }).then((result) => {
                    if(result.isConfirmed) {
                        document.getElementById('input-cek-nik').value = nik;
                        window.bukaModalCek();
                    }
                });
            }
        } catch (e) {
            btn.innerHTML = oriText; btn.disabled = false;
        }
    }

    if(!validasiStep(currentStep)) return; 

    document.getElementById(`step-${currentStep}`).classList.add('hidden');
    document.getElementById(`step-${stepTujuan}`).classList.remove('hidden');
    currentStep = stepTujuan;
    updateProgressUI();
};

window.prevStep = function(stepTujuan) {
    document.getElementById(`step-${currentStep}`).classList.add('hidden');
    document.getElementById(`step-${stepTujuan}`).classList.remove('hidden');
    currentStep = stepTujuan;
    updateProgressUI();
};

function validasiStep(step) {
    let isValid = true;
    const inputs = document.getElementById(`step-${step}`).querySelectorAll('input[required], select[required], textarea[required]');
    inputs.forEach(input => {
        if (!input.value.trim()) {
            input.classList.add('border-red-500');
            isValid = false;
        } else {
            input.classList.remove('border-red-500');
        }
    });

    if (!isValid) {
        Swal.fire({ icon: 'warning', title: 'Oops...', text: 'Harap lengkapi semua kolom yang wajib diisi (bergaris merah)!', confirmButtonColor: '#1e293b' });
    }
    return isValid;
}

function updateProgressUI() {
    const progress = ((currentStep - 1) / (totalSteps - 1)) * 100;
    document.getElementById('progress-bar').style.width = `${progress}%`;

    for (let i = 1; i <= totalSteps; i++) {
        const ind = document.getElementById(`ind-${i}`);
        const circle = ind.querySelector('div');
        
        if (i < currentStep) {
            circle.className = 'w-10 h-10 rounded-full border-4 bg-navy-900 flex items-center justify-center font-black transition-colors border-emerald-500 text-emerald-500';
            circle.innerHTML = '<i class="fa-solid fa-check"></i>';
        } else if (i === currentStep) {
            circle.className = 'w-10 h-10 rounded-full border-4 bg-navy-900 flex items-center justify-center font-black transition-colors border-gold-500 text-gold-500';
            if(i===1) circle.innerHTML = '<i class="fa-solid fa-user"></i>';
            if(i===2) circle.innerHTML = '<i class="fa-solid fa-users"></i>';
            if(i===3) circle.innerHTML = '<i class="fa-solid fa-folder-open"></i>';
            if(i===4) circle.innerHTML = '<i class="fa-solid fa-wallet"></i>';
        } else {
            circle.className = 'w-10 h-10 rounded-full border-4 border-slate-700 bg-navy-900 text-slate-500 flex items-center justify-center font-black transition-colors';
            if(i===1) circle.innerHTML = '<i class="fa-solid fa-user"></i>';
            if(i===2) circle.innerHTML = '<i class="fa-solid fa-users"></i>';
            if(i===3) circle.innerHTML = '<i class="fa-solid fa-folder-open"></i>';
            if(i===4) circle.innerHTML = '<i class="fa-solid fa-wallet"></i>';
        }
    }
}

// Variabel Global Penampung URL File
window.uploadedFiles = { foto: "", kk: "", skl: "", bukti: "" };

// ==========================================
// UPLOAD & KOMPRESI FILE REAL-TIME
// ==========================================
window.handleFileUpload = async function(input, type) {
    const file = input.files[0];
    if (!file) return;

    const previewEl = document.getElementById(`preview-${type}`);
    previewEl.innerHTML = `<i class="fa-solid fa-spinner fa-spin text-gold-500 mr-2"></i> Mengunggah...`;
    previewEl.classList.remove('hidden');

    try {
        let fileToUpload = file;
        if (file.type.startsWith('image/')) {
            const options = { maxSizeMB: 0.5, maxWidthOrHeight: 1024, useWebWorker: true };
            fileToUpload = await imageCompression(file, options);
        }

        const formData = new FormData();
        formData.append('file', fileToUpload);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

        const res = await fetch(CLOUDINARY_URL, { method: 'POST', body: formData });
        const data = await res.json();
        
        window.uploadedFiles[type] = data.secure_url;
        
        if (file.type.startsWith('image/')) {
            previewEl.innerHTML = `
                <div class="mt-2 text-center">
                    <p class="text-[10px] font-bold text-emerald-600 mb-2 truncate"><i class="fa-solid fa-check mr-1"></i> ${file.name}</p>
                    <img src="${data.secure_url}" class="h-24 mx-auto object-cover rounded-lg border-2 border-emerald-200 shadow-sm" alt="Preview">
                </div>
            `;
        } else {
            previewEl.innerHTML = `<p class="text-xs font-bold text-emerald-600 mt-2 truncate"><i class="fa-solid fa-check mr-1"></i> Berhasil: ${file.name}</p>`;
        }
    } catch (error) {
        previewEl.innerHTML = `<p class="text-xs font-bold text-rose-500 mt-2"><i class="fa-solid fa-times mr-1"></i> Gagal Mengunggah. Coba lagi.</p>`;
        input.value = ""; 
    }
};

window.toggleNextStep3 = function() {
    const cb = document.getElementById('cek-yakin-berkas');
    const btn = document.getElementById('btn-next-step3');
    if (cb.checked) {
        btn.disabled = false;
        btn.className = "bg-navy-900 hover:bg-navy-800 text-white font-black px-8 py-3.5 rounded-xl shadow-lg transition";
    } else {
        btn.disabled = true;
        btn.className = "bg-slate-300 text-slate-500 font-black px-8 py-3.5 rounded-xl cursor-not-allowed transition";
    }
};

// ==========================================
// PROSES SUBMIT DATA AKHIR & MUNCULKAN PREVIEW
// ==========================================
document.getElementById('form-ppdb').addEventListener('submit', async function(e) {
    e.preventDefault();
    if (!validasiStep(4)) return;

    if (!window.uploadedFiles.foto || !window.uploadedFiles.kk || !window.uploadedFiles.bukti) {
        return Swal.fire({ icon: 'warning', title: 'Berkas Belum Siap', text: 'Tunggu hingga Foto, KK, dan Bukti Transfer selesai terunggah (bercentang hijau)!', confirmButtonColor: '#1e293b' });
    }

    Swal.fire({
        title: 'Menyelesaikan Pendaftaran...',
        html: 'Menyimpan data pendaftaran...',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
    });

    try {
        const namaSiswa = document.getElementById('ppdb-nama').value;
        const nikSiswa = document.getElementById('ppdb-nik').value;
        const noDaftar = "PPDB-" + new Date().getFullYear() + Date.now().toString().slice(-5);

        const payload = {
            nama: namaSiswa,
            nik: nikSiswa,
            nisn: document.getElementById('ppdb-nisn').value || '-',
            tempatLahir: document.getElementById('ppdb-tempat-lahir').value,
            tanggalLahir: document.getElementById('ppdb-tgl-lahir').value,
            jenisKelamin: document.getElementById('ppdb-jk').value,
            asalSekolah: document.getElementById('ppdb-asal-sekolah').value,
            namaAyah: document.getElementById('ppdb-ayah').value,
            namaIbu: document.getElementById('ppdb-ibu').value,
            noWA: document.getElementById('ppdb-wa').value,
            pekerjaanOrtu: document.getElementById('ppdb-pekerjaan').value,
            alamat: document.getElementById('ppdb-alamat').value,
            linkFoto: window.uploadedFiles.foto,
            linkKK: window.uploadedFiles.kk,
            linkSKL: window.uploadedFiles.skl,
            linkBukti: window.uploadedFiles.bukti,
            noDaftar: noDaftar
        };

        const formSubmitData = new FormData();
        for (const key in payload) {
            formSubmitData.append(key, payload[key]);
        }

        await fetch(APPS_SCRIPT_URL, { method: 'POST', body: formSubmitData, mode: 'no-cors' });
        localStorage.removeItem('ppdb_draft');

        document.getElementById('bukti-no-daftar').innerText = noDaftar;
        document.getElementById('bukti-nama').innerText = namaSiswa;
        document.getElementById('bukti-nik').innerText = nikSiswa;
        document.getElementById('bukti-jk').innerText = payload.jenisKelamin;
        document.getElementById('bukti-ortu').innerText = `${payload.namaAyah} / ${payload.namaIbu}`;

        // Update Header Preview
        document.getElementById('preview-nama-yayasan').innerText = window.profilLembaga.nama;
        document.getElementById('preview-tahun-ajaran').innerText = window.profilLembaga.tahun;

        Swal.close();

        document.getElementById('modal-bukti').classList.remove('hidden');
        setTimeout(() => { 
            document.getElementById('modal-bukti').classList.remove('opacity-0'); 
            document.getElementById('modal-bukti-content').classList.remove('scale-95'); 
        }, 10);

    } catch (error) {
        Swal.fire({ icon: 'error', title: 'Terjadi Kesalahan', text: 'Gagal mengirim data. Periksa koneksi internet Anda.'});
    }
});

// ==========================================
// MODAL BUKTI & FUNGSI UNDUH PDF (NATIVE JSPDF)
// ==========================================
window.tutupModalBukti = function() {
    document.getElementById('modal-bukti').classList.add('opacity-0'); 
    document.getElementById('modal-bukti-content').classList.add('scale-95');
    setTimeout(() => { 
        document.getElementById('modal-bukti').classList.add('hidden'); 
        window.location.reload(); 
    }, 300);
};

window.unduhBuktiPDF = function() {
    const btn = document.getElementById('btn-unduh-pdf');
    const oriText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Memproses PDF...';
    btn.disabled = true;

    const noDaftar = document.getElementById('bukti-no-daftar').innerText;
    const namaSiswa = document.getElementById('bukti-nama').innerText;
    const nikSiswa = document.getElementById('bukti-nik').innerText;
    const jk = document.getElementById('bukti-jk').innerText;
    const ortu = document.getElementById('bukti-ortu').innerText;

    buatPDFNative(noDaftar, namaSiswa, nikSiswa, jk, ortu, function() {
        btn.innerHTML = oriText;
        btn.disabled = false;
        
        const noAdmin = "6281234567890"; 
        const pesanWA = `Assalamualaikum Admin, saya telah melakukan pendaftaran PPDB Online.%0A%0ANo. Daftar: ${noDaftar}%0ANama: ${namaSiswa}%0ANIK: ${nikSiswa}%0A%0AMohon bantuan verifikasinya. Terima kasih.`;
        window.location.href = `https://wa.me/${noAdmin}?text=${pesanWA}`;
    });
};

window.cetakUlangPDF = function(noDaftar, namaSiswa, nikSiswa, jk, ortu) {
    Swal.fire({ title: 'Memproses PDF...', text: 'Mohon tunggu sebentar...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    buatPDFNative(noDaftar, namaSiswa, nikSiswa, jk, ortu, function() {
        Swal.close();
    });
};

// ==========================================
// MESIN PEMBUAT PDF (ANTI LAYAR PUTIH)
// ==========================================
function buatPDFNative(noDaftar, nama, nik, jk, ortu, callback) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a5" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42); 
    doc.text(window.profilLembaga.nama.toUpperCase(), 74, 20, { align: "center" });
    
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); 
    doc.text(`Bukti Pendaftaran Siswa Baru ${window.profilLembaga.tahun}`, 74, 26, { align: "center" });

    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.5);
    doc.line(15, 32, 133, 32);

    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    let y = 45;
    const spasi = 8;
    
    doc.setFont("helvetica", "bold");
    doc.text("No. Pendaftaran", 15, y); doc.setTextColor(225, 29, 72); doc.text(": " + noDaftar, 50, y); y += spasi; doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "normal");
    doc.text("Nama Calon Siswa", 15, y); doc.text(": " + nama, 50, y); y += spasi;
    doc.text("NIK Siswa", 15, y); doc.text(": " + nik, 50, y); y += spasi;
    doc.text("Jenis Kelamin", 15, y); doc.text(": " + jk, 50, y); y += spasi;
    doc.text("Nama Orang Tua", 15, y); doc.text(": " + ortu, 50, y); y += spasi;

    doc.setDrawColor(203, 213, 225); 
    doc.setFillColor(248, 250, 252); 
    doc.roundedRect(15, y + 10, 118, 22, 3, 3, "FD");

    doc.setFont("helvetica", "bold");
    doc.text("Status Pendaftaran: Menunggu Verifikasi", 74, y + 19, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("Simpan bukti ini. Gunakan NIK untuk mengecek kelulusan", 74, y + 25, { align: "center" });
    doc.text("melalui portal Cek Kelulusan di website kami.", 74, y + 29, { align: "center" });

    doc.save(`Bukti_Daftar_${noDaftar}.pdf`);
    if(callback) callback();
}

// ==========================================
// MODAL CEK KELULUSAN & LOGIN PORTAL
// ==========================================
window.bukaModalCek = function() {
    document.getElementById('modal-cek').classList.remove('hidden');
    setTimeout(() => { document.getElementById('modal-cek').classList.remove('opacity-0'); document.getElementById('modal-cek-content').classList.remove('scale-95'); }, 10);
};

window.tutupModalCek = function() {
    document.getElementById('modal-cek').classList.add('opacity-0'); document.getElementById('modal-cek-content').classList.add('scale-95');
    setTimeout(() => { document.getElementById('modal-cek').classList.add('hidden'); document.getElementById('hasil-cek').innerHTML = ''; }, 300);
};

window.cekStatusKelulusan = async function() {
    const nik = document.getElementById('input-cek-nik').value.trim();
    if(!nik) return Swal.fire({ icon: 'warning', text: 'Masukkan NIK terlebih dahulu!' });

    const btn = document.querySelector('#modal-cek button.bg-navy-900');
    const oriText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Mencari...'; btn.disabled = true;

    try {
        const url = `${APPS_SCRIPT_URL}?action=cekStatus&nik=${nik}`;
        const response = await fetch(url);
        const data = await response.json();
        
        const hasilDiv = document.getElementById('hasil-cek');
        hasilDiv.classList.remove('hidden');
        
        if (data.success) {
            let badgeColor = data.status.toLowerCase() === 'lulus' ? 'bg-emerald-100 text-emerald-700 border-emerald-300' : 
                             data.status.toLowerCase() === 'ditolak' ? 'bg-rose-100 text-rose-700 border-rose-300' : 'bg-amber-100 text-amber-700 border-amber-300';
            
            let btnDaftarUlang = data.status.toLowerCase() === 'lulus' ? `<button onclick="window.location.href='daftar_ulang.html?nik=${nik}'" class="mt-4 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 rounded-xl shadow-lg transition"><i class="fa-solid fa-clipboard-check mr-2"></i> Lanjutkan Daftar Ulang</button>` : '';

            let btnCetakUlang = `<button onclick="window.cetakUlangPDF('${data.noDaftar}', '${data.nama}', '${nik}', '${data.jk}', '${data.ortu}')" class="mt-3 w-full bg-slate-800 hover:bg-slate-900 text-white font-black py-3 rounded-xl shadow-md transition"><i class="fa-solid fa-file-pdf mr-2 text-rose-400"></i> Unduh Ulang Bukti Daftar</button>`;

            hasilDiv.innerHTML = `
                <div class="text-left bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <p class="text-[10px] font-bold text-slate-400 uppercase mb-1">Nama Calon Siswa</p>
                    <p class="text-sm font-black text-navy-900 mb-3">${data.nama}</p>
                    <p class="text-[10px] font-bold text-slate-400 uppercase mb-1">Status Saat Ini</p>
                    <div class="inline-block px-4 py-2 border rounded-lg font-black text-sm uppercase ${badgeColor}">${data.status}</div>
                </div>
                ${btnDaftarUlang}
                ${btnCetakUlang}`;
        } else {
            hasilDiv.innerHTML = `<div class="bg-rose-50 text-rose-600 p-4 rounded-xl border border-rose-200 text-xs font-bold"><i class="fa-solid fa-triangle-exclamation mr-1"></i> ${data.message}</div>`;
        }
    } catch (err) { Swal.fire({ icon: 'error', text: 'Gagal terhubung ke server.' }); }
    
    btn.innerHTML = oriText; btn.disabled = false;
};