import express from 'express';
import fs from 'fs';
import path from 'fs'; // Gunakan path jika perlu manipulasi path file
import axios from 'axios';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// --- CONFIG & UTILS START ---
const PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAo+yvc35R8VPsfy1ScmQap+vVg/IYTcZCiJP5iiIo0HFLBrfDhwZ30wpvQ8lpezTN3exdZU3edIspp+weCgifbjFEyI7/Ecce7GTYXZyLncBrjzvO6IohPnaz/hx7+Uy6eNw8DNk15sxcJrQeSOULtOWJJ8dJ2IbR1eRIp0PXwJeXqdfoT52WzT/FaNzwh7sWmt4Zl8cw9o9JvdTqdU3WsCsdqsOXWIgyP/UIFWM+uu7P1xJ/DY40nMokHlG+fDdiT0us5Vu4LNUt3Er8OOZynnOESSQUocSvpb9UOcK5SurLCjWsk0RnQY2RBQluBnC9isJK5RC9FyK/5ezjmaQ1hQIDAQAB\n-----END PUBLIC KEY-----`;

function getCurrentDate() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function decryptResponse(encryptedData, sessionKey) {
    try {
        const aesKey = sessionKey.substring(0, 16);
        const aesIv = sessionKey.substring(16, 32);
        const decipher = crypto.createDecipheriv('aes-128-cbc', Buffer.from(aesKey, 'utf8'), Buffer.from(aesIv, 'utf8'));
        let decrypted = decipher.update(encryptedData, 'base64', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (e) { return null; }
}

function generateEncryptedBody(payloadJson) {
    const sessionKey = uuidv4().replace(/-/g, '');
    const aesKey = sessionKey.substring(0, 16);
    const aesIv = sessionKey.substring(16, 32);
    const cipher = crypto.createCipheriv('aes-128-cbc', Buffer.from(aesKey, 'utf8'), Buffer.from(aesIv, 'utf8'));
    let encryptedData = cipher.update(JSON.stringify(payloadJson), 'utf8', 'base64');
    encryptedData += cipher.final('base64');
    const encryptedKeyBuffer = crypto.publicEncrypt({ key: PUBLIC_KEY_PEM, padding: crypto.constants.RSA_PKCS1_PADDING }, Buffer.from(sessionKey, 'utf8'));
    return { ki: encryptedKeyBuffer.toString('base64'), data: encryptedData, sessionKey };
}

async function executeRequest(endpoint, payload) {
    const { data: creds } = await axios.get('https://www.kitsulabs.xyz/api/frida-hook/a/bd/jniutils/TokenUtils');
    const encryptedBody = generateEncryptedBody(payload);
    const res = await axios.post(endpoint, { rv: 1, ki: encryptedBody.ki, data: encryptedBody.data }, {
        headers: {
            'User-Agent': 'okhttp/4.12.0',
            '--v2-time': Date.now().toString(),
            'uid': creds.uid,
            'token': creds.token,
            'content-type': 'application/json; charset=utf-8'
        }
    });
    const decryptedRaw = decryptResponse(res.data.data, encryptedBody.sessionKey);
    const responseData = JSON.parse(decryptedRaw);
    const baseUrl = 'https://hardstonepte.ltd/hs-us/';
    const rawResult = responseData.image_url || responseData.result_url;
    
    if (rawResult) {
        const paths = Array.isArray(rawResult) ? rawResult : [rawResult];
        const results = paths.map(p => baseUrl + (p.startsWith('/') ? p.slice(1) : p));
        return { success: true, result: Array.isArray(rawResult) ? results : results[0] };
    }
    throw new Error('Gagal mendapatkan URL hasil');
}

const uploadToFirebase = async (fileBuffer, folderPrefix) => {
    const dateStr = getCurrentDate();
    const storagePath = `${folderPrefix}/${dateStr}/${uuidv4()}_0.jpg`;
    const initUrl = `https://firebasestorage.googleapis.com/v0/b/stn2_hs_us/o?name=${encodeURIComponent(storagePath)}&uploadType=resumable`;
    const headers = { 'User-Agent': 'Dalvik/2.1.0', 'x-firebase-storage-version': 'Android/21.0.2', 'Content-Type': 'application/x-www-form-urlencoded' };

    const initRes = await axios.post(initUrl, '', { headers: { ...headers, 'X-Goog-Upload-Command': 'start', 'X-Goog-Upload-Protocol': 'resumable' } });
    const uploadUrl = initRes.headers['x-goog-upload-url'];
    await axios.post(uploadUrl, fileBuffer, { headers: { ...headers, 'X-Goog-Upload-Command': 'upload, finalize', 'X-Goog-Upload-Offset': '0', 'X-Goog-Upload-Protocol': 'resumable' } });
    return storagePath;
};
// --- CONFIG & UTILS END ---

// ENDPOINT: Get Styles (JSON)
router.get('/styles', async (req, res) => {
    try {
        const { data } = await axios.get('https://hardstonepte.ltd/snapAi/avatar/home_config.json');
        const parsed = data.category.filter(cat => !["Banner", "Function"].includes(cat.titleMap?.en?.title)).map(cat => ({
            category: cat.titleMap?.en?.title || "Other",
            styles: cat.items.map(i => ({ name: i.style_name, id: i.style_id }))
        }));
        return res.json({ status: true, result: parsed });
    } catch (e) { return res.status(500).json({ error: e.message }); }
});

// ENDPOINT: Morph Process (JSON)
// Query Params: ?url=LINK_GAMBAR&style=Roblox&type=img2img
router.get('/process', async (req, res) => {
    const { url, style, prompt, type = 'img2img' } = req.query;
    if (!url) return res.status(400).json({ error: "Missing 'url' parameter" });

    try {
        // Download gambar dari URL ke Buffer
        const imageRes = await axios.get(url, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(imageRes.data, 'binary');

        let folder = 'snap_img2img/upload';
        let endpoint = 'https://ai.hardstonepte.ltd/snap/img2img/v2/';
        let payload = { "nb": "stn2_hs_us" };

        if (type === 'enhance') {
            folder = 'snap_single/upload';
            endpoint = 'https://ai.hardstonepte.ltd/snap/single/enhance/v2/';
        } else if (type === 'retake') {
            folder = 'snap_retake/upload';
            endpoint = 'https://ai.hardstonepte.ltd/snap/ai/retake/v2/';
            payload.style_name = style || 'Funny';
        } else if (type === 'edit') {
            endpoint = 'https://ai.hardstonepte.ltd/snap/chat/edit/v2/';
            payload.prompt = prompt || 'make it cool';
        } else {
            payload.style_id = style || 'Roblox';
            payload.strength = "50"; payload.ratio = 1; payload.gender = "male";
        }

        const imagePath = await uploadToFirebase(buffer, folder);
        payload.image_name = imagePath;

        const result = await executeRequest(endpoint, payload);
        return res.json({ status: true, author: 'Gemini', result: result.result });

    } catch (e) {
        return res.status(500).json({ status: false, error: e.message });
    }
});

export default router;
