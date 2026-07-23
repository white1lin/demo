import type { JobAnalysis, MatchAnalysis } from "./schemas";

const openAIModel = process.env.OPENAI_MODEL || "gpt-4.1-mini";
const nvidiaModel = process.env.NVIDIA_MODEL;
const modelTimeoutMs = 25_000;

const jobSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    company: { type: "string" },
    location: { type: "string" },
    seniority: { type: "string" },
    summary: { type: "string" },
    skills: { type: "array", items: { type: "string" } },
    requiredSkills: { type: "array", items: { type: "string" } },
    bonusSkills: { type: "array", items: { type: "string" } },
    responsibilities: { type: "array", items: { type: "string" } },
    hiddenRequirements: { type: "array", items: { type: "string" } }
  },
  required: [
    "title",
    "company",
    "location",
    "seniority",
    "summary",
    "skills",
    "requiredSkills",
    "bonusSkills",
    "responsibilities",
    "hiddenRequirements"
  ]
};

const matchSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    matchScore: { type: "number", minimum: 0, maximum: 100 },
    priority: { type: "string", enum: ["high", "medium", "low"] },
    strengths: { type: "array", items: { type: "string" } },
    gaps: { type: "array", items: { type: "string" } },
    resumeSuggestions: { type: "array", items: { type: "string" } },
    interviewPrep: { type: "array", items: { type: "string" } },
    nextAction: { type: "string" },
    followUpQuestion: { type: "string" },
    projectEvidence: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          project: { type: "string" },
          matchedRequirements: { type: "array", items: { type: "string" } },
          role: { type: "string" },
          outcomes: { type: "array", items: { type: "string" } },
          relevance: { type: "string", enum: ["high", "medium", "low"] }
        },
        required: ["project", "matchedRequirements", "role", "outcomes", "relevance"]
      }
    },
    scoring: {
      type: "object",
      additionalProperties: false,
      properties: {
        requiredPoints: { type: "number" },
        bonusPoints: { type: "number" },
        projectPoints: { type: "number" },
        outcomePoints: { type: "number" },
        matchedRequiredSkills: { type: "array", items: { type: "string" } },
        matchedBonusSkills: { type: "array", items: { type: "string" } },
        confidence: { type: "string", enum: ["high", "medium", "low"] },
        rationale: { type: "string" }
      },
      required: [
        "requiredPoints",
        "bonusPoints",
        "projectPoints",
        "outcomePoints",
        "matchedRequiredSkills",
        "matchedBonusSkills",
        "confidence",
        "rationale"
      ]
    }
  },
  required: [
    "matchScore",
    "priority",
    "strengths",
    "gaps",
    "resumeSuggestions",
    "interviewPrep",
    "nextAction",
    "followUpQuestion",
    "projectEvidence",
    "scoring"
  ]
};

function clip(text: string, max = 12000) {
  return text.trim().slice(0, max);
}

async function fetchModel(url: string, options: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), modelTimeoutMs);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error("模型响应超时，请确认模型配置后重试。");
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

const skillCatalog = [
  "JavaScript",
  "TypeScript",
  "React",
  "Next.js",
  "Node.js",
  "Python",
  "SQL",
  "Excel",
  "Tableau",
  "Power BI",
  "Figma",
  "Photoshop",
  "Google Analytics",
  "SEO",
  "CRM",
  "Salesforce",
  "AWS",
  "Docker",
  "Git",
  "AI",
  "ChatGPT",
  "机器学习",
  "数据分析",
  "产品管理",
  "项目管理",
  "用户研究",
  "内容运营",
  "市场营销",
  "销售",
  "沟通",
  "英语"
];

function includesSkill(text: string, skill: string) {
  return text.toLocaleLowerCase().includes(skill.toLocaleLowerCase());
}

function findSkills(text: string) {
  return skillCatalog.filter((skill) => includesSkill(text, skill));
}

function firstLines(text: string, max = 3) {
  return text
    .split(/\n|[。.!?；;]/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, max);
}

function scorePriority(score: number): MatchAnalysis["priority"] {
  if (score >= 75) return "high";
  if (score >= 55) return "medium";
  return "low";
}

function calculateScore(
  job: JobAnalysis,
  resumeText: string,
  projectEvidence: MatchAnalysis["projectEvidence"]
) {
  const requiredSkills = job.requiredSkills?.length > 0 ? job.requiredSkills : job.skills;
  const bonusSkills = job.bonusSkills ?? [];
  const matchedRequiredSkills = requiredSkills.filter((skill) => includesSkill(resumeText, skill));
  const matchedBonusSkills = bonusSkills.filter((skill) => includesSkill(resumeText, skill));
  const requiredPoints = requiredSkills.length
    ? Math.round((matchedRequiredSkills.length / requiredSkills.length) * 40)
    : 0;
  const bonusPoints = bonusSkills.length
    ? Math.round((matchedBonusSkills.length / bonusSkills.length) * 15)
    : 0;
  const directlyRelevantProject = projectEvidence.find(
    (project) =>
      project.matchedRequirements.some((skill) => requiredSkills.includes(skill)) &&
      project.relevance !== "low"
  );
  const projectPoints = directlyRelevantProject?.relevance === "high" ? 30 : directlyRelevantProject ? 20 : 0;
  const outcomes = projectEvidence.flatMap((project) => project.outcomes);
  const outcomePoints = outcomes.some((outcome) => /\d|%|增长|提升|节省|减少/.test(outcome))
    ? 15
    : outcomes.length > 0
      ? 8
      : 0;
  const score = Math.min(100, requiredPoints + bonusPoints + projectPoints + outcomePoints);
  const detailCount = requiredSkills.length + bonusSkills.length + job.responsibilities.length;
  const confidence: MatchAnalysis["scoring"]["confidence"] =
    detailCount <= 2 ? "low" : detailCount <= 5 ? "medium" : "high";

  return {
    score,
    requiredPoints,
    bonusPoints,
    projectPoints,
    outcomePoints,
    matchedRequiredSkills,
    matchedBonusSkills,
    confidence,
    rationale: `明确要求匹配 ${matchedRequiredSkills.length}/${requiredSkills.length} 项，` +
      `岗位加分项匹配 ${matchedBonusSkills.length}/${bonusSkills.length} 项，` +
      (directlyRelevantProject ? "找到与岗位直接相关的项目经历。" : "未找到与岗位明确要求直接对应的项目经历。")
  };
}

function applyExplainableScore(job: JobAnalysis, resumeText: string, match: MatchAnalysis): MatchAnalysis {
  const score = calculateScore(job, resumeText, match.projectEvidence);
  return {
    ...match,
    matchScore: score.score,
    priority: scorePriority(score.score),
    scoring: {
      requiredPoints: score.requiredPoints,
      bonusPoints: score.bonusPoints,
      projectPoints: score.projectPoints,
      outcomePoints: score.outcomePoints,
      matchedRequiredSkills: score.matchedRequiredSkills,
      matchedBonusSkills: score.matchedBonusSkills,
      confidence: score.confidence,
      rationale: score.rationale
    }
  };
}

function mockJobAnalysis(jobText: string): JobAnalysis {
  const compact = clip(jobText, 600);
  const detectedSkills = findSkills(compact);
  const lines = firstLines(compact);
  const bonusText = lines.filter((line) => /加分|优先|bonus/i.test(line)).join(" ");
  const bonusSkills = detectedSkills.filter((skill) => includesSkill(bonusText, skill));
  const requiredSkills = detectedSkills.filter((skill) => !bonusSkills.includes(skill));
  return {
    title: lines[0]?.slice(0, 60) || "待确认岗位",
    company: "待确认公司",
    location: "待确认地点",
    seniority: "从岗位文本判断",
    summary: compact || "请粘贴岗位描述后再分析。",
    skills: detectedSkills.length > 0 ? detectedSkills : ["沟通", "项目管理", "数据分析"],
    requiredSkills: requiredSkills.length > 0 ? requiredSkills : detectedSkills,
    bonusSkills,
    responsibilities:
      lines.slice(1).length > 0
        ? lines.slice(1)
        : ["请补充更完整的岗位职责，获得更准确的本地分析。"],
    hiddenRequirements: ["能独立推进任务", "能把模糊问题拆成清楚行动"]
  };
}

function mockMatchAnalysis(job: JobAnalysis, resumeText: string): MatchAnalysis {
  const resumeSkills = findSkills(resumeText);
  const matchedSkills = job.skills.filter((skill) => includesSkill(resumeText, skill));
  const missingSkills = job.skills.filter((skill) => !includesSkill(resumeText, skill));
  const hasEvidence = /\d|%|年|增长|提升|节省|负责|完成/.test(resumeText);
  const matchScore = calculateScore(job, resumeText, []).score;
  const priority = scorePriority(matchScore);

  return {
    matchScore,
    priority,
    strengths:
      matchedSkills.length > 0
        ? matchedSkills.map((skill) => `简历中提到了 ${skill}，与岗位要求直接相关。`)
        : ["暂未发现明确的技能重合；可以补充与你最相关的项目经历。"],
    gaps:
      missingSkills.length > 0
        ? missingSkills.map((skill) => `岗位提到 ${skill}，但简历中没有找到对应证据。`)
        : ["主要技能已覆盖，下一步重点是把成果写得更具体。"],
    resumeSuggestions: [
      matchedSkills.length > 0
        ? `把 ${matchedSkills.slice(0, 3).join("、")} 相关项目放到简历前半部分。`
        : "在简历中补充与岗位最相关的技能或项目关键词。",
      hasEvidence
        ? "保留已有的量化成果，并让每条成果都说明你的具体贡献。"
        : "增加 2-3 个量化指标，例如节省时间、提升转化或减少错误。",
      "把经历改成：做了什么、用了什么方法、产生什么结果。"
    ],
    interviewPrep: [
      `准备一个能证明 ${matchedSkills[0] || resumeSkills[0] || "核心能力"} 的项目复盘故事。`,
      missingSkills[0]
        ? `准备如何快速学习或补齐 ${missingSkills[0]} 的具体计划。`
        : "准备一个你如何解决复杂问题的例子。"
    ],
    nextAction:
      priority === "high"
        ? "优先投递，并针对已匹配的技能调整简历顺序。"
        : priority === "medium"
          ? "补充一到两个关键技能证据后再投递。"
          : "先判断缺失技能能否在短期补齐，再决定是否投入时间投递。",
    followUpQuestion:
      "请用一两句话补充一个最相关的项目：你做了什么、承担了什么职责、最后有什么变化？",
    projectEvidence: [],
    scoring: {
      requiredPoints: 0,
      bonusPoints: 0,
      projectPoints: 0,
      outcomePoints: 0,
      matchedRequiredSkills: [],
      matchedBonusSkills: [],
      confidence: "low",
      rationale: "等待本地评分规则计算。"
    }
  };
}

async function callOpenAI<T>(task: string, schemaName: string, schema: object, input: string): Promise<T> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const response = await fetchModel("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: openAIModel,
      input: [
        {
          role: "system",
          content:
            "你是一位专业 AI 产品教练和求职顾问。请给出具体、可执行、适合初学者理解的分析。必须只输出符合 schema 的 JSON。"
        },
        {
          role: "user",
          content: `${task}\n\n${input}`
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: schemaName,
          schema,
          strict: true
        }
      }
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`OpenAI request failed: ${detail}`);
  }

  const data = await response.json();
  const output = data.output_text || data.output?.[0]?.content?.[0]?.text;

  if (!output) {
    throw new Error("OpenAI response did not include output_text.");
  }

  return JSON.parse(output) as T;
}

function parseJson<T>(output: string): T {
  const withoutFence = output
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "");
  return JSON.parse(withoutFence) as T;
}

async function callNvidia<T>(task: string, schemaName: string, schema: object, input: string): Promise<T> {
  if (!process.env.NVIDIA_API_KEY) {
    throw new Error("NVIDIA_API_KEY is not configured.");
  }

  if (!nvidiaModel) {
    throw new Error("NVIDIA_MODEL is not configured. Copy a model ID from build.nvidia.com.");
  }

  const response = await fetchModel("https://integrate.api.nvidia.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.NVIDIA_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: nvidiaModel,
      temperature: 0.2,
      max_tokens: 1800,
      messages: [
        {
          role: "system",
          content: [
            "你是一位专业 AI 产品教练和求职顾问。请给出具体、可执行、适合初学者理解的分析。",
            "只返回合法 JSON，不要 Markdown 代码块、解释或额外字段。",
            `JSON Schema 名称：${schemaName}`,
            `JSON Schema：${JSON.stringify(schema)}`
          ].join("\n")
        },
        { role: "user", content: `${task}\n\n${input}` }
      ]
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`NVIDIA request failed: ${detail}`);
  }

  const data = await response.json();
  const output = data.choices?.[0]?.message?.content;

  if (typeof output !== "string" || !output.trim()) {
    throw new Error("NVIDIA response did not include text content.");
  }

  return parseJson<T>(output);
}

function activeProvider(): "openai" | "nvidia" | "mock" {
  const configured = process.env.AI_PROVIDER?.toLowerCase();
  if (configured === "openai" || configured === "nvidia") return configured;
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.NVIDIA_API_KEY) return "nvidia";
  return "mock";
}

function callProvider<T>(task: string, schemaName: string, schema: object, input: string): Promise<T> {
  return activeProvider() === "nvidia"
    ? callNvidia<T>(task, schemaName, schema, input)
    : callOpenAI<T>(task, schemaName, schema, input);
}

export async function analyzeJob(jobText: string): Promise<JobAnalysis> {
  if (activeProvider() === "mock") {
    return mockJobAnalysis(jobText);
  }

  return callProvider<JobAnalysis>(
    "请把下面的岗位描述结构化。请把明确写出的必备能力放入 requiredSkills，把出现“加分、优先、bonus”等措辞的能力放入 bonusSkills；skills 应包含两者的去重合集。",
    "job_analysis",
    jobSchema,
    clip(jobText)
  );
}

export async function matchResume(job: JobAnalysis, resumeText: string): Promise<MatchAnalysis> {
  if (activeProvider() === "mock") {
    return applyExplainableScore(job, resumeText, mockMatchAnalysis(job, resumeText));
  }

  const analysis = await callProvider<MatchAnalysis>(
    "请比较岗位和简历，输出优势、差距、简历建议、面试准备点和下一步行动。请在 projectEvidence 中只提取简历明确写出的项目或经历，说明它对应哪些岗位要求、候选人的职责、可验证成果和相关性；没有明确项目时返回空数组。若缺少与岗位直接相关的项目或项目成果，请在 followUpQuestion 中只提出一个最具体、最容易回答的问题；否则返回空字符串。分数与 scoring 字段会由程序重新计算，因此不要把它们当作最终判断。",
    "match_analysis",
    matchSchema,
    JSON.stringify({ job, resumeText: clip(resumeText) }, null, 2)
  );

  return applyExplainableScore(job, resumeText, analysis);
}
