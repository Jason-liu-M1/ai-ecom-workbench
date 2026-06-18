// ============================================
// AI 电商工作台 - 后端入口
// 支持 5 个免费/付费 Provider
// ============================================
import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import './loadEnv.js';

import { handleImageGeneration } from './routes/image.js';
import { handleListingGeneration } from './routes/listing.js';
import { handleCopyGeneration } from './routes/copy.js';
import { handleAnalysisGeneration } from './routes/analysis.js';
import { detectProvider, getConfig, getModels, getImageProvider, getImageModel } from './openaiClient.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app  = express();
const PORT = process.env.PORT || 8787;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// 简易访问日志
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// ===== 健康检查 =====
app.get('/api/health', (_req, res) => {
  const detected = detectProvider();
  const cfg = detected ? getConfig() : null;
  const imgProv = getImageProvider();
  const imgModel = getImageModel();
  res.json({
    ok: true,
    detectedProvider: detected,
    hasKey: cfg ? !!cfg.apiKey : false,
    provider: cfg ? cfg.provider : null,
    model: getModels().gpt,
    imageProvider: imgProv,
    imageModel: imgModel,
    supportsImage: !!imgProv,
    time: new Date().toISOString(),
  });
});

// 列出所有支持的 provider(供前端展示)
app.get('/api/providers', (_req, res) => {
  res.json({
    providers: [
      { id: 'zhipu',       name: '智谱 GLM-4-Flash',  free: true,  needVPN: false, signup: 'https://open.bigmodel.cn',     desc: '国内直连,永久免费' },
      { id: 'siliconflow', name: '硅基流动',           free: true,  needVPN: false, signup: 'https://cloud.siliconflow.cn', desc: '国内直连,送 2000 万 tokens' },
      { id: 'deepseek',    name: 'DeepSeek',          free: true,  needVPN: false, signup: 'https://platform.deepseek.com',desc: '国内直连,注册送 $5' },
      { id: 'groq',        name: 'Groq',              free: true,  needVPN: true,  signup: 'https://console.groq.com',     desc: '需翻墙,极速 Llama 3.3 70B' },
      { id: 'openai',      name: 'OpenAI 官方',       free: false, needVPN: true,  signup: 'https://platform.openai.com',  desc: '需翻墙+信用卡,GPT-4o + DALL·E 3' },
    ],
  });
});

// ===== AI 生成 API =====
app.post('/api/image',    handleImageGeneration);
app.post('/api/listing',  handleListingGeneration);
app.post('/api/copy',     handleCopyGeneration);
app.post('/api/analysis', handleAnalysisGeneration);

// ===== 静态资源 =====
const publicDir = path.join(__dirname, '..', 'public');
app.use(express.static(publicDir));
app.get('/', (_req, res) => res.sendFile(path.join(publicDir, 'index.html')));

// ===== 全局错误处理 =====
app.use((err, _req, res, _next) => {
  console.error('[ERROR]', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    code:  err.code,
  });
});

// ===== 启动 =====
app.listen(PORT, () => {
  const detected = detectProvider();
  const cfg = detected ? getConfig() : null;

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`🚀 AI 电商工作台后端已启动`);
  console.log(`📍 地址: http://localhost:${PORT}`);

  if (cfg) {
    console.log(`🤖 Provider: ${cfg.provider.toUpperCase()}  ${cfg.free ? '🆓 免费' : '💰 付费'}`);
    console.log(`🔑 API Key:  ${cfg.apiKey ? '✅ 已配置' : '❌ 未配置'}`);
    console.log(`🧠 模型:     ${getModels().gpt}`);
    const imgProv = getImageProvider();
    const imgModel = getImageModel();
    console.log(`🖼  图片:     ${imgProv ? `${imgModel} (${imgProv})` : '⚠️ 无图片 provider'}`);
    console.log(`🌐 端点:     ${cfg.baseURL}`);
  } else {
    console.log('⚠️  未检测到任何 API Key');
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  if (!cfg) {
    console.log('');
    console.log('🆓 免费方案(国内直连,推荐):');
    console.log('   1. 智谱 GLM-4-Flash (永久免费)');
    console.log('      申请: https://open.bigmodel.cn');
    console.log('      配:  ZHIPU_API_KEY=你的key');
    console.log('');
    console.log('   2. 硅基流动 (送 2000 万 tokens)');
    console.log('      申请: https://cloud.siliconflow.cn');
    console.log('      配:  SILICONFLOW_API_KEY=你的key');
    console.log('');
    console.log('   3. DeepSeek (注册送 $5)');
    console.log('      申请: https://platform.deepseek.com');
    console.log('      配:  DEEPSEEK_API_KEY=你的key');
    console.log('');
    console.log('把 key 填到项目根目录的 .env 文件即可,无需改代码。');
  } else {
    const imgProv = getImageProvider();
    if (imgProv && imgProv !== cfg.provider) {
      console.log(`💚 文本: ${cfg.provider.toUpperCase()}  |  图片: ${imgProv.toUpperCase()} (${getImageModel()})`);
    } else if (cfg.provider === 'zhipu') {
      console.log('💚 智谱 GLM-4-Flash: 文本+图片(国内直连,永久免费)');
    } else if (cfg.provider === 'siliconflow') {
      console.log('💚 硅基流动: Qwen2.5-72B 文本 + Kolors 图片');
    } else if (cfg.provider === 'deepseek') {
      console.log('💚 DeepSeek: 文本(国内直连,注册送 $5)');
    } else if (cfg.provider === 'groq') {
      console.log('💚 Groq: 极速 Llama 3.3 70B(需翻墙)');
    } else if (cfg.provider === 'openai') {
      console.log('💎 OpenAI 官方: GPT-4o + DALL·E 3');
    }
  }
});
