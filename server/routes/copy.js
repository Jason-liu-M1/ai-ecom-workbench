// ============================================
// POST /api/copy
// 广告文案生成（GPT-4o）
// ============================================
import { getClient, getModels, safeParseJSON } from '../openaiClient.js';

export async function handleCopyGeneration(req, res, next) {
  try {
    const { productInfo, scene = '' } = req.body || {};
    if (!productInfo) return res.status(400).json({ error: '请填写产品信息' });

    const client = getClient();
    const completion = await client.chat.completions.create({
      model: getModels().gpt,
      temperature: 0.85,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: '你是一位顶级广告创意总监，深谙 TikTok / Facebook / 品牌口号写作。请始终以严格 JSON 格式输出。',
        },
        {
          role: 'user',
          content: `请基于以下产品信息生成多平台广告文案。

产品信息：${productInfo}
${scene ? `使用场景：${scene}` : ''}

要求：
- headlines: 5 条广告标题（每条 20–40 字，中文）
- tiktok: 一段 TikTok 短视频文案（200–300 字，含 emoji、口语化、有 hook）
- facebook: 一段 Facebook 广告正文（200–300 字，分段，含 emoji）
- slogans: 5 条品牌口号（中英混搭、朗朗上口）

严格按如下 JSON 输出：
{
  "headlines": ["...", "...", "...", "...", "..."],
  "tiktok": "...",
  "facebook": "...",
  "slogans": ["...", "...", "...", "...", "..."]
}`,
        },
      ],
    });

    const data = safeParseJSON(completion.choices[0].message.content);
    res.json({ ...data, model: getModels().gpt, usage: completion.usage });
  } catch (e) {
    console.error('[copy] failed:', e.message);
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
