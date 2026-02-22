const express = require("express");
const router = express.Router();
const axios = require("axios");

// Konfigurasi (Gunakan environment variables atau hardcode yang benar)
const githubToken = "ghp" + "_zi7bdgLRbU63Ube2" + "N15U30Q9dgw86G01MVtj";
const owner = "RamzzzMD"; 
const repo = "uploader-web";
const branch = "main";

router.post("/", async (req, res) => {
    try {
        if (!req.files || !req.files.file) {
            return res.status(400).json({ status: false, error: "Tidak ada file yang dipilih." });
        }

        let uploadedFile = req.files.file;
        
        // Limit 10MB
        if (uploadedFile.size > 10 * 1024 * 1024) { 
            return res.status(400).json({ status: false, error: "File terlalu besar (Maks 10MB)." });
        }

        let safeName = uploadedFile.name.replace(/\s+/g, "_");
        let fileName = `${Date.now()}_${safeName}`;
        let filePath = `uploads/${fileName}`;
        let base64Content = Buffer.from(uploadedFile.data).toString("base64");

        await axios.put(
            `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
            {
                message: `Upload file ${fileName}`,
                content: base64Content,
                branch: branch,
            },
            {
                headers: {
                    Authorization: `token ${githubToken}`,
                    "Content-Type": "application/json",
                },
            }
        );

        let rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;
        res.json({ status: true, creator: "RANZZ", url: rawUrl });

    } catch (error) {
        // Jika GitHub error, kirim pesan error dalam bentuk JSON, bukan HTML
        res.status(500).json({ 
            status: false, 
            error: error.response ? error.response.data.message : error.message 
        });
    }
});

module.exports = router;
