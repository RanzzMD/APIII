const BASE_URL = window.location.origin;
let isRequestInProgress = false;
let apiData = null;
let allApiElements = [];
let totalEndpoints = 0;
let totalCategories = 0;
let batteryMonitor = null;

const themeToggleBtn = document.getElementById('themeToggle');
const themeToggleDarkIcon = document.getElementById('theme-toggle-dark-icon');
const themeToggleLightIcon = document.getElementById('theme-toggle-light-icon');
const html = document.documentElement;
const body = document.body;

// --- LOGIKA TEMA (ASLI) ---
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'light') enableLightMode();
    else enableDarkMode();
}

function toggleTheme() {
    if (body.classList.contains('light-mode')) {
        enableDarkMode();
        localStorage.setItem('theme', 'dark');
    } else {
        enableLightMode();
        localStorage.setItem('theme', 'light');
    }
}

function enableLightMode() {
    body.classList.add('light-mode');
    body.classList.remove('bg-black', 'text-white');
    body.classList.add('bg-white', 'text-black');
    document.querySelectorAll('.border-white').forEach(el => {
        el.classList.remove('border-white');
        el.classList.add('border-black');
    });
    themeToggleBtn?.classList.remove('bg-black', 'border-white');
    themeToggleBtn?.classList.add('bg-white', 'border-black');
    if (themeToggleBtn) themeToggleBtn.style.boxShadow = '0.3rem 0.3rem 0 #ccc';
    themeToggleDarkIcon?.classList.add('hidden');
    themeToggleLightIcon?.classList.remove('hidden');
}

function enableDarkMode() {
    body.classList.remove('light-mode');
    body.classList.remove('bg-white', 'text-black');
    body.classList.add('bg-black', 'text-white');
    document.querySelectorAll('.border-black').forEach(el => {
        el.classList.remove('border-black');
        el.classList.add('border-white');
    });
    themeToggleBtn?.classList.remove('bg-white', 'border-black');
    themeToggleBtn?.classList.add('bg-black', 'border-white');
    if (themeToggleBtn) themeToggleBtn.style.boxShadow = '0.3rem 0.3rem 0 #222';
    themeToggleDarkIcon?.classList.remove('hidden');
    themeToggleLightIcon?.classList.add('hidden');
}

// --- LOGIKA BATERAI (ASLI) ---
function initBatteryDetection() {
    const batteryLevelElement = document.getElementById('batteryLevel');
    const batteryPercentageElement = document.getElementById('batteryPercentage');
    const batteryStatusElement = document.getElementById('batteryStatus');
    const batteryContainer = document.getElementById('batteryContainer');
    
    if ('getBattery' in navigator) {
        navigator.getBattery().then(function(battery) {
            function updateBatteryInfo() {
                const level = battery.level * 100;
                if (batteryPercentageElement) batteryPercentageElement.textContent = `${Math.round(level)}%`;
                if (batteryLevelElement) batteryLevelElement.style.width = `${level}%`;
                if (batteryStatusElement) batteryStatusElement.textContent = battery.charging ? 'Charging' : 'Discharging';
            }
            updateBatteryInfo();
            battery.addEventListener('levelchange', updateBatteryInfo);
            battery.addEventListener('chargingchange', updateBatteryInfo);
        }).catch(() => fallbackBattery());
    } else {
        fallbackBattery();
    }
    
    function fallbackBattery() {
        if (batteryStatusElement) batteryStatusElement.textContent = 'Simulated';
        if (batteryPercentageElement) batteryPercentageElement.textContent = '75%';
        if (batteryLevelElement) batteryLevelElement.style.width = '75%';
    }
}

// --- FUNGSI TOAST & COPY ---
function showToast(message, isError = false) {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    if (!toast || !toastMessage) return;
    toastMessage.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

function copyText(text, type = 'path') {
    navigator.clipboard.writeText(text).then(() => {
        showToast(`${type} copied to clipboard!`);
    });
}

// --- EKSEKUSI API & SEARCH ---
function loadApis() {
    const apiList = document.getElementById('apiList');
    if (!apiData) return;
    
    let html = '';
    apiData.categories.forEach((category, catIdx) => {
        html += `
        <div class="category-group raised-shadow border-white mb-4">
            <button onclick="toggleCategory(${catIdx})" class="w-full px-4 py-3 flex justify-between items-center text-xs font-bold uppercase">
                <span>${category.name} (${category.items.length})</span>
                <svg id="cat-icon-${catIdx}" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7"/></svg>
            </button>
            <div id="cat-${catIdx}" class="hidden border-t border-white">
                ${category.items.map((item, epIdx) => `
                    <div class="api-item p-4 border-b border-white last:border-0" data-path="${item.path.toLowerCase()}">
                        <div class="flex justify-between items-center mb-2">
                            <span class="text-[10px] font-bold px-2 py-0.5 border border-white">${item.methods[0]}</span>
                            <span class="text-[10px] opacity-60">${item.path}</span>
                        </div>
                        <p class="text-[10px] mb-3 opacity-80">${item.desc}</p>
                        <form id="form-${catIdx}-${epIdx}" onsubmit="executeRequest(event, ${catIdx}, ${epIdx}, '${item.methods[0]}', '${item.path}')">
                            <button type="submit" class="border border-white px-3 py-1 text-[10px] font-bold hover:bg-white hover:text-black transition-all">EXECUTE</button>
                        </form>
                        <div id="response-${catIdx}-${epIdx}" class="hidden mt-3 p-2 border border-white text-[9px] font-mono break-all max-h-32 overflow-auto bg-white bg-opacity-5"></div>
                    </div>
                `).join('')}
            </div>
        </div>`;
    });
    apiList.innerHTML = html;
}

function toggleCategory(idx) {
    const el = document.getElementById(`cat-${idx}`);
    const icon = document.getElementById(`cat-icon-${idx}`);
    el.classList.toggle('hidden');
    if (icon) icon.style.transform = el.classList.contains('hidden') ? 'rotate(0deg)' : 'rotate(180deg)';
}

async function executeRequest(e, catIdx, epIdx, method, path) {
    e.preventDefault();
    const resDiv = document.getElementById(`response-${catIdx}-${epIdx}`);
    resDiv.classList.remove('hidden');
    resDiv.innerText = "Loading...";
    try {
        const res = await fetch(path);
        const data = await res.json();
        resDiv.innerText = JSON.stringify(data, null, 2);
    } catch (err) {
        resDiv.innerText = "Error: " + err.message;
    }
}

// --- LOGIKA UPLOAD (Disesuaikan untuk GitHub Uploader baru) ---
function initUploadFeature() {
    const fileInput = document.getElementById('fileInput');
    const fileLabel = document.getElementById('fileLabel');
    const uploadForm = document.getElementById('uploadForm');
    const uploadStatus = document.getElementById('uploadStatus');

    fileInput?.addEventListener('change', (e) => {
        fileLabel.innerText = e.target.files[0]?.name || "Klik untuk pilih file";
    });

    uploadForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = e.target.querySelector('button');
        if (!fileInput.files[0]) return showToast("Pilih file dulu!", true);

        const formData = new FormData();
        formData.append('file', fileInput.files[0]);

        uploadStatus.classList.remove('hidden');
        uploadStatus.innerText = "⏳ Mengunggah ke GitHub...";
        submitBtn.disabled = true;

        try {
            const res = await fetch('/api/tools/upload', { method: 'POST', body: formData });
            const result = await res.json();
            
            // Mencocokkan dengan respon: { status: true, url: rawUrl }
            if (result.status) {
                showToast("Berhasil diunggah ke GitHub!");
                uploadStatus.innerHTML = `
                    <div class="text-green-500 font-bold mb-1">UPLOAD BERHASIL!</div>
                    <div class="opacity-70 mb-2">Creator: ${result.creator || 'RANZZ'}</div>
                    <a href="${result.url}" target="_blank" class="underline break-all text-blue-400">${result.url}</a>
                `;
            } else {
                throw new Error(result.error || "Gagal mengunggah");
            }
        } catch (err) {
            uploadStatus.innerText = "GAGAL: " + err.message;
            showToast(err.message, true);
        } finally {
            submitBtn.disabled = false;
        }
    });
}

// --- MAIN RUN ---
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initBatteryDetection();
    initUploadFeature();
    
    fetch('/api/apilist')
        .then(res => res.json())
        .then(data => { apiData = data; loadApis(); });
        
    themeToggleBtn?.addEventListener('click', toggleTheme);
});
