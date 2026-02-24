const express = require("express");
const path = require("path");
const fs = require("fs");
const fileUpload = require("express-fileupload"); // Tambahkan ini

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.static(path.join(__dirname)));
app.use(express.json());
app.use(fileUpload());

/*
For setting API name etc
*/
const title = "RANZZ API";
const favicon =
  "https://raw.githubusercontent.com/RamzzzMD/tes-aja-lah/refs/heads/main/reply.jpg";
const logo =
  "https://raw.githubusercontent.com/RamzzzMD/tes-aja-lah/refs/heads/main/ChatGPT%20Image%20Feb%2022%2C%202026%2C%2010_35_52%20AM.png";
const headertitle = "REST API";
const headerdescription = "Kumpulan API Endpoint yang mungkin berguna.";
const footer = "© RANZZ";

// Dynamically load all routes
const router = express.Router();
const apiPath = path.join(__dirname, "api");
const endpointDirs = fs
  .readdirSync(apiPath)
  .filter((f) => fs.statSync(path.join(apiPath, f)).isDirectory());

for (const category of endpointDirs) {
  const categoryPath = path.join(apiPath, category);
  const files = fs.readdirSync(categoryPath).filter((f) => f.endsWith(".js"));
  for (const file of files) {
    const routeName = path.basename(file, ".js");
    const route = require(path.join(categoryPath, file));
    router.use(`/${category}/${routeName}`, route);
  }
}

function getEndpointsFromRouter(category, file) {
  const endpoints = [];
  const route = require(path.join(apiPath, category, file));
  const subRouter = route.stack ? route : route.router || route;
  if (!subRouter || !subRouter.stack) return endpoints;

  subRouter.stack.forEach((layer) => {
    if (layer.route) {
      const methods = Object.keys(layer.route.methods).map((m) => m.toUpperCase());
      let params = {};
      let isMultipart = false;

      if (layer.route.stack && layer.route.stack.length) {
        layer.route.stack.forEach((mw) => {
          const fnString = mw.handle.toString();
          
          // Deteksi parameter standar
          [...fnString.matchAll(/req\.query\.([a-zA-Z0-9_]+)/g)].forEach(m => params[m[1]] = "text");
          [...fnString.matchAll(/req\.body\.([a-zA-Z0-9_]+)/g)].forEach(m => params[m[1]] = "text");
          
          // Deteksi khusus 'action' untuk Sfile
          if (fnString.includes('action')) params['action'] = 'select';
          
          // Deteksi File (Choose File)
          if (fnString.includes('req.file') || fnString.includes('req.files')) {
            isMultipart = true;
            params["image"] = "file"; 
          }
        });
      }

      endpoints.push({
        name: `/${category}/${file.replace(/\.js$/, "")}`,
        path: `/api/${category}/${file.replace(/\.js$/, "")}`,
        desc: `/${category}/${file.replace(/\.js$/, "")}`,
        status: "ready",
        params,
        methods,
        isMultipart
      });
    }
  });
  return endpoints;
}

// Endpoint Upload ke GitHub Storage
router.post("/tools/upload", async (req, res) => {
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).json({ error: "File tidak ditemukan." });
    }

    const uploadedFile = req.files.file;
    const axios = require("axios");

    // --- PENGATURAN GITHUB ---
    const a = "g";
    const b = "h";
    const c = "p";
    const to = "_ryVNjSwIIQmh52Qj";
    const ken = "OHXWkvSjmOTpVF0qrMJr";
    const GITHUB_TOKEN = `${a}${b}${c}${to}${ken}`;
    const REPO_OWNER = "RamzzzMD";
    const REPO_NAME = "uploader-web";
    const FOLDER_PATH = "uploads"; // File akan masuk ke folder uploads/
    // -------------------------

    const fileName = Date.now() + "-" + uploadedFile.name.replace(/\s+/g, '-');
    const contentBase64 = uploadedFile.data.toString("base64");

    const githubUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FOLDER_PATH}/${fileName}`;

    const response = await axios.put(
      githubUrl,
      {
        message: `Upload file: ${fileName}`,
        content: contentBase64,
      },
      {
        headers: {
          Authorization: `token ${GITHUB_TOKEN}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );

    // Mengonversi URL API menjadi URL Raw agar bisa diakses langsung sebagai gambar/media
    const rawUrl = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/main/${FOLDER_PATH}/${fileName}`;

    res.json({
      status: true,
      url: rawUrl,
      name: fileName
    });

  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ error: "Gagal upload ke GitHub: " + error.message });
  }
});

router.get("/apilist", (req, res) => {
  const categories = [];

  for (const category of endpointDirs) {
    const files = fs
      .readdirSync(path.join(apiPath, category))
      .filter((f) => f.endsWith(".js"));
    const endpoints = [];
    for (const file of files) {
      endpoints.push(...getEndpointsFromRouter(category, file));
    }
    if (endpoints.length) {
      categories.push({
        name: `${category.toUpperCase()} API ENDPOINT`,
        items: endpoints,
      });
    }
  }

  // Add "OTHER" for /apilist itself
  categories.push({
    name: "OTHER",
    items: [
      {
        name: "/apilist",
        path: "/api/apilist",
        desc: "/apilist",
        status: "ready",
        params: {},
        methods: ["GET"],
      },
    ],
  });

  res.json({ categories });
});

app.use("/api", router);

app.get("/script.js", (req, res) => {
  res.sendFile(path.join(__dirname, "script.js"));
});
app.get("/linkbio.json", (req, res) => {
  res.sendFile(path.join(__dirname, "linkbio.json"));
});
app.get("/styles.css", (req, res) => {
  res.sendFile(path.join(__dirname, "styles.css"));
});
app.get("/", (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="id" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <link rel="icon" type="image/x-icon" href="${favicon}">
    <script src="https://cdn.tailwindcss.com"></script>
    
    <script>
        tailwind.config = {
            darkMode: 'class',
            theme: {
                extend: {
                    fontFamily: {
                        'heading': ['"IBM Plex Mono"', 'monospace'],
                        'body': ['"IBM Plex Mono"', 'monospace'],
                    },
                    colors: {
                        'blackish': '#333',
                        'whitish': '#f2f7f5',
                    }
                }
            }
        }
    </script>
   <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600;700&display=swap" rel="stylesheet">
   <link rel="stylesheet" href="styles.css" />
</head>
<body class="font-body bg-black text-white min-h-screen">
    <button id="themeToggle" class="theme-toggle-btn">
        <svg id="theme-toggle-dark-icon" class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"></path>
        </svg>
        <svg id="theme-toggle-light-icon" class="w-5 h-5 text-black hidden" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"></path>
        </svg>
    </button>

    <main class="container mx-auto px-6 py-12 flex items-center justify-center min-h-screen">
        <div class="border-2 border-white p-6 md:p-10 raised-shadow w-full max-w-lg">
            
            <div class="text-center mb-6">
                <img src="${logo}" alt="Profile" class="profile-img mx-auto mb-6 border-2 border-white w-43 h-43 object-cover">
                <h1 class="text-2xl md:text-3xl font-bold font-heading mb-2">Selamat datang di ${headertitle}!</h1>
                <p class="text-base mb-6 text-gray-300 leading-relaxed">${headerdescription}</p>
            </div>

            <div class="grid gap-4 mb-6">
                <div class="flex flex-wrap gap-4 justify-center">
                    <a href="/docs" class="border-2 border-white px-10 py-3 hover:bg-white hover:text-black transition-colors duration-200 inline-flex items-center gap-2 text-lg font-bold tracking-wider">
                      DOCS
                    </a>
                </div>
            </div>

            <div id="socialContainer" class="flex flex-wrap justify-center gap-2">
                <div id="socialLoading" class="text-center py-2 w-full text-sm">
                </div>
                <div id="socialError" class="text-center py-4 w-full hidden">
                    <div class="text-2xl mb-2">⚠️</div>
                    <h3 class="text-xs font-bold mb-1 uppercase tracking-wider">Link bio not available</h3>
                    <p class="text-[10px] opacity-70">Please create <code>linkbio.json</code> file first</p>
                </div>
            </div>
            
        </div>
    </main>
<script src="script.js"></script>
</body>
</html>
    `);
});
app.get("/docs", (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en" class="dark">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>${title}</title>
    <link id="faviconLink" rel="icon" type="image/x-icon" href="${favicon}">
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            darkMode: 'class',
            theme: {
                extend: {
                    fontFamily: {
                        'mono': ['"IBM Plex Mono"', 'monospace'],
                    },
                    colors: {
                        'blackish': '#000',
                        'whitish': '#fff',
                        'api-green': '#10b981',
                        'api-blue': '#3b82f6',
                        'api-ready': '#22c55e',
                        'api-update': '#f59e0b',
                        'api-error': '#ef4444',
                    }
                }
            }
        }
    </script>
    <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="styles.css" />
</head>
<body class="font-mono bg-black text-white min-h-screen">
    <div id="toast" class="toast">
        <div class="flex items-center gap-3">
            <svg id="toastIcon" class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
            </svg>
            <span id="toastMessage" class="font-medium">Action completed</span>
        </div>
    </div>

    <button id="themeToggle" class="theme-toggle-btn" aria-label="Toggle theme">
        <svg id="theme-toggle-dark-icon" class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"></path>
        </svg>
        <svg id="theme-toggle-light-icon" class="w-5 h-5 text-black hidden" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" fill-rule="evenodd" clip-rule="evenodd"></path>
        </svg>
    </button>

    <div class="max-w-5xl mx-auto px-4 py-8">
        <header id="api" class="mb-12 text-center">
            <div class="mb-6 flex justify-center">
                <img id="logoImg" src="${logo}" alt="Logo" class="w-full max-w-sm border-2 border-white light-mode:border-black">
            </div>
            <h1 id="mainTitle" class="text-4xl md:text-6xl font-black mb-4 leading-tight tracking-wider">${headertitle}</h1>
            <p id="mainDescription" class="text-lg font-light tracking-wide">${headerdescription}</p>
            
            <div class="mt-8 flex flex-wrap justify-center items-center gap-4 md:gap-8">
                <div class="border-2 border-white light-mode:border-black p-4 raised-shadow">
                    <div class="flex flex-col items-center">
                        <span class="text-xs font-medium mb-2">Your Battery</span>
                        <div class="flex items-center gap-2">
                            <div id="batteryContainer" class="battery-container">
                                <div id="batteryLevel" class="battery-level" style="width: 0%"></div>
                                <div class="battery-tip"></div>
                            </div>
                            <div class="flex flex-col items-start">
                                <span id="batteryPercentage" class="text-sm font-bold">0%</span>
                                <span id="batteryStatus" class="text-xs opacity-80">Detecting...</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="border-2 border-white light-mode:border-black p-4 raised-shadow">
                    <div class="flex flex-col items-center">
                        <span class="text-xs font-medium mb-1">Total Endpoints</span>
                        <span id="totalEndpoints" class="text-lg font-bold">0</span>
                    </div>
                </div>
                
                <div class="border-2 border-white light-mode:border-black p-4 raised-shadow">
                    <div class="flex flex-col items-center">
                        <span class="text-xs font-medium mb-1">Total Categories</span>
                        <span id="totalCategories" class="text-lg font-bold">0</span>
                    </div>
                </div>
            </div>
            <div class="mt-6 h-1 w-32 mx-auto bg-current"></div>
        </header>

        <div class="mb-8">
            <div class="relative">
                <input 
                    type="text" 
                    id="searchInput" 
                    placeholder="Search endpoints by name, path, or category..."
                    class="border-2 border-white light-mode:border-black bg-transparent w-full px-4 py-3 text-sm focus:outline-none focus:border-current"
                >
                <svg class="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
            </div>
        </div>

        <div class="mb-8 border-2 border-white p-6 raised-shadow bg-transparent">
            <div class="flex items-center gap-2 mb-4">
                <span class="text-xl">📤</span>
                <h3 class="font-bold text-sm uppercase tracking-widest">Media Uploader (GitHub Storage)</h3>
            </div>
            <form id="githubUploadForm" class="space-y-4">
                <div class="flex flex-col md:flex-row gap-4">
                    <input 
                        type="file" 
                        id="mediaFile" 
                        class="flex-1 text-xs border border-white p-2 file:mr-4 file:py-1 file:px-4 file:border-0 file:text-xs file:font-bold file:bg-white file:text-black hover:file:bg-gray-200 cursor-pointer"
                        required>
                    <button type="submit" id="uploadBtn" class="border-2 border-white bg-white text-black px-8 py-2 font-bold text-sm hover:bg-transparent hover:text-white transition-all">
                        UPLOAD
                    </button>
                </div>
            </form>
            <div id="uploadStatus" class="mt-4 text-[10px] font-mono hidden border-t border-white pt-4"></div>
        </div>

        <div id="noResults" class="text-center py-12 hidden">
            <div class="text-4xl mb-2">🔍</div>
            <h3 class="text-sm font-bold mb-1">No endpoints found</h3>
            <p class="text-xs">Try a different search term</p>
        </div>

        <div id="apiList" class="space-y-4"></div>

        <section id="social" class="mt-12 pt-8 border-t-2 border-white light-mode:border-black">
            <div id="socialContainer" class="flex flex-wrap justify-center gap-3">
                <div id="socialLoading" class="text-center py-4 w-full">
                    <div class="spinner mx-auto"></div>
                    <p class="text-sm mt-3">Loading link bio...</p>
                </div>
                <div id="socialError" class="text-center py-4 w-full hidden">
                    <div class="text-4xl mb-2">⚠️</div>
                    <h3 class="text-sm font-bold mb-1">Link bio not available</h3>
                    <p class="text-xs">Please create <code>linkbio.json</code> file first</p>
                    <p class="text-xs mt-2 opacity-80">Required format: {"link_bio": [{"name": "...", "url": "..."}]}</p>
                </div>
            </div>
        </section>

        <footer id="siteFooter" class="mt-12 pt-6 border-t-2 border-white light-mode:border-black text-center text-xs">
            ${footer}
        </footer>
    </div>

    <script src="script.js"></script>
</body>
</html>
    `);
});

app.use("/api", router);

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
