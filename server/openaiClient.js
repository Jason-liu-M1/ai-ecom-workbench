// ============================================
// LLM 客户端封装（OpenAI 兼容协议统一接入）
// 支持: OpenAI / Groq / SiliconFlow / DeepSeek / 智谱 GLM / 自定义中转
// ============================================
import OpenAI from 'openai';

let _client = null;
let _provider = null;
let _config = null;
let _imageClient = null;
let _imageProvider = null;

/**
 * Provider 配置表 - 添加新的免费源只需在这里加一行
 */
const PROVIDERS = {
  openai: {
    name: 'OpenAI 官方',
    keyEnv: 'OPENAI_API_KEY',
    baseURL: 'https://api.openai.com/v1',
    defaultGPT: 'gpt-4o',
    defaultFast: 'gpt-4o-mini',
    defaultImage: 'dall-e-3',
    imageSupport: true,
    free: false,
  },
  groq: {
    name: 'Groq 免费层',
    keyEnv: 'GROQ_API_KEY',
    baseURL: 'https://api.groq.com/openai/v1',
    defaultGPT: 'llama-3.3-70b-versatile',
    defaultFast: 'llama-3.1-8b-instant',
    defaultImage: null,
    imageSupport: false,
    free: true,
  },
  siliconflow: {
    name: '硅基流动 (国内免费)',
    keyEnv: 'SILICONFLOW_API_KEY',
    baseURL: 'https://api.siliconflow.cn/v1',
    defaultGPT: 'Qwen/Qwen2.5-72B-Instruct',
    defaultFast: 'Qwen/Qwen2.5-7B-Instruct',
    defaultImage: 'Kwai-Kolors/Kolors',
    imageSupport: true,
    free: true,
  },
  deepseek: {
    name: 'DeepSeek (国内,注册送 $5)',
    keyEnv: 'DEEPSEEK_API_KEY',
    baseURL: 'https://api.deepseek.com/v1',
    defaultGPT: 'deepseek-chat',
    defaultFast: 'deepseek-chat',
    defaultImage: null,
    imageSupport: false,
    free: true,
  },
  zhipu: {
    name: '智谱 GLM-4-Flash (国内永久免费)',
    keyEnv: 'ZHIPU_API_KEY',
    baseURL: 'https://open.bigmodel.cn/api/paas/v4',
    defaultGPT: 'glm-4-flash',
    defaultFast: 'glm-4-flash',
    defaultImage: 'cogview-3',
    imageSupport: true,
    free: true,
  },
};

/**
 * Provider 探测逻辑
 *   - LLM_PROVIDER 显式设置     ->  按配置
 *   - 按 key 是否有值自动探测
 *   - 优先级: zhipu > deepseek > siliconflow > groq > openai
 */
export function detectProvider() {
  if (process.env.LLM_PROVIDER) {
    return process.env.LLM_PROVIDER.toLowerCase();
  }
  for (const name of ['zhipu', 'deepseek', 'siliconflow', 'groq', 'openai']) {
    if (process.env[PROVIDERS[name].keyEnv]) return name;
  }
  return null;
}

export function getProvider() {
  if (_provider) return _provider;
  _provider = detectProvider() || 'openai';
  return _provider;
}

export function getConfig() {
  if (_config) return _config;
  const provider = getProvider();
  const def = PROVIDERS[provider] || PROVIDERS.openai;
  _config = {
    provider,
    name: def.name,
    free: def.free,
    imageSupport: def.imageSupport,
    apiKey: process.env[def.keyEnv],
    baseURL: process.env.BASE_URL_OVERRIDE
      || process.env[`${provider.toUpperCase()}_BASE_URL`]
      || def.baseURL,
  };
  return _config;
}

export function getClient() {
  if (_client) return _client;
  const cfg = getConfig();

  if (!cfg.apiKey) {
    const err = new Error(
      `未配置 ${cfg.provider.toUpperCase()} 的 API Key。\n` +
      `免费方案:\n` +
      `  · 智谱 GLM-4-Flash(国内直连,永久免费): https://open.bigmodel.cn  ->  ZHIPU_API_KEY\n` +
      `  · 硅基流动(国内直连,送 2000 万 tokens): https://cloud.siliconflow.cn  ->  SILICONFLOW_API_KEY\n` +
      `  · DeepSeek(国内直连,注册送 $5): https://platform.deepseek.com  ->  DEEPSEEK_API_KEY`
    );
    err.status = 500;
    err.code = 'NO_API_KEY';
    throw err;
  }

  _client = new OpenAI({ apiKey: cfg.apiKey, baseURL: cfg.baseURL });
  return _client;
}

/** 各 provider 默认模型 */
const DEFAULT_MODELS = {
  openai:      { gpt: 'gpt-4o',                  fast: 'gpt-4o-mini',              image: 'dall-e-3' },
  groq:        { gpt: 'llama-3.3-70b-versatile', fast: 'llama-3.1-8b-instant',     image: null },
  siliconflow: { gpt: 'Qwen/Qwen2.5-72B-Instruct', fast: 'Qwen/Qwen2.5-7B-Instruct', image: 'Kwai-Kolors/Kolors' },
  deepseek:    { gpt: 'deepseek-chat',           fast: 'deepseek-chat',            image: null },
  zhipu:       { gpt: 'glm-4-flash',             fast: 'glm-4-flash',              image: 'cogview-3' },
};

export function getModels() {
  const def = DEFAULT_MODELS[getProvider()] || DEFAULT_MODELS.openai;
  return {
    gpt:   process.env.GPT_MODEL      || def.gpt,
    fast:  process.env.GPT_FAST_MODEL || def.fast,
    image: process.env.IMAGE_MODEL    || def.image,
  };
}

/** 当前 provider 是否支持图片生成 */
export function supportsImage() {
  return getConfig().imageSupport;
}

/**
 * 探测图片生成 provider（可能与文本 provider 不同）
 * 逻辑：
 *   1. 如果文本 provider 支持图片，直接用
 *   2. 否则按优先级找支持图片的 provider：智谱 > 硅基流动 > OpenAI
 */
function detectImageProvider() {
  const textProvider = getProvider();
  if (PROVIDERS[textProvider]?.imageSupport) {
    return textProvider;
  }
  for (const name of ['zhipu', 'siliconflow', 'openai']) {
    if (process.env[PROVIDERS[name].keyEnv]) return name;
  }
  return null;
}

export function getImageProvider() {
  if (_imageProvider) return _imageProvider;
  _imageProvider = detectImageProvider();
  return _imageProvider;
}

export function getImageClient() {
  if (_imageClient) return _imageClient;

  const providerName = getImageProvider();
  if (!providerName) return null;

  const provider = PROVIDERS[providerName];
  if (!provider) return null;

  const apiKey = process.env[provider.keyEnv];
  if (!apiKey) return null;

  const baseURL = process.env.BASE_URL_OVERRIDE
    || process.env[`${providerName.toUpperCase()}_BASE_URL`]
    || provider.baseURL;

  _imageClient = new OpenAI({ apiKey, baseURL });
  return _imageClient;
}

export function getImageModel() {
  const providerName = getImageProvider();
  if (!providerName) return null;
  const def = DEFAULT_MODELS[providerName] || DEFAULT_MODELS.openai;
  return process.env.IMAGE_MODEL || def.image;
}

// ----- JSON 安全解析 -----
export function safeParseJSON(text) {
  if (!text) return null;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1] : text;
  try { return JSON.parse(raw.trim()); }
  catch (e) {
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) { try { return JSON.parse(m[0]); } catch {} }
    throw new Error('模型未返回有效 JSON');
  }
}
