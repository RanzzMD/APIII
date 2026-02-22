const express = require('express');
const router = express.Router();
const axios = require('axios');

/**
 * SCRAPER LOGIC - Pinterest Downloader
 * Support: pin.it (Short URL) & pinterest.com
 * Author: Ranzz
 */

const pinterest = {
    getPinterestIdFromUrl: async function (pinterestUrl) {
        let utext;
        if (/pin\.it/i.test(pinterestUrl)) {
            // Handle short URL dengan axios (mengambil lokasi redirect)
            const r = await axios.get(pinterestUrl, { maxRedirects: 5 });
            utext = r.request.res.responseUrl || pinterestUrl;
        } else {
            if (!/pinterest/i.test(pinterestUrl)) throw new Error("URL tidak valid. Hostname bukan Pinterest.");
            utext = pinterestUrl;
        }
        
        const url = new URL(utext);
        const pinId = url.pathname.match(/\/pin\/(\d+)/)?.[1];
        if (!pinId) throw new Error("Gagal mengambil Pin ID dari URL.");
        return pinId;
    },

    serialize: function (pinterestResponse) {
        const data = pinterestResponse.data.v3GetPinQuery.data;
        
        const post = {
            title: data?.unauthOnPageTitle?.trim() || '(no title)',
            description: data?.description?.trim() || '',
            likesCount: data?.totalReactionCount || 0,
            shareCount: data?.shareCount || 0,
            commentCount: data?.aggregatedPinData?.commentCount || 0,
            createdAt: data?.createdAt || '(unknown)'
        };

        const user = {
            fullName: data?.originPinner?.fullName || '(unknown)',
            username: data?.originPinner?.username || '(unknown)'
        };

        const v = data?.storyPinData?.pages[0]?.blocks[0]?.videoDataV2?.videoList720P?.v720P ||
                  data?.videos?.videoList?.v720P;
                  
        const content = {
            images: Object.keys(data)
                .filter(k => k.startsWith('images_'))
                .map(k => ({ ...data[k], name: k.replace('images_', '') })),
            videos: v ? [v] : []
        };

        return { user, post, content };
    },

    getData: async function (pinterestUrl) {
        const pinterestId = await this.getPinterestIdFromUrl(pinterestUrl);
        const res = await axios.post("https://id.pinterest.com/_/graphql/", {
            queryHash: "91dc7817f1acf1c2fb8d505d1c79dedebcb3baa1794065ba3602b843099f8ff7",
            variables: {
                pinId: pinterestId,
                isAuth: false,
                isDesktop: true,
                shouldPrefetchStoryPinFragment: false,
                isUnauth: true
            }
        }, {
            headers: {
                "content-type": "application/json",
                "x-csrftoken": "f199c374cd68fda2595b9cc9bb9c7d5d",
                "cookie": "csrftoken=f199c374cd68fda2595b9cc9bb9c7d5d;"
            }
        });

        return this.serialize(res.data);
    }
};

/**
 * ENDPOINT API
 * Base URL: /api/pinterest?text=URL_PINTEREST
 */
router.get('/', async (req, res) => {
    const text = req.query.text; // URL Pinterest dari parameter ?text=

    if (!text) {
        return res.status(400).json({ 
            status: false,
            creator: "Ranzz",
            error: "Masukkan parameter 'text' berisi URL Pinterest." 
        });
    }

    try {
        const result = await pinterest.getData(text);
        
        return res.json({
            status: true,
            creator: "Ranzz",
            result: result
        });

    } catch (e) {
        console.error("Pinterest Error:", e.message);
        return res.status(500).json({ 
            status: false,
            creator: "Ranzz",
            error: e.message 
        });
    }
});

module.exports = router;
