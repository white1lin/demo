# AI 求职助手学习项目

这是一个从 0 学 AI 产品开发的练习项目。它不是只给你一堆代码，而是把产品定义、Codex 提问方式、MVP 实现和测试方法放在一起。

## 你会学到什么

- 如何把一个模糊想法收敛成 MVP。
- 如何让 Codex 分阶段帮你做产品，而不是一次性“生成全部”。
- 如何设计 AI 输入、结构化输出和失败兜底。
- 如何用 Next.js 做一个本地可用的 AI 产品。

## 推荐学习顺序

1. 读 `PRODUCT.md`，理解产品为什么这样设计。
2. 读 `LEARNING_GUIDE.md`，按阶段学习。
3. 读 `CODEX_PROMPTS.md`，练习如何指挥 Codex。
4. 安装依赖并运行项目。
5. 先用模拟结果体验，再配置 `OPENAI_API_KEY` 接真实模型。

## 运行方式

```bash
npm install
npm run dev
```

在当前 Windows 学习环境中，也可以直接运行 `powershell -ExecutionPolicy Bypass -File .\start-dev.ps1` 启动本地开发服务器。

复制 `.env.example` 为 `.env.local`，选择 OpenAI 或 NVIDIA 并填入对应 Key 后会调用真实模型；不填 Key 时会自动返回本地规则分析，适合学习页面和产品流程。不要把 `.env.local` 提交到 GitHub 或发到聊天中。

## 数据与隐私

- 分析历史默认只保存在当前浏览器的 localStorage 中，可以在页面右侧一键清除。
- 使用真实模型时，岗位和简历文本会发送到你选择的模型服务进行分析；不要粘贴自己无权处理的敏感信息。
- API Key 只放在 `.env.local`，不会发送到浏览器页面。

## 项目结构

```text
src/app/page.tsx              产品工作台
src/app/api/analyze-job       岗位结构化 API
src/app/api/match-resume      简历匹配 API
src/lib/ai.ts                 AI 调用和模拟兜底
src/lib/schemas.ts            产品数据结构
```
