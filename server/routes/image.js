// ============================================
// POST /api/image
// 商品图生成
//   - 自动探测图片 provider（可能与文本 provider 不同）
//   - 支持: DALL·E 3 / cogview-3 / Kolors 真实图片
//   - 无图片 provider: 生成提示词 + 友好降级
// ============================================
import { getClient, getModels, getProvider, getImageClient, getImageModel, getImageProvider } from '../openaiClient.js';

const STYLE_PROMPTS = {
  white:     'pure white seamless background, professional e-commerce product photo, soft studio lighting, sharp focus, no shadows, ultra clean',
  lifestyle: 'lifestyle scene, real-life environment, natural lighting, contextual props, warm inviting atmosphere',
  luxury:    'high-end commercial advertising shot, dramatic cinematic lighting, dark gradient background, premium feel, ultra detailed, 8k',
};

export async function handleImageGeneration(req, res, next) {
  try {
    const { description, style = 'white', qty = 1 } = req.body || {};
    if (!description || !description.trim()) {
      return res.status(400).json({ error: '产品描述不能为空' });
    }
    const n = Math.max(1, Math.min(4, Number(qty) || 1));
    const stylePrompt = STYLE_PROMPTS[style] || STYLE_PROMPTS.white;
    const fullPrompt = `A professional product photograph of: ${description.trim()}. ${stylePrompt}. Hyper realistic, commercial quality, award-winning photography.`;

    // ---- 探测图片 provider ----
    const imageProvider = getImageProvider();
    const imageClient  = getImageClient();
    const imageModel   = getImageModel();

    // ---- 无图片 provider:降级为提示词 ----
    if (!imageProvider || !imageClient || !imageModel) {
      return res.json({
        images: [],
        prompt: fullPrompt,
        model: 'placeholder',
        provider: getProvider(),
        fallback: true,
        message: `当前没有配置支持图片生成的 Provider（智谱/硅基流动/OpenAI）。已生成可用提示词，可在 Midjourney / DALL·E 中使用。`,
        promptSuggestions: Array.from({ length: n }).map((_, i) => ({
          index: i + 1,
          prompt: fullPrompt,
          seed: Math.floor(Math.random() * 1e9),
        })),
      });
    }

    // ---- 真实图片生成 ----
    const tasks = Array.from({ length: n }).map(async () => {
      const r = await imageClient.images.generate({
        model: imageModel,
        prompt: fullPrompt,
        n: 1,
        size: '1024x1024',
        quality: 'standard',
      });
      return r.data[0]?.url;
    });

    const images = (await Promise.all(tasks)).filter(Boolean);
    res.json({ images, prompt: fullPrompt, model: imageModel, provider: imageProvider });
  } catch (e) {
    console.error('[image] failed:', e.message);
    if (e.status === 403) {
      return res.status(403).json({
        error: '图片 API 返回 403 Forbidden',
        hint: '通常是 API Key 无效/被吊销，或模型不可用。请到对应控制台检查 Key 状态',
        detail: e.message,
      });
    }
    next(e);
  }
}
