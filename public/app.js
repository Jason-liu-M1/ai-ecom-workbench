/* ============================================
   AI 电商工作台 MVP — app.js
   Frontend ⇄ Backend (GPT-4o + DALL·E 3)
   ============================================ */

// ====== API 配置 ======
const API = {
  base: '',  // 同源部署，base 为空；如前后端分离可改为 'http://localhost:8787'
  image:    '/api/image',
  listing:  '/api/listing',
  copy:     '/api/copy',
  analysis: '/api/analysis',
  health:   '/api/health',
};

// ====== 工具：异步请求 ======
async function callAPI(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error || `请求失败 (${res.status})`;
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return data;
}

const HISTORY_KEY = 'ai-ecom-history';
const MAX_HISTORY = 50;

function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); }
  catch { return []; }
}
function saveHistoryItem(module, inputs, outputs) {
  const list = loadHistory();
  const item = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    module,
    inputs,
    outputs,
    timestamp: Date.now(),
  };
  list.unshift(item);
  if (list.length > MAX_HISTORY) list.pop();
  localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
  updateHistoryBadge();
}
function deleteHistoryItem(id) {
  const list = loadHistory().filter(h => h.id !== id);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
  renderHistory();
  updateHistoryBadge();
}
function clearHistory() {
  if (!confirm('确定要清空所有历史记录吗？')) return;
  localStorage.removeItem(HISTORY_KEY);
  renderHistory();
  updateHistoryBadge();
}
function updateHistoryBadge() {
  const count = loadHistory().length;
  const btn = document.getElementById('btnHistory');
  if (btn) {
    btn.querySelector('span:last-child').textContent = `历史记录 ${count > 0 ? `(${count})` : ''}`;
  }
}
const MODULE_NAMES = {
  image: '🖼️ 作图', listing: '📝 Listing', copy: '✍️ 文案', analysis: '📊 竞品分析'
};
function formatTime(ts) {
  const d = new Date(ts);
  return `${d.getMonth()+1}月${d.getDate()}日 ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}
function getHistorySummary(item) {
  const inputs = item.inputs || {};
  if (item.module === 'image') return inputs.description || '商品图';
  if (item.module === 'listing') return inputs.productName || 'Listing';
  if (item.module === 'copy') return inputs.productInfo || '文案';
  if (item.module === 'analysis') return inputs.productName || '竞品分析';
  return '未知';
}
let _lastActiveModule = 'image';

function openHistoryPanel() {
  document.getElementById('historyPanel').classList.remove('hidden');
  document.getElementById('historyOverlay').classList.remove('hidden');
  renderHistory();
}
function closeHistoryPanel() {
  document.getElementById('historyPanel').classList.add('hidden');
  document.getElementById('historyOverlay').classList.add('hidden');
  // 恢复之前的导航状态
  const prev = document.querySelector(`.nav-item[data-module="${_lastActiveModule}"]`);
  if (prev) prev.click();
}
function restoreHistory(item) {
  // 切换到对应模块
  const btn = document.querySelector(`.nav-item[data-module="${item.module}"]`);
  if (btn) btn.click();
  // 恢复输入
  if (item.module === 'image') {
    document.getElementById('img-desc').value = item.inputs.description || '';
    const styleBtn = document.querySelector(`.style-btn[data-style="${item.inputs.style}"]`);
    if (styleBtn) styleBtn.click();
  } else if (item.module === 'listing') {
    document.getElementById('lst-name').value = item.inputs.productName || '';
    document.getElementById('lst-points').value = item.inputs.sellingPoints || '';
    const mktBtn = document.querySelector(`.market-btn[data-market="${item.inputs.market}"]`);
    if (mktBtn) mktBtn.click();
  } else if (item.module === 'copy') {
    document.getElementById('copy-info').value = item.inputs.productInfo || '';
    document.getElementById('copy-scene').value = item.inputs.scene || '';
  } else if (item.module === 'analysis') {
    document.getElementById('ana-name').value = item.inputs.productName || '';
    document.getElementById('ana-asin').value = item.inputs.asin || '';
  }
  // 恢复输出（重新渲染）
  setTimeout(() => restoreOutput(item), 100);
  closeHistoryPanel();
  showToast('已恢复历史记录');
}
function restoreOutput(item) {
  const outputs = item.outputs || {};
  if (item.module === 'image') {
    const grid = document.getElementById('imgGrid');
    const ph = document.getElementById('imgResultPlaceholder');
    ph.classList.add('hidden');
    grid.classList.remove('hidden');
    grid.innerHTML = '';
    (outputs.images || []).forEach((url, i) => {
      const div = document.createElement('div');
      div.className = 'img-item fade-in';
      div.innerHTML = `<img src="${escapeHTML(url)}" alt="商品图" loading="lazy" /><div class="img-item-overlay"><button class="download-btn" onclick="downloadImg('${escapeHTML(url)}','product_${item.timestamp}_${i+1}.png')">⬇ 下载</button></div>`;
      grid.appendChild(div);
    });
  } else if (item.module === 'listing') {
    const result = document.getElementById('listingResult');
    const ph = document.getElementById('lstResultPlaceholder');
    ph.classList.add('hidden');
    result.classList.remove('hidden');
    result.innerHTML = [
      makeSection('📌 标题（Title）', `<p>${escapeHTML(outputs.title||'')}</p>`),
      makeSection('🎯 五点描述', makeUL(outputs.bullets||[])),
      makeSection('📖 产品描述', `<p>${escapeHTML(outputs.description||'')}</p>`),
      makeSection('🔑 关键词', `<div class="keyword-tags">${(outputs.keywords||[]).map(k=>`<span class="keyword-tag">${escapeHTML(k)}</span>`).join('')}</div>`),
    ].join('');
  } else if (item.module === 'copy') {
    const result = document.getElementById('copyResult');
    const ph = document.getElementById('copyResultPlaceholder');
    ph.classList.add('hidden');
    result.classList.remove('hidden');
    result.innerHTML = [
      makeSection('🎯 广告标题', makeUL(outputs.headlines||[])),
      makeSection('🎵 TikTok 文案', `<p>${escapeHTML(outputs.tiktok||'').replace(/\n/g,'<br/>')}</p>`),
      makeSection('📘 Facebook 文案', `<p>${escapeHTML(outputs.facebook||'').replace(/\n/g,'<br/>')}</p>`),
      makeSection('💡 品牌口号', makeUL(outputs.slogans||[])),
    ].join('');
  } else if (item.module === 'analysis') {
    const result = document.getElementById('analysisResult');
    const ph = document.getElementById('anaResultPlaceholder');
    ph.classList.add('hidden');
    result.classList.remove('hidden');
    const threatMap = { high: '🔴 高', medium: '🟡 中', low: '🟢 低' };
    const threatCls = { high: 'tag-lose', medium: 'tag-warn', low: 'tag-win' };
    const tableHTML = `<table class="analysis-table"><thead><tr><th>竞品</th><th>售价</th><th>评分</th><th>评论数</th><th>威胁等级</th></tr></thead><tbody>${(outputs.competitors||[]).map(c=>`<tr><td>${escapeHTML(c.name)}</td><td>${escapeHTML(c.price)}</td><td>${escapeHTML(c.rating)}</td><td>${escapeHTML(c.reviews)}</td><td class="${threatCls[c.threat]||'tag-warn'}">${threatMap[c.threat]||'🟡 中'}</td></tr>`).join('')}</tbody></table>`;
    const priceHTML = outputs.priceAnalysis ? `<div class="price-bar-wrap"><div class="price-label">市场定价区间分布</div><div style="margin:8px 0;"><div style="font-size:12px;color:var(--text2);">📊 低：${escapeHTML(outputs.priceAnalysis.low)} ｜ 中：${escapeHTML(outputs.priceAnalysis.mid)} ｜ 高：${escapeHTML(outputs.priceAnalysis.high)}</div></div><div class="price-range-text">💡 建议定价：<strong style="color:var(--accent2)">${escapeHTML(outputs.priceAnalysis.suggested)}</strong></div></div>` : '<p>暂无定价数据</p>';
    const diffHTML = `<ul style="line-height:2;">${(outputs.differentiation||[]).map(d=>`<li>✅ <strong>差异化：</strong>${escapeHTML(d)}</li>`).join('')}${(outputs.warnings||[]).map(d=>`<li>⚠️ <strong>风险：</strong>${escapeHTML(d)}</li>`).join('')}${(outputs.growth||[]).map(d=>`<li>🚀 <strong>增长：</strong>${escapeHTML(d)}</li>`).join('')}</ul>`;
    result.innerHTML = [
      makeSection('🏆 竞品对比矩阵', tableHTML),
      makeSection('💰 定价区间分析', priceHTML),
      makeSection('🎯 差异化建议', diffHTML),
    ].join('');
  }
}
function renderHistory() {
  const list = loadHistory();
  const listEl = document.getElementById('historyList');
  const emptyEl = document.getElementById('historyEmpty');
  if (!list.length) {
    listEl.innerHTML = '';
    emptyEl.classList.remove('hidden');
    return;
  }
  emptyEl.classList.add('hidden');
  listEl.innerHTML = list.map(item => `
    <div class="history-item" data-id="${item.id}">
      <div class="history-item-top">
        <span class="history-item-module">${MODULE_NAMES[item.module] || item.module}</span>
        <span class="history-item-time">${formatTime(item.timestamp)}</span>
      </div>
      <div class="history-item-summary">${escapeHTML(getHistorySummary(item))}</div>
      <div class="history-item-actions">
        <button class="history-btn-view" onclick="restoreHistoryById('${item.id}')">查看</button>
        <button class="history-btn-del" onclick="deleteHistoryItem('${item.id}')">删除</button>
      </div>
    </div>
  `).join('');
}
function restoreHistoryById(id) {
  const item = loadHistory().find(h => h.id === id);
  if (item) restoreHistory(item);
}

// ====== 历史面板事件 ======
document.getElementById('btnHistory').addEventListener('click', () => {
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  document.getElementById('btnHistory').classList.add('active');
  openHistoryPanel();
});
document.getElementById('btnCloseHistory').addEventListener('click', closeHistoryPanel);
document.getElementById('historyOverlay').addEventListener('click', closeHistoryPanel);
document.getElementById('btnClearHistory').addEventListener('click', clearHistory);

// ====== 模块路由 ======
const modules = {
  image:    { el: 'mod-image',    title: '🖼️ AI 作图工坊',   sub: '输入产品信息，一键生成高质量商品图' },
  listing:  { el: 'mod-listing',  title: '📝 Listing 生成',   sub: '输入卖点与目标市场，自动生成亚马逊 Listing' },
  copy:     { el: 'mod-copy',     title: '✍️ 文案工坊',       sub: '输入产品信息，生成多平台广告文案' },
  analysis: { el: 'mod-analysis', title: '📊 竞品分析',       sub: '输入产品名称或 ASIN，获取竞品洞察报告' },
};

document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => {
    const key = btn.dataset.module;
    if (key === 'history') return;
    _lastActiveModule = key;
    // 关闭历史面板（如果打开）
    document.getElementById('historyPanel').classList.add('hidden');
    document.getElementById('historyOverlay').classList.add('hidden');
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.module').forEach(m => m.classList.add('hidden'));
    document.getElementById(modules[key].el).classList.remove('hidden');
    document.getElementById('pageTitle').textContent = modules[key].title;
    document.getElementById('pageSub').textContent = modules[key].sub;
  });
});

// ====== 选择器 ======
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

// ====== 上传区 ======
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

// ====== Loading Overlay (已简化，不显示动画) ======
function showLoading(steps) {
  // 不显示加载动画，直接返回，减少等待感
  return Promise.resolve();
}

// ====== 复制与 Toast ======
function copyText(text, btn) {
  navigator.clipboard.writeText(text).then(() => {
    btn.textContent = '✅ 已复制';
    btn.classList.add('copied');
    setTimeout(() => { btn.textContent = '📋 复制'; btn.classList.remove('copied'); }, 2000);
    showToast('已复制到剪贴板');
  });
}
function showToast(msg, type = 'success') {
  const t = document.createElement('div');
  t.className = 'toast';
  if (type === 'error') t.style.background = 'var(--red)';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2500);
}

function makeSection(title, content) {
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

function makeUL(arr) { return `<ul>${arr.map(x => `<li>${escapeHTML(x)}</li>`).join('')}</ul>`; }
function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function showError(where, err) {
  where.classList.remove('hidden');
  where.innerHTML = `
    <div style="padding:24px;text-align:center;color:var(--red);">
      <div style="font-size:36px;margin-bottom:8px;">⚠️</div>
      <div style="font-weight:600;margin-bottom:6px;">生成失败</div>
      <div style="font-size:13px;color:var(--text2);">${escapeHTML(err.message || String(err))}</div>
      <div style="font-size:12px;color:var(--text3);margin-top:12px;">
        ${err.status === 500 ? '提示：请检查后端 .env 是否配置了 OPENAI_API_KEY' : ''}
      </div>
    </div>`;
}

// ===================================================
//  MODULE 1 — AI IMAGE GENERATION
// ===================================================
document.getElementById('btnGenImage').addEventListener('click', async () => {
  const desc = document.getElementById('img-desc').value.trim();
  if (!desc) { showToast('请填写产品描述', 'error'); return; }
  const style = document.querySelector('.style-btn.active')?.dataset.style || 'white';
  const qty   = parseInt(document.querySelector('.qty-btn.active')?.dataset.qty || '1');

  const btn = document.getElementById('btnGenImage');
  btn.disabled = true;
  btn.innerHTML = '<span class="btn-icon">⏳</span> 生成中...';

  await showLoading(['解析产品描述', '构建提示词', '调用 DALL·E 3', '渲染优化中', '生成完成']);

  const grid = document.getElementById('imgGrid');
  const ph   = document.getElementById('imgResultPlaceholder');
  ph.classList.add('hidden');
  grid.classList.remove('hidden');
  grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text3);">⏳ 正在调用 DALL·E 3...</div>';

  try {
    const data = await callAPI(API.image, { description: desc, style, qty });
    grid.innerHTML = '';
    data.images.forEach((url, i) => {
      const item = document.createElement('div');
      item.className = 'img-item fade-in';
      item.innerHTML = `
        <img src="${url}" alt="AI 生成的商品图 ${i+1}" loading="lazy" />
        <div class="img-item-overlay">
          <button class="download-btn" onclick="downloadImg('${url}','product_${Date.now()}_${i+1}.png')">⬇ 下载</button>
        </div>`;
      grid.appendChild(item);
    });
    showToast(`✅ 成功生成 ${data.images.length} 张图`);
    saveHistoryItem('image', { description: desc, style, qty }, data);
  } catch (err) {
    showError(grid, err);
    ph.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span class="btn-icon">✨</span> 生成商品图';
  }
});

function downloadImg(url, filename) {
  fetch(url).then(r => r.blob()).then(blob => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
    showToast('已下载');
  }).catch(() => showToast('下载失败，尝试右键保存', 'error'));
}

// ===================================================
//  MODULE 2 — LISTING GENERATION
// ===================================================
document.getElementById('btnGenListing').addEventListener('click', async () => {
  const name   = document.getElementById('lst-name').value.trim();
  const points = document.getElementById('lst-points').value.trim();
  if (!name || !points) { showToast('请填写产品名称和核心卖点', 'error'); return; }
  const market = document.querySelector('.market-btn.active')?.dataset.market || 'US';

  const btn = document.getElementById('btnGenListing');
  btn.disabled = true;
  btn.innerHTML = '<span class="btn-icon">⏳</span> 生成中...';

  await showLoading(['分析产品卖点', '构建 SEO 标题', '生成五点描述', '撰写产品描述', '提取关键词']);

  const result = document.getElementById('listingResult');
  const ph     = document.getElementById('lstResultPlaceholder');
  ph.classList.add('hidden');
  result.classList.remove('hidden');

  try {
    const data = await callAPI(API.listing, {
      productName: name,
      sellingPoints: points,
      market,
    });
    result.innerHTML = [
      makeSection('📌 标题（Title）', `<p>${escapeHTML(data.title)}</p>`),
      makeSection('🎯 五点描述（Bullet Points）', makeUL(data.bullets || [])),
      makeSection('📖 产品描述（Description）', `<p>${escapeHTML(data.description)}</p>`),
      makeSection('🔑 关键词（Keywords）', `<div class="keyword-tags">${(data.keywords || []).map(k => `<span class="keyword-tag">${escapeHTML(k)}</span>`).join('')}</div>`),
    ].join('');
    showToast('✅ Listing 已生成');
    saveHistoryItem('listing', { productName: name, sellingPoints: points, market }, data);
  } catch (err) {
    showError(result, err);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span class="btn-icon">✨</span> 生成 Listing';
  }
});

// ===================================================
//  MODULE 3 — COPY STUDIO
// ===================================================
document.getElementById('btnGenCopy').addEventListener('click', async () => {
  const info  = document.getElementById('copy-info').value.trim();
  const scene = document.getElementById('copy-scene').value.trim();
  if (!info) { showToast('请填写产品信息', 'error'); return; }

  const btn = document.getElementById('btnGenCopy');
  btn.disabled = true;
  btn.innerHTML = '<span class="btn-icon">⏳</span> 生成中...';

  await showLoading(['分析产品卖点', '创意头脑风暴', '生成 TikTok 文案', '生成 Facebook 文案', '提炼品牌口号']);

  const result = document.getElementById('copyResult');
  const ph     = document.getElementById('copyResultPlaceholder');
  ph.classList.add('hidden');
  result.classList.remove('hidden');

  try {
    const data = await callAPI(API.copy, { productInfo: info, scene });
    result.innerHTML = [
      makeSection('🎯 广告标题（Headlines）', makeUL(data.headlines || [])),
      makeSection('🎵 TikTok 广告文案', `<p>${escapeHTML(data.tiktok).replace(/\n/g, '<br/>')}</p>`),
      makeSection('📘 Facebook 广告文案', `<p>${escapeHTML(data.facebook).replace(/\n/g, '<br/>')}</p>`),
      makeSection('💡 品牌口号（Slogans）', makeUL(data.slogans || [])),
    ].join('');
    showToast('✅ 文案已生成');
    saveHistoryItem('copy', { productInfo: info, scene }, data);
  } catch (err) {
    showError(result, err);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span class="btn-icon">✨</span> 生成文案';
  }
});

// ===================================================
//  MODULE 4 — COMPETITOR ANALYSIS
// ===================================================
document.getElementById('btnGenAnalysis').addEventListener('click', async () => {
  const name = document.getElementById('ana-name').value.trim();
  if (!name) { showToast('请填写产品名称', 'error'); return; }
  const asin = document.getElementById('ana-asin').value.trim();

  const btn = document.getElementById('btnGenAnalysis');
  btn.disabled = true;
  btn.innerHTML = '<span class="btn-icon">⏳</span> 分析中...';

  await showLoading(['拉取竞品数据', '分析价格分布', '对比卖点差异', 'AI 深度洞察', '生成分析报告']);

  const result = document.getElementById('analysisResult');
  const ph     = document.getElementById('anaResultPlaceholder');
  ph.classList.add('hidden');
  result.classList.remove('hidden');

  try {
    const data = await callAPI(API.analysis, { productName: name, asin });

    const threatMap = { high: '🔴 高', medium: '🟡 中', low: '🟢 低' };
    const threatCls = { high: 'tag-lose', medium: 'tag-warn', low: 'tag-win' };

    const tableHTML = `
      <table class="analysis-table">
        <thead><tr><th>竞品</th><th>售价</th><th>评分</th><th>评论数</th><th>威胁等级</th></tr></thead>
        <tbody>${(data.competitors || []).map(c => `
          <tr>
            <td>${escapeHTML(c.name)}</td>
            <td>${escapeHTML(c.price)}</td>
            <td>${escapeHTML(c.rating)}</td>
            <td>${escapeHTML(c.reviews)}</td>
            <td class="${threatCls[c.threat] || 'tag-warn'}">${threatMap[c.threat] || '🟡 中'}</td>
          </tr>`).join('')}
        </tbody>
      </table>`;

    const priceHTML = data.priceAnalysis ? `
      <div class="price-bar-wrap">
        <div class="price-label">市场定价区间分布 · ${escapeHTML(data.productName || name)}</div>
        <div style="margin:8px 0;">
          <div style="font-size:12px;color:var(--text2);">📊 低：${escapeHTML(data.priceAnalysis.low)} ｜ 中：${escapeHTML(data.priceAnalysis.mid)} ｜ 高：${escapeHTML(data.priceAnalysis.high)}</div>
        </div>
        <div class="price-range-text">💡 建议定价：<strong style="color:var(--accent2)">${escapeHTML(data.priceAnalysis.suggested)}</strong></div>
        <div class="price-range-text" style="color:var(--text2);margin-top:6px;">${escapeHTML(data.priceAnalysis.suggestion || '')}</div>
      </div>` : '<p>暂无定价数据</p>';

    const diffHTML = `
      <ul style="line-height:2;">
        ${(data.differentiation || []).map(d => `<li>✅ <strong>差异化：</strong>${escapeHTML(d)}</li>`).join('')}
        ${(data.warnings       || []).map(d => `<li>⚠️ <strong>风险：</strong>${escapeHTML(d)}</li>`).join('')}
        ${(data.growth         || []).map(d => `<li>🚀 <strong>增长：</strong>${escapeHTML(d)}</li>`).join('')}
      </ul>`;

    result.innerHTML = [
      makeSection('🏆 竞品对比矩阵', tableHTML),
      makeSection('💰 定价区间分析', priceHTML),
      makeSection('🎯 差异化建议（如何赢）', diffHTML),
    ].join('');

    if (data.isMockData) {
      showToast('📊 示例数据（未联网）');
    } else {
      showToast('✅ 分析完成');
      saveHistoryItem('analysis', { productName: name, asin }, data);
    }
  } catch (err) {
    showError(result, err);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span class="btn-icon">✨</span> 开始分析';
  }
});

// ===================================================
//  启动时健康检查
// ===================================================
(async function init() {
  updateHistoryBadge();
  try {
    const r = await fetch(API.health);
    const h = await r.json();
    if (!h.hasKey) {
      showToast('⚠️ 未配置 OPENAI_API_KEY，功能将无法使用', 'error');
      console.warn('请在 server/.env 中设置 OPENAI_API_KEY');
    } else {
      console.log(`✅ 后端就绪 · 模型: ${h.model} / ${h.imageModel}`);
    }
  } catch (e) {
    showToast('⚠️ 无法连接后端服务，请先启动 node server/index.js', 'error');
  }
})();
