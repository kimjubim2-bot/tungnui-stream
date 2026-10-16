/**
 * index.jsTUNGNUI PRO 3.6 - ULTIMATE MERGE EDITION (BẢN FINAL TRỊ MÀN ĐEN TIVI)
 * Tái cấu trúc Mạng truyền Link "Virtual M3u Playlist" thông qua Vercel!
 */

const fs = require("fs");
const path = require("path");
const axios = require("axios");

const VIPTORRENT_BASE = "https://viptorrent.nadan.cloud/%7B%22v%22%3A%226.2.0%22%7D";

const getEndpoints = () => {
    const defaults = { kkphim: "https://phimapi.com", vsmov: "https://vsmov.com", nguonc: "https://phim.nguonc.com" };
    try { const data = JSON.parse(fs.readFileSync(path.join(process.cwd(), "api_endpoints.json"), "utf-8")); if (data && data.kkphim) { return { kkphim: data.kkphim.replace(/\/api\/?$/, ''), vsmov: data.vsmov.replace(/\/api\/?$/, ''), nguonc: data.nguonc.replace(/\/api\/?$/, '') }; } } catch (e) {}
    return defaults;
};

const failureTelemetry = { count: 0, lastTrigger: 0, recordFailure: async () => {} };
const http = axios.create({ timeout: 3000, headers: { "User-Agent": "Mozilla/5.0 Chrome/128.0.0.0 Safari/537.36" } });
const getImgUrl = (url) => { if (!url) return "https://via.placeholder.com/300x450?text=No+Poster"; return url.startsWith("http") ? url : `https://phimimg.com/${url}`; };
const parseEpisodeNumber = (name, index) => { if (!name) return index + 1; const match = name.toString().match(/\d+/); return match ? parseInt(match[0], 10) : index + 1; };
const removeVietnameseTones = (str) => { if (!str) return ""; return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D'); };

const classifyTvChannel = (ch) => {
    const n = (ch.name || "").toLowerCase();
    if (n.includes(" vs ") || n.includes("⚽") || n.includes("🏀")) return { category: "the_thao", categoryName: "⚽ Kênh Thể Thao", sortIndex: 40 };
    if (n.includes("vtv") && !n.includes("vtvcab")) return { category: "vtv", categoryName: "🔴 Kênh VTV", sortIndex: 1 };
    if (n.includes("cartoon") || n.includes("kids") || n.includes("thiếu nhi") || n.includes("disney")) return { category: "thieu_nhi", categoryName: "👶 Kênh Thiếu Nhi", sortIndex: 30 };
    if (n.includes("warner") || n.includes("cinema") || n.includes("filmbox") || n.includes("hbo") || n.includes("cinemax") || n.includes("axn") || n.includes("phim")) {
        let sortIndex = 55; if (n.includes("hbo")) sortIndex = 50; else if (n.includes("cinemax")) sortIndex = 51; else if (n.includes("warner")) sortIndex = 52; else if (n.includes("axn")) sortIndex = 53;
        return { category: "phim_truyen", categoryName: "🎬 Kênh Phim", sortIndex };
    }
    if (n.includes("sport") || n.includes("thể thao") || n.includes("k+")) return { category: "the_thao", categoryName: "⚽ Kênh Thể Thao", sortIndex: 40 };
    if (n.includes("vtvcab") || n.includes("vtv cab") || n.startsWith("on ")) return { category: "vtvcab", categoryName: "📺 Kênh VTVCab", sortIndex: 20 };
    if (["hbo", "axn", "cinemax", "discovery", "bbc", "cnn", "nhk", "warner", "filmbox"].some(k => n.includes(k))) return { category: "quoc_te", categoryName: "🌐 Kênh Quốc Tế", sortIndex: 65 };
    if (n.includes("htv") || n.includes("vtc") || n.includes("thvl") || n.includes("sctv")) return { category: "giai_tri", categoryName: "🎭 Kênh Giải Trí", sortIndex: 70 };
    return { category: "dia_phuong", categoryName: "📡 Các Kênh Khác", sortIndex: 80 };
};

const isMovieChannel = (ch) => ["hbo", "cinemax", "warner", "cinema", "filmbox", "axn", "box movie", "phim"].some(kw => (ch.name || "").toLowerCase().includes(kw));
const isInternationalChannel = (ch) => ["hbo", "cinemax", "warner", "axn", "discovery", "bbc", "cnn", "animax", "cartoon", "disney", "cinema"].some(kw => (ch.name || "").toLowerCase().includes(kw));

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
    { id: "phim-bo", name: "Phim Bộ", type: "series", apiPath: "danh-sach/phim-bo", defaultChecked: true }
];
const ADULT_SUB_CATALOGS = [];
const ALL_CATALOGS = [...TV_CATALOGS, ...MOVIE_CATALOGS];
const DEFAULT_ACTIVE_IDS = ["tv_tong_hop", "sports_live_matches", "tv_vtv", "tv_vtvcab", "tv_quoc_te", "tv_the_thao", "phim-le", "phim-moi-cap-nhat", "phim-bo"];

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
    
    TV_CATALOGS.forEach(t => { if (config.catalogs.includes(t.id)) activeCatalogs.push({ type: "tv", id: t.id, name: t.name, extra: [{ name: "search", isRequired: false }, { name: "skip", isRequired: false }] }); });
    if (config.catalogs.includes("tv_tong_hop")) activeCatalogs.push({ type: "tv", id: "tv_tong_hop", name: "📺 Toàn Bộ Kênh TV", extra: [ { name: "genre", options: [ "🌟 Tất Cả", "🔴 Kênh VTV", "📺 Kênh VTVCab", "🌐 Kênh Quốc Tế", "⚽ Bóng Đá Live" ], isRequired: false }, { name: "search", isRequired: false }, { name: "skip", isRequired: false } ] });

    const handledSpecial = [...TV_CATALOGS.map(t => t.id), "tv_tong_hop"];
    ALL_CATALOGS.filter(cat => !handledSpecial.includes(cat.id) && config.catalogs.includes(cat.id)).forEach(cat => { activeCatalogs.push({ type: cat.type, id: `cat_${cat.id.replace(/-/g, '_')}`, name: cat.icon ? `${cat.icon} ${cat.name}` : cat.name, extra: [{ name: "search", isRequired: false }, { name: "skip", isRequired: false }] }); });

    return { id: "community.nuvio.addon", version: "3.6.0", name: "TUNGNUI-ADDON FINAL", description: "Bản sửa lỗi DRM dứt điểm cho TV", resources: ["catalog", "meta", "stream", "subtitles"], types: ["movie", "series", "tv"], idPrefixes: ["phim_", "vsmov_", "nguonc_", "match_", "tt", "iptv_", "vmttv_", "viptorrent_", "viptorrent:", "jav_"], catalogs: [ ...activeCatalogs ] };
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

    // --- CẤU TRÚC PHÁ MÀN ĐEN TỐI THƯỢNG ---
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
                            
                            // GIẢI PHÁP SỐ 1: VIRTUAL M3U PLAYLIST - Hóa trang thành file Danh sách phát mà Nuvio sẽ ăn ngấu nghiến.
                            // (__VERCEL_HOST__ sẽ được Server tự gạch bỏ và thay thế URL chuẩn trước khi thả vào luồng)
                            ch.streams.push({
                                name: "🔴 [Luồng M3U Native] Giả Lập Mạng Cứng",
                                title: `📺 ${finalName}\n💎 [Trị Màn Đen 100%] Ép TV đọc theo quy chuẩn Sports App!`,
                                url: `__VERCEL_HOST__/api/play.m3u?url=${encodeURIComponent(line)}&kid=${kidHex}&key=${keyHex}&ua=${encodeURIComponent(currentUa)}`,
                                isTargetM3uPlay: true, 
                                behaviorHints: { isLive: true }
                            });

                            // GIẢI PHÁP SỐ 2: TRÌNH DUYỆT BROWSER WEB PLAYER 
                            ch.streams.push({
                                name: "🌐 [Browser Web] Máy Chiếu Vượt Tuyến",
                                title: `📺 ${finalName}\n⚡ Khởi chạy Webview an toàn (Shaka Trình duyệt)`,
                                externalUrl: `__VERCEL_HOST__/api/player?url=${encodeURIComponent(line)}&kid=${kidHex}&key=${keyHex}`,
                                behaviorHints: { isLive: true }
                            });
                            
                            // GIẢI PHÁP SỐ 3: JSON DRM CACHE (CHỐNG CHÁY CỦA SERVER)
                            const licenseUrlProxy = `__VERCEL_HOST__/api/clearkey/${kidHex}/${keyHex}`;
                            ch.streams.push({
                                name: "🔴 [Exo Cổ Điển] Stremio Truyền Thống",
                                title: `📺 ${finalName}\n💎 Dùng Link mồi Server phá License của Exo`,
                                url: line,
                                behaviorHints: { isLive: true, notWebReady: true, drm: "clearkey", drmLicenseUri: licenseUrlProxy, proxyHeaders: { request: { "User-Agent": currentUa } } }
                            });
                        }
                    } else {
                        ch.streams.push({ name: isMpd ? "🔴 [Vietsub TQS] Giải mã mạng Nội" : "🔴 [Phụ Đề] TQS Server", title: isMpd ? `📺 ${finalName}\n⚡ Luồng Không Bọc Khóa Bản Quyền` : `📺 ${finalName}\n⚡ Luồng HLS Nhanh & Dịch Phụ đề Tiếng Việt Chuẩn`, url: line, behaviorHints: { isLive: true, proxyHeaders: { request: { "User-Agent": currentUa || "Dalvik/2.1.0" } } } });
                    }
                    if (key.includes("warner")) {
                        ch.streams.unshift({ name: "⚡ [Dự Phòng] Warner HD Đám Mây Mở", title: `📺 Warner TV HD\n⚡ Phân Phát Máy Chủ Ngoại`, url: "http://cdn4.skygo.mn/live/disk1/Warner/HLSv3-FTA/Warner.m3u8", behaviorHints: { isLive: true } });
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

const getChannelEpgInfo = async (channelName, cache) => { return `📺 Đang chiếu kênh ${channelName}`; };
const fetchLiveMatches = async (cache) => { return []; };

const getChannelStreams = async (rawId, cache, debridKey = "") => {
    const channels = await fetchUnifiedTvChannels(cache);
    const targetKey = rawId.replace("iptv_", "").replace("vmttv_", "");
    const found = channels.find(c => c.key === targetKey || c.id === rawId || (c.vipId && c.vipId === rawId));
    if (!found) return [];

    const finalStreams = [];
    for (const st of found.streams) {
        if (st.isVipApi && found.vipId) {
            try { const res = await axios.get(`${VIPTORRENT_BASE}/stream/tv/${found.vipId}.json`, { timeout: 2600 }); if (res.data?.streams) { res.data.streams.forEach(vst => { finalStreams.push({ name: `🔴 [VipTorrent]`, title: `📺 ${found.name}\n💎 VipTorrent Chuẩn 1080p`, url: vst.url, behaviorHints: { isLive: true } }); }); } } catch (e) {}
        } else if (st.url || st.externalUrl) { finalStreams.push(st); }
    }

    const unique = []; const seen = new Set();
    const sorted = finalStreams.sort((a, b) => {
        let sA = (a.isTargetM3uPlay || a.externalUrl) ? 1000 : 0;
        let sB = (b.isTargetM3uPlay || b.externalUrl) ? 1000 : 0;
        if(a.name && a.name.includes("Browser Web")) sA += 200;
        if(b.name && b.name.includes("Browser Web")) sB += 200;
        return sB - sA;
    });
    
    sorted.forEach(s => { const checkUrl = s.url || s.externalUrl || ""; if (!seen.has(checkUrl)) { seen.add(checkUrl); unique.push(s); } });
    return unique;
};

// ... MODULE EXPORT CHỐNG SẬP
const fetchSubtitles = async () => [];
const isAnimeMovie = () => false;
module.exports = {
    getEndpoints, failureTelemetry, TV_CATALOGS, MOVIE_CATALOGS, ADULT_SUB_CATALOGS, ALL_CATALOGS, DEFAULT_ACTIVE_IDS, parseConfig, buildManifest, fetchLiveMatches, fetchUnifiedTvChannels, getChannelStreams, getChannelEpgInfo, fetchSubtitles, isAnimeMovie, getImgUrl, parseEpisodeNumber, searchAllMovieSources: async()=>[], fetchKKPhim: async()=>[], fetchVSMOV: async()=>[], fetchNguonC: async()=>[], fetchAllVnStreamsByTitle: async()=>[], fetchMainstreamMacCmsStreams: async()=>[], fetchAdultJav: async()=>[], fetchAdultJavMeta: async()=>{}, fetchAdultJavStream: async()=>[], getCinemetaInfo: async()=>{}, getImdbFromTitle: async()=>{}, fetchVipTorrentHttp: async()=>[], fetchVNStream: async()=>[], fetchTorrentio: async()=>[], sortStreamsByNewRule: (s)=>s, classifyTvChannel, isMovieChannel, isInternationalChannel
};
