# 🚀 AI 电商工作台 MVP（已接入真实 API）

> 支持：商品图生成（DALL·E 3）· Listing 生成（GPT-4o）· 广告文案（GPT-4o）· 竞品分析（GPT-4o）
> 面向：Amazon / Shopify / TikTok Shop 卖家

## 📁 项目结构

```
ai-ecom-workbench/
├── server/                   # Express 后端
│   ├── index.js              #   · 入口
│   ├── openaiClient.js       #   · OpenAI 单例
│   └── routes/
│       ├── image.js          #   · /api/image    (DALL·E 3)
│       ├── listing.js        #   · /api/listing  (GPT-4o)
│       ├── copy.js           #   · /api/copy     (GPT-4o)
│       └── analysis.js       #   · /api/analysis (GPT-4o)
├── public/                   # 前端（HTML/CSS/JS）
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── package.json
├── .env.example              # 环境变量模板
└── README.md
```

## ⚡ 快速开始

### 1. 安装依赖
```bash
cd ai-ecom-workbench
npm install
```

### 2. 配置 API Key
```bash
# 复制模板
cp .env.example .env

# 编辑 .env，填入你的 OpenAI API Key
# OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxx
```

> 💡 API Key 申请：<https://platform.openai.com/api-keys>

### 3. 启动服务
```bash
npm start
```

启动成功后会看到：
```
🚀 AI 电商工作台后端已启动
📍 地址: http://localhost:8787
🔑 API Key: ✅ 已配置
🧠 模型:   gpt-4o / dall-e-3
```

### 4. 打开浏览器
访问 <http://localhost:8787> 即可使用。

## 🔌 API 端点

| 方法 | 路径 | 模型 | 说明 |
|------|------|------|------|
| GET  | `/api/health`    | —   | 健康检查 |
| POST | `/api/image`     | dall-e-3 | 商品图生成（1–4 张） |
| POST | `/api/listing`   | gpt-4o   | 亚马逊 Listing 全套 |
| POST | `/api/copy`      | gpt-4o   | TikTok/Facebook/口号 |
| POST | `/api/analysis`  | gpt-4o   | 竞品分析报告 |

### 请求示例

**Listing：**
```bash
curl -X POST http://localhost:8787/api/listing \
  -H "Content-Type: application/json" \
  -d '{
    "productName": "Premium Leather Bifold Wallet",
    "sellingPoints": "RFID blocking\nGenuine leather\nUltra slim design\n8 card slots",
    "market": "US"
  }'
```

**图片：**
```bash
curl -X POST http://localhost:8787/api/image \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Brown leather wallet with RFID protection",
    "style": "white",
    "qty": 2
  }'
```

## 🧠 模型选择（在 `.env` 配置）

| 变量 | 默认值 | 备选 |
|------|--------|------|
| `GPT_MODEL` | `gpt-4o` | `gpt-4-turbo`, `gpt-3.5-turbo` |
| `GPT_FAST_MODEL` | `gpt-4o-mini` | — |
| `IMAGE_MODEL` | `dall-e-3` | `dall-e-2` |
| `OPENAI_BASE_URL` | （默认） | Azure / 反代地址 |

## 💰 费用参考（OpenAI 官方价）

| 功能 | 单次成本（约） |
|------|---------------|
| Listing 生成 | $0.01 – 0.03 |
| 文案生成 | $0.01 – 0.02 |
| 竞品分析 | $0.02 – 0.04 |
| 商品图 (DALL·E 3 1024²) | $0.04 / 张 |

## 🛡️ 注意事项

- **API Key 切勿提交到 Git**（`.env` 已加入 `.gitignore`）
- **DALL·E 3 单次只能生成 1 张**，系统自动并行调用
- **竞品分析当前为 AI 模拟数据**（无联网爬取），如需真实数据建议接入 Helium 10 / Jungle Scout API
- **生产环境**建议增加：用户鉴权、调用限流、生成历史持久化、付费配额

## 🔜 后续可扩展

- [ ] 接入 Replicate / Stability AI（成本更低）
- [ ] 接入真实亚马逊竞品爬虫
- [ ] 用户系统 + 历史记录
- [ ] 付费订阅 / Stripe 集成
- [ ] 一键导出 Listing 到 Amazon Seller Central
