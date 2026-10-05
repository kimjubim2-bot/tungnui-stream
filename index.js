const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());

const DUMMY_M3U8 = "data:application/vnd.apple.mpegurl;charset=utf-8," + encodeURIComponent("#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-ENDLIST");
const AD_KEYWORDS = ["ads", "bet", "banner", "pop"];

function sanitizeStreamUrl(url) {
    return AD_KEYWORDS.some(k => url.toLowerCase().includes(k)) ? DUMMY_M3U8 : url;
}

// 1. MANIFEST (Phiên bản V3 - Ép xóa Cache Nuvio)
app.get('/manifest.json', (req, res) => {
    res.json({
        id: "com.nuvio.vietstream.v3", 
        version: "3.0.0",
        name: "VietStream Pro (Về Bờ)",
        description: "Hệ thống cào link thông minh tích hợp Radar Tìm Kiếm.",
        resources: ["stream", "catalog"],
        types: ["movie", "series"],
        idPrefixes: ["tt", "kk"], 
        catalogs: [
            {
                type: "movie",
                id: "kk_phim_moi",
                name: "🔥 Rạp Chiếu Nóng Hổi",
                extra: [{ name: "skip", isRequired: false }]
            }
        ]
    });
});

// 2. CATALOG (Sử dụng API chắc chắn hoạt động)
const catalogHandler = async (req, res) => {
    let page = 1;
    if (req.params.extra) {
        const match = req.params.extra.match(/skip=(\d+)/);
        if (match) page = Math.floor(parseInt(match[1]) / 10) + 1;
    }

    try {
        const response = await fetch(`https://kkphim.com/api/v1/danh-sach/phim-moi-cap-nhat?page=${page}`);
        const data = await response.json();

        const metas = data.data.items.map(item => ({
            id: `kk:${item.slug}`, 
            type: "movie",
            name: item.name,
            poster: `https://phimimg.com/${item.thumb_url}`,
            description: `🌍 Nguồn: ${item.origin_name}\nNăm: ${item.year}\nTrạng thái: Tốc độ cao`
        }));

        res.json({ metas: metas });
    } catch (error) {
        res.json({ metas: [] });
    }
};

app.get('/catalog/:type/:id.json', catalogHandler);
app.get('/catalog/:type/:id/:extra.json', catalogHandler);

// 3. RADAR TÌM KIẾM KÉP & LẤY LINK
async function getSlugFromSearch(title) {
    try {
        const res = await fetch(`https://kkphim.com/api/v1/search?keyword=${encodeURIComponent(title)}`);
        const data = await res.json();
        if (data?.data?.items?.length > 0) return data.data.items[0].slug;
    } catch (e) {}
    return null;
}

async function fetchStreamBySlug(slug, serverName, apiUrlPrefix) {
    const res = await fetch(`${apiUrlPrefix}/movie/${slug}`);
    const data = await res.json();
    if (!data.status || !data.movie.episodes[0].server_data[0]) throw new Error("Not found");
    return { 
        server: serverName, 
        url: sanitizeStreamUrl(data.movie.episodes[0].server_data[0].link_m3u8), 
        title: `⚡ ${serverName}` 
    };
}

app.get('/stream/:type/:id.json', async (req, res) => {
    let { type, id } = req.params;
    let targetSlug = "";

    try {
        if (id.startsWith('kk:')) {
            targetSlug = id.replace('kk:', '').split(':')[0];
        } else if (id.startsWith('tt')) {
            const cleanId = id.split(':')[0];
            const metaRes = await fetch(`https://v3-cinemeta.strem.io/meta/${type}/${cleanId}.json`);
            const metaData = await metaRes.json();
            if (metaData?.meta?.name) {
                targetSlug = await getSlugFromSearch(metaData.meta.name);
            }
        }

        if (!targetSlug) return res.json({ streams: [] });

        const fastStream = await Promise.any([
            fetchStreamBySlug(targetSlug, "KKPhim", "https://kkphim.com/api/v1"),
            fetchStreamBySlug(targetSlug, "Nguồn C", "https://phim.nguonc.com/api/v1")
        ]);
        
        res.json({ streams: [fastStream] });
    } catch (e) {
        res.json({ streams: [] });
    }
});

module.exports = app;
