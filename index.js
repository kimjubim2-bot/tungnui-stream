const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());

app.get('/manifest.json', (req, res) => {
    res.json({
        id: "com.nuvio.vietstream.v3", 
        version: "3.0.0",
        name: "VietStream Pro (Railway)",
        description: "Hệ thống cào link thông minh tích hợp Radar Tìm Kiếm.",
        resources: ["stream", "catalog"],
        types: ["movie", "series"],
        idPrefixes: ["tt", "kk"], 
        catalogs: [{ type: "movie", id: "kk_phim_moi", name: "🔥 Rạp Chiếu Nóng Hổi" }]
    });
});

const catalogHandler = async (req, res) => {
    try {
        const response = await fetch(`https://kkphim.com/api/v1/danh-sach/phim-moi-cap-nhat?page=1`);
        const data = await response.json();
        const metas = data.data.items.map(item => ({
            id: `kk:${item.slug}`, 
            type: "movie",
            name: item.name,
            poster: `https://phimimg.com/${item.thumb_url}`
        }));
        res.json({ metas });
    } catch (error) { res.json({ metas: [] }); }
};
app.get('/catalog/:type/:id.json', catalogHandler);

// Lệnh khởi động bắt buộc cho Railway
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Cỗ máy đã khởi động trên cổng ${PORT}`);
});
