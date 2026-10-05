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
// KHAI BÁO MẶT TIỀN (MANIFEST)
// ==========================================
app.get('/manifest.json', (req, res) => {
    res.json({
        id: "com.nuvio.vietstream.pro",
        version: "1.0.0",
        name: "VietStream Pro (Real-time)",
        description: "Rạp phim cá nhân cập nhật siêu tốc từ nguồn Việt Nam.",
        resources: ["stream", "catalog"],
        types: ["movie", "series"],
        idPrefixes: ["tt", "kk"], 
        catalogs: [
            {
                type: "movie",
                id: "kkphim_new",
                name: "🔥 Rạp Chiếu Nóng Hổi",
                extra: [{ name: "skip", isRequired: false }]
            }
        ]
    });
});

// ==========================================
// GIAO LỘ PHÂN VÙNG (CATALOG)
// ==========================================
const catalogHandler = async (req, res) => {
    let page = 1;
    if (req.params.extra) {
        const match = req.params.extra.match(/skip=(\d+)/);
        if (match) page = Math.floor(parseInt(match[1]) / 10) + 1;
    }

    try {
        const response = await fetch(`https://kkphim.com/api/v1/danh-sach/phim-moi-cap-nhat?page=${page}`);
        const data = await response.json();

        const metas = data.data.items.map(item => {
            const genreTags = item.category ? item.category.map(c => c.name) : ["Đang cập nhật"];
            return {
                id: item.slug, // Nuvio sẽ dùng ID này để gọi stream
                type: "movie",
                name: item.name,
                poster: `https://phimimg.com/${item.thumb_url}`,
                genres: genreTags,
                description: `🎭 Thể loại: ${genreTags.join(" • ")}\n🌍 Nguồn: ${item.origin_name}\n\nĐã cập nhật lên danh sách tốc độ cao!` 
            };
        });

        res.json({ metas: metas });
    } catch (error) {
        res.json({ metas: [] });
    }
};

// SỬA LỖI 404: Tách thành 2 đường dẫn độc lập để Express bắt chuẩn xác
app.get('/catalog/:type/:id.json', catalogHandler);
app.get('/catalog/:type/:id/:extra.json', catalogHandler);

// ==========================================
// LÕI ĐUA TỐC ĐỘ (PROMISE.ANY)
// ==========================================
async function fetchKKphim(slug) {
    const res = await fetch(`https://kkphim.com/api/v1/movie/${slug}`);
    const data = await res.json();
    if (!data.status) throw new Error("Not found");
    return { server: "KKPhim", url: data.movie.episodes[0].server_data[0].link_m3u8, title: "💎 FHD (KKPhim)" };
}

async function fetchNguonC(slug) {
    const res = await fetch(`https://phim.nguonc.com/api/v1/movie/${slug}`);
    const data = await res.json();
    if (!data.status) throw new Error("Not found");
    return { server: "Nguồn C", url: data.movie.episodes[0].server_data[0].link_m3u8, title: "✨ HD (Nguồn C)" };
}

app.get('/stream/:type/:id.json', async (req, res) => {
    const { type, id } = req.params;
    let cleanId = id.split(':')[0]; 

    // BỘ DỊCH THUẬT: Biến mã IMDB (tt...) thành tên phim không dấu (slug)
    if (cleanId.startsWith('tt')) {
        try {
            const metaRes = await fetch(`https://v3-cinemeta.strem.io/meta/${type}/${cleanId}.json`);
            const metaData = await metaRes.json();
            if (metaData && metaData.meta) {
                const title = metaData.meta.name;
                cleanId = title.toLowerCase()
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "") // Xóa dấu tiếng Việt
                    .replace(/[^a-z0-9\s-]/g, '')    // Giữ lại chữ, số và khoảng trắng
                    .trim()
                    .replace(/\s+/g, '-');           // Đổi khoảng trắng thành gạch ngang
            }
        } catch (e) {
            console.log("Lỗi dịch ID:", e);
        }
    }

    try {
        const fastStream = await Promise.any([
            fetchKKphim(cleanId),
            fetchNguonC(cleanId)
        ]);
        
        fastStream.url = sanitizeStreamUrl(fastStream.url);
        res.json({ streams: [fastStream] });
    } catch (e) {
        res.json({ streams: [] });
    }
});

module.exports = app;
