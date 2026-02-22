const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

// Pastikan folder uploads tersedia secara otomatis
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

app.use(express.static(path.join(__dirname)));
app.use(express.json());
app.use('/uploads', express.static(uploadDir));

/* --- KONFIGURASI TAMPILAN --- */
const title = "RANZZ API";
const favicon = "https://raw.githubusercontent.com/RamzzzMD/tes-aja-lah/refs/heads/main/reply.jpg";
const logo = "https://raw.githubusercontent.com/RamzzzMD/tes-aja-lah/refs/heads/main/ChatGPT%20Image%20Feb%2022%2C%202026%2C%2010_35_52%20AM.png";
const headertitle = "REST API";
const headerdescription = "Kumpulan API Endpoint yang mungkin berguna.";
const footer = "© RANZZ";

// Dynamically load all routes
const router = express.Router();
const apiPath = path.join(__dirname, "api");
if (fs.existsSync(apiPath)) {
    const endpointDirs = fs.readdirSync(apiPath).filter((f) => fs.statSync(path.join(apiPath, f)).isDirectory());
    for (const category of endpointDirs) {
        const categoryPath = path.join(apiPath, category);
        const files = fs.readdirSync(categoryPath).filter((f) => f.endsWith(".js"));
        for (const file of files) {
            const route = require(path.join(categoryPath, file));
            router.use(`/${category}/${path.basename(file, ".js")}`, route);
        }
    }
}

// Utility untuk metadata /apilist
function getEndpointsFromRouter(category, file) {
    const endpoints = [];
    try {
        const route = require(path.join(apiPath, category, file));
        const subRouter = route.stack ? route : route.router || route;
        if (!subRouter || !subRouter.stack) return endpoints;
        subRouter.stack.forEach((layer) => {
            if (layer.route) {
                endpoints.push({
                    name: `/${category}/${file.replace(/\.js$/, "")}`,
                    path: `/api/${category}/${file.replace(/\.js$/, "")}`,
                    desc: `Endpoint: ${category} - ${file.replace(/\.js$/, "")}`,
                    status: "ready",
                    methods: Object.keys(layer.route.methods).map(m => m.toUpperCase())
                });
            }
        });
    } catch (e) { console.error(e); }
    return endpoints;
}

router.get("/apilist", (req, res) => {
    const categories = [];
    if (fs.existsSync(apiPath)) {
        const endpointDirs = fs.readdirSync(apiPath).filter((f) => fs.statSync(path.join(apiPath, f)).isDirectory());
        for (const category of endpointDirs) {
            const files = fs.readdirSync(path.join(apiPath, category)).filter(f => f.endsWith(".js"));
            const items = [];
            files.forEach(file => items.push(...getEndpointsFromRouter(category, file)));
            if (items.length) categories.push({ name: `${category.toUpperCase()} ENDPOINT`, items });
        }
    }
    res.json({ categories });
});

app.use("/api", router);

/* --- HALAMAN UTAMA (/) --- */
app.get("/", (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="id" class="dark">
<head>
    <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="styles.css" />
</head>
<body class="bg-black text-white font-mono p-4">
    <main class="max-w-xl mx-auto border-2 border-white p-6 raised-shadow mt-10">
        <div class="text-center mb-10">
            <img src="${logo}" class="w-32 h-32 mx-auto border-2 border-white mb-6 object-cover">
            <h1 class="text-2xl font-bold uppercase">${headertitle}</h1>
            <p class="text-[10px] opacity-60">${headerdescription}</p>
        </div>

        <div class="flex justify-center gap-4 mb-10">
            <a href="/docs" class="border-2 border-white px-8 py-2 hover:bg-white hover:text-black font-bold uppercase transition-all">DOKUMENTASI</a>
        </div>

        <div class="mb-10 p-4 border-2 border-dashed border-white/30 bg-white/5">
            <h3 class="text-xs font-bold mb-4 text-center uppercase tracking-widest">Upload Media</h3>
            <form id="uploadForm" class="space-y-4">
                <input type="file" id="fileInput" class="text-[10px] w-full file:bg-white file:text-black file:border-0 file:px-2 cursor-pointer">
                <button type="submit" class="w-full bg-white text-black font-bold py-2 text-xs uppercase hover:bg-gray-200 transition-all">UNGGAH FILE</button>
            </form>
            <div id="uploadStatus" class="text-[9px] mt-2 text-center break-all opacity-70"></div>
        </div>

        <h3 class="text-xs font-bold mb-4 uppercase tracking-widest border-b border-white/20 pb-2">Fitur Tersedia</h3>
        <div id="apiList" class="space-y-3">
            <div class="text-center py-6 opacity-30 animate-pulse text-[10px]">Menghubungkan...</div>
        </div>

        <div class="hidden">
            <span id="totalEndpoints">0</span><span id="totalCategories">0</span>
            <div id="batteryLevel"></div><span id="batteryPercentage"></span><span id="batteryStatus"></span><div id="batteryContainer"></div>
            <div id="socialContainer"></div><input type="text" id="searchInput">
            <button id="themeToggle"></button><div id="toast"><span id="toastMessage"></span><div id="toastIcon"></div></div>
        </div>
    </main>
    <script src="script.js"></script>
</body>
</html>`);
});

/* --- HALAMAN DOKUMENTASI (/docs) --- */
app.get("/docs", (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en" class="dark">
<head>
    <meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>${title} - Docs</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="styles.css" />
</head>
<body class="bg-black text-white font-mono min-h-screen p-4">
    <div id="toast" class="toast"><div class="flex items-center gap-3"><span id="toastIcon"></span><span id="toastMessage">Action completed</span></div></div>
    
    <button id="themeToggle" class="theme-toggle-btn border-2 border-white p-2">🌓</button>

    <main class="max-w-5xl mx-auto py-10">
        <header class="mb-12 text-center border-2 border-white p-8 raised-shadow">
            <img src="${logo}" class="w-32 h-32 mx-auto mb-6 border-2 border-white">
            <h1 class="text-4xl font-black mb-4 uppercase">${headertitle}</h1>
            <div class="flex flex-wrap justify-center gap-6 mt-6">
                <div class="border-2 border-white p-3 flex items-center gap-2">
                    <div id="batteryContainer" class="w-10 h-4 border border-white relative"><div id="batteryLevel" class="bg-white h-full" style="width: 0%"></div></div>
                    <span id="batteryPercentage" class="text-xs font-bold">0%</span>
                </div>
                <div class="border-2 border-white p-3 text-xs uppercase font-bold text-center">EP: <span id="totalEndpoints">0</span></div>
            </div>
        </header>

        <div class="mb-8"><input type="text" id="searchInput" placeholder="Search endpoints..." class="w-full bg-transparent border-2 border-white p-3 text-sm focus:outline-none"></div>
        <div id="apiList" class="space-y-4"></div>
        <div id="socialContainer" class="mt-12 flex justify-center gap-3 border-t-2 border-white pt-8"></div>
        <footer class="mt-12 text-center text-[10px] opacity-50">${footer}</footer>
    </main>
    <script src="script.js"></script>
</body>
</html>`);
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
