// --- State Management ---
let currentDate = new Date();
let selectedDateKey = null;
let habits = JSON.parse(localStorage.getItem('habitData')) || {};
let username = localStorage.getItem('habitUsername');
let theme = localStorage.getItem('habitTheme') || 'light';
let greetingInterval;
let modalCloseTimeout;

// Media Recorder Variables
let mediaRecorder;
let audioChunks = [];
let currentAudioBlobBase64 = null;
let currentPhotoBase64 = null;

// --- DOM Elements ---
const calendarEl = document.getElementById('calendar');
const photoInput = document.getElementById('photoInput');
const photoPreviewContainer = document.getElementById('photoPreviewContainer');

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    initNavbar();
    checkLogin();
    initTheme();
    renderCalendar();
    initTimeAndWeather();
    setupEventListeners();
});

// --- Event Listeners Setup ---
function setupEventListeners() {
    // Navigasi Bulan
    document.getElementById('prevMonthBtn').addEventListener('click', () => changeMonth(-1));
    document.getElementById('nextMonthBtn').addEventListener('click', () => changeMonth(1));

    // Theme & Login
    document.getElementById('themeToggleBtn').addEventListener('click', toggleTheme);
    document.getElementById('loginBtn').addEventListener('click', handleLogin);

    // Modal Actions
    document.getElementById('closeModalBtn').addEventListener('click', closeModal);
    document.getElementById('saveBtn').addEventListener('click', saveEntry);
    
    // Photo Actions
    photoPreviewContainer.addEventListener('click', () => photoInput.click());
    photoInput.addEventListener('change', function() { handlePhotoUpload(this); });
    document.getElementById('removePhotoBtn').addEventListener('click', removePhoto);

    // Audio Actions
    document.getElementById('recordBtn').addEventListener('click', toggleRecording);
    document.getElementById('removeAudioBtn').addEventListener('click', removeAudio);

    // News Actions
    document.getElementById('newsToggleBtn').addEventListener('click', toggleNews);
    document.getElementById('closeNewsBtn').addEventListener('click', toggleNews);
}

// --- Navbar Logic ---
function initNavbar() {
    const nav = document.createElement('nav');
    nav.className = "fixed top-0 left-0 w-full h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md shadow-sm z-50 flex items-center justify-between px-4 transition-colors duration-300 border-b border-slate-200 dark:border-slate-700";

    const logo = document.createElement('div');
    logo.className = "text-xl font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-2 cursor-default";
    logo.innerHTML = '<i class="fas fa-check-circle"></i> HabitTracker';

    const btnContainer = document.createElement('div');
    btnContainer.className = "flex items-center gap-2";

    // Pindahkan tombol eksisting ke navbar
    const ids = ['newsToggleBtn', 'themeToggleBtn', 'loginBtn'];
    ids.forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.classList.remove('absolute', 'fixed', 'top-4', 'top-5', 'right-4', 'right-5', 'left-4', 'z-10', 'm-4');
            btn.classList.add('relative', 'p-2', 'rounded-lg', 'hover:bg-slate-100', 'dark:hover:bg-slate-800', 'transition-colors');
            btnContainer.appendChild(btn);
        }
    });

    nav.appendChild(logo);
    nav.appendChild(btnContainer);

    document.body.prepend(nav);
    document.body.classList.add('pt-20');
}

// --- Login & Theme Logic ---
function checkLogin() {
    if (!username) {
        document.getElementById('loginModal').classList.remove('hidden');
    } else {
        updateGreeting();
    }
}

function handleLogin() {
    const input = document.getElementById('usernameInput');
    const val = input.value.trim();
    if (val) {
        username = val;
        localStorage.setItem('habitUsername', username);
        document.getElementById('loginModal').classList.add('hidden');
        updateGreeting();
    } else {
        alert("Silakan isi nama panggilanmu!");
    }
}

function updateGreeting() {
    const title = document.getElementById('greetingTitle');
    const greetings = ["Halo", "Hello", "Hola", "Bonjour", "Konnichiwa"];
    let index = 0;

    if (greetingInterval) clearInterval(greetingInterval);

    const changeText = () => {
        title.style.opacity = '0'; // Fade Out
        setTimeout(() => {
            title.innerText = `${greetings[index]}, ${username}!`;
            title.style.opacity = '1'; // Fade In
            index = (index + 1) % greetings.length;
        }, 500); // Tunggu 500ms (sesuai duration-500 CSS)
    };

    // Set awal tanpa animasi
    title.innerText = `${greetings[0]}, ${username}!`;
    index = 1;
    
    greetingInterval = setInterval(changeText, 3000);
}

function toggleNews() {
    const sidebar = document.getElementById('newsSidebar');
    const btn = document.getElementById('newsToggleBtn');
    
    // Toggle visibility
    sidebar.classList.toggle('hidden');
    btn.classList.toggle('hidden');
}

function initTheme() {
    if (theme === 'dark') {
        document.documentElement.classList.add('dark');
        document.querySelector('#themeToggleBtn i').className = 'fas fa-sun';
    }
}

function toggleTheme() {
    const html = document.documentElement;
    if (html.classList.contains('dark')) {
        html.classList.remove('dark');
        theme = 'light';
        document.querySelector('#themeToggleBtn i').className = 'fas fa-moon';
    } else {
        html.classList.add('dark');
        theme = 'dark';
        document.querySelector('#themeToggleBtn i').className = 'fas fa-sun';
    }
    localStorage.setItem('habitTheme', theme);
    renderCalendar(); // Re-render untuk update warna border/bg di JS
}

// --- Calendar Logic ---
function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    document.getElementById('currentMonthYear').innerText = `${monthNames[month]} ${year}`;

    calendarEl.innerHTML = '';

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Padding hari kosong (Awal Bulan)
    for (let i = 0; i < firstDay; i++) {
        const emptyDiv = document.createElement('div');
        emptyDiv.className = "day-card invisible"; // Invisible tapi menjaga dimensi
        calendarEl.appendChild(emptyDiv);
    }

    // Render hari
    for (let day = 1; day <= daysInMonth; day++) {
        const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const data = habits[dateKey];
        
        // Cek Hari Libur & Minggu
        const holidayName = getHoliday(year, month + 1, day);
        const isHoliday = !!holidayName;
        const isSunday = new Date(year, month, day).getDay() === 0;
        const now = new Date();
        const isToday = day === now.getDate() && month === now.getMonth() && year === now.getFullYear();
        
        const dayEl = document.createElement('div');
        
        let classes = "day-card rounded-xl flex flex-col items-center justify-center cursor-pointer border backdrop-blur-sm transition-all duration-300 ";
        if (data && data.completed) {
            classes += "bg-indigo-500/80 text-white border-indigo-400/50 shadow-lg shadow-indigo-500/30";
        } else if (isHoliday || isSunday) {
            classes += "bg-white/30 dark:bg-slate-800/40 text-red-600 dark:text-red-400 border-white/40 dark:border-slate-600/50 hover:bg-white/50 dark:hover:bg-slate-700/50";
        } else {
            classes += "bg-white/30 dark:bg-slate-800/40 text-slate-700 dark:text-slate-200 border-white/40 dark:border-slate-600/50 hover:bg-white/50 dark:hover:bg-slate-700/50";
        }

        if (isToday) {
            classes += " ring-2 ring-indigo-500 dark:ring-indigo-400 font-extrabold";
        }

        if (selectedDateKey === dateKey) {
            classes += " ring-2 ring-offset-2 ring-indigo-500 dark:ring-indigo-400";
        }

        dayEl.className = classes;
        if (holidayName) dayEl.title = holidayName;
        
        // Indikator Media
        let indicators = '';
        if (data && (data.photo || data.audio)) {
            indicators = `<div class="flex gap-1 mt-1 text-[8px] ${data.completed ? 'text-indigo-200' : 'text-indigo-400'}">
                ${data.photo ? '<i class="fas fa-camera"></i>' : ''}
                ${data.audio ? '<i class="fas fa-microphone"></i>' : ''}
            </div>`;
        }

        dayEl.innerHTML = `<span class="text-sm font-bold">${day}</span>${indicators}`;
        dayEl.addEventListener('click', () => openModal(dateKey, day, monthNames[month]));
        calendarEl.appendChild(dayEl);
    }

    // Padding hari kosong (Akhir Bulan) untuk menjaga simetri 6 baris (42 sel)
    const totalCellsFilled = firstDay + daysInMonth;
    const totalSlots = 42; // 6 baris x 7 kolom
    for (let i = totalCellsFilled; i < totalSlots; i++) {
        const emptyDiv = document.createElement('div');
        emptyDiv.className = "day-card invisible";
        calendarEl.appendChild(emptyDiv);
    }
}

function changeMonth(offset) {
    currentDate.setMonth(currentDate.getMonth() + offset);
    renderCalendar();
}

// --- Modal & Data Logic ---
function openModal(dateKey, day, monthName) {
    selectedDateKey = dateKey;
    renderCalendar(); // Re-render untuk update highlight seleksi
    const data = habits[dateKey] || {};

    document.getElementById('modalDateTitle').innerText = `${day} ${monthName}`;
    
    // Tampilkan Nama Hari Libur
    const [y, m, d] = dateKey.split('-').map(Number);
    const holidayName = getHoliday(y, m, d);
    const holidayTextEl = document.getElementById('modalHolidayText');
    if (holidayName) {
        holidayTextEl.innerText = holidayName;
        holidayTextEl.classList.remove('hidden');
    } else {
        holidayTextEl.classList.add('hidden');
    }

    document.getElementById('statusCheck').checked = data.completed || false;
    document.getElementById('noteInput').value = data.note || '';
    
    // Load Photo
    currentPhotoBase64 = data.photo || null;
    if (currentPhotoBase64) {
        document.getElementById('photoPreview').src = currentPhotoBase64;
        document.getElementById('photoPreview').classList.remove('hidden');
        document.getElementById('photoPlaceholder').classList.add('hidden');
        document.getElementById('removePhotoBtn').classList.remove('hidden');
    } else {
        removePhotoUI();
    }

    // Load Audio
    currentAudioBlobBase64 = data.audio || null;
    const audioPlayer = document.getElementById('audioPlayer');
    if (currentAudioBlobBase64) {
        audioPlayer.src = currentAudioBlobBase64;
        audioPlayer.classList.remove('hidden');
        document.getElementById('removeAudioBtn').classList.remove('hidden');
    } else {
        removeAudioUI();
    }

    // Reset timeout jika user membuka modal dengan cepat setelah menutup
    clearTimeout(modalCloseTimeout);
    
    const modal = document.getElementById('entryModal');
    const modalContent = document.getElementById('modalContent');
    
    modal.classList.remove('hidden');
    modal.classList.remove('modal-exit');
    modal.classList.add('modal-enter');
    
    modalContent.classList.remove('modal-content-exit');
    modalContent.classList.add('modal-content-enter');
}

function closeModal() {
    const modal = document.getElementById('entryModal');
    const modalContent = document.getElementById('modalContent');
    
    modal.classList.remove('modal-enter');
    modal.classList.add('modal-exit');
    
    modalContent.classList.remove('modal-content-enter');
    modalContent.classList.add('modal-content-exit');

    // Tunggu animasi selesai (300ms) baru sembunyikan elemen
    modalCloseTimeout = setTimeout(() => {
        modal.classList.add('hidden');
        selectedDateKey = null;
        renderCalendar(); // Hapus highlight seleksi
    }, 300);
    
    stopRecording();
}

function saveEntry() {
    const completed = document.getElementById('statusCheck').checked;
    const note = document.getElementById('noteInput').value;

    if (!completed && !note && !currentPhotoBase64 && !currentAudioBlobBase64) {
        delete habits[selectedDateKey];
    } else {
        habits[selectedDateKey] = {
            completed,
            note,
            photo: currentPhotoBase64,
            audio: currentAudioBlobBase64
        };
    }

    try {
        localStorage.setItem('habitData', JSON.stringify(habits));
        renderCalendar();
        closeModal();
    } catch (e) {
        alert("Penyimpanan penuh! Hapus beberapa foto/audio lama.");
    }
}

// --- Photo Logic ---
function handlePhotoUpload(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            currentPhotoBase64 = e.target.result;
            document.getElementById('photoPreview').src = currentPhotoBase64;
            document.getElementById('photoPreview').classList.remove('hidden');
            document.getElementById('photoPlaceholder').classList.add('hidden');
            document.getElementById('removePhotoBtn').classList.remove('hidden');
        }
        reader.readAsDataURL(input.files[0]);
    }
}

function removePhoto() {
    currentPhotoBase64 = null;
    photoInput.value = '';
    removePhotoUI();
}

function removePhotoUI() {
    document.getElementById('photoPreview').classList.add('hidden');
    document.getElementById('photoPlaceholder').classList.remove('hidden');
    document.getElementById('removePhotoBtn').classList.add('hidden');
}

// --- Audio Logic ---
async function toggleRecording() {
    const btn = document.getElementById('recordBtn');
    const btnText = document.getElementById('recordBtnText');

    if (mediaRecorder && mediaRecorder.state === "recording") {
        stopRecording();
        btn.classList.remove('bg-red-100', 'text-red-600');
        btn.classList.add('bg-slate-100', 'text-slate-700');
        btnText.innerText = "Rekam";
    } else {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];

            mediaRecorder.ondataavailable = event => {
                audioChunks.push(event.data);
            };

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                const reader = new FileReader();
                reader.readAsDataURL(audioBlob);
                reader.onloadend = () => {
                    currentAudioBlobBase64 = reader.result;
                    const audioPlayer = document.getElementById('audioPlayer');
                    audioPlayer.src = currentAudioBlobBase64;
                    audioPlayer.classList.remove('hidden');
                    document.getElementById('removeAudioBtn').classList.remove('hidden');
                };
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            btn.classList.remove('bg-slate-100', 'text-slate-700');
            btn.classList.add('bg-red-100', 'text-red-600');
            btnText.innerText = "Stop...";
        } catch (err) {
            alert("Izin mikrofon diperlukan untuk merekam suara.");
            console.error(err);
        }
    }
}

function stopRecording() {
    if (mediaRecorder && mediaRecorder.state === "recording") {
        mediaRecorder.stop();
    }
}

function removeAudio() {
    currentAudioBlobBase64 = null;
    removeAudioUI();
}

function removeAudioUI() {
    const audioPlayer = document.getElementById('audioPlayer');
    audioPlayer.pause();
    audioPlayer.src = "";
    audioPlayer.classList.add('hidden');
    document.getElementById('removeAudioBtn').classList.add('hidden');
}

// --- Holiday Logic ---
function getHoliday(year, month, day) {
    const formattedDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const formattedMonthDay = `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    const fixedHolidays = {
        "01-01": "Tahun Baru Masehi",
        "05-01": "Hari Buruh Internasional",
        "06-01": "Hari Lahir Pancasila",
        "08-17": "Hari Kemerdekaan RI",
        "12-25": "Hari Raya Natal"
    };

    // Contoh data hari libur (perlu diupdate tiap tahun atau pakai library)
    const movableHolidays = {
        // 2025
        "2025-01-29": "Tahun Baru Imlek 2576",
        "2025-03-29": "Hari Raya Nyepi",
        "2025-03-31": "Idul Fitri 1446H",
        "2025-04-01": "Idul Fitri 1446H",
        "2025-05-01": "Hari Buruh",
        "2025-05-12": "Hari Raya Waisak",
        "2025-05-29": "Kenaikan Isa Al Masih",
        "2025-06-06": "Idul Adha 1446H",
        "2025-06-27": "Tahun Baru Islam 1447H",
        "2025-09-05": "Maulid Nabi Muhammad SAW",
        // 2026
        "2026-01-01": "Tahun Baru Masehi",
        "2026-02-17": "Tahun Baru Imlek 2577",
        "2026-03-19": "Hari Raya Nyepi",
        "2026-03-20": "Idul Fitri 1447H",
        "2026-04-03": "Wafat Isa Al Masih",
        "2026-05-01": "Hari Buruh",
        "2026-05-14": "Kenaikan Isa Al Masih",
        "2026-05-31": "Hari Raya Waisak",
        "2026-05-27": "Idul Adha 1447H",
        "2026-08-17": "Hari Kemerdekaan RI",
        "2026-08-26": "Maulid Nabi Muhammad SAW",
        "2026-12-25": "Hari Raya Natal"
    };

    return fixedHolidays[formattedMonthDay] || movableHolidays[formattedDate] || null;
}

// --- Time & Weather Logic ---
function initTimeAndWeather() {
    updateTime();
    setInterval(updateTime, 1000);
    getWeather();
    setInterval(getWeather, 15 * 60 * 1000); // Update cuaca tiap 15 menit
}

function updateTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const dateString = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' });
    
    const widget = document.getElementById('weatherTimeWidget');
    const timeEl = document.getElementById('liveTime');
    
    if (timeEl) timeEl.innerText = `${dateString}, ${timeString}`;
    if (widget) widget.classList.remove('hidden');
}

function getWeather() {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(async position => {
        try {
            const { latitude, longitude } = position.coords;
            // Menggunakan Open-Meteo API (Gratis, tanpa key)
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&timezone=auto`;
            
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.current_weather) {
                const { temperature, weathercode } = data.current_weather;
                const weatherDesc = getWeatherDesc(weathercode);
                const weatherEl = document.getElementById('liveWeather');
                if (weatherEl) {
                    weatherEl.innerHTML = `<i class="fas fa-cloud-sun"></i> ${Math.round(temperature)}°C ${weatherDesc}`;
                }
            }
        } catch (e) { console.error("Gagal memuat cuaca", e); }
    }, () => console.log("Izin lokasi ditolak"));
}

function getWeatherDesc(code) {
    // WMO Weather interpretation codes
    if (code === 0) return "Cerah";
    if (code <= 3) return "Berawan";
    if (code <= 48) return "Berkabut";
    if (code <= 67 || (code >= 80 && code <= 82)) return "Hujan";
    if (code >= 95) return "Badai";
    return "";
}
