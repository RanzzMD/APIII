const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Konfigurasi penyimpanan lokal
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = './uploads';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir); // Buat folder jika belum ada
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueName + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // Batas maksimal 10MB
});

router.post('/', upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Pilih file dulu, Ranzz!" });

    res.json({
      status: true,
      message: "File berhasil diunggah",
      fileInfo: {
        name: req.file.filename,
        size: (req.file.size / 1024).toFixed(2) + " KB",
        path: `/uploads/${req.file.filename}`
      }
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
