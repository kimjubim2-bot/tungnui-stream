const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());

// ==========================================
// BỘ LỌC QUẢNG CÁO "PHIM CÂM"
// ==========================================
const DUMMY_M3U8 = "data:application/vnd.apple.mpegurl;charset=utf-8," + encodeURIComponent("#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-ENDLIST");
const AD_KEYWORDS = ["ads", "bet", "banner", "pop"];

function sanitizeStreamUrl(url) {
    const isAd = AD_KEYWORDS.some(keyword => url.toLowerCase().includes(keyword));
    return isAd ? DUMMY_M3U8 : url;
}

// ==========================================
// 1. MẶT TIỀN NỘI BỘ (MANIFEST & CATALOG)
// ==========================================
app.get('/manifest.json', (req, res) => {
    res.json({
        id: "com.nuvio.vietstream.pro",
        version: "2.0.0",
        name: "VietStream Pro (SpeedX)",
        description: "Hệ thống cào link thông minh tích hợp Radar Tìm Kiếm.",
        resources: ["stream", "catalog"],
        types: ["movie", "series"],
        idPrefixes: ["tt", "kk"], // 'kk' là tiền tố nội bộ của chúng ta
        catalogs: [
            {
                type: "movie",
                id: "kk_phim_le",
                name: "🔥 Phim Lẻ Mới Nhất",
                extra: [{ name: "skip", isRequired: false }]
            },
            {
                type: "series",
                id: "kk_phim_bo",
                name: "📺 Phim Bộ Trending",
                extra: [{ name: "skip", isRequired: false }]
            }
        ]
    });
});

const catalogHandler = async (req, res) => {
    const { id } = req.params;
    let page = 1;
    if (req.params.extra) {
        const match = req.params.extra.match(/skip=(\d+)/);
        if (match) page = Math.floor(parseInt(match[1]) / 20) + 1; // KKPhim thường trả 20 item/trang
    }

    // Phân luồng API dựa trên danh mục bạn chọn
    const apiUrl = id === 'kk_phim_le' 
        ? `https://kkphim.com/api/v1/danh-sach/phim-le?page=${page}`
        : `https://kkphim.com/api/v1/danh-sach/phim-bo?page=${page}`;

    try {
        const response = await fetch(apiUrl);
        const data = await response.json();

        const metas = data.data.items.map(item => ({
            id: `kk:${item.slug}`, // Đóng dấu tiền tố nội bộ 'kk:'
            type: id === 'kk_phim_le' ? "movie" : "series",
            name: item.name,
            poster: `https://phimimg.com/${item.thumb_url}`,
            description: `Năm: ${item.year}\nChất lượng: ${item.quality}\nNgôn ngữ: ${item.lang}`
        }));

        res.json({ metas: metas });
    } catch (error) {
        res.json({ metas: [] });
    }
};

app.get('/catalog/:type/:id.json', catalogHandler);
app.get('/catalog/:type/:id/:extra.json', catalogHandler);

// ==========================================
// 2. RADAR TÌM KIẾM KÉP & LẤY LINK
// ==========================================
async function getSlugFromSearch(title) {
    try {
        const res = await fetch(`https://kkphim.com/api/v1/search?keyword=${encodeURIComponent(title)}`);
        const data = await res.json();
        if (data && data.data && data.data.items && data.data.items.length > 0) {
            return data.data.items[0].slug; // Lấy kết quả khớp nhất đầu tiên
        }
    } catch (e) {
        console.log("Search error:", e);
    }
    return null;
}

async function fetchStreamBySlug(slug, serverName, apiUrlPrefix) {
    const res = await fetch(`${apiUrlPrefix}/movie/${slug}`);
    const data = await res.json();
    if (!data.status || !data.movie.episodes[0].server_data[0]) throw new Error("Not found");
    return { 
        server: serverName, 
        url: sanitizeStreamUrl(data.movie.episodes[0].server_data[0].link_m3u8), 
        title: `⚡ Tốc độ cao (${serverName})` 
    };
}

app.get('/stream/:type/:id.json', async (req, res) => {
    let { type, id } = req.params;
    let targetSlug = "";

    try {
        // Kịch bản 1: Bấm từ Mặt Tiền Nội Bộ (id có chứa kk:)
        if (id.startsWith('kk:')) {
            targetSlug = id.replace('kk:', '').split(':')[0];
        } 
        // Kịch bản 2: Bấm từ danh mục Quốc Tế Cinemeta (id chứa tt...)
        else if (id.startsWith('tt')) {
            const cleanId = id.split(':')[0];
            const metaRes = await fetch(`https://v3-cinemeta.strem.io/meta/${type}/${cleanId}.json`);
            const metaData = await metaRes.json();
            
            if (metaData && metaData.meta && metaData.meta.name) {
                // Kích hoạt Radar Tìm Kiếm Kép để móc ra slug chuẩn từ KKPhim
                targetSlug = await getSlugFromSearch(metaData.meta.name);
            }
        }

        if (!targetSlug) return res.json({ streams: [] });

        // Đua tốc độ Promise.any khi đã chốt được Slug chuẩn
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
