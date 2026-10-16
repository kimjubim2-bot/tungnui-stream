/**
 * TUNGNUI PRO 2 - FILE 1: GIAO DIỆN (UI & THEME THẾ HỆ MỚI)
 */

const renderHomeHtml = (topCatalogs, subCatalogs, adultCatalogs) => {
    const topGridHtml = topCatalogs.map(item => `
        <label class="top-card">
            <input type="checkbox" value="${item.id}" class="config-item" checked onchange="handleConfigChange()">
            <div class="top-icon">${item.icon}</div>
            <div class="top-title">${item.name}</div>
        </label>
    `).join('');

    const subGridHtml = subCatalogs.map(item => `
        <label class="sub-pill">
            <input type="checkbox" value="${item.id}" class="config-item" ${item.defaultChecked ? 'checked' : ''} onchange="handleConfigChange()">
            <span>${item.name}</span>
        </label>
    `).join('');

    const adultSubGridHtml = adultCatalogs.map(item => `
        <label class="adult-pill">
            <input type="checkbox" value="${item.id}" class="config-item adult-item" onchange="handleConfigChange()">
            <span>${item.name}</span>
        </label>
    `).join('');

    return `
        <!DOCTYPE html>
        <html lang="vi">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
            <title>Cài Đặt TungNui PRO 2</title>
            <style>
                :root { --primary: #fbbf24; --border-gold: rgba(251, 191, 36, 0.28); --accent-red: #ef4444; --success: #22c55e; }
                * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
                body {
                    background: #08080a url('https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=2070&auto=format&fit=crop') no-repeat center center fixed;
                    background-size: cover; color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                    margin: 0; padding: 24px 12px 40px; display: flex; justify-content: center; min-height: 100vh;
                }
                .app-wrapper {
                    width: 100%; max-width: 430px; display: flex; flex-direction: column; align-items: center;
                    backdrop-filter: blur(18px); background: rgba(10, 10, 12, 0.94); border: 1px solid var(--border-gold);
                    border-radius: 26px; padding: 22px 14px 20px; box-shadow: 0 25px 60px rgba(0, 0, 0, 0.95);
                }
                .brand-header { text-align: center; margin-bottom: 16px; }
                .popcorn-icon { font-size: 36px; margin-bottom: 2px; }
                .brand-title { margin: 0; font-size: 21px; font-weight: 900; letter-spacing: 1px; color: var(--primary); text-transform: uppercase; }
                .brand-subtitle { color: #94a3b8; font-size: 11px; margin: 4px 0 0 0; font-weight: 500; }
                .debrid-box { width: 100%; background: rgba(251, 191, 36, 0.05); border: 1px dashed var(--border-gold); border-radius: 14px; padding: 10px 12px; margin-bottom: 12px; }
                .debrid-label { font-size: 11px; font-weight: 700; color: #fef08a; display: flex; align-items: center; gap: 6px; margin-bottom: 6px; }
                .debrid-input { width: 100%; background: rgba(0, 0, 0, 0.6); border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 8px; color: #fff; padding: 8px 10px; font-size: 11px; outline: none; }
                .top-grid { width: 100%; display: grid; grid-template-columns: 1fr 1fr; gap: 9px; margin-bottom: 12px; }
                .top-card { background: rgba(255, 255, 255, 0.04); border: 1.5px solid var(--border-gold); border-radius: 16px; padding: 15px 10px; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; transition: 0.25s; }
                .top-card input, .sub-pill input, .adult-pill input { display: none; }
                .top-card:has(input:checked) { border-color: var(--primary); background: rgba(251, 191, 36, 0.12); box-shadow: 0 0 16px rgba(251, 191, 36, 0.35); }
                .top-card:not(:has(input:checked)) { opacity: 0.45; }
                .top-icon { font-size: 30px; margin-bottom: 4px; }
                .top-title { font-size: 13px; font-weight: 700; color: #fef08a; }
                .sub-grid { width: 100%; display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-bottom: 12px; }
                .sub-pill { background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 11px; padding: 8px 3px; min-height: 44px; display: flex; align-items: center; justify-content: center; text-align: center; cursor: pointer; transition: 0.2s; }
                .sub-pill span { font-size: 10px; font-weight: 600; color: #cbd5e1; }
                .sub-pill:has(input:checked) { border-color: var(--primary); background: rgba(251, 191, 36, 0.15); }
                .sub-pill:has(input:checked) span { color: #fef08a; }
                .sub-pill:not(:has(input:checked)) { opacity: 0.4; }
                .lock-wrapper { width: 100%; margin-bottom: 16px; }
                .lock-toggle-btn { width: 100%; background: rgba(239, 68, 68, 0.08); border: 1.5px dashed var(--accent-red); color: #fca5a5; padding: 11px 12px; border-radius: 14px; font-size: 11.5px; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer; }
                .lock-toggle-btn.unlocked { background: rgba(34, 197, 94, 0.12); border: 1.5px solid var(--success); color: #86efac; }
                .adult-subgroup { max-height: 0; overflow: hidden; transition: max-height 0.4s ease, opacity 0.35s ease; opacity: 0; }
                .adult-subgroup.expanded { max-height: 220px; opacity: 1; margin-top: 8px; }
                .adult-subgroup-inner { background: rgba(20, 10, 10, 0.88); border: 1px solid rgba(239, 68, 68, 0.35); border-radius: 14px; padding: 9px 8px; display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
                .adult-pill { background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 9px; padding: 8px 4px; display: flex; align-items: center; justify-content: center; cursor: pointer; }
                .adult-pill span { font-size: 10.5px; font-weight: 700; color: #fca5a5; }
                .adult-pill:has(input:checked) { border-color: #ef4444; background: rgba(239, 68, 68, 0.38); }
                .adult-pill:has(input:checked) span { color: #fff; }
                .bottom-actions { width: 100%; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
                .btn-act { border-radius: 14px; padding: 11px 6px; display: flex; align-items: center; justify-content: center; gap: 6px; text-decoration: none; cursor: pointer; font-size: 11.5px; font-weight: 700; }
                .btn-install { background: var(--primary); border: none; color: #000; font-size: 12px; font-weight: 800; grid-column: span 2; }
                .btn-qr { background: rgba(34, 197, 94, 0.15); border: 1.5px solid var(--success); color: #86efac; }
                .btn-copy { background: rgba(255, 255, 255, 0.06); border: 1.5px solid var(--border-gold); color: #fef08a; }
                .qr-modal { display: none; position: fixed; inset: 0; background: rgba(0, 0, 0, 0.85); backdrop-filter: blur(8px); justify-content: center; align-items: center; z-index: 1000; }
                .qr-box { background: #141418; border: 1.5px solid var(--border-gold); border-radius: 20px; padding: 20px; max-width: 320px; width: 90%; text-align: center; }
                .qr-box h3 { margin: 0 0 6px 0; color: var(--primary); font-size: 16px; }
                .qr-box p { font-size: 11.5px; color: #94a3b8; margin: 0 0 14px 0; }
                #qrcode-container { background: #fff; padding: 12px; border-radius: 12px; display: inline-block; }
                .btn-close-qr { margin-top: 15px; width: 100%; background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.2); color: #fff; padding: 8px; border-radius: 10px; font-weight: 700; cursor: pointer; }
            </style>
        </head>
        <body>
            <div class="app-wrapper">
                <div class="brand-header">
                    <div class="popcorn-icon">🍿</div>
                    <h1 class="brand-title">TUNGNUI PRO 2</h1>
                    <p class="brand-subtitle">Trực Tiếp Bóng Đá BLV Tiếng Việt • Auto-Heal • Asia VIP 4K</p>
                </div>
                <div class="debrid-box">
                    <div class="debrid-label"><span>🔑</span> Real-Debrid / TorBox Token (Tùy chọn):</div>
                    <input type="password" id="debrid-key" class="debrid-input" placeholder="Dán API Key để kích hoạt tốc độ 100Mbps..." oninput="handleConfigChange()">
                </div>
                <div class="top-grid">${topGridHtml}</div>
                <div class="sub-grid">${subGridHtml}</div>
                <div class="lock-wrapper">
                    <button id="lock-btn" class="lock-toggle-btn" type="button" onclick="handleUnlock18()">
                        <span id="lock-icon">🔒</span><span id="lock-title">Phim 18+ (Đã Khóa)</span>
                    </button>
                    <div id="adult-subgroup" class="adult-subgroup">
                        <div class="adult-subgroup-inner">${adultSubGridHtml}</div>
                    </div>
                </div>
                <div class="bottom-actions">
                    <a id="install-btn" class="btn-act btn-install" href="#">🧩 CÀI VÀO NUVIO / STREMIO</a>
                    <button class="btn-act btn-qr" onclick="openQrModal()">📱 Quét QR Smart TV</button>
                    <button class="btn-act btn-copy" onclick="copyManifest()">📋 Chép Link Manifest</button>
                </div>
            </div>
            <div id="qr-modal" class="qr-modal" onclick="closeQrModal(event)">
                <div class="qr-box" onclick="event.stopPropagation()">
                    <h3>📱 Quét Mã Cài Trên Smart TV</h3>
                    <p>Mở camera điện thoại quét mã QR để cài đặt thẳng vào Nuvio TV:</p>
                    <div id="qrcode-container"></div>
                    <button class="btn-close-qr" onclick="document.getElementById('qr-modal').style.display='none'">Đóng</button>
                </div>
            </div>
            <script>
                let is18Unlocked = false;
                function restoreFromStorage() {
                    try {
                        const savedKey = localStorage.getItem('tungnui_debrid_key');
                        if (savedKey) document.getElementById('debrid-key').value = savedKey;
                        const savedConfigs = JSON.parse(localStorage.getItem('tungnui_selected_cats'));
                        if (Array.isArray(savedConfigs)) {
                            document.querySelectorAll('.config-item').forEach(cb => { cb.checked = savedConfigs.includes(cb.value); });
                        }
                    } catch (e) {}
                    updateLinks();
                }
                function handleConfigChange() {
                    const selected = Array.from(document.querySelectorAll('.config-item:checked')).map(cb => cb.value);
                    const debridVal = document.getElementById('debrid-key').value.trim();
                    try {
                        localStorage.setItem('tungnui_selected_cats', JSON.stringify(selected));
                        localStorage.setItem('tungnui_debrid_key', debridVal);
                    } catch (e) {}
                    updateLinks();
                }
                function getUrlPath() {
                    const selected = Array.from(document.querySelectorAll('.config-item:checked')).map(cb => cb.value);
                    const debridVal = document.getElementById('debrid-key').value.trim();
                    const configObj = { c: selected };
                    if (debridVal) configObj.rd = debridVal;
                    const jsonStr = JSON.stringify(configObj);
                    const b64 = btoa(unescape(encodeURIComponent(jsonStr))).replace(/\\+/g, '-').replace(/\\//g, '_').replace(/=+$/, '');
                    return '/config/' + b64 + '/manifest.json';
                }
                function updateLinks() { document.getElementById('install-btn').href = 'stremio://' + window.location.host + getUrlPath(); }
                function copyManifest() {
                    const fullUrl = 'https://' + window.location.host + getUrlPath();
                    navigator.clipboard.writeText(fullUrl).then(() => alert("✅ Đã sao chép link Manifest cấu hình mới!")).catch(() => prompt("Sao chép link Manifest:", fullUrl));
                }
                function handleUnlock18() {
                    if (is18Unlocked) { document.getElementById('adult-subgroup').classList.toggle('expanded'); return; }
                    const enteredPass = prompt("Vui lòng nhập mật khẩu mở khóa:");
                    if (enteredPass === "admin") {
                        is18Unlocked = true;
                        const btn = document.getElementById('lock-btn');
                        btn.classList.add('unlocked');
                        document.getElementById('lock-icon').innerText = '🔓';
                        document.getElementById('lock-title').innerText = 'Phim 18+ (Đã Mở Khóa)';
                        document.getElementById('adult-subgroup').classList.add('expanded');
                        document.querySelectorAll('.adult-item').forEach(cb => cb.checked = true);
                        handleConfigChange();
                    } else if (enteredPass !== null) alert("Mật khẩu không chính xác!");
                }
                function openQrModal() {
                    const fullUrl = 'https://' + window.location.host + getUrlPath();
                    document.getElementById('qrcode-container').innerHTML = '<img src="https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=' + encodeURIComponent(fullUrl) + '" width="220" height="220" style="display:block; border-radius:6px;"/>';
                    document.getElementById('qr-modal').style.display = 'flex';
                }
                function closeQrModal(e) { if (e.target.id === 'qr-modal') document.getElementById('qr-modal').style.display = 'none'; }
                window.onload = restoreFromStorage;
            </script>
        </body>
        </html>
    `;
};

module.exports = { renderHomeHtml };
