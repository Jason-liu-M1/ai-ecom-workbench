const ZHIPU_BASE = 'https://open.bigmodel.cn/api/paas/v4';
const TEXT_MODEL = 'glm-4-flash';
const IMAGE_MODEL = 'cogview-3';

const STYLE_PROMPTS = {
  white:     'pure white seamless background, professional e-commerce product photo, soft studio lighting, sharp focus, no shadows, ultra clean',
  lifestyle: 'lifestyle scene, real-life environment, natural lighting, contextual props, warm inviting atmosphere',
  luxury:    'high-end commercial advertising shot, dramatic cinematic lighting, dark gradient background, premium feel, ultra detailed, 8k',
};

const originalFetch = window.fetch;

window.fetch = async function(url, options) {
  if (typeof url === 'string' && url.startsWith('/api/')) {
    try {
      return await handleCloudAPI(url, options);
    } catch (e) {
      console.error('Cloud API error:', e);
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  }
  return originalFetch(url, options);
};

async function handleCloudAPI(url, options) {
  const body = JSON.parse(options.body || '{}');

  if (url === '/api/health') {
    return jsonResponse({
      ok: true, provider: 'zhipu', model: TEXT_MODEL,
      imageModel: IMAGE_MODEL, supportsImage: true, hasKey: true
    });
  }

  if (url === '/api/image') {
    const { description, style = 'white', qty = 1 } = body;
    if (!description) return jsonResponse({ error: '产品描述不能为空' }, 400);
    const stylePrompt = STYLE_PROMPTS[style] || STYLE_PROMPTS.white;
    const fullPrompt = `A professional product photograph of: ${description.trim()}. ${stylePrompt}. Hyper realistic, commercial quality, award-winning photography.`;
    const n = Math.max(1, Math.min(4, Number(qty) || 1));
    const tasks = [];
    for (let i = 0; i < n; i++) {
      tasks.push(
        fetch('/api/image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: fullPrompt, model: IMAGE_MODEL })
        }).then(r => r.json()).then(d => d.data?.[0]?.url)
      );
    }
    const images = (await Promise.all(tasks)).filter(Boolean);
    return jsonResponse({ images, prompt: fullPrompt, model: IMAGE_MODEL, provider: 'zhipu' });
  }

  if (url === '/api/listing') {
    const { productName, sellingPoints, market } = body;
    const prompt = `Generate an Amazon product listing for "${productName}" targeting the ${market} market.
Selling points: ${sellingPoints}

Return ONLY a JSON object with these exact keys:
- title: product title (under 200 chars)
- bullets: array of 5 bullet points (each under 500 chars)
- description: HTML product description
- keywords: array of 10 search keywords

No extra text, just the JSON.`;

    const content = await zhipuChat([{ role: 'user', content: prompt }]);
    const result = extractJson(content) || {};
    return jsonResponse({
      title: result.title || '',
      bullets: result.bullets || [],
      description: result.description || '',
      keywords: result.keywords || [],
      provider: 'zhipu'
    });
  }

  if (url === '/api/copy') {
    const { productInfo, scene } = body;
    const prompt = `Generate marketing copy for this product: ${productInfo}
Target scenario: ${scene}

Return ONLY a JSON object with:
- headlines: array of 5 ad headlines
- tiktok: TikTok script (under 300 chars)
- facebook: Facebook post copy
- slogans: array of 3 brand slogans

No extra text, just the JSON.`;

    const content = await zhipuChat([{ role: 'user', content: prompt }]);
    const result = extractJson(content) || {};
    return jsonResponse({
      headlines: result.headlines || [],
      tiktok: result.tiktok || '',
      facebook: result.facebook || '',
      slogans: result.slogans || [],
      provider: 'zhipu'
    });
  }

  if (url === '/api/analysis') {
    const { productName, asin } = body;
    const prompt = `Analyze the Amazon market for product: ${productName} (ASIN: ${asin || 'unknown'}).

Return ONLY a JSON object with:
- competitors: array of 3 competitor objects {name, price, rating, reviews, threat}
- priceAnalysis: {low, mid, high, suggested}
- differentiation: array of 3 differentiation suggestions
- warnings: array of 2 risk warnings
- growth: array of 2 growth opportunities

No extra text, just the JSON.`;

    const content = await zhipuChat([{ role: 'user', content: prompt }]);
    const result = extractJson(content) || {};
    return jsonResponse({
      competitors: result.competitors || [],
      priceAnalysis: result.priceAnalysis || {},
      differentiation: result.differentiation || [],
      warnings: result.warnings || [],
      growth: result.growth || [],
      isMockData: false,
      provider: 'zhipu'
    });
  }

  return jsonResponse({ error: 'Unknown endpoint' }, 404);
}

async function zhipuChat(messages) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: TEXT_MODEL, messages, temperature: 0.7 })
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

function extractJson(text) {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
  } catch {}
  try {
    return JSON.parse(text);
  } catch {}
  return null;
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

console.log('☁️ Cloud mode active: Vercel API proxy + Zhipu GLM-4-Flash + cogview-3');
