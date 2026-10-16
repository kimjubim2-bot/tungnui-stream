/**
 * TUNGNUI PRO 3.5 - ULTIMATE MERGE EDITION (WEBVIEW EXTERNAL URL)
 * - Tự động đẩy "isClearkeyFlag" kích hoạt chế độ phát qua Web (Shaka Player)
 * - Đưa ưu tiên luồng Player Vượt Kén lên vị trí Top 1 chống lỗi Màn Đen!
 */

const fs = require("fs");
const path = require("path");
const axios = require("axios");

// KHÔI PHỤC HẰNG SỐ VIPTORRENT
const VIPTORRENT_BASE = "https://viptorrent.nadan.cloud/%7B%22v%22%3A%226.2.0%22%7D";

// =========================================================================
// 0. BỘ TỰ ĐỘNG HEAL & KHỞI TẠO CẤU HÌNH API
// =========================================================================
const getEndpoints = () => {
    const defaults = { 
        kkphim: "https://phimapi.com", 
        vsmov: "https://vsmov.com", 
        nguonc: "https://phim.nguonc.com" 
    };

    const possiblePaths = [ 
        path.join(__dirname, "api_endpoints.json"), 
        path.join(process.cwd(), "api_endpoints.json") 
    ];

    for (const p of possiblePaths) {
        try { 
            if (fs.existsSync(p)) { 
                const data = JSON.parse(fs.readFileSync(p, "utf-8")); 
                if (data && data.kkphim) {
                    return { 
                        kkphim: (data.kkphim || defaults.kkphim).replace(/\/api\/?$/, ''), 
                        vsmov: (data.vsmov || defaults.vsmov).replace(/\/api\/?$/, ''), 
                        nguonc: (data.nguonc || defaults.nguonc).replace(/\/api\/?$/, '') 
                    }; 
                } 
            } 
        } catch (e) {}
    }
    return defaults;
};

const failureTelemetry = {
    count: 0, 
    lastTrigger: 0,
    recordFailure: async () => {
        failureTelemetry.count++; 
        const now = Date.now();
        if (failureTelemetry.count >= 5 && (now - failureTelemetry.lastTrigger > 15 * 60 * 1000)) {
            failureTelemetry.lastTrigger = now; 
            failureTelemetry.count = 0;
            const patToken = process.env.GITHUB_TOKEN || process.env.GITHUB_PAT; 
            const repoSlug = process.env.GITHUB_REPOSITORY;
            
            if (patToken && repoSlug) { 
                try { 
                    await axios.post(
                        `https://api.github.com/repos/${repoSlug}/dispatches`, 
                        { event_type: "auto_heal" }, 
                        { headers: { "Authorization": `Bearer ${patToken}`, "Accept": "application/vnd.github.v3+json", "User-Agent": "TungNui-Telemetry" }, timeout: 3000 }
                    ); 
                } catch (e) {} 
            }
        }
    }
};

const http = axios.create({ timeout: 3000, headers: { "User-Agent": "Mozilla/5.0 Chrome/128.0.0.0 Safari/537.36", "Accept": "application/json, text/plain, */*" } });

const getImgUrl = (url) => { 
    if (!url) return "https://via.placeholder.com/300x450?text=No+Poster"; 
    if (url.startsWith("http")) return url; 
    return `https://phimimg.com/${url}`; 
};

const parseEpisodeNumber = (name, index) => { 
    if (!name) return index + 1; 
    const match = name.toString().match(/\d+/); 
    return match ? parseInt(match[0], 10) : index + 1; 
};

const removeVietnameseTones = (str) => { 
    if (!str) return ""; 
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D'); 
};

const isStrictTitleMatch = (targetTitle, targetOrigTitle, candidateName, candidateOrigName, targetImdb, candidateImdb) => {
    if (targetImdb && candidateImdb && targetImdb.startsWith("tt") && targetImdb === candidateImdb) return true;
    const normalize = (s) => { if (!s) return ""; return removeVietnameseTones(s.toLowerCase()).replace(/\[.*?\]|\(.*?\)/g, '').replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim(); };
    
    const t1 = normalize(targetTitle), t2 = normalize(targetOrigTitle), c1 = normalize(candidateName), c2 = normalize(candidateOrigName);
    if (t1 && (t1 === c1 || t1 === c2)) return true;
    if (t2 && (t2 === c1 || t2 === c2)) return true;
    
    const checkWordOverlap = (target, candidate) => {
        if (!target || !candidate) return false;
        const w1 = target.split(' '), w2 = candidate.split(' ');
        const stopWords = new Set(['con', 'nguoi', 'ke', 'co', 'anh', 'em', 'ong', 'ba', 'bo', 'nhung', 'cai', 'thang', 'chu', 'bac', 'va', 'la', 'mot', 'the', 'a', 'an']);
        let meaningful = w1.filter(w => !stopWords.has(w) && w.length > 1); 
        if (meaningful.length === 0) meaningful = w1;
        const candidateSet = new Set(w2); 
        let matchCount = 0; 
        meaningful.forEach(w => { if (candidateSet.has(w)) matchCount++; });
        return (matchCount / meaningful.length) >= 0.6;
    };
    
    if (t1 && (checkWordOverlap(t1, c1) || checkWordOverlap(t1, c2))) return true;
    if (t2 && (checkWordOverlap(t2, c1) || checkWordOverlap(t2, c2))) return true;
    return false;
};

// =========================================
// 1. PHÂN LOẠI KÊNH TRUYỀN HÌNH CHUẨN XÁC
// =========================================
const classifyTvChannel = (ch) => {
    const n = (ch.name || "").toLowerCase();
    if (n.includes(" vs ") || n.includes("⚽") || n.includes("🏐") || n.includes("🏀") || n.includes("🎾") || n.includes("🎮")) return { category: "the_thao", categoryName: "⚽ Kênh Thể Thao", sortIndex: 40 };
    if (n.includes("vtv") && !n.includes("vtvcab") && !n.includes("vtv cab")) {
        let sortIndex = 99;
        if (n.includes("vtv1") && !n.includes("vtv10")) sortIndex = 1; else if (n.includes("vtv2")) sortIndex = 2; else if (n.includes("vtv3")) sortIndex = 3; else if (n.includes("vtv4")) sortIndex = 4; else if (n.includes("vtv5") && !n.includes("tây nguyên") && !n.includes("tay nguyen") && !n.includes("tây nam") && !n.includes("tay nam")) sortIndex = 5; else if (n.includes("vtv6")) sortIndex = 6; else if (n.includes("vtv7")) sortIndex = 7; else if (n.includes("vtv8")) sortIndex = 8; else if (n.includes("vtv9")) sortIndex = 9; else if (n.includes("vtv10")) sortIndex = 10; else if (n.includes("vtv5")) sortIndex = 11;
        return { category: "vtv", categoryName: "🔴 Kênh VTV", sortIndex };
    }
    if (n.includes("cartoon") || n.includes("cartoonito") || n.includes("cbeebies") || n.includes("baby tv") || n.includes("kids") || n.includes("thiếu nhi") || n.includes("disney") || n.includes("nickelodeon") || n.includes("dreamworks") || n.includes("animax") || n.includes("bibi") || n.includes("on kids")) return { category: "thieu_nhi", categoryName: "👶 Kênh Thiếu Nhi", sortIndex: 30 };
    if (n.includes("warner") || n.includes("cinemaworld") || n.includes("cinema world") || n.includes("filmbox") || n.includes("phim việt") || n.includes("phim âu mỹ") || n.includes("phim 4k") || n.includes("phim kinh điển") || n.includes("phim hoa ngữ") || n.includes("cinema") || n.includes("movie") || n.includes("hbo") || n.includes("cinemax") || n.includes("axn") || n.includes("box movie") || n.includes("on movies") || n.includes("on cine") || n.includes("sctv phim") || n.includes("htvc phim") || (n.includes("phim") && !n.includes("thuyết minh"))) {
        let sortIndex = 55; if (n.includes("hbo")) sortIndex = 50; else if (n.includes("cinemax")) sortIndex = 51; else if (n.includes("warner")) sortIndex = 52; else if (n.includes("axn")) sortIndex = 53;
        return { category: "phim_truyen", categoryName: "🎬 Kênh Phim", sortIndex };
    }
    if (n.includes("tnt sport") || n.includes("spotv") || n.includes("golf") || n.includes("thể thao") || n.includes("sport") || n.includes("k+ sport") || n.includes("k+ action") || n.includes("k+") || n.includes("bein") || n.includes("dazn") || n.includes("htv sports") || n.includes("htv thể thao") || n.includes("on sports") || n.includes("on football") || n.includes("fox sports")) return { category: "the_thao", categoryName: "⚽ Kênh Thể Thao", sortIndex: 40 };
    if (n.includes("vtvcab") || n.includes("vtv cab") || n.includes("vfamily") || n.includes("vie giải trí") || n.includes("vie dramas") || n.includes("fashiontv") || n.includes("e channel") || n.includes("o2tv") || /\bon\s+(sports|football|cine|movies|kids|info|music|trending|style|o2tv|plus|golf|phim)/i.test(n) || n.startsWith("on ") || n.startsWith("on_")) return { category: "vtvcab", categoryName: "📺 Kênh VTVCab", sortIndex: 20 };
    if (["hbo", "axn", "cinemax", "discovery", "dreamworks", "animal planet", "hgtv", "bbc", "cnn", "bloomberg", "france 24", "dw", "nhk", "mbc", "ebs", "tvb", "al jazeera", "capital", "cs tv", "g1", "dmax", "tlc", "national geographic", "nat geo", "paramount", "fox", "kbs", "tvn", "animax", "warner", "cinema world", "cinemaworld", "filmbox"].some(k => n.includes(k))) {
        let sortIndex = 65; if (n.includes("hbo")) sortIndex = 60; else if (n.includes("cinemax")) sortIndex = 61; else if (n.includes("warner")) sortIndex = 62; else if (n.includes("axn")) sortIndex = 63; else if (n.includes("discovery")) sortIndex = 64;
        return { category: "quoc_te", categoryName: "🌐 Kênh Quốc Tế", sortIndex };
    }
    if (n.includes("htv") || n.includes("vtc") || n.includes("thvl") || n.includes("todaytv") || n.includes("thuần việt") || n.includes("sctv") || n.includes("truyền hình vĩnh long") || n.includes("hà nội")) return { category: "giai_tri", categoryName: "🎭 Kênh Giải Trí", sortIndex: 70 };
    return { category: "dia_phuong", categoryName: "📡 Các Kênh Khác", sortIndex: 80 };
};

const isMovieChannel = (ch) => { const n = (ch.name || "").toLowerCase(); return ["hbo", "cinemax", "warner", "cinema world", "cinemaworld", "filmbox", "axn", "box movie", "phim", "cinema", "movie", "cine"].some(kw => n.includes(kw)); };
const isInternationalChannel = (ch) => { const n = (ch.name || "").toLowerCase(); return ["hbo", "cinemax", "warner", "axn", "discovery", "dreamworks", "animal planet", "hgtv", "bbc", "cnn", "bloomberg", "france 24", "dw", "nhk", "mbc", "ebs", "tvb", "al jazeera", "capital", "cs tv", "g1", "dmax", "tlc", "national geographic", "nat geo", "paramount", "fox", "kbs", "tvn", "animax", "cartoon", "disney", "cbeebies", "cinema world", "cinemaworld", "filmbox"].some(kw => n.includes(kw)); };

// =========================================
// 2. CONFIG: BẢNG MENU CATOLOG ĐẦY ĐỦ
// =========================================
const TV_CATALOGS = [
    { id: "tv_tong_hop", name: "📺 Toàn Bộ Kênh TV", type: "tv", apiPath: "live", defaultChecked: true },
    { id: "sports_live_matches", name: "⚽ Bóng Đá Live", type: "tv", apiPath: "live", defaultChecked: true },
    { id: "tv_vtv", name: "🔴 Kênh VTV", type: "tv", apiPath: "live", defaultChecked: true },
    { id: "tv_vtvcab", name: "📺 Kênh VTVCab", type: "tv", apiPath: "live", defaultChecked: true },
    { id: "tv_quoc_te", name: "🌐 Kênh Quốc Tế", type: "tv", apiPath: "live", defaultChecked: true },
    { id: "tv_the_thao", name: "⚽ Kênh Thể Thao", type: "tv", apiPath: "live", defaultChecked: true },
    { id: "tv_thieu_nhi", name: "👶 Kênh Thiếu Nhi", type: "tv", apiPath: "live", defaultChecked: true },
    { id: "tv_giai_tri", name: "🎭 Kênh Giải Trí", type: "tv", apiPath: "live", defaultChecked: true },
    { id: "tv_trong_nuoc", name: "🇻🇳 TH Việt Nam", type: "tv", apiPath: "live", defaultChecked: true },
    { id: "tv_dia_phuong", name: "📡 Các Kênh Khác", type: "tv", apiPath: "live", defaultChecked: true },
    { id: "tv_phim_truyen", name: "🎬 Phim Truyền Hình", type: "tv", apiPath: "live", defaultChecked: true }
];

const MOVIE_CATALOGS = [
    { id: "phim-le", name: "Xem Phim 📺", type: "movie", apiPath: "danh-sach/phim-le", defaultChecked: true },
    { id: "phim-4k", name: "Phim 4K", type: "movie", apiPath: "danh-sach/phim-chieu-rap", defaultChecked: true },
    { id: "phim-moi-cap-nhat", name: "Phim Mới", type: "movie", apiPath: "danh-sach/phim-moi-cap-nhat", defaultChecked: true },
    { id: "phim-bo", name: "Phim Bộ", type: "series", apiPath: "danh-sach/phim-bo", defaultChecked: true },
    { id: "phim-thieu-nhi", name: "Thiếu Nhi", type: "movie", apiPath: "the-loai/hoat-hinh", defaultChecked: true },
    { id: "phim-le-thuyet-minh", name: "Phim Thuyết Minh", type: "movie", apiPath: "danh-sach/phim-thuyet-minh", defaultChecked: true },
    { id: "bxh-phim-thang", name: "BXH Phim Tháng", type: "movie", apiPath: "danh-sach/phim-moi-cap-nhat", defaultChecked: true },
    { id: "phim-chieu-rap", name: "Phim Chiếu Rạp", type: "movie", apiPath: "danh-sach/phim-chieu-rap", defaultChecked: false },
    { id: "hanh-dong", name: "Hành Động / Phiêu Lưu", type: "movie", apiPath: "the-loai/hanh-dong", defaultChecked: false },
    { id: "kinh-di", name: "Kinh Dị / Giật Gân", type: "movie", apiPath: "the-loai/kinh-di", defaultChecked: false },
    { id: "au-my", name: "Phim Âu Mỹ", type: "movie", apiPath: "quoc-gia/au-my", defaultChecked: false },
    { id: "han-trung", name: "Hàn Quốc / Trung Quốc", type: "series", apiPath: "quoc-gia/han-quoc", defaultChecked: false },
    { id: "vo-thuat-long-tieng", name: "Võ Thuật / Lồng Tiếng", type: "movie", apiPath: "the-loai/vo-thuat", defaultChecked: false },
    { id: "khoa-hoc-vien-tuong", name: "🛸 Khoa Học Viễn Tưởng", type: "movie", apiPath: "the-loai/khoa-hoc-vien-tuong", defaultChecked: false },
    { id: "hoat-hinh-anime", name: "Hoạt Hình & Anime", type: "series", apiPath: "danh-sach/hoat-hinh", defaultChecked: false }
];

const ADULT_SUB_CATALOGS = [
    { id: "phim_18_bo_chong", name: "🔞 Bố chồng / Con dâu", type: "movie", tag: "Bố chồng / Con dâu", primaryKw: "公公", secondaryKw: "儿媳" },
    { id: "phim_18_massage", name: "🔞 Massage thư giãn", type: "movie", tag: "Massage thư giãn", primaryKw: "日本 按摩", secondaryKw: "按摩" },
    { id: "phim_18_series", name: "🔞 Series JUQ, STAR...", type: "movie", tag: "Series Độc Quyền", primaryKw: "JUQ", secondaryKw: "STAR" },
    { id: "phim_18_vung_trom", name: "🔞 Vụng trộm / Kịch tính", type: "movie", tag: "Vụng trộm / Kịch tính", primaryKw: "日本 偷情", secondaryKw: "偷情" }
];

const ALL_CATALOGS = [...TV_CATALOGS, ...MOVIE_CATALOGS, ...ADULT_SUB_CATALOGS];
const TOP_MAIN_CATALOGS = TV_CATALOGS.slice(0, 4);
const SUB_GRID_CATALOGS = [...TV_CATALOGS.slice(4), ...MOVIE_CATALOGS];

const DEFAULT_ACTIVE_IDS = [
    "tv_tong_hop", "sports_live_matches", "tv_vtv", "tv_vtvcab", "tv_quoc_te",
    "tv_the_thao", "tv_thieu_nhi", "tv_giai_tri", "tv_trong_nuoc", "tv_dia_phuong",
    "phim-le", "phim-4k", "phim-moi-cap-nhat", "phim-bo", "phim-thieu-nhi", "phim-le-thuyet-minh"
];

// NẠP CONFIG MỞ RỘNG
const parseConfig = (rawParam) => {
    if (!rawParam) return { catalogs: DEFAULT_ACTIVE_IDS, rd: "", ai: "" };
    try {
        let b64 = rawParam.replace(/-/g, '+').replace(/_/g, '/'); while (b64.length % 4) b64 += '=';
        const parsed = JSON.parse(Buffer.from(b64, 'base64').toString('utf-8'));
        return { catalogs: parsed.c || parsed.catalogs || DEFAULT_ACTIVE_IDS, rd: parsed.rd || "", ai: parsed.ai || parsed.gemini || "" };
    } catch (e) { return { catalogs: rawParam.split(','), rd: "", ai: "" }; }
};

const buildManifest = (optionsStr) => {
    const config = parseConfig(optionsStr);
    const activeCatalogs = [];
    const tvCategoriesList = [{ id: "tv_vtv", name: "🔴 Kênh VTV" }, { id: "tv_vtvcab", name: "📺 Kênh VTVCab" }, { id: "tv_quoc_te", name: "🌐 Kênh Quốc Tế" }, { id: "sports_live_matches", name: "⚽ Bóng Đá Live" }, { id: "tv_the_thao", name: "⚽ Kênh Thể Thao" }, { id: "tv_thieu_nhi", name: "👶 Kênh Thiếu Nhi" }, { id: "tv_giai_tri", name: "🎭 Kênh Giải Trí" }, { id: "tv_trong_nuoc", name: "🇻🇳 TH Việt Nam" }, { id: "tv_dia_phuong", name: "📡 Các Kênh Khác" }, { id: "tv_phim_truyen", name: "🎬 Phim Truyền Hình" }];

    tvCategoriesList.forEach(t => { if (config.catalogs.includes(t.id)) activeCatalogs.push({ type: "tv", id: t.id, name: t.name, extra: [{ name: "search", isRequired: false }, { name: "skip", isRequired: false }] }); });
    if (config.catalogs.includes("tv_tong_hop")) activeCatalogs.push({ type: "tv", id: "tv_tong_hop", name: "📺 Toàn Bộ Kênh TV", extra: [ { name: "genre", options: [ "🌟 Tất Cả", "🔴 Kênh VTV", "📺 Kênh VTVCab", "🌐 Kênh Quốc Tế", "⚽ Bóng Đá Live", "⚽ Kênh Thể Thao", "👶 Kênh Thiếu Nhi", "🎭 Kênh Giải Trí", "🇻🇳 TH việt nam", "📡 Kênh Địa Phương" ], isRequired: false }, { name: "search", isRequired: false }, { name: "skip", isRequired: false } ] });

    const handledSpecial = [...tvCategoriesList.map(t => t.id), "tv_tong_hop"];
    ALL_CATALOGS.filter(cat => !handledSpecial.includes(cat.id) && config.catalogs.includes(cat.id)).forEach(cat => { activeCatalogs.push({ type: cat.type, id: `cat_${cat.id.replace(/-/g, '_')}`, name: cat.icon ? `${cat.icon} ${cat.name}` : cat.name, extra: [{ name: "search", isRequired: false }, { name: "skip", isRequired: false }] }); });

    return { id: "community.nuvio.addon", version: "3.5.0", name: "TUNGNUI-ADDON AI", description: "Hệ thống Truyền Hình, Phim Đa Nguồn và Phụ đề AI dịch.", resources: ["catalog", "meta", "stream", "subtitles"], types: ["movie", "series", "tv"], idPrefixes: ["phim_", "vsmov_", "nguonc_", "match_", "tt", "iptv_", "vmttv_", "viptorrent_", "viptorrent:", "jav_"], catalogs: [ ...activeCatalogs, { type: "movie", id: "search_movie", name: "🔍 Tìm Kiếm Phim", extra: [{ name: "search", isRequired: true }] }, { type: "series", id: "search_series", name: "🔍 Tìm Kiếm Phim Bộ", extra: [{ name: "search", isRequired: true }] } ] };
};

const isAnimeMovie = (p) => {
    if (!p) return false; 
    const typeStr = (p.type || "").toLowerCase(); if (typeStr === "hoathinh" || typeStr === "anime") return true;
    if (p.category && Array.isArray(p.category)) { const hasCart = p.category.some(c => { const s = (c.slug || "").toLowerCase(); const n = (c.name || "").toLowerCase(); return s.includes("hoat-hinh") || s.includes("anime") || s.includes("donghua") || n.includes("hoạt hình") || n.includes("anime"); }); if (hasCart) return true; }
    const nameLower = `${p.name || ""} ${p.origin_name || ""} ${p.slug || ""}`.toLowerCase(); if (nameLower.includes("hoạt hình") || nameLower.includes("anime") || nameLower.includes("donghua") || nameLower.includes("animation")) return true;
    const donghuaKeywords = ["vạn giới", "phàm nhân", "đấu la", "đấu phá", "thôn phệ", "hoàn mỹ thế giới", "già thiên", "nghịch thiên", "tiên nghịch", "linh kiếm tôn", "vũ canh kỷ", "tây hành kỷ", "tu tiên", "đại lục linh", "linh võ", "yêu thần ký", "trùng sinh", "tuyết ưng", "bách luyện", "thương nguyên", "sư huynh", "võ thần", "linh vũ", "võ luyện", "tinh thần biến", "nguyên tôn", "thần ấn vương tọa", "nhất niệm vĩnh hằng", "luyện khí mười vạn năm", "tuyệt thế đường môn", "wan jie", "fan ren", "dou luo", "dou po", "swallowed star"];
    if (donghuaKeywords.some(kw => nameLower.includes(kw))) return true;
    const animeKeywords = ["one piece", "naruto", "boruto", "conan", "dragon ball", "jujutsu kaisen", "kimetsu", "demon slayer", "bleach", "attack on titan", "hunter x hunter", "solo leveling", "mushoku tensei", "re:zero", "slime", "sword art online", "haikyuu", "chainsaw man", "spy x family", "tokyo ghoul", "doraemon", "pokemon"];
    if (animeKeywords.some(kw => nameLower.includes(kw))) return true; return false;
};

// =========================================================================
// 3. TRUYỀN HÌNH ĐA NGUỒN (TÍCH HỢP BIẾN MỒI WEBVIEW CLEARKEY)
// =========================================================================
const FALLBACK_TV_POOLS = {
    "vtv1": ["https://live.fptplay53.net/live/media/vtv1/live247-hls-avc/index.m3u8"], "vtv3": ["https://live.fptplay53.net/live/media/vtv3/live247-hls-avc/index.m3u8"], "vtv5": ["https://live.fptplay53.net/live/media/vtv5/live247-hls-avc/index.m3u8"], "htv_the_thao": ["https://live.fptplay53.net/live/media/htvtt/live247-hls-avc/index.m3u8"], "vtc3": ["https://live.fptplay53.net/live/media/vtc3/live247-hls-avc/index.m3u8"], "warner": ["http://cdn4.skygo.mn/live/disk1/Warner/HLSv3-FTA/Warner.m3u8"]
};

const normalizeTvKey = (rawName) => { if (!rawName) return ""; return rawName.toLowerCase().replace(/\[.*?\]|\(.*?\)/g, '').replace(/fhd|hd|sd|4k|1080p|720p|live|24\/7|server\s*\d+|luồng\s*\d+/gi, '').replace(/k\s*\+/g, 'kplus').replace(/đ/g, 'd').replace(/[^a-z0-9]/g, ''); };
const getTvSortRank = (name, genre) => { const n = (name || "").toLowerCase(); if (n.includes("vtv")) return { rank: 1, sub: 0 }; if (n.includes("htv") || n.includes("vtc") || n.includes("thvl")) return { rank: 2, sub: 0 }; if (n.includes("on ") || n.includes("sctv")) return { rank: 3, sub: 0 }; if (["hbo", "cinemax", "warner", "fox", "cinema"].some(kw => n.includes(kw))) return { rank: 4, sub: 0 }; if (n.includes("sport") || n.includes("thể thao") || n.includes("k+")) return { rank: 5, sub: 0 }; return { rank: 6, sub: 0 }; };

const fetchUnifiedTvChannels = async (cache) => {
    const cached = cache.get("unified_tv_channels"); 
    if (cached) return cached;
    
    const channelMap = new Map();
    const possiblePaths = [path.join(__dirname, "live_channels.json"), path.join(process.cwd(), "live_channels.json")];
    let vmttvChannels = [];
    
    for (const p of possiblePaths) { 
        try { if (fs.existsSync(p)) { vmttvChannels = JSON.parse(fs.readFileSync(p, "utf-8")); if (vmttvChannels.length > 0) break; } } catch (e) {} 
    }

    vmttvChannels.forEach(ch => {
        let cleanName = (ch.name || "").trim();
        if (cleanName.includes("token=") || cleanName.includes(".png") || cleanName.includes(".jpg")) { const idx = cleanName.lastIndexOf(","); if (idx !== -1) cleanName = cleanName.substring(idx + 1).replace(/^[\s",]+|[\s",]+$/g, "").trim(); }
        const key = normalizeTvKey(cleanName); if (!key) return;
        if (!channelMap.has(key)) { channelMap.set(key, { id: `iptv_${key}`, key, name: cleanName, poster: ch.poster || "https://via.placeholder.com/300x200?text=TV", genre: ch.genre || "📺 Truyền Hình", streams: [] }); }
        if (ch.streamUrl) { channelMap.get(key).streams.push({ name: "⚡ [Mạng Nội Bộ CDN]", title: `📺 ${cleanName}\n⚡ Luồng Máy Chủ HLS Tốc Độ Cao`, url: ch.streamUrl, behaviorHints: { isLive: true } }); }
    });

    try {
        const tqsRes = await axios.get("https://raw.githubusercontent.com/hieu-TQS/error/refs/heads/main/error.m3u", { timeout: 3500 });
        const lines = tqsRes.data.split("\n"); 
        
        let currentName = "", currentLogo = "", currentUa = "Dalvik/2.1.0", currentKey = "", isClearkey = false;
        
        for (let line of lines) {
            line = line.trim();
            if (line.startsWith("#EXTINF:")) {
                const lMatch = line.match(/tvg-logo="([^"]+)"/); const lastCommaIdx = line.lastIndexOf(',');
                if (lastCommaIdx !== -1) currentName = line.substring(lastCommaIdx + 1).replace(/^[\s",]+|[\s",]+$/g, '').trim();
                if (lMatch) currentLogo = lMatch[1]; currentKey = ""; isClearkey = false;
            } else if (line.startsWith("#EXTVLCOPT:http-user-agent=")) { currentUa = line.replace("#EXTVLCOPT:http-user-agent=", "").trim();
            } else if (line.startsWith("#KODIPROP:inputstream.adaptive.license_key=")) { currentKey = line.split("=")[1].trim(); isClearkey = true;
            } else if (line.startsWith("http") && currentName) {
                const nLower = currentName.toLowerCase();
                let isMovieTarget = ["hbo", "warner", "cinemax", "fox", "axn", "cinema"].some(k => nLower.includes(k));
                let finalName = currentName; if (isMovieTarget && !nLower.includes("vietsub")) finalName += " (Vietsub TQS)";
                
                const key = normalizeTvKey(currentName);
                if (key) {
                    if (!channelMap.has(key)) { channelMap.set(key, { id: `iptv_${key}`, key, name: finalName, poster: currentLogo || "https://via.placeholder.com/300x200?text=TV", genre: "📺 Kênh Phim Đặc Sắc", streams: [] }); }
                    const ch = channelMap.get(key); const isMpd = line.includes(".mpd");
                    
                    if (isClearkey && currentKey) {
                        const [kidHex, keyHex] = currentKey.split(":");
                        if (kidHex && keyHex) {
                            // 👇 Đây là mã lệnh isClearkeyFlag truyền lên api/index.js để gọi Webview (Đừng xóa!)
                            ch.streams.push({
                                name: "🔴 [Máy Chủ Proxy] Vercel Phá Khóa",
                                title: `📺 ${finalName}\n💎 Khởi chạy luồng Vượt kén bảo vệ`,
                                url: line,
                                isClearkeyFlag: true,
                                kidHex: kidHex, keyHex: keyHex,
                                behaviorHints: { isLive: true, proxyHeaders: { request: { "User-Agent": currentUa || "Dalvik/2.1.0" } } }
                            });
                            
                            // Mã lệnh Dự phòng dạng mộc URL chèn Key cho máy Exo cực cũ.
                            ch.streams.push({
                                name: "🔴 [PIPE Truyền Thống] Giải Mã Thô",
                                title: `📺 ${finalName}\n💎 Truyền chìa khóa qua URL (Kodi Style)`,
                                url: `${line}|drmScheme=clearkey&drmLicense=__DRM_PROXY__`,
                                isPipeFlag: true,
                                kidHex: kidHex, keyHex: keyHex,
                                behaviorHints: { isLive: true, proxyHeaders: { request: { "User-Agent": currentUa || "Dalvik/2.1.0" } } }
                            });
                        }
                    } else {
                        ch.streams.push({ name: isMpd ? "🔴 [Vietsub TQS] Giải mã nội bộ" : "🔴 [Phụ Đề] TQS Server", title: isMpd ? `📺 ${finalName}\n⚡ Luồng Không Bọc Khóa Bản Quyền` : `📺 ${finalName}\n⚡ Luồng HLS Nhanh & Dịch Phụ đề Tiếng Việt Chuẩn`, url: line, behaviorHints: { isLive: true, proxyHeaders: { request: { "User-Agent": currentUa || "Dalvik/2.1.0" } } } });
                    }
                    if (key.includes("warner")) {
                        ch.streams.unshift({ name: "⚡ [Dự Phòng] Warner HD Mở Rộng", title: `📺 Warner TV HD\n⚡ Phân Phát Máy Chủ Ngoại`, url: "http://cdn4.skygo.mn/live/disk1/Warner/HLSv3-FTA/Warner.m3u8", behaviorHints: { isLive: true } });
                    }
                }
                currentName = ""; currentUa = "Dalvik/2.1.0";
            }
        }
    } catch(e) {}

    try {
        const vRes = await axios.get(`${VIPTORRENT_BASE}/catalog/tv/viptorrent_iptv_vn.json`, { timeout: 3200 });
        const vipMetas = vRes.data?.metas || [];
        vipMetas.forEach(v => {
            const key = normalizeTvKey(v.name); if (!key) return;
            if (!channelMap.has(key)) { channelMap.set(key, { id: `iptv_${key}`, key, name: v.name, poster: v.poster || "https://via.placeholder.com/300x200?text=TV", genre: "📺 Truyền Hình", streams: [] }); }
            const item = channelMap.get(key);
            if (!item.poster || item.poster.includes("placeholder")) { item.poster = v.poster; } item.vipId = v.id;
            item.streams.push({ name: "🔴 [VipTorrent IPTV]", title: `📺 ${v.name}\n💎 Luồng Chính Thức Máy Chủ VipTorrent`, url: `${VIPTORRENT_BASE}/stream/tv/${v.id}.json`, isVipApi: true, behaviorHints: { isLive: true } });
        });
    } catch (e) {}

    const result = Array.from(channelMap.values()).sort((a, b) => { const sA = getTvSortRank(a.name, a.genre); const sB = getTvSortRank(b.name, b.genre); if (sA.rank !== sB.rank) return sA.rank - sB.rank; if (sA.sub !== sB.sub) return sA.sub - sB.sub; return (a.name || "").localeCompare(b.name || ""); });
    if (result.length > 0) cache.set("unified_tv_channels", result, 1800); return result;
};

const getChannelEpgInfo = async (channelName, cache) => {
    const clean = (channelName || "").toLowerCase(); const h = (new Date().getUTCHours() + 7) % 24; const m = new Date().getUTCMinutes(); const time = `${h < 10 ? '0'+h : h}:${m < 10 ? '0'+m : m}`;
    if (clean.includes("hbo") || clean.includes("warner")) return `📺 Đang Phát Tới 24h: Các Tác Phẩm Bom Tấn (Đã Có Vietsub)`; if (clean.includes("vtv3")) return `📺 Lịch phát sóng [${time}]: Phim Giờ Vàng`; if (clean.includes("sport")) return `⚽ Trực Tiếp Thể Thao [${time}]`; return `📺 Truyền Hình Trực Tiếp [${time}]`;
};

// =========================================================================
// 4. BÓNG ĐÁ M3U EXTRACTOR: VƯỢT CLOUDFLARE 100% CÙNG CỘNG ĐỒNG
// =========================================================================
const fetchLiveMatches = async (cache) => {
    const cached = cache.get("live_sports_matches"); if (cached) return cached;
    const matchesMap = new Map();
    const M3U_BONG_DA = [ "https://thtt.pages.dev/tttt.m3u", "https://dl.dropboxusercontent.com/s/o5vygit34v9ryly71gam4/coban66.m3u?rlkey=auyoon54hfubajt16nc7u7dbn&st=70gyvtcu&dl=0", "https://raw.githubusercontent.com/hieu-TQS/error/refs/heads/main/error.m3u" ];

    for (const m3uUrl of M3U_BONG_DA) {
        try {
            const res = await axios.get(m3uUrl, { timeout: 4500, headers: { "User-Agent": "Mozilla/5.0" } });
            const lines = res.data.split("\n"); let currentMeta = null;
            for (let line of lines) {
                line = line.trim();
                if (line.startsWith("#EXTINF:")) {
                    const nameMatch = line.match(/,(.+)$/); const logoMatch = line.match(/tvg-logo="([^"]+)"/); const groupMatch = line.match(/group-title="([^"]+)"/);
                    if (nameMatch) {
                        const rawName = nameMatch[1].trim(); const rawNameLower = rawName.toLowerCase();
                        if ((rawNameLower.includes(" vs ") || rawNameLower.includes(" - ") || rawNameLower.includes("live")) && !rawNameLower.includes("vtv") && !rawNameLower.includes("htv")) {
                            let cleanMatchName = rawName.split(/\[|\(|\- |\|/)[0].trim(); if (!cleanMatchName) cleanMatchName = rawName;
                            currentMeta = { rawName, matchName: cleanMatchName, matchId: "match_m3u_" + Buffer.from(cleanMatchName).toString("hex").slice(0, 10), poster: logoMatch ? logoMatch[1] : "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=500&q=80", group: groupMatch ? groupMatch[1] : "⚽ Trực Tiếp Hôm Nay" };
                        } else { currentMeta = null; }
                    }
                } else if (line.startsWith("http") && currentMeta) {
                    if (!matchesMap.has(currentMeta.matchName)) { matchesMap.set(currentMeta.matchName, { id: currentMeta.matchId, name: `🔴 [LIVE] ${currentMeta.matchName}`, poster: currentMeta.poster, genre: currentMeta.group, description: "Trực Tiếp Bóng Đá Đỉnh Cao (M3U)", streams: [] }); }
                    const matchEntry = matchesMap.get(currentMeta.matchName);
                    let streamName = `🔴 [M3U] ${currentMeta.rawName.replace(currentMeta.matchName, "").trim()}`; if (streamName === `🔴 [M3U]`) streamName = `🔴 [BLV Tiếng Việt M3U]`;
                    let headerInject = { "User-Agent": "Mozilla/5.0" };
                    if (line.includes("gavang")) headerInject = { "Referer": "https://gavang.tv/", "Origin": "https://gavang.tv/" }; if (line.includes("socolive") || line.includes("vebo")) headerInject = { "Referer": "https://socolive.pro/" };
                    matchEntry.streams.push({ name: streamName.substring(0, 35), title: `⚽ ${currentMeta.rawName}\n⚡ Luồng Cáo Bạc / M3U Tinhlagi`, url: line, behaviorHints: { isLive: true, proxyHeaders: { request: headerInject } } }); currentMeta = null;
                }
            }
        } catch (e) {}
    }
    let matches = Array.from(matchesMap.values());
    if (matches.length === 0) { matches.push({ id: "match_error_fallback", name: "📡 Radar Đang Cập Nhật Trận Đấu", poster: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=500", genre: "⚽ Radar Thể Thao", description: "Các Trận Đấu Trực Tiếp thường sẽ được hệ thống lên sóng trước 30 Phút khi bóng lăn. Vui lòng trở lại sau.", streams: [] }); }
    matches.sort((a, b) => b.streams.length - a.streams.length); cache.set("live_sports_matches", matches, 150); return matches;
};

// ĐÃ CHỈNH LẠI HÀM SẮP XẾP TV CỐ TÌNH ĐƯA LINK DRM CHỨA CỜ NHẬN DIỆN LÊN ĐỈNH BẢNG!
const getChannelStreams = async (rawId, cache, debridKey = "") => {
    if (rawId.startsWith("match_")) { 
        const matches = await fetchLiveMatches(cache); const foundMatch = matches.find(m => m.id === rawId); 
        if (foundMatch && foundMatch.streams) { 
            let finalStreams = [...foundMatch.streams]; 
            if (debridKey) { finalStreams.unshift({ name: `⚡ [Real-Debrid] Mạng P2P 4K`, title: `⚽ Băng Thông Trực Tiếp Không Đáy`, url: `https://real-debrid.com/streaming/unrestricted?token=${debridKey}`, behaviorHints: { isLive: true } }); }
            return finalStreams; 
        } 
    }

    const channels = await fetchUnifiedTvChannels(cache);
    const targetKey = rawId.replace("iptv_", "").replace("vmttv_", "");
    const found = channels.find(c => c.key === targetKey || c.id === rawId || (c.vipId && c.vipId === rawId));
    if (!found) {
        for (const fbKey of Object.keys(FALLBACK_TV_POOLS)) { if (targetKey.includes(fbKey)) { return FALLBACK_TV_POOLS[fbKey].map((url, idx) => ({ name: `🌐 [Dự Phòng ${idx + 1}]`, title: `📺 Kênh Trực Tiếp`, url, behaviorHints: { isLive: true } })); } }
        return [];
    }

    const finalStreams = [];
    for (const st of found.streams) {
        if (st.isVipApi && found.vipId) {
            try { const res = await axios.get(`${VIPTORRENT_BASE}/stream/tv/${found.vipId}.json`, { timeout: 2600 }); if (res.data?.streams) { res.data.streams.forEach(vst => { finalStreams.push({ name: `🔴 [VipTorrent]`, title: `📺 ${found.name}\n💎 VipTorrent Chuẩn 1080p`, url: vst.url, behaviorHints: { isLive: true } }); }); } } catch (e) {}
        } else if (st.url && st.url.startsWith("http")) { finalStreams.push(st); }
    }

    for (const fbKey of Object.keys(FALLBACK_TV_POOLS)) { if (targetKey.includes(fbKey)) { FALLBACK_TV_POOLS[fbKey].forEach((url, idx) => { finalStreams.push({ name: `⚡ [HLS Dự Phòng ${idx + 1}] Không Khóa Mã`, title: `📺 ${found ? found.name : 'Kênh Trực Tiếp'}\n⚡ Luồng HLS Mở Trực Tiếp`, url, behaviorHints: { isLive: true } }); }); } }

    const unique = []; const seen = new Set();
    
    // Thuật toán nhấc link DRM Web lên đỉnh ngay lập tức
    const sorted = finalStreams.sort((a, b) => {
        let sA = (a.isClearkeyFlag || a.isPipeFlag) ? 1000 : 0;
        let sB = (b.isClearkeyFlag || b.isPipeFlag) ? 1000 : 0;
        if(a.name && a.name.includes("VipTorrent")) sA += 500;
        if(b.name && b.name.includes("VipTorrent")) sB += 500;
        return sB - sA;
    });
    
    sorted.forEach(s => { 
        const checkUrl = s.url || s.externalUrl || "";
        if (!seen.has(checkUrl)) { seen.add(checkUrl); unique.push(s); } 
    });
    
    return unique;
};

// =========================================================================
// 5. BỘ CÀO PHIM VOD & HỖ TRỢ PHỤ ĐỀ
// =========================================================================
const fetchSubtitles = async (type, rawId) => {
    if (!rawId.startsWith("tt")) return []; const imdbId = rawId.split(":")[0];
    try { const res = await axios.get(`https://opensubtitles-v3.strem.io/subtitles/${type}/${rawId}.json`, { timeout: 2500 }); if (res.data?.subtitles) { const viSubs = res.data.subtitles.filter(s => s.lang === 'vie' || s.lang === 'vi'); if (viSubs.length > 0) { return viSubs; } } } catch (e) {}
    return [{ id: `sub_vi_${imdbId}`, url: `https://sub.vnstream.io.vn/vtt/${imdbId}.vtt`, lang: "vie", label: "🇻🇳 Tiếng Việt (Tự Động)" }];
};

const searchAllMovieSources = async (keyword, page = 1) => {
    const endpoints = getEndpoints(); const cleanKw = (keyword || "").trim(); if (!cleanKw) return []; const noToneKw = removeVietnameseTones(cleanKw);
    const tasks = [
        http.get(`${endpoints.kkphim}/v1/api/tim-kiem?keyword=${encodeURIComponent(cleanKw)}&limit=16&page=${page}`).then(res => (res.data?.data?.items || []).map(p => ({ id: `phim_${p.slug}`, type: (p.type === "tv" || p.type === "series" || p.total_episodes > 1) ? "series" : "movie", name: p.name, origin_name: p.origin_name || "", poster: getImgUrl(p.thumb_url || p.poster_url), description: `${p.origin_name || ""} • [KKPhim]` }))).catch(() => []),
        Promise.any([ http.get(`${endpoints.vsmov}/api/tim-kiem?keyword=${encodeURIComponent(cleanKw)}&limit=16&page=${page}`, { timeout: 3800 }), http.get(`${endpoints.vsmov}/api/tim-kiem?keyword=${encodeURIComponent(noToneKw)}&limit=16&page=${page}`, { timeout: 3800 }) ]).then(res => { const arr = res.data?.items || res.data?.data?.items || (Array.isArray(res.data?.data) ? res.data.data : []) || []; return arr.map(p => ({ id: `vsmov_${p.slug}`, type: (p.type === "tv" || p.type === "series" || (p.name || "").includes("Tập")) ? "series" : "movie", name: p.name, origin_name: p.origin_name || "", poster: p.thumb_url || p.poster_url || "https://via.placeholder.com/300x450?text=No+Poster", description: `${p.origin_name || ""} • [VSMOV]` })); }).catch(() => []),
        http.get(`${endpoints.nguonc}/api/films/search?keyword=${encodeURIComponent(cleanKw)}&page=${page}`, { timeout: 3000, headers: { "Accept": "application/json" } }).then(res => { const arr = (res.data?.status === "success" && Array.isArray(res.data?.items)) ? res.data.items : []; return arr.map(p => ({ id: `nguonc_${p.slug}`, type: (p.type === "tv" || p.type === "series") ? "series" : "movie", name: p.name, origin_name: p.original_name || "", poster: p.thumb_url || p.poster_url || "https://via.placeholder.com/300x450?text=No+Poster", description: `${p.original_name || ""} • [NguonC]` })); }).catch(() => [])
    ];
    const results = await Promise.allSettled(tasks); const combined = []; results.forEach(r => { if (r.status === "fulfilled" && Array.isArray(r.value)) { combined.push(...r.value); } });
    const unique = []; const seen = new Set(); combined.forEach(item => { const key = item.name.toLowerCase().trim(); if (!seen.has(key) && !isAnimeMovie(item)) { seen.add(key); unique.push(item); } });
    return unique;
};

const fetchKKPhim = async (slug, targetEpisode) => {
    try { 
        const res = await http.get(`${getEndpoints().kkphim}/phim/${slug}`, { timeout: 2600 }); const movie = res.data?.movie; if (!movie) return { streams: [], movie: null }; 
        const episodes = res.data?.episodes || []; const streams = [];
        episodes.forEach(server => { 
            const sName = (server.server_name || "KKPhim VIP").trim(); const foundEp = (server.server_data || []).find((ep, idx) => { return targetEpisode === null || parseEpisodeNumber(ep.name, idx) === targetEpisode; });
            if (foundEp && foundEp.link_m3u8) { streams.push({ name: `[KKPhim] ${sName}`, title: `🎬 Server: ${sName} • Tập ${foundEp.name || 'Full'}\n⚡ Máy Chủ Việt Nam PhimAPI`, url: foundEp.link_m3u8, behaviorHints: { proxyHeaders: { request: { "Referer": "https://phimapi.com/", "User-Agent": "Mozilla/5.0" } } } }); }
        }); 
        return { streams, movie };
    } catch (e) { failureTelemetry.recordFailure(); return { streams: [], movie: null }; }
};

const fetchVSMOV = async (slug, targetEpisode, title = "", origTitle = "", targetImdbId = "") => {
    const baseUrl = getEndpoints().vsmov;
    const tryFetch = async (targetSlug) => {
        if (!targetSlug) return null;
        try { 
            const res = await http.get(`${baseUrl}/api/phim/${targetSlug}`, { timeout: 2600 }); const data = res.data?.data || res.data || {}; const movie = data.movie || data.item || data; const episodes = res.data?.episodes || data.episodes || movie?.episodes || [];
            if (Array.isArray(episodes) && episodes.length > 0) { 
                const streams = [];
                for (const server of episodes) { 
                    const sName = (server.server_name || server.name || "VSMOV VIP").replace(/[\r\n]+/g, ' ').trim(); const eList = server.server_data || server.items || server.episodes || [];
                    const foundEp = eList.find((ep, idx) => { return targetEpisode === null || parseEpisodeNumber(ep.name, idx) === targetEpisode; });
                    if (foundEp) { 
                        let link = foundEp.link_m3u8 || foundEp.m3u8 || "";
                        if (!link && foundEp.link_embed) { try { const embedRes = await http.get(foundEp.link_embed, { timeout: 1800, headers: { "Referer": "https://vsmov.com/" } }); const html = typeof embedRes.data === 'string' ? embedRes.data : ''; const match = html.match(/(https?:\/\/[^"'\s]+\.m3u8[^"'\s]*)/i) || html.match(/source\s*:\s*["']([^"']+\.m3u8[^"']*)["']/i); if (match) link = match[1]; } catch (e) {} }
                        if (link && link.includes('.m3u8')) { streams.push({ name: `[VSMOV 100Gbps] ${sName}`, title: `🎬 Server: ${sName} • Tập ${foundEp.name || 'Full'}\n🚀 CDN VSMOV 30ms Siêu Tốc`, url: link, behaviorHints: { proxyHeaders: { request: { "Referer": "https://vsmov.com/" } } } }); } else if (foundEp.link_embed) { streams.push({ name: `[VSMOV Webview] ${sName}`, title: `🎬 Server: ${sName} • Tập ${foundEp.name || 'Full'}\n⚡ Mở Trình Phát Web VSMOV Mượt Mà`, externalUrl: foundEp.link_embed }); }
                    }
                } 
                if (streams.length > 0) return { streams, movie };
            }
        } catch (e) { failureTelemetry.recordFailure(); } 
        return null;
    };
    let result = await tryFetch(slug); if (result) return result;
    if (title || origTitle) {
        try { 
            const cleanTitle = (origTitle || title).replace(/\s*\(\d{4}\)/g, '').replace(/[:\-–&]/g, ' ').trim();
            for (const sUrl of [`${baseUrl}/api/tim-kiem?keyword=${encodeURIComponent(cleanTitle)}&limit=5`]) {
                const sRes = await http.get(sUrl, { timeout: 2600 }); const items = sRes.data?.items || sRes.data?.data?.items || [];
                for (const it of items.slice(0, 5)) { if (isStrictTitleMatch(title, origTitle, it.name, it.origin_name, targetImdbId, it.imdb?.id) && it.slug) { result = await tryFetch(it.slug); if (result) return result; } }
            }
        } catch (e) {}
    } 
    return { streams: [], movie: null };
};

const fetchNguonC = async (slug, targetEpisode, title = "", origTitle = "") => {
    const baseUrl = getEndpoints().nguonc;
    const tryFetch = async (targetSlug) => { 
        if (!targetSlug) return null;
        try { 
            const res = await http.get(`${baseUrl}/api/film/${targetSlug}`, { timeout: 2800, headers: { "Accept": "application/json" } });
            if (res.data?.status === "success" && res.data?.movie) { 
                const movie = res.data.movie; const streams = [];
                (movie.episodes || []).forEach(server => { 
                    const sName = (server.server_name || "NguonC VIP").trim(); const foundEp = (server.items || []).find((ep, idx) => { return targetEpisode === null || parseEpisodeNumber(ep.name, idx) === targetEpisode; }); const link = foundEp?.m3u8 || foundEp?.link_m3u8; 
                    if (foundEp && link && link.includes('.m3u8')) { streams.push({ name: `[NguonC] ${sName}`, title: `🎬 Server: ${sName}\n🚀 Máy Chủ NguonC`, url: link, behaviorHints: { proxyHeaders: { request: { "Referer": "https://phim.nguonc.com/" } } } }); }
                });
                if (streams.length > 0) return { streams, movie };
            }
        } catch (e) { failureTelemetry.recordFailure(); } 
        return null;
    }; 
    let result = await tryFetch(slug); if (result) return result; return { streams: [], movie: null };
};

const fetchAllVnStreamsByTitle = async (title, originTitle, year, targetEpisode, imdbId = "") => {
    const endpoints = getEndpoints(); 
    const cleanSearch = (str) => { if (!str) return ""; return str.replace(/\s*\(\d{4}\)/g, '').replace(/\[.*?\]|\(.*?\)/g, '').replace(/season\s*\d+|phần\s*\d+|tập\s*\d+/gi, '').replace(/[:\-–&]/g, ' ').replace(/\s+/g, ' ').trim(); };
    const query = cleanSearch(originTitle) || cleanSearch(title); if (!query || query.length < 2) return [];

    const searchTasks = [
        http.get(`${endpoints.kkphim}/v1/api/tim-kiem?keyword=${encodeURIComponent(query)}&limit=3`, { timeout: 2200 }).then(res => ({ source: "kkphim", items: res.data?.data?.items || [] })).catch(() => ({ source: "kkphim", items: [] })),
        http.get(`${endpoints.vsmov}/api/tim-kiem?keyword=${encodeURIComponent(query)}&limit=5`, { timeout: 3500 }).then(res => ({ source: "vsmov", items: res.data?.items || res.data?.data?.items || [] })).catch(() => ({ source: "vsmov", items: [] })),
        http.get(`${endpoints.nguonc}/api/films/search?keyword=${encodeURIComponent(query)}&page=1`, { timeout: 2500, headers: { "Accept": "application/json" } }).then(res => ({ source: "nguonc", items: res.data?.status === "success" ? (res.data.items || []) : [] })).catch(() => ({ source: "nguonc", items: [] }))
    ];
    
    const searchResults = await Promise.allSettled(searchTasks); let kkSlug = null, vsSlug = null, ncSlug = null;
    searchResults.forEach(r => { 
        if (r.status === "fulfilled" && r.value?.items?.length > 0) { 
            const matchedItem = r.value.items.find(it => { return isStrictTitleMatch(title, originTitle, it.name, it.origin_name || it.original_name, imdbId, it.imdb?.id); }); 
            if (matchedItem && matchedItem.slug) { if (r.value.source === "kkphim" && !kkSlug) kkSlug = matchedItem.slug; if (r.value.source === "vsmov" && !vsSlug) vsSlug = matchedItem.slug; if (r.value.source === "nguonc" && !ncSlug) ncSlug = matchedItem.slug; } 
        } 
    });

    const streamTasks = []; 
    if (kkSlug) streamTasks.push(fetchKKPhim(kkSlug, targetEpisode)); 
    if (vsSlug) streamTasks.push(fetchVSMOV(vsSlug, targetEpisode, title, originTitle, imdbId)); 
    if (ncSlug) streamTasks.push(fetchNguonC(ncSlug, targetEpisode, title, originTitle));
    
    const streamResults = await Promise.allSettled(streamTasks); const vnStreams = []; 
    streamResults.forEach(r => { if (r.status === "fulfilled" && r.value?.streams) { vnStreams.push(...r.value.streams); } }); 
    return vnStreams;
};

const fetchMainstreamMacCmsStreams = async (originTitle, title, targetEpisode) => {
    const cleanKw = (originTitle || title || "").replace(/\s*\(\d{4}\)/g, '').replace(/\[.*?\]|\(.*?\)/g, '').replace(/season\s*\d+|phần\s*\d+|tập\s*\d+/gi, '').replace(/[:\-–&]/g, ' ').replace(/\s+/g, ' ').trim(); 
    if (!cleanKw || cleanKw.length < 2) return [];
    
    const apis = [ `https://api.tiankongapi.com/api.php/provide/vod/at/json/?ac=detail&wd=${encodeURIComponent(cleanKw)}`, `https://bfzyapi.com/api.php/provide/vod/at/json/?ac=detail&wd=${encodeURIComponent(cleanKw)}`, `https://ikunzyapi.com/api.php/provide/vod/at/json/?ac=detail&wd=${encodeURIComponent(cleanKw)}` ];
    const adultTags = ["伦理", "情色", "成人", "福利", "三级", "里番", "18+"]; const foundStreams = [];

    for (const apiUrl of apis) {
        try { 
            const res = await http.get(apiUrl, { timeout: 2600 }); const list = res.data?.list || []; if (list.length === 0) continue; 
            const cleanMovies = list.filter(item => { return !adultTags.some(t => (item.type_name || "").toLowerCase().includes(t) || (item.vod_name || "").toLowerCase().includes(t)); }); 
            if (cleanMovies.length === 0) continue;
            
            const targetMovie = cleanMovies[0]; const playUrlStr = targetMovie.vod_play_url || ""; if (!playUrlStr) continue; 
            const is4kGlobal = (targetMovie.vod_remarks || "").toLowerCase().includes("4k") || (targetMovie.vod_name || "").toLowerCase().includes("4k");
            
            playUrlStr.split(/#|\$\$\$/).forEach((part, idx) => { 
                const seg = part.split('$'); const epName = seg.length > 1 ? seg[0].trim() : `Tập ${idx + 1}`; const url = seg.length > 1 ? seg[1].trim() : seg[0].trim();
                if ((targetEpisode === null || parseEpisodeNumber(epName, idx) === targetEpisode) && url && (url.includes('.m3u8') || url.includes('.mp4'))) {
                    const is4k = is4kGlobal || epName.toLowerCase().includes("4k"); 
                    foundStreams.push({ name: is4k ? `🌐 [Asia VIP 4K] 💎` : `🌐 [Asia VIP 1080p] ⚡`, title: `🎬 ${targetMovie.vod_name} • ${epName}\n🚀 CDN Châu Á Siêu Tốc`, url, behaviorHints: { proxyHeaders: { request: { "User-Agent": "Mozilla/5.0" } } } });
                }
            });
            if (foundStreams.length > 0) break;
        } catch (e) {}
    } 
    return foundStreams;
};

// =========================================================================
// 6. MODULE NGƯỜI LỚN
// =========================================================================
const extractJavCode = (title) => { const match = (title || "").replace(/\[.*?\]|\(.*?\)/g, ' ').trim().match(/([a-zA-Z]{2,6})[-_ ]?(\d{2,5})/i); if (match) { return { code: `${match[1].toUpperCase()}-${match[2]}`, prefix: match[1].toUpperCase(), num: parseInt(match[2], 10) }; } return { code: "", prefix: "", num: 0 }; };
const PREFERRED_JAV_CODES = ["JUQ", "SSIS", "SNIS", "IPX", "SIVR", "IPZ", "IPSX", "JUC", "FSDSS", "FNE", "STAR", "STARS", "MIDE", "MIAE", "PRED", "JUL", "WANZ", "ABP", "ADN"];
const getAdultVideoScore = (item) => { let score = 0; const t = (item.vod_name || "").toLowerCase(); const n = (item.type_name || "").toLowerCase(); const p = extractJavCode(item.vod_name); if (["国产", "探花", "自拍", "麻豆", "吃瓜", "91", "门事件"].some(x => t.includes(x) || n.includes(x))) { score -= 30000; } if (p.code || n.includes("日本") || n.includes("jav") || t.includes("日本")) { score += 20000; } if (p.prefix) { score += PREFERRED_JAV_CODES.includes(p.prefix) ? 40000 - (PREFERRED_JAV_CODES.indexOf(p.prefix) * 500) : 10000; } return score; };

const fetchAdultJav = async (page, rawCatalogId) => {
    const cat = ADULT_SUB_CATALOGS.find(c => rawCatalogId.includes(c.id) || rawCatalogId.includes(c.id.replace(/-/g, '_'))); let rawList = [];
    for (const kw of [cat?.primaryKw, cat?.secondaryKw, ""]) { 
        if (!kw && rawList.length > 0) break; 
        for (const url of [`https://api.apilyzy.com/api.php/provide/vod/at/json/?ac=detail&pg=${page}${kw ? `&wd=${encodeURIComponent(kw)}` : ''}`, `https://lbapi9.com/api.php/provide/vod/at/json/?ac=detail&pg=${page}${kw ? `&wd=${encodeURIComponent(kw)}` : ''}`]) { try { const res = await http.get(url, { timeout: 2800 }); if (res.data?.list?.length > 0) { rawList = res.data.list; break; } } catch (e) {} } 
        if (rawList.length > 0) break; 
    }
    rawList.sort((a, b) => { return getAdultVideoScore(b) - getAdultVideoScore(a) !== 0 ? getAdultVideoScore(b) - getAdultVideoScore(a) : extractJavCode(b.vod_name).num - extractJavCode(a.vod_name).num; });
    return rawList.map(item => { const p = extractJavCode(item.vod_name); return { id: `jav_${item.vod_id}`, type: "movie", name: `🔞 ${p.code ? `[${p.code}] ` : ""}${(item.vod_name || "").replace(/\[.*?\]/g, '').trim()}`, poster: item.vod_pic || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500", description: p.code ? `💎 Code: ${p.code} • ${cat?.tag || "JAV"} • JAV Nhật Bản 1080p` : `Phim JAV Nhật Bản • ${cat?.tag || "JAV"}` }; });
};

const fetchAdultJavMeta = async (rawId) => { 
    const vodId = rawId.replace("jav_", ""); 
    for (const url of [`https://api.apilyzy.com/api.php/provide/vod/at/json/?ac=detail&ids=${vodId}`, `https://lbapi9.com/api.php/provide/vod/at/json/?ac=detail&ids=${vodId}`]) { try { const res = await http.get(url, { timeout: 2600 }); const item = res.data?.list?.[0]; if (item) { return { id: rawId, type: "movie", name: `🔞 ${item.vod_name}`, poster: item.vod_pic, background: item.vod_pic, description: `Phim JAV Nhật Bản HD • Bản Gốc`, genres: ["18+", "JAV"] }; } } catch (e) {} } 
    return { id: rawId, type: "movie", name: "🔞 Phim 18+ JAV" }; 
};

const fetchAdultJavStream = async (rawId) => { 
    const vodId = rawId.replace("jav_", ""); 
    for (const url of [`https://api.apilyzy.com/api.php/provide/vod/at/json/?ac=detail&ids=${vodId}`, `https://lbapi9.com/api.php/provide/vod/at/json/?ac=detail&ids=${vodId}`]) { 
        try { 
            const res = await http.get(url, { timeout: 3000 }); const item = res.data?.list?.[0]; 
            if (item?.vod_play_url) { const streams = []; item.vod_play_url.split(/#|\$\$\$/).forEach((part, idx) => { const segs = part.split('$'); const u = segs.length > 1 ? segs[1].trim() : segs[0].trim(); if (u && u.includes('.m3u8')) { streams.push({ name: `🔞 [JAV VIP 1080p]`, title: `🎬 ${item.vod_name}\n💎 Server HLS #${idx + 1}`, url: u }); } }); if (streams.length > 0) return streams; } 
        } catch (e) {} 
    } 
    return []; 
};

// =========================================================================
// 7. QUỐC TẾ & REAL-DEBRID (Lấy Thông Tin / Luồng Phát)
// =========================================================================
const getCinemetaInfo = async (type, imdbId, cache) => { 
    const cached = cache.get(`cinemeta_${imdbId}`); if (cached) return cached; 
    try { const res = await http.get(`https://v3-cinemeta.strem.io/meta/${type}/${imdbId}.json`, { timeout: 2400 }); const meta = res.data?.meta; if (meta && meta.name) { const data = { name: meta.name, year: meta.year || "" }; cache.set(`cinemeta_${imdbId}`, data, 86400 * 7); return data; } } catch (e) {} 
    return null; 
};

const getImdbFromTitle = async (type, title, cache) => { 
    const clean = (title || "").replace(/\s*\(\d{4}\)/g, '').replace(/\[.*?\]|\(.*?\)/g, '').replace(/season\s*\d+|phần\s*\d+|tập\s*\d+/gi, '').replace(/[:\-–&]/g, ' ').replace(/\s+/g, ' ').trim(); if (!clean || clean.length < 2) return null; 
    const cached = cache.get(`imdb_search_${clean}`); if (cached) return cached; 
    try { const res = await http.get(`https://v3-cinemeta.strem.io/catalog/${type}/top/search=${encodeURIComponent(clean)}.json`, { timeout: 2600 }); const metas = res.data?.metas || []; if (metas.length > 0 && metas[0].id) { cache.set(`imdb_search_${clean}`, metas[0].id, 86400 * 7); return metas[0].id; } } catch (e) {} 
    return null; 
};

const fetchVipTorrentHttp = async (targetType, queryParam) => {
    const c = (queryParam || "").replace('.json', ''); if (!c) return [];
    for (const url of [`${VIPTORRENT_BASE}/stream/${targetType}/${c}.json`, `https://viptorrent.nadan.cloud/stream/${targetType}/${c}.json`]) {
        try { const res = await http.get(url, { timeout: 2500 }); const streams = res.data?.streams; if (streams?.length > 0) { return streams.map(st => ({ ...st, name: `🌐 VipTorrent HTTP Direct` })); } } catch (e) {}
    } return [];
};

const fetchVNStream = async (targetType, queryId) => { 
    try { const res = await http.get(`https://addon.vnstream.io.vn/guest/stream/${targetType}/${queryId}.json`, { timeout: 2400 }); const streams = res.data?.streams; if (streams?.length > 0) { return streams.map(st => ({ ...st, name: `[VNStream] ${st.name || 'Direct'}` })); } } catch (e) {} return []; 
};

const fetchTorrentio = async (targetType, imdbId, seasonNum, targetEpisode, debridToken = "") => { 
    if (!imdbId || !imdbId.startsWith("tt")) return []; 
    try { 
        const debridStr = debridToken ? `realdebrid=${debridToken}|` : ""; const query = targetType === "series" && targetEpisode ? `:${seasonNum || 1}:${targetEpisode}` : "";
        const res = await http.get(`https://torrentio.strem.fun/${debridStr}language=vietnamese|qualityfilter=4k,1080p/stream/${targetType}/${imdbId}${query}.json`, { timeout: 2500 }); const streams = res.data?.streams; 
        if (streams?.length > 0) { return streams.slice(0, 5).map(st => ({ ...st, name: debridToken ? `⚡ [Real-Debrid 4K]\n${st.name || ''}` : `[Torrent 4K Vietsub]\n${st.name || ''}` })); }
    } catch (e) {} 
    return []; 
};

// =========================================================================
// 8. THUẬT TOÁN ĐIỀU HƯỚNG BĂNG THÔNG STREAM
// =========================================================================
const sortStreamsByNewRule = (streams) => {
    return streams.sort((a, b) => {
        const getScore = (st) => { 
            const t = `${(st.name || "").toLowerCase()} ${(st.title || "").toLowerCase()}`; 
            let score = 0;
            if (t.includes("player mới") || t.includes("web") || t.includes("webview")) score += 60000; // Ưu tiên Webview
            else if (t.includes("exoplayer chuẩn")) score += 50000;
            else if (t.includes("real-debrid")) score += 40000;
            else if (t.includes("kkphim") || t.includes("vsmov") || t.includes("nguonc")) score += 30000;
            else if (t.includes("asia vip")) score += 25000;
            else if (t.includes("viptorrent")) score += 20000;
            else score += 10000;
            
            if (t.includes("4k") || t.includes("2160p")) score += 400; else if (t.includes("1080p") || t.includes("fhd")) score += 300; else if (t.includes("720p") || t.includes("hd")) score += 200; else score += 100;
            if (t.includes("thuyết minh") || t.includes("lồng tiếng")) score += 40; else if (t.includes("vietsub") || t.includes("phụ đề")) score += 20;
            return score; 
        };
        return getScore(b) - getScore(a);
    });
};

// =========================================================================
// EXPORTS CẦN THIẾT CHO SERVER.JS HOẠT ĐỘNG
// =========================================================================
module.exports = {
    getEndpoints, failureTelemetry, TOP_MAIN_CATALOGS, SUB_GRID_CATALOGS, TV_CATALOGS, MOVIE_CATALOGS, ADULT_SUB_CATALOGS, ALL_CATALOGS, DEFAULT_ACTIVE_IDS,
    parseConfig, buildManifest, fetchLiveMatches, fetchUnifiedTvChannels, getChannelStreams, getChannelEpgInfo, fetchSubtitles, isAnimeMovie, getImgUrl, parseEpisodeNumber, searchAllMovieSources, fetchKKPhim, fetchVSMOV, fetchNguonC, fetchAllVnStreamsByTitle, fetchMainstreamMacCmsStreams, fetchAdultJav, fetchAdultJavMeta, fetchAdultJavStream, getCinemetaInfo, getImdbFromTitle, fetchVipTorrentHttp, fetchVNStream, fetchTorrentio, sortStreamsByNewRule, classifyTvChannel, isMovieChannel, isInternationalChannel
};
