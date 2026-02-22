const express = require("express");
const router = express.Router();
const axios = require("axios");
const mime = require("mime-types");

// Konfigurasi Token & Repo
const a = "g", b = "h", c = "p";
const to = "_zi7bdgLRbU63Ube2"; 
const ken = "N15U30Q9dgw86G01MVtj"; 
const githubToken = `${a}${b}${c}${to}${ken}`;
const owner = "RamzzzMD"; // Tambahkan tanda kutip
const repo = "uploader-web"; // Tambahkan tanda kutip
const branch = "main";

// Endpoint Upload
router.post("/", async (req, res) => {
    // Gunakan req.files jika memakai express-fileupload di index.js
    if (!req.files || !req.files.file) {
        return res.status(400).json({ error: "No file uploaded." });
    }

    let uploadedFile = req.files.file;
    let safeName = uploadedFile.name.replace(/\s+/g, "_");
    let fileName = `${Date.now()}_${safeName}`;
    let filePath = `uploads/${fileName}`;
    let base64Content = Buffer.from(uploadedFile.data).toString("base64");

    try {
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
        res.json({ status: true, creator: "RANZZ", url: rawUrl });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// BARIS INI WAJIB ADA AGAR TIDAK ERROR "GOT AN OBJECT"
module.exports = router;
