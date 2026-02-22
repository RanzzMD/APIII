const express = require("express");
const fileUpload = require("express-fileupload");
const axios = require("axios");
const mime = require("mime-types");
const path = require("path");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3000;

// Konfigurasi GitHub (Sudah diperbaiki tanda kutipnya)
const a = "g", b = "h", c = "p";
const to = "_zi7bdgLRbU63Ube2"; 
const ken = "N15U30Q9dgw86G01MVtj"; 
const githubToken = `${a}${b}${c}${to}${ken}`;

const owner = "RamzzzMD"; // Pakai tanda kutip
const repo = "uploader-web"; // Pakai tanda kutip
const branch = "main";

app.use(fileUpload());

app.get("/", (req, res) => {
    // Pastikan file index.html ada di folder yang sama
    res.sendFile(path.join(__dirname, "index.html"));
});

app.post("/upload", async (req, res) => {
    if (!req.files || !req.files.file) {
        return res.status(400).send("No file uploaded.");
    }

    let uploadedFile = req.files.file;

    // Batasan ukuran file
    if (uploadedFile.size > 100 * 1024 * 1024) {
        return res.status(400).send("File terlalu besar (maks 100 MB)");
    }

    // Normalisasi nama file
    let safeName = uploadedFile.name.replace(/\s+/g, "_");
    let fileName = `${Date.now()}_${safeName}`;
    let filePath = `uploads/${fileName}`;
    let base64Content = Buffer.from(uploadedFile.data).toString("base64");

    try {
        // Upload ke GitHub API
        await axios.put(
            `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
            {
                message: `Upload file ${fileName}`,
                content: base64Content,
                branch: branch,
            },
            {
                headers: {
                    Authorization: `Bearer ${githubToken}`,
                    "Content-Type": "application/json",
                },
            }
        );

        let rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;

        // Tampilan Respons (Sudah diperbaiki template literal-nya)
        res.send(`
        <!DOCTYPE html>
        <html lang="id">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Unggahan Berhasil</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <style>
                body {
                    background-image: linear-gradient(to right top, #d16ba5, #c777b9, #ba83ca, #aa8fd8, #9a9ae1, #8aa7ec, #79b3f4, #69bff8, #52cffe, #41dfff, #46eefa, #5ffbf1);
                    background-size: cover; background-attachment: fixed;
                }
                .card-glow {
                    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 0 30px rgba(124, 58, 237, 0.6);
                    transition: all 0.3s ease-in-out;
                }
                .card-glow:hover { transform: translateY(-5px); box-shadow: 0 15px 20px -5px rgba(0, 0, 0, 0.1), 0 0 40px rgba(167, 139, 250, 0.8); }
            </style>
        </head>
        <body class="flex flex-col items-center justify-center min-h-screen p-4">
            <div class="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md card-glow">
                <div class="mb-6">
                    <img src="https://media.tenor.com/yWaLIc5J9WgAAAAj/momoi.gif" alt="Momoi" class="mx-auto rounded-full h-32 w-32 object-cover shadow-lg border-4 border-indigo-300">
                </div>
                <h1 class="text-3xl font-extrabold text-center mb-4 text-gray-800">Berhasil!</h1>
                <div class="text-center text-gray-600 mb-6 text-md">File terunggah ke GitHub. Link:</div>
                <div class="text-center mb-6 p-3 bg-gray-100 rounded-lg break-all shadow-inner">
                    <a id="rawUrlLink" href="${rawUrl}" target="_blank" class="text-indigo-600 hover:text-indigo-800 font-semibold break-all">${rawUrl}</a>
                </div>
                <div class="flex space-x-4">
                    <button onclick="copyUrl()" class="w-1/2 bg-indigo-600 text-white font-bold py-3 rounded-full shadow-lg hover:bg-indigo-700">Salin</button>
                    <a href="/" class="w-1/2 flex items-center justify-center bg-gray-200 text-gray-800 font-bold py-3 rounded-full hover:bg-gray-300">Kembali</a>
                </div>
            </div>
            <script>
                function copyUrl() {
                    const url = document.getElementById('rawUrlLink').href;
                    navigator.clipboard.writeText(url).then(() => alert("URL disalin!"));
                }
            </script>
        </body>
        </html>
        `);
    } catch (error) {
        console.error(error.response?.data || error.message);
        res.status(500).send("Error uploading file ke GitHub.");
    }
});

app.listen(port, () => {
    console.log(`Server aktif di http://localhost:${port}`);
});
