/* ============================================
   AI 电商工作台 MVP — app.js
   Interactive Logic (Demo / Mockup Mode)
   ============================================ */

// ===== MODULE ROUTING =====
const modules = {
  image:    { el: 'mod-image',    title: '🖼️ AI 作图工坊',   sub: '输入产品信息，一键生成高质量商品图' },
  listing:  { el: 'mod-listing',  title: '📝 Listing 生成',   sub: '输入卖点与目标市场，自动生成亚马逊 Listing' },
  copy:     { el: 'mod-copy',     title: '✍️ 文案工坊',       sub: '输入产品信息，生成多平台广告文案' },
  analysis: { el: 'mod-analysis', title: '📊 竞品分析',       sub: '输入产品名称或 ASIN，获取竞品洞察报告' },
};

document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => {
    const key = btn.dataset.module;
    // update nav
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    // update modules
    document.querySelectorAll('.module').forEach(m => m.classList.add('hidden'));
    document.getElementById(modules[key].el).classList.remove('hidden');
    // update header
    document.getElementById('pageTitle').textContent = modules[key].title;
    document.getElementById('pageSub').textContent = modules[key].sub;
  });
});

// ===== SELECTOR TOGGLES =====
function initSelector(selector) {
  document.querySelectorAll(selector).forEach(btn => {
    btn.addEventListener('click', () => {
      btn.closest('.style-selector, .qty-selector, .market-selector')
        .querySelectorAll('button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
}
initSelector('.style-btn');
initSelector('.qty-btn');
initSelector('.market-btn');

// ===== UPLOAD ZONE =====
const uploadZone = document.getElementById('uploadZone');
const fileInput  = document.getElementById('fileInput');
uploadZone.addEventListener('click', () => fileInput.click());
uploadZone.addEventListener('dragover', e => { e.preventDefault(); uploadZone.style.borderColor = 'var(--accent)'; });
uploadZone.addEventListener('dragleave', () => { uploadZone.style.borderColor = ''; });
uploadZone.addEventListener('drop', e => {
  e.preventDefault();
  uploadZone.style.borderColor = '';
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) showUploadPreview(file);
});
fileInput.addEventListener('change', () => {
  if (fileInput.files[0]) showUploadPreview(fileInput.files[0]);
});
function showUploadPreview(file) {
  const reader = new FileReader();
  reader.onload = e => {
    uploadZone.innerHTML = `<img src="${e.target.result}" style="max-height:80px;border-radius:6px;" /><span style="font-size:12px;color:var(--text2)">${file.name}</span>`;
  };
  reader.readAsDataURL(file);
}

// ===== LOADING OVERLAY =====
function showLoading(steps) {
  const overlay = document.getElementById('loadingOverlay');
  const stepsEl = document.getElementById('loadingSteps');
  stepsEl.innerHTML = steps.map((s, i) =>
    `<div class="loading-step" id="lstep${i}"><div class="step-dot"></div>${s}</div>`
  ).join('');
  overlay.classList.remove('hidden');
  return new Promise(resolve => {
    let i = 0;
    const tick = () => {
      if (i > 0) document.getElementById(`lstep${i-1}`)?.classList.replace('active','done');
      if (i < steps.length) {
        document.getElementById(`lstep${i}`)?.classList.add('active');
        i++;
        setTimeout(tick, 800 + Math.random() * 400);
      } else {
        setTimeout(() => { overlay.classList.add('hidden'); resolve(); }, 400);
      }
    };
    tick();
  });
}

// ===== COPY TO CLIPBOARD =====
function copyText(text, btn) {
  navigator.clipboard.writeText(text).then(() => {
    btn.textContent = '✅ 已复制';
    btn.classList.add('copied');
    setTimeout(() => { btn.textContent = '📋 复制'; btn.classList.remove('copied'); }, 2000);
    showToast('已复制到剪贴板');
  });
}

function showToast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2200);
}

function makeSection(title, content, plain) {
  const id = 'sec_' + Math.random().toString(36).slice(2);
  return `
  <div class="result-section fade-in">
    <div class="result-section-header">
      <span class="result-section-title">${title}</span>
      <button class="copy-btn" onclick="copyText(document.getElementById('${id}').innerText, this)">📋 复制</button>
    </div>
    <div class="result-section-body" id="${id}">${content}</div>
  </div>`;
}

// ===================================================
//  MODULE 1 — AI IMAGE GENERATION
// ===================================================
document.getElementById('btnGenImage').addEventListener('click', async () => {
  const desc = document.getElementById('img-desc').value.trim();
  if (!desc) { alert('请填写产品描述'); return; }
  const style = document.querySelector('.style-btn.active')?.dataset.style || 'white';
  const qty   = parseInt(document.querySelector('.qty-btn.active')?.dataset.qty || '1');

  await showLoading(['解析产品描述', '构建提示词', '调用图像模型', '渲染优化中', '生成完成']);

  document.getElementById('imgResultPlaceholder').classList.add('hidden');
  const grid = document.getElementById('imgGrid');
  grid.innerHTML = '';
  grid.classList.remove('hidden');

  const styleLabels = { white: '白底图', lifestyle: '场景图', luxury: '广告图' };
  const palettes = [
    ['#e8e0d5','#d4c9bc','#f0ebe3','#c8bfb3'],
    ['#d5e8d5','#b8d4b8','#e3f0e3','#a8c4a8'],
    ['#d5dde8','#b8c4d4','#e3e8f0','#a8b4c8'],
    ['#e8d5e8','#d4b8d4','#f0e3f0','#c8a8c8'],
  ];

  for (let i = 0; i < qty; i++) {
    const item = document.createElement('div');
    item.className = 'img-item fade-in';
    const bg = palettes[i % palettes.length];
    const svgContent = generateProductSVG(desc, style, bg, i);
    item.innerHTML = `
      <div style="width:100%;height:100%;background:linear-gradient(135deg,${bg[0]},${bg[1]});display:flex;align-items:center;justify-content:center;padding:16px;aspect-ratio:1;">
        ${svgContent}
      </div>
      <div class="img-item-overlay">
        <button class="download-btn" onclick="downloadImg(this, ${i})">⬇ 下载</button>
      </div>`;
    grid.appendChild(item);
    await delay(120);
  }
});

function generateProductSVG(desc, style, bg, idx) {
  const names = ['Premium Product', 'Luxury Item', 'Artisan Craft', 'Signature Collection'];
  const name  = names[idx % names.length];
  const icons = ['🛍️','✨','💎','🌟'];
  return `<div style="text-align:center;font-family:serif;">
    <div style="font-size:48px;margin-bottom:8px;">${icons[idx%4]}</div>
    <div style="font-size:13px;font-weight:700;color:#333;letter-spacing:1px;text-transform:uppercase;">${name}</div>
    <div style="font-size:10px;color:#666;margin-top:4px;max-width:120px;line-height:1.4;">${desc.slice(0,30)}${desc.length>30?'…':''}</div>
    <div style="margin-top:8px;font-size:9px;color:#999;background:rgba(0,0,0,0.08);padding:2px 8px;border-radius:10px;display:inline-block;">${['白底','场景','广告'][['white','lifestyle','luxury'].indexOf(style)]||''}图 · AI生成</div>
  </div>`;
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }
function downloadImg(btn, idx) { showToast(`图片 ${idx+1} 已加入下载队列（Demo模式）`); }


// ===================================================
//  MODULE 2 — LISTING GENERATION
// ===================================================
document.getElementById('btnGenListing').addEventListener('click', async () => {
  const name   = document.getElementById('lst-name').value.trim();
  const points = document.getElementById('lst-points').value.trim();
  if (!name || !points) { alert('请填写产品名称和核心卖点'); return; }
  const market = document.querySelector('.market-btn.active')?.dataset.market || 'US';

  await showLoading(['分析产品卖点', '构建 SEO 标题', '生成五点描述', '撰写产品描述', '提取关键词']);

  document.getElementById('lstResultPlaceholder').classList.add('hidden');
  const result = document.getElementById('listingResult');
  result.classList.remove('hidden');

  const mLabel = { US:'美国', EU:'欧洲', JP:'日本' }[market];
  const pts = points.split('\n').filter(Boolean);

  const title = generateTitle(name, pts, market);
  const bullets = generateBullets(pts);
  const desc = generateDesc(name, pts, mLabel);
  const keywords = generateKeywords(name, pts);

  result.innerHTML = [
    makeSection('📌 标题（Title）', `<p>${title}</p>`),
    makeSection('🎯 五点描述（Bullet Points）', `<ul>${bullets.map(b=>`<li>${b}</li>`).join('')}</ul>`),
    makeSection('📖 产品描述（Description）', `<p>${desc}</p>`),
    makeSection('🔑 关键词（Keywords）', `<div class="keyword-tags">${keywords.map(k=>`<span class="keyword-tag">${k}</span>`).join('')}</div>`),
  ].join('');
});

function generateTitle(name, pts, market) {
  const mods = { US:'Premium', EU:'Professional', JP:'High-Quality' };
  const mod = mods[market] || 'Premium';
  const hint = pts[0] ? ' - ' + pts[0].slice(0,30) : '';
  return `${mod} ${name}${hint} | Best Seller ${new Date().getFullYear()} | Free Fast Shipping`;
}

function generateBullets(pts) {
  const prefixes = ['✅ 核心优势：','⭐ 品质保证：','🛡️ 放心购买：','🎁 超值包装：','🚀 快速发货：'];
  return pts.slice(0,5).map((p, i) => `${prefixes[i]||'✅ '}${p}`);
}

function generateDesc(name, pts, mLabel) {
  return `专为${mLabel}市场打造，${name}代表着卓越的品质与工艺。${pts.slice(0,2).join('，')}。无论作为自用还是送礼，都是不二之选。我们承诺提供30天无忧退换保障，让您的购物体验更加放心。立即加入购物车，享受卓越品质！`;
}

function generateKeywords(name, pts) {
  const base = name.toLowerCase().split(' ');
  const extra = ['best seller', 'premium quality', 'fast shipping', 'gift idea', 'free returns'];
  const fromPts = pts.slice(0,3).map(p => p.slice(0,15).toLowerCase());
  return [...new Set([...base, ...fromPts, ...extra])].slice(0,12);
}


// ===================================================
//  MODULE 3 — COPY STUDIO
// ===================================================
document.getElementById('btnGenCopy').addEventListener('click', async () => {
  const info = document.getElementById('copy-info').value.trim();
  if (!info) { alert('请填写产品信息'); return; }
  const scene = document.getElementById('copy-scene').value.trim();

  await showLoading(['分析产品卖点', '创意头脑风暴', '生成 TikTok 文案', '生成 Facebook 文案', '提炼品牌口号']);

  document.getElementById('copyResultPlaceholder').classList.add('hidden');
  const result = document.getElementById('copyResult');
  result.classList.remove('hidden');

  const tiktok = generateTikTok(info, scene);
  const fb     = generateFacebook(info, scene);
  const slogans = generateSlogans(info);
  const headlines = generateHeadlines(info);

  result.innerHTML = [
    makeSection('🎯 广告标题（Headlines）', `<ul>${headlines.map(h=>`<li>${h}</li>`).join('')}</ul>`),
    makeSection('🎵 TikTok 广告文案', `<p>${tiktok}</p>`),
    makeSection('📘 Facebook 广告文案', `<p>${fb}</p>`),
    makeSection('💡 品牌口号（Slogans）', `<ul>${slogans.map(s=>`<li>${s}</li>`).join('')}</ul>`),
  ].join('');
});

function generateTikTok(info, scene) {
  return `🔥 你还在为找不到合适的${info.slice(0,10)}发愁吗？\n✨ 这款产品彻底改变了我的生活！${scene ? '特别适合'+scene+'的你' : ''}\n💯 高品质 + 超实惠，限时优惠进行中\n👇 点击购买链接，现在下单立享折扣！\n#好物分享 #强烈推荐 #品质生活`;
}

function generateFacebook(info, scene) {
  return `🌟 介绍一款让您爱不释手的产品！\n\n我们的${info.slice(0,20)}专为注重品质的您设计。${scene ? `无论是${scene}，` : ''}它都能完美满足您的需求。\n\n✅ 高端品质，经久耐用\n✅ 精美设计，时尚百搭\n✅ 30天退换保障，购物无忧\n\n🎁 今日下单，享受专属优惠！立即点击「了解更多」，开启品质生活。`;
}

function generateSlogans(info) {
  return [
    `品质源自匠心，${info.slice(0,8)}只为最好的你`,
    `每一件，都是对生活品质的坚持`,
    `Style Meets Quality — Your Perfect Choice`,
    `不将就，用最好的`,
    `Define Your Standard`,
  ];
}

function generateHeadlines(info) {
  return [
    `限时5折 | ${info.slice(0,12)} 爆款热销中`,
    `${info.slice(0,10)} — 品质口碑之选`,
    `超过10,000人的共同选择`,
    `买到就是赚到！今日特惠不容错过`,
    `送礼自用两相宜，品质首选`,
  ];
}


// ===================================================
//  MODULE 4 — COMPETITOR ANALYSIS
// ===================================================
document.getElementById('btnGenAnalysis').addEventListener('click', async () => {
  const name = document.getElementById('ana-name').value.trim();
  if (!name) { alert('请填写产品名称'); return; }
  const asin = document.getElementById('ana-asin').value.trim();

  await showLoading(['爬取竞品数据', '分析价格分布', '对比卖点差异', 'AI 深度洞察', '生成分析报告']);

  document.getElementById('anaResultPlaceholder').classList.add('hidden');
  const result = document.getElementById('analysisResult');
  result.classList.remove('hidden');

  result.innerHTML = generateAnalysisHTML(name, asin);
});

function generateAnalysisHTML(name, asin) {
  const competitors = [
    { name:'竞品 A（市场第一）', price:'$24.99', rating:'4.7★', reviews:'12,450', tag:'win' },
    { name:'竞品 B（同类爆款）', price:'$19.99', rating:'4.5★', reviews:'8,200',  tag:'warn' },
    { name:'竞品 C（低价竞争）', price:'$14.99', rating:'4.1★', reviews:'3,100',  tag:'lose' },
  ];

  const tableHTML = `
  <table class="analysis-table">
    <thead><tr><th>竞品</th><th>售价</th><th>评分</th><th>评论数</th><th>威胁等级</th></tr></thead>
    <tbody>${competitors.map(c=>`
      <tr>
        <td>${c.name}</td>
        <td>${c.price}</td>
        <td>${c.rating}</td>
        <td>${c.reviews}</td>
        <td class="tag-${c.tag}">${{win:'🔴 高',warn:'🟡 中',lose:'🟢 低'}[c.tag]}</td>
      </tr>`).join('')}
    </tbody>
  </table>`;

  const priceHTML = `
  <div class="price-bar-wrap">
    <div class="price-label">市场定价区间分布（${name}类目）</div>
    <div style="display:flex;gap:8px;align-items:center;margin:8px 0;">
      <span style="font-size:12px;color:var(--text3);width:60px;">低端</span>
      <div class="price-bar" style="flex:1;"><div class="price-fill" style="width:30%"></div></div>
      <span style="font-size:12px;color:var(--text3);width:60px;text-align:right;">$9–$15</span>
    </div>
    <div style="display:flex;gap:8px;align-items:center;margin:8px 0;">
      <span style="font-size:12px;color:var(--text3);width:60px;">中端</span>
      <div class="price-bar" style="flex:1;"><div class="price-fill" style="width:65%"></div></div>
      <span style="font-size:12px;color:var(--text3);width:60px;text-align:right;">$16–$25</span>
    </div>
    <div style="display:flex;gap:8px;align-items:center;margin:8px 0;">
      <span style="font-size:12px;color:var(--text3);width:60px;">高端</span>
      <div class="price-bar" style="flex:1;"><div class="price-fill" style="width:45%"></div></div>
      <span style="font-size:12px;color:var(--text3);width:60px;text-align:right;">$26–$50</span>
    </div>
    <div class="price-range-text">💡 建议定价区间：<strong style="color:var(--accent2)">$22–$28</strong>（中高端卡位，兼顾转化率与利润）</div>
  </div>`;

  const diffHTML = `
  <ul style="line-height:2;">
    <li>✅ <strong>差异化点 1：</strong>强化 <em>RFID 防盗</em> 等功能卖点，竞品普遍缺失</li>
    <li>✅ <strong>差异化点 2：</strong>提供更好的礼盒包装，提升礼品属性，溢价空间更大</li>
    <li>✅ <strong>差异化点 3：</strong>主打"终身质保"，与竞品形成信任壁垒</li>
    <li>⚠️ <strong>注意：</strong>竞品 A 评论数远超市场，需通过 Vine 计划快速积累 review</li>
    <li>🚀 <strong>增长建议：</strong>优先抢占 $22–$26 价格带，利用 Coupon 引流，初期冲 BSR</li>
  </ul>`;

  return [
    makeSection('🏆 竞品对比矩阵', tableHTML),
    makeSection('💰 定价区间分析', priceHTML),
    makeSection('🎯 差异化建议（如何赢）', diffHTML),
  ].join('');
}
