// ============================================
// POST /api/listing
// 亚马逊 Listing 生成（GPT-4o）
// ============================================
import { getClient, getModels, safeParseJSON } from '../openaiClient.js';

export async function handleListingGeneration(req, res, next) {
  try {
    const { productName, sellingPoints, market = 'US' } = req.body || {};
    if (!productName || !sellingPoints) {
      return res.status(400).json({ error: '请填写产品名称与卖点' });
    }
    const marketNames = { US: '美国', EU: '欧洲', JP: '日本' };
    const mName = marketNames[market] || '美国';

    const client = getClient();
    const completion = await client.chat.completions.create({
      model: getModels().gpt,
      temperature: 0.7,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `你是一位资深亚马逊 SEO 专家与文案高手，专攻${mName}市场，擅长撰写高转化的 Listing。请始终以严格的 JSON 格式输出。`,
        },
        {
          role: 'user',
          content: `请基于以下产品信息生成亚马逊 Listing。

产品名称：${productName}
目标市场：${mName}
核心卖点：
${sellingPoints}

要求：
1. 标题长度 150–200 字符，含品牌词 + 核心关键词 + 卖点 + 修饰语
2. 五点描述（Bullet Points）每条 100–200 字符，大写首字母
3. 产品描述 200–400 字符，分段，可读性强
4. 关键词 8–12 个，覆盖长尾搜索词

严格按如下 JSON Schema 输出：
{
  "title": "...",
  "bullets": ["...", "...", "...", "...", "..."],
  "description": "...",
  "keywords": ["...", "..."]
}`,
        },
      ],
    });

    const data = safeParseJSON(completion.choices[0].message.content);
    res.json({ ...data, model: getModels().gpt, usage: completion.usage });
  } catch (e) {
    console.error('[listing] failed:', e.message);
    if (e.status === 403) {
      return res.status(403).json({
        error: 'Groq 返回 403 Forbidden',
        hint: '通常是 API Key 无效/被吊销，或模型不可用。请到 https://console.groq.com 检查 Key 状态',
        detail: e.message,
      });
    }
    next(e);
  }
}
