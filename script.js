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

// --- LOGIKA TEMA (Sesuai kode asli Ranzz) ---
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'light') {
        enableLightMode();
    } else {
        enableDarkMode();
    }
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
    document.querySelectorAll('audio').forEach(audio => {
        audio.classList.remove('border-white');
        audio.classList.add('border-black');
    });
    themeToggleBtn.classList.remove('bg-black', 'border-white');
    themeToggleBtn.classList.add('bg-white', 'border-black');
    themeToggleBtn.style.boxShadow = '0.3rem 0.3rem 0 #ccc';
    themeToggleDarkIcon.classList.add('hidden');
    themeToggleLightIcon.classList.remove('hidden');
}

function enableDarkMode() {
    body.classList.remove('light-mode');
    body.classList.remove('bg-white', 'text-black');
    body.classList.add('bg-black', 'text-white');
    document.querySelectorAll('.border-black').forEach(el => {
        el.classList.remove('border-black');
        el.classList.add('border-white');
    });
    document.querySelectorAll('audio').forEach(audio => {
        audio.classList.remove('border-black');
        audio.classList.add('border-white');
    });
    themeToggleBtn.classList.remove('bg-white', 'border-black');
    themeToggleBtn.classList.add('bg-black', 'border-white');
    themeToggleBtn.style.boxShadow = '0.3rem 0.3rem 0 #222';
    themeToggleDarkIcon.classList.remove('hidden');
    themeToggleLightIcon.classList.add('hidden');
}

// --- LOGIKA BATERAI (Sesuai kode asli Ranzz) ---
function initBatteryDetection() {
    const batteryLevelElement = document.getElementById('batteryLevel');
    const batteryPercentageElement = document.getElementById('batteryPercentage');
    const batteryStatusElement = document.getElementById('batteryStatus');
    const batteryContainer = document.getElementById('batteryContainer');
    
    if ('getBattery' in navigator) {
        navigator.getBattery().then(function(battery) {
            function updateBatteryInfo() {
                const level = battery.level * 100;
                const isCharging = battery.charging;
                const roundedLevel = Math.round(level);
                batteryPercentageElement.textContent = `${roundedLevel}%`;
                batteryLevelElement.style.width = `${level}%`;
                if (isCharging) {
                    batteryContainer.classList.add('charging');
                    batteryStatusElement.textContent = 'Charging';
                } else {
                    batteryContainer.classList.remove('charging');
                    batteryStatusElement.textContent = battery.dischargingTime === Infinity ? 'Fully charged' : 'Discharging';
                }
                if (isCharging && battery.chargingTime !== Infinity) {
                    const h = Math.floor(battery.chargingTime / 3600);
                    const m = Math.floor((battery.chargingTime % 3600) / 60);
                    batteryStatusElement.textContent = `Charging (${h}h ${m}m)`;
                } else if (!isCharging && battery.dischargingTime !== Infinity) {
                    const h = Math.floor(battery.dischargingTime / 3600);
                    const m = Math.floor((battery.dischargingTime % 3600) / 60);
                    batteryStatusElement.textContent = `${h}h ${m}m left`;
                }
            }
            updateBatteryInfo();
            battery.addEventListener('levelchange', updateBatteryInfo);
            battery.addEventListener('chargingchange', updateBatteryInfo);
            batteryMonitor = battery;
        }).catch(() => fallbackBattery());
    } else {
        fallbackBattery();
    }
    
    function fallbackBattery() {
        batteryStatusElement.textContent = 'Simulated';
        let level = 75;
        batteryPercentageElement.textContent = `${level}%`;
        batteryLevelElement.style.width = `${level}%`;
    }
}

// --- LOGIKA DASHBOARD & UI ---
function updateTotalEndpoints() {
    document.getElementById('totalEndpoints').textContent = totalEndpoints;
}

function updateTotalCategories() {
    document.getElementById('totalCategories').textContent = totalCategories;
}

function showToast(message, isError = false) {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    const toastIcon = document.getElementById('toastIcon');
    toastMessage.textContent = message;
    if (isError) {
        toastIcon.innerHTML = '<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>';
    } else {
        toastIcon.innerHTML = '<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>';
    }
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

function copyText(text, type = 'path') {
    navigator.clipboard.writeText(text).then(() => {
        showToast(`${type} copied to clipboard!`);
    }).catch(() => showToast('Failed to copy', true));
}

function toggleCategory(index) {
    const content = document.getElementById(`cat-${index}`);
    const icon = document.getElementById(`cat-icon-${index}`);
    content.classList.toggle('hidden');
    icon.style.transform = content.classList.contains('hidden') ? 'rotate(0deg)' : 'rotate(180deg)';
}

function toggleEndpoint(catIdx, epIdx) {
    const content = document.getElementById(`ep-${catIdx}-${epIdx}`);
    const icon = document.getElementById(`ep-icon-${catIdx}-${epIdx}`);
    content.classList.toggle('hidden');
    icon.style.transform = content.classList.contains('hidden') ? 'rotate(0deg)' : 'rotate(180deg)';
}

// --- LOGIKA MEDIA PREVIEW ---
function isMediaFile(url) {
    const exts = ['.jpg','.jpeg','.png','.gif','.mp4','.webm','.mp3','.wav','.pdf'];
    return exts.some(ext => url.toLowerCase().includes(ext)) || url.startsWith('data:');
}

function createMediaPreview(url, contentType) {
    if (contentType?.includes('image') || url.match(/\.(jpg|jpeg|png|gif|webp)$/)) {
        return `<div class="media-preview"><img src="${url}" class="media-image"></div>`;
    }
    if (contentType?.includes('video') || url.match(/\.(mp4|webm)$/)) {
        return `<div class="media-preview"><video controls class="media-iframe"><source src="${url}"></video></div>`;
    }
    if (contentType?.includes('audio') || url.match(/\.(mp3|wav)$/)) {
        return `<div class="media-preview"><audio controls class="w-full"><source src="${url}"></audio></div>`;
    }
    return `<div class="media-preview"><iframe src="${url}" class="media-iframe" frameborder="0"></iframe></div>`;
}

// --- EKSEKUSI REQUEST (Sesuai kode asli Ranzz) ---
async function executeRequest(e, catIdx, epIdx, method, path) {
    e.preventDefault();
    if (isRequestInProgress) return showToast('Please wait...', true);

    const form = document.getElementById(`form-${catIdx}-${epIdx}`);
    const responseDiv = document.getElementById(`response-${catIdx}-${epIdx}`);
    const responseContent = document.getElementById(`response-content-${catIdx}-${epIdx}`);
    const curlSection = document.getElementById(`curl-section-${catIdx}-${epIdx}`);
    const urlSection = document.getElementById(`url-section-${catIdx}-${epIdx}`);
    const executeBtn = form.querySelector('button[type="submit"]');
    
    isRequestInProgress = true;
    executeBtn.disabled = true;
    executeBtn.classList.add('btn-loading');
    
    const formData = new FormData(form);
    const params = new URLSearchParams();
    for (const [k, v] of formData.entries()) if(v) params.append(k, v);

    const fullPath = `${BASE_URL}${path.split('?')[0]}?${params.toString()}`;
    responseDiv.classList.remove('hidden');
    responseContent.innerHTML = '<div class="spinner mx-auto"></div>';
    
    document.getElementById(`url-command-${catIdx}-${epIdx}`).textContent = fullPath;
    urlSection.classList.remove('hidden');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
        const response = await fetch(fullPath, { signal: controller.signal });
        clearTimeout(timeout);
        const contentType = response.headers.get("content-type");
        
        if (contentType?.includes("application/json")) {
            const data = await response.json();
            responseContent.innerHTML = `<pre class="text-sm overflow-auto">${JSON.stringify(data, null, 2)}</pre>`;
        } else if (contentType?.startsWith("image/") || contentType?.startsWith("video/") || contentType?.startsWith("audio/")) {
            const blob = await response.blob();
            const mediaUrl = URL.createObjectURL(blob);
            responseContent.innerHTML = createMediaPreview(mediaUrl, contentType);
        } else {
            const text = await response.text();
            responseContent.innerHTML = isMediaFile(text) ? createMediaPreview(text, contentType) : `<pre class="text-sm overflow-auto">${text}</pre>`;
        }
        showToast('Success!');
    } catch (err) {
        responseContent.innerHTML = `<pre class="text-sm">Error: ${err.message}</pre>`;
        showToast('Failed!', true);
    } finally {
        isRequestInProgress = false;
        executeBtn.disabled = false;
        executeBtn.classList.remove('btn-loading');
    }
}

function clearResponse(catIdx, epIdx) {
    document.getElementById(`response-${catIdx}-${epIdx}`).classList.add('hidden');
    document.getElementById(`url-section-${catIdx}-${epIdx}`).classList.add('hidden');
}

// --- LOGIKA LOAD API & SEARCH (Sesuai kode asli Ranzz) ---
function loadApis() {
    const apiList = document.getElementById('apiList');
    if (!apiData) return;
    
    totalEndpoints = 0;
    apiData.categories.forEach(c => totalEndpoints += c.items.length);
    totalCategories = apiData.categories.length;
    updateTotalEndpoints();
    updateTotalCategories();
    
    let htmlContent = '';
    apiData.categories.forEach((category, catIdx) => {
        htmlContent += `
        <div class="category-group fade-in mb-4" data-category="${category.name.toLowerCase()}">
            <div class="raised-shadow border-white bg-transparent">
                <button onclick="toggleCategory(${catIdx})" class="w-full px-4 py-3 flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <span class="text-lg">📁</span>
                        <h3 class="font-bold text-sm text-left">${category.name}</h3>
                    </div>
                    <svg id="cat-icon-${catIdx}" class="w-4 h-4 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7"/></svg>
                </button>
                <div id="cat-${catIdx}" class="hidden">`;
        
        category.items.forEach((item, epIdx) => {
            const method = item.methods?.[0] || 'GET';
            htmlContent += `
            <div class="api-item border-t border-white" data-path="${item.path.toLowerCase()}">
                <button onclick="toggleEndpoint(${catIdx}, ${epIdx})" class="w-full px-4 py-2 text-left text-xs flex justify-between items-center">
                    <span><span class="font-bold mr-2">${method}</span>${item.path}</span>
                    <svg id="ep-icon-${catIdx}-${epIdx}" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7"/></svg>
                </button>
                <div id="ep-${catIdx}-${epIdx}" class="hidden p-4 border-t border-white bg-transparent">
                    <p class="text-[10px] mb-3 opacity-70">${item.desc}</p>
                    <form id="form-${catIdx}-${epIdx}" onsubmit="executeRequest(event, ${catIdx}, ${epIdx}, '${method}', '${item.path}')">
                        <div class="space-y-3 mb-4">
                            ${Object.keys(item.params || {}).map(p => `
                                <div>
                                    <label class="block text-[10px] mb-1 font-bold uppercase">${p}</label>
                                    <input type="text" name="${p}" class="border border-white bg-transparent w-full px-2 py-1 text-xs" placeholder="value" required>
                                </div>`).join('')}
                        </div>
                        <button type="submit" class="border border-white px-4 py-1 text-[10px] font-bold hover:bg-white hover:text-black">EXECUTE</button>
                        <button type="button" onclick="clearResponse(${catIdx}, ${epIdx})" class="border border-white px-4 py-1 text-[10px] font-bold ml-2">CLEAR</button>
                    </form>
                    <div id="url-section-${catIdx}-${epIdx}" class="hidden mt-4 text-[10px]"><p class="font-bold mb-1">URL:</p><code id="url-command-${catIdx}-${epIdx}" class="break-all opacity-70"></code></div>
                    <div id="response-${catIdx}-${epIdx}" class="hidden mt-4 border border-white p-2 max-h-60 overflow-auto" id="response-content-${catIdx}-${epIdx}"></div>
                </div>
            </div>`;
        });
        htmlContent += `</div></div></div>`;
    });
    apiList.innerHTML = htmlContent;
}

function performSearch() {
    const term = document.getElementById('searchInput').value.toLowerCase();
    document.querySelectorAll('.api-item').forEach(item => {
        const path = item.getAttribute('data-path');
        item.classList.toggle('hidden', !path.includes(term));
    });
}

// --- MAIN INIT ---
document.addEventListener('DOMContentLoaded', function() {
    initTheme();
    initBatteryDetection();
    
    fetch('/api/apilist')
        .then(res => res.json())
        .then(data => { apiData = data; loadApis(); });

    // --- UPLOAD LOGIC (Sesuai file script.js terakhir Ranzz) ---
    const fileInput = document.getElementById('fileInput');
    const fileLabel = document.getElementById('fileLabel');
    fileInput?.addEventListener('change', (e) => {
        fileLabel.innerText = e.target.files[0]?.name || "Klik atau seret file ke sini";
    });

    document.getElementById('uploadForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const status = document.getElementById('uploadStatus');
        const submitBtn = e.target.querySelector('button');
        if (!fileInput.files[0]) return showToast("Pilih file dulu!", true);

        const formData = new FormData();
        formData.append('file', fileInput.files[0]);
        status.classList.remove('hidden');
        status.innerText = "Sedang mengunggah...";
        submitBtn.disabled = true;

        try {
            const res = await fetch('/api/tools/upload', { method: 'POST', body: formData });
            const result = await res.json();
            if (result.status) {
                const finalUrl = result.result?.url || result.fileInfo?.path;
                status.innerHTML = `Sukses! <a href="${finalUrl}" target="_blank" class="underline">Buka File</a>`;
                showToast("File berhasil diunggah!");
            } else {
                status.innerText = "Gagal: " + result.message;
            }
        } catch (err) {
            status.innerText = "Gagal: Server Error";
        } finally {
            submitBtn.disabled = false;
        }
    });
});

themeToggleBtn?.addEventListener('click', toggleTheme);
document.getElementById('searchInput')?.addEventListener('input', performSearch);
