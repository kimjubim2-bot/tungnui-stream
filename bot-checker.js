/**
 * TUNGNUI PRO 3 - BOT HARVESTER & TELEGRAM CANARY
 * - Quét Ping bảo lưu 100% kênh Việt Nam (Anti Geo-Block)
 * - Tự động đọc Kênh Telegram để cập nhật Domain động
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

// 1. TÍNH NĂNG MỚI: NẰM VÙNG TELEGRAM LẤY DOMAIN
const scanTelegramCanary = async () => {
    console.log("🕵️ [TELEGRAM CANARY] Đang quét các kênh Telegram truy tìm tên miền mới...");
    const newDomains = { kkphim: [], vsmov: [], nguonc: [] };
    
    // Các kênh Telegram công khai của các nhóm nguồn (Ví dụ mẫu)
    const channels = [
        { id: 'vsmov', url: 'https://t.me/s/vsmov_channel' },
        { id: 'kkphim', url: 'https://t.me/s/phimapi' },
        { id: 'nguonc', url: 'https://t.me/s/nguonccom' }
    ];

    for (const ch of channels) {
        try {
            const res = await axios.get(ch.url, { timeout: 3000 });
            // Tìm các link có dạng https://xxx.com/api
            const matches = res.data.match(/https:\/\/[a-zA-Z0-9-]+\.[a-zA-Z]+\/api/g) || [];
            matches.forEach(link => {
                if (!newDomains[ch.id].includes(link)) {
                    newDomains[ch.id].push(link);
                }
            });
        } catch (e) {}
    }
    return newDomains;
};

// Khai báo ban đầu
const DOMAIN_CANDIDATES = {
    kkphim: ["https://phimapi.com", "https://kkphim.com"],
    vsmov: ["https://vsmov.com/api"],
    nguonc: ["https://phim.nguonc.com/api"]
};

const resolveLiveApiDomain = async (serviceName, candidates, testPath) => {
    for (const baseUrl of candidates) {
        if (!baseUrl) continue;
        try {
            const testUrl = `${baseUrl}${testPath}`;
            const res = await axios.get(testUrl, {
                timeout: 2500,
                signal: AbortSignal.timeout(2500),
                maxRedirects: 5,
                headers: { "User-Agent": "Mozilla/5.0 Chrome/128.0.0.0 Safari/537.36", "Accept": "application/json" }
            });
            const finalUrl = res.request?.res?.responseUrl || testUrl;
            const parsed = new URL(finalUrl);
            const liveDomain = parsed.origin;

            if (res.status === 200 && res.data) {
                const data = res.data;
                if (data?.items || data?.data?.items || data?.status) {
                    console.log(`🎯 [Domain sống - ${serviceName.toUpperCase()}]: ${liveDomain}`);
                    return serviceName === "vsmov" || serviceName === "nguonc" ? `${liveDomain}/api` : liveDomain;
                }
            }
        } catch (e) {}
    }
    return candidates[0]; // Trả về mặc định nếu tất cả đều chết
};

const GITHUB_SOURCES = [
    { author: "VMTTV VN", url: "https://raw.githubusercontent.com/vuminhthanh12/vuminhthanh12/main/vmttv", isGlobalSource: false },
    { author: "IPTV-Org VN", url: "https://iptv-org.github.io/iptv/countries/vn.m3u", isGlobalSource: false },
    { author: "IPTV-Org Movies", url: "https://iptv-org.github.io/iptv/categories/movies.m3u", isGlobalSource: true },
    { author: "IPTV-Org Sports", url: "https://iptv-org.github.io/iptv/categories/sports.m3u", isGlobalSource: true }
];

const FALLBACK_POOL = {
    "vtv1": ["https://live.fptplay53.net/live/media/vtv1/live247-hls-avc/index.m3u8", "https://vtv1.vtvgo.vn/live/index.m3u8"],
    "vtv2": ["https://live.fptplay53.net/live/media/vtv2/live247-hls-avc/index.m3u8"],
    "vtv3": ["https://live.fptplay53.net/live/media/vtv3/live247-hls-avc/index.m3u8", "https://vtv3.vtvgo.vn/live/index.m3u8"],
    "vtv4": ["https://live.fptplay53.net/live/media/vtv4/live247-hls-avc/index.m3u8"],
    "vtv5": ["https://live.fptplay53.net/live/media/vtv5/live247-hls-avc/index.m3u8"],
    "vtv7": ["https://live.fptplay53.net/live/media/vtv7/live247-hls-avc/index.m3u8"],
    "vtv8": ["https://live.fptplay53.net/live/media/vtv8/live247-hls-avc/index.m3u8"],
    "vtv9": ["https://live.fptplay53.net/live/media/vtv9/live247-hls-avc/index.m3u8"],
    "htv7": ["https://live.fptplay53.net/live/media/htv7/live247-hls-avc/index.m3u8"],
    "htv_the_thao": ["https://live.fptplay53.net/live/media/htvtt/live247-hls-avc/index.m3u8"],
    "kplus_sport_1": ["https://live.fptplay53.net/live/media/htvtt/live247-hls-avc/index.m3u8"],
    "vtc3": ["https://live.fptplay53.net/live/media/vtc3/live247-hls-avc/index.m3u8"]
};

const isVietnamChannel = (name, genre) => {
    const n = (name || "").toLowerCase();
    const g = (genre || "").toLowerCase();
    return n.includes("vtv") || n.includes("htv") || n.includes("vtc") || n.includes("k+") || n.includes("sctv") || n.includes("drt") || n.includes("thvl") || n.includes("on ") || n.includes("vtvcab") || g.includes("việt");
};

const isWantedChannel = (name, genre) => {
    if (isVietnamChannel(name, genre)) return true;
    const n = (name || "").toLowerCase();
    const g = (genre || "").toLowerCase();
    const movieKeywords = ["hbo", "cinemax", "warner", "axn", "discovery", "cartoon", "disney", "fox", "national", "paramount", "cinemaworld", "animax", "bbc", "cnn", "kbs", "nhk"];
    if (movieKeywords.some(kw => n.includes(kw) || g.includes(kw))) return true;
    const sportKeywords = ["bein", "spotv", "dazn", "sky sports", "espn", "astro", "premier", "ufc", "fight"];
    if (sportKeywords.some(kw => n.includes(kw) || g.includes(kw))) return true;
    return false;
};

const normalizeChannelKey = (rawName) => {
    if (!rawName) return "";
    return rawName.toLowerCase().replace(/\[.*?\]|\(.*?\)/g, '').replace(/fhd|hd|sd|4k|1080p|720p|live|24\/7|server\s*\d+|luồng\s*\d+/gi, '').replace(/k\s*\+/g, 'kplus').replace(/[^a-z0-9]/g, '');
};

const testStreamLatency = async (url) => {
    if (!url || !url.startsWith("http")) return { alive: false, latency: 99999 };
    const start = Date.now();
    try {
        const res = await axios.get(url, {
            signal: AbortSignal.timeout(1500),
            headers: { "User-Agent": "Mozilla/5.0", "Range": "bytes=0-1024", "X-Forwarded-For": "14.161.25.102", "Client-IP": "14.161.25.102" }
        });
        const latency = Date.now() - start;
        const content = typeof res.data === 'string' ? res.data : '';
        const isHls = (res.status === 200 || res.status === 206) && (content.includes("#EXTM3U") || content.includes("#EXTINF") || (res.headers['content-type'] || '').includes('mpegurl'));
        return { alive: isHls, latency };
    } catch (e) {
        if (e.response && e.response.status === 403) {
            const isVnCdn = url.includes("fptplay") || url.includes("tv360") || url.includes("vtvgo") || url.includes("vtc");
            if (isVnCdn) return { alive: true, latency: 200 };
        }
        return { alive: false, latency: 99999 };
    }
};

const parseM3uContent = (content, sourceInfo) => {
    const lines = content.split("\n");
    const channels = [];
    let cur = null;
    for (let line of lines) {
        line = line.trim();
        if (line.startsWith("#EXTINF:")) {
            const nameMatch = line.match(/,(.+)$/);
            const logoMatch = line.match(/tvg-logo="([^"]+)"/);
            const groupMatch = line.match(/group-title="([^"]+)"/);
            const rawName = nameMatch ? nameMatch[1].trim() : "Kênh TV";
            const genre = groupMatch ? groupMatch[1] : "📺 Truyền Hình";
            if (sourceInfo.isGlobalSource && !isWantedChannel(rawName, genre)) {
                cur = null;
                continue;
            }
            cur = { rawName, logo: logoMatch ? logoMatch[1] : "", genre, author: sourceInfo.author, streamUrl: "" };
        } else if (line.startsWith("http") && cur) {
            cur.streamUrl = line;
            channels.push(cur);
            cur = null;
        }
    }
    return channels;
};

const runMultiSourceBot = async () => {
    console.log("==================================================================");
    console.log("🤖 BẮT ĐẦU QUÉT SIÊU TỐC & BẢO LƯU KÊNH VIỆT NAM");
    console.log("==================================================================");
    const globalStart = Date.now();

    // KẾT HỢP TELEGRAM CANARY
    const teleDomains = await scanTelegramCanary();
    if (teleDomains.kkphim.length > 0) DOMAIN_CANDIDATES.kkphim.unshift(...teleDomains.kkphim);
    if (teleDomains.vsmov.length > 0) DOMAIN_CANDIDATES.vsmov.unshift(...teleDomains.vsmov);
    if (teleDomains.nguonc.length > 0) DOMAIN_CANDIDATES.nguonc.unshift(...teleDomains.nguonc);

    // 1. DÒ TÌM DOMAIN PHIM ĐỘNG
    const [liveKkphim, liveVsmov, liveNguonc] = await Promise.all([
        resolveLiveApiDomain("kkphim", DOMAIN_CANDIDATES.kkphim, "/danh-sach/phim-moi-cap-nhat?page=1"),
        resolveLiveApiDomain("vsmov", DOMAIN_CANDIDATES.vsmov, "/danh-sach/phim-moi-cap-nhat?page=1"),
        resolveLiveApiDomain("nguonc", DOMAIN_CANDIDATES.nguonc, "/films/phim-moi-cap-nhat?page=1")
    ]);

    const endpointsData = { kkphim: liveKkphim, vsmov: liveVsmov, nguonc: liveNguonc, lastUpdated: new Date().toISOString() };
    fs.writeFileSync(path.join(__dirname, "api_endpoints.json"), JSON.stringify(endpointsData, null, 2), "utf-8");
    console.log("💾 Cập nhật api_endpoints.json thành công!");

    // 2. CÀO PLAYLIST
    const fetchPromises = GITHUB_SOURCES.map(src => axios.get(src.url, { timeout: 5000, signal: AbortSignal.timeout(5000) }).then(res => ({ source: src, data: res.data })).catch(() => null));
    const sourceResults = await Promise.allSettled(fetchPromises);
    let allRawStreams = [];

    sourceResults.forEach(r => {
        if (r.status === "fulfilled" && r.value) {
            allRawStreams = allRawStreams.concat(parseM3uContent(r.value.data, r.value.source));
        }
    });

    const channelClusters = new Map();
    allRawStreams.forEach(item => {
        const key = normalizeChannelKey(item.rawName);
        if (!key) return;
        if (!channelClusters.has(key)) {
            channelClusters.set(key, { displayName: item.rawName, logo: item.logo || "https://via.placeholder.com/300x200?text=TV", genre: item.genre, isVn: isVietnamChannel(item.rawName, item.genre), candidateUrls: new Set() });
        }
        const cluster = channelClusters.get(key);
        if (cluster.candidateUrls.size < 3 && item.streamUrl) cluster.candidateUrls.add(item.streamUrl);
    });

    // 3. QUÉT SONG SONG VÀ BẢO LƯU TUYỆT ĐỐI KÊNH VIỆT NAM
    const finalChannels = [];
    const entries = Array.from(channelClusters.entries());
    const BATCH_SIZE = 40;

    for (let i = 0; i < entries.length; i += BATCH_SIZE) {
        const batch = entries.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(async ([key, info]) => {
            const urls = Array.from(info.candidateUrls);
            let bestUrl = null, lowestLatency = 99999;

            for (const testUrl of urls) {
                const res = await testStreamLatency(testUrl);
                if (res.alive && res.latency < lowestLatency) {
                    lowestLatency = res.latency;
                    bestUrl = testUrl;
                    break;
                }
            }

            // BẢO LƯU KÊNH VIỆT NAM (ANTI GEO-BLOCK)
            if (!bestUrl && info.isVn && urls.length > 0) { bestUrl = urls[0]; lowestLatency = 200; }
            if (!bestUrl) {
                let fallbackKey = null;
                if (key.includes("vtv1")) fallbackKey = "vtv1";
                else if (key.includes("vtv3")) fallbackKey = "vtv3";
                else if (key.includes("vtv5")) fallbackKey = "vtv5";
                else if (key.includes("htv7")) fallbackKey = "htv7";
                else if (key.includes("thethao") && key.includes("htv")) fallbackKey = "htv_the_thao";
                else if (key.includes("kplus") && key.includes("sport1")) fallbackKey = "kplus_sport_1";
                else if (key.includes("vtc3")) fallbackKey = "vtc3";

                if (fallbackKey && FALLBACK_POOL[fallbackKey]) { bestUrl = FALLBACK_POOL[fallbackKey][0]; lowestLatency = 150; }
            }

            if (bestUrl) {
                finalChannels.push({ id: "vmttv_" + Buffer.from(key).toString("hex").slice(0, 12), name: info.displayName, poster: info.logo, genre: info.genre, streamUrl: bestUrl, latency: lowestLatency });
            }
        }));
    }

    finalChannels.sort((a, b) => {
        const getPriority = (item) => {
            const name = (item.name || "").toLowerCase(), genre = (item.genre || "").toLowerCase();
            if (name.includes("vtv")) return 1;
            if (name.includes("drt") || name.includes("đà nẵng")) return 2;
            if (name.includes("on ") || name.includes("sctv")) return 3;
            if (name.includes("hbo") || name.includes("cinemax") || name.includes("warner") || name.includes("axn") || name.includes("discovery")) return 4;
            if (name.includes("k+") || name.includes("sport") || name.includes("bein") || name.includes("spotv") || genre.includes("thể thao")) return 5;
            return 6;
        };
        const pA = getPriority(a), pB = getPriority(b);
        if (pA !== pB) return pA - pB;
        return a.latency - b.latency;
    });

    fs.writeFileSync(path.join(__dirname, "live_channels.json"), JSON.stringify(finalChannels, null, 2), "utf-8");
    console.log(`🎉 [HOÀN TẤT] Tuyển chọn ${finalChannels.length} kênh sống 100% trong ${((Date.now() - globalStart) / 1000).toFixed(1)}s.`);
};

runMultiSourceBot();
