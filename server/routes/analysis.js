// ============================================
// POST /api/analysis
// 竞品分析（GPT-4o）
// 真实场景下应抓取亚马逊数据；MVP 阶段使用 AI 模拟生成
// ============================================
import { getClient, getModels, safeParseJSON } from '../openaiClient.js';

export async function handleAnalysisGeneration(req, res, next) {
  try {
    const { productName, asin = '' } = req.body || {};
    if (!productName) return res.status(400).json({ error: '请填写产品名称' });

    const client = getClient();
    const completion = await client.chat.completions.create({
      model: getModels().gpt,
      temperature: 0.6,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `你是一位资深电商数据分析师，熟悉亚马逊类目竞争格局。
注意：当前 MVP 阶段没有联网数据，请基于对该品类的行业经验输出**合理可信的示例数据**，
明确标注"示例数据"，但分析框架与建议需专业、有实操价值。`,
        },
        {
          role: 'user',
          content: `请分析以下产品的竞争格局：

产品名称：${productName}
${asin ? `参考 ASIN：${asin}` : ''}

要求输出严格 JSON：
{
  "productName": "...",
  "competitors": [
    { "name": "竞品 A", "price": "$XX.XX", "rating": "4.X", "reviews": "X,XXX", "threat": "high|medium|low", "usp": ["..."] }
  ],
  "priceAnalysis": {
    "low": "$X-$XX",
    "mid": "$X-$XX",
    "high": "$X-$XX",
    "suggested": "$XX-$XX",
    "suggestion": "..."
  },
  "differentiation": ["差异化点 1", "差异化点 2", "差异化点 3", "..."],
  "warnings": ["风险点 1", "..."],
  "growth": ["增长建议 1", "..."]
}

要求：
- competitors 至少 3 个
- 价格区间以美元计
- differentiation 至少 3 条，warnings 至少 1 条，growth 至少 2 条
- 数据合理，结论专业`,
        },
      ],
    });

    const data = safeParseJSON(completion.choices[0].message.content);
    res.json({ ...data, model: getModels().gpt, isMockData: true, usage: completion.usage });
  } catch (e) {
    console.error('[analysis] failed:', e.message);
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
