# Codex 提问脚本

按顺序使用这些提示词。每次只做一个小目标。

## 1. 理解产品

```text
请用产品经理视角解释 PRODUCT.md。告诉我这个 MVP 解决什么问题、为什么第一版不做登录和自动爬取。
```

## 2. 理解页面

```text
请解释 src/app/page.tsx 的结构。用初学者能懂的方式说明 React state、表单输入、loading 状态和历史记录。
```

## 3. 理解 API

```text
请解释 src/app/api/analyze-job/route.ts 和 src/app/api/match-resume/route.ts。重点说明浏览器如何请求服务端、为什么 API key 不应该放在前端。
```

## 4. 加一个小功能

```text
请给 AI 求职助手增加“投递行动清单”字段：包括今天要做的 3 个动作。先说明改动计划，再修改代码。
```

## 5. 改进 prompt

```text
请帮我优化 src/lib/ai.ts 里的 prompt，让输出更具体、更像专业求职顾问。改完后解释 prompt 的每一部分。
```

## 6. 做产品复盘

```text
我用 3 个岗位测试了这个工具。请根据这些结果帮我判断：下一版应该优先做什么，不应该做什么。
```
