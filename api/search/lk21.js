const express = require('express');
const router = express.Router();
const cheerio = require('cheerio');
const axios = require('axios');

/**
 * CORE LOGIC - LK21 Scraper
 * Fitur: Search, Detail, Download, & Filters
 * Author: RANZZ
 */
class LK21 {
    constructor() {
        this.base = 'https://tv3.lk21online.mom';
        this.baseDL = 'https://dl.lk21.party';
        this.headers = {
            'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',
            'Referer': 'https://google.com'
        };
    }

    async fetchText(url, opts = {}) {
        const res = await axios.get(url, {
            headers: opts.headers || this.headers,
            ...opts
        });
        return res.data;
    }

    async Search(query, page = 1) {
        const res = await axios.get(`https://gudangvape.com/search.php?s=${query}&page=${page}`, {
            headers: { Referer: this.base + '/' }
        });
        if (!res.data?.data?.length) throw new Error('Hasil Tidak Ditemukan');
        return res.data.data.map(m => ({
            title: m.title,
            rating: m.rating,
            quality: m.quality || 'Unknown',
            year: m.year,
            thumbnail: 'https://poster.lk21.party/wp-content/uploads/' + m.poster,
            link: this.base + '/' + m.slug
        }));
    }

    async Detail(url) {
        const html = await this.fetchText(url);
        const $ = cheerio.load(html);
        const result = {
            title: $('.movie-info h1').text().trim(),
            synopsis: $('.synopsis').text().trim(),
            director: $('p:contains("Sutradara") a').text().trim(),
            cast: $('p:contains("Bintang Film") a').map((_, a) => $(a).text().trim()).get(),
            country: $('p:contains("Negara") a').text().trim(),
            poster: $('.detail picture img').attr('src'),
            trailer: $('.trailer-series iframe').attr('src'),
            download_page: $('.movie-action a').attr('href')
        };
        return result;
    }

    async Download(url) {
        const slug = url.split('/').filter(Boolean).pop();
        const raw = await this.fetchText(this.baseDL + '/get/' + slug);
        const match = raw.match(/setCookie\('validate', '([^']+)'/);
        if (!match) throw new Error('Gagal mendapatkan token validasi');

        const params = new URLSearchParams();
        params.append('slug', slug);

        const res = await axios.post(this.baseDL + '/verifying.php?slug=' + slug, params, {
            headers: {
                ...this.headers,
                'Cookie': 'validate=' + match[1],
                'Content-Type': 'application/x-www-form-urlencoded',
                'Referer': this.baseDL
            }
        });

        const $ = cheerio.load(res.data);
        const links = [];
        $('tr').each((_, el) => {
            const name = $(el).find('strong').text().trim();
            const dl_url = $(el).find('a').attr('href');
            if (name && dl_url) links.push({ name, url: dl_url });
        });
        return links;
    }

    extractMetadata(html) {
        const $ = cheerio.load(html);
        const result = [];
        $('article').each((_, el) => {
            result.push({
                title: $(el).find('[itemprop="name"]').text().trim(),
                thumbnail: $(el).find('img').attr('src'),
                rating: $(el).find('[itemprop="ratingValue"]').text().trim() || 'Unknown',
                year: $(el).find('.year').text().trim(),
                link: this.base + $(el).find('a[itemprop="url"]').attr('href')
            });
        });
        return result;
    }
}

const lk = new LK21();

/**
 * ENDPOINT ROUTER
 */
router.get('/', async (req, res) => {
    const { action, query, url, page } = req.query;

    try {
        let result;
        switch (action) {
            case 'search':
                result = await lk.Search(query, page || 1);
                break;
            case 'detail':
                result = await lk.Detail(url);
                break;
            case 'download':
                result = await lk.Download(url);
                break;
            default:
                // Default tampilkan populer movie
                const html = await lk.fetchText(lk.base + '/populer/type/movie/page/' + (page || 1));
                result = lk.extractMetadata(html);
        }

        res.json({ status: true, creator: "RANZZ", result });
    } catch (e) {
        res.status(500).json({ status: false, creator: "RANZZ", error: e.message });
    }
});

module.exports = router;
      
