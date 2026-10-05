// ==========================================
// 1. TỪ ĐIỂN THÔNG MINH (Xử lý tên phụ đề)
// ==========================================
const subDictionary = {
    "vi": "🇻🇳 Vietsub",
    "viet": "🇻🇳 Vietsub",
    "vietsub": "🇻🇳 Vietsub",
    "thuyetminh": "🎙️ Thuyết Minh",
    "dub": "🎙️ Lồng Tiếng"
};

function formatSubtitleName(rawName, sourceName) {
    let cleanName = (rawName || "").toLowerCase();
    let finalName = "🇻🇳 Tiếng Việt";

    for (let key in subDictionary) {
        if (cleanName.includes(key)) {
            finalName = subDictionary[key];
            break;
        }
    }
    return `${finalName} (${sourceName})`;
}

// ==========================================
// 2. THUẬT TOÁN SO KHỚP MỜ & ĐIỂM THƯỞNG
// ==========================================
function isGoodMatch(nuvioTitle, webTitle, nuvioYear, webYear) {
    if (!nuvioTitle || !webTitle) return false;

    const normalize = (str) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[-:]/g, " ");
    const keywords = normalize(nuvioTitle).split(" ").filter(w => w.length > 0);
    const webTitleClean = normalize(webTitle);

    let matches = 0;
    keywords.forEach(word => {
        if (webTitleClean.includes(word)) matches++;
    });
    let totalScore = (matches / keywords.length) * 100;

    if (nuvioYear && webYear && String(nuvioYear) === String(webYear)) {
        totalScore += 30; 
    }

    return totalScore >= 70;
}

// ==========================================
// 3. TRẠM DỊCH THUẬT CINEMETA (Zero API Key)
// ==========================================
async function fetchMovieInfoFromId(imdbId, type = "movie") {
    try {
        const response = await fetch(`https://v3-cinemeta.strem.io/meta/${type}/${imdbId}.json`);
        const data = await response.json();
        
        if (!data || !data.meta) return null;

        const title = data.meta.name;
        const year = data.meta.year || (data.meta.releaseInfo ? data.meta.releaseInfo.substring(0, 4) : "");
        const slug = title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

        return { title, year, slug };
    } catch (e) {
        return null;
    }
}

// ==========================================
// 4. CÁC MODULE CÀO DỮ LIỆU ĐỘC LẬP
// ==========================================
async function fetchKKphim(movieTitle, movieYear, movieSlug) {
    try {
        const res = await fetch(`https://kkphim.com/api/v1/movie/${movieSlug}`);
        const data = await res.json();
        
        if (!isGoodMatch(movieTitle, data.movie.name, movieYear, data.movie.year)) return null;

        const streamUrl = data.movie.episodes[0].server_data[0].link_m3u8;
        const subName = formatSubtitleName(data.movie.lang, "KKPhim");

        return { server: "KKPhim", url: streamUrl, subTitle: subName };
    } catch (e) {
        return null;
    }
}

async function fetchNguonC(movieTitle, movieYear, movieSlug) {
    try {
        const res = await fetch(`https://phim.nguonc.com/api/v1/movie/${movieSlug}`);
        const data = await res.json();
        
        if (!isGoodMatch(movieTitle, data.movie.name, movieYear, data.movie.year)) return null;

        const streamUrl = data.movie.episodes[0].server_data[0].link_m3u8;
        const subName = formatSubtitleName("vietsub", "Nguồn C");

        return { server: "Nguồn C", url: streamUrl, subTitle: subName };
    } catch (e) {
        return null;
    }
}

async function fetchVsmov(movieTitle, movieYear, movieSlug) {
    try {
        const resHtml = await fetch(`https://vsmov.com/xem-phim/${movieSlug}`);
        const html = await resHtml.text();
        
        const iframeMatch = html.match(/<iframe[^>]+src="([^"]+)"/i);
        if (!iframeMatch) return null;

        const iframeRes = await fetch(iframeMatch[1]);
        const iframeHtml = await iframeRes.text();

        const m3u8Match = iframeHtml.match(/"(https:\/\/[^"]+\.m3u8[^"]*)"/i);
        if (!m3u8Match) return null;

        const subMatch = iframeHtml.match(/<track[^>]+src="([^"]+\.vtt)"/i);
        const subName = formatSubtitleName("vietsub", "Vsmov");

        return { 
            server: "Vsmov", 
            url: m3u8Match[1], 
            subTitle: subName,
            subUrl: subMatch ? subMatch[1] : null
        };
    } catch (e) {
        return null;
    }
}

async function getStreams(movieInfo) {
    const { title, year, slug } = movieInfo; 
    const promises = [
        fetchKKphim(title, year, slug),
        fetchNguonC(title, year, slug),
        fetchVsmov(title, year, slug)
    ];
    const results = await Promise.all(promises);
    return results.filter(stream => stream !== null);
}

// ==========================================
// 5. CỔNG GIAO TIẾP VỚI NUVIO
// ==========================================
async function addonRequestHandler(args) {
    const { type, id } = args;
    const movieInfo = await fetchMovieInfoFromId(id, type);
    if (!movieInfo) return { streams: [] };
    
    const streams = await getStreams(movieInfo);
    return { streams: streams };
}
