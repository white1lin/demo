"use client";

import { useEffect, useMemo, useState } from "react";
import type { AnalysisRecord, JobAnalysis, MatchAnalysis } from "@/lib/schemas";

const sampleJob =
  "AI Product Intern / Junior AI Product Manager. 负责调研用户需求，设计 AI 工作流，和工程师协作完成原型。要求能写清楚 PRD，理解大模型能力边界，有数据分析或求职产品经验加分。";

const sampleResume =
  "我有运营和内容经验，做过招聘信息整理、表格分析和自动化工具尝试。熟悉用户沟通，正在学习 AI 产品、Prompt 和前端开发，希望转向 AI 产品经理方向。";

const maxInputChars = 12000;
const analysisVersion = 2;

function priorityLabel(priority: MatchAnalysis["priority"]) {
  return priority === "high" ? "优先投递" : priority === "medium" ? "可以投递" : "谨慎投递";
}

function confidenceLabel(confidence: MatchAnalysis["scoring"]["confidence"]) {
  return confidence === "high" ? "高" : confidence === "medium" ? "中" : "低";
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul>
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export default function Home() {
  const [jobText, setJobText] = useState(sampleJob);
  const [resumeText, setResumeText] = useState(sampleResume);
  const [job, setJob] = useState<JobAnalysis | null>(null);
  const [match, setMatch] = useState<MatchAnalysis | null>(null);
  const [history, setHistory] = useState<AnalysisRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [followUpAnswer, setFollowUpAnswer] = useState("");

  useEffect(() => {
    const saved = window.localStorage.getItem("ai-job-coach-history");
    if (saved) {
      setHistory(JSON.parse(saved) as AnalysisRecord[]);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("ai-job-coach-history", JSON.stringify(history));
  }, [history]);

  const canSubmit = useMemo(() => jobText.trim().length > 20 && resumeText.trim().length > 20, [
    jobText,
    resumeText
  ]);
  const scoring = match?.scoring ?? {
    requiredPoints: 0,
    bonusPoints: 0,
    projectPoints: 0,
    outcomePoints: 0,
    matchedRequiredSkills: [],
    matchedBonusSkills: [],
    confidence: "low" as const,
    rationale: "这是旧版历史记录，尚未保存评分依据。请重新分析以生成可解释评分。"
  };
  const projectEvidence = match?.projectEvidence ?? [];
  const followUpQuestion =
    match && (scoring.projectPoints === 0 || scoring.outcomePoints === 0)
      ? match.followUpQuestion || "请补充一个最相关项目：你做了什么、承担了什么职责、最后有什么变化？"
      : "";

  async function runAnalysis(resumeOverride = resumeText) {
    if (!canSubmit) {
      setError("请先粘贴完整的岗位描述和简历文本。");
      return;
    }

    if (jobText.length > maxInputChars || resumeOverride.length > maxInputChars) {
      setError(`单段文本最多 ${maxInputChars.toLocaleString("zh-CN")} 个字符，请删减后重试。`);
      return;
    }

    const existingRecord = history.find(
      (record) =>
        record.analysisVersion === analysisVersion &&
        record.jobText === jobText &&
        record.resumeText === resumeOverride
    );
    if (existingRecord) {
      setJob(existingRecord.job);
      setMatch(existingRecord.match);
      setError("");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/match-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobText, resumeText: resumeOverride })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "分析失败，请稍后重试。");
      }

      setJob(data.job);
      setMatch(data.match);
      setHistory((records) => [
        {
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          analysisVersion,
          jobText,
          resumeText: resumeOverride,
          job: data.job,
          match: data.match
        },
        ...records
      ]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "分析失败，请稍后重试。");
    } finally {
      setIsLoading(false);
    }
  }

  async function submitFollowUp() {
    const answer = followUpAnswer.trim();
    if (!answer) {
      setError("请先用自然语言补充一点项目或成果信息。 ");
      return;
    }

    const enrichedResume = `${resumeText}\n\n补充说明：${answer}`;
    setResumeText(enrichedResume);
    setFollowUpAnswer("");
    await runAnalysis(enrichedResume);
  }

  function loadRecord(record: AnalysisRecord) {
    setJobText(record.jobText);
    setResumeText(record.resumeText);
    setJob(record.job);
    setMatch(record.match);
    setError("");
  }

  function clearHistory() {
    if (!window.confirm("确定清除当前浏览器中的全部分析历史吗？此操作无法恢复。")) {
      return;
    }

    setHistory([]);
    setJob(null);
    setMatch(null);
  }

  function exportResult() {
    if (!job || !match) return;
    const content = `# ${job.title}\n\n匹配分：${match.matchScore}\n投递建议：${priorityLabel(
      match.priority
    )}\n评分依据：${match.scoring?.rationale ?? "旧版历史记录没有评分依据。"}\n\n## 岗位摘要\n${job.summary}\n\n## 简历建议\n${match.resumeSuggestions.join("\n")}`;
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "ai-job-analysis.md";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main>
      <section className="workspace">
        <aside className="learning-panel">
          <p className="eyebrow">从 0 学 AI 产品</p>
          <h1>AI 求职助手</h1>
          <p className="intro">
            这个项目教你把一个真实痛点拆成产品闭环：输入岗位和简历，让 AI 输出可执行的求职判断。
          </p>

          <div className="steps">
            <strong>学习顺序</strong>
            <span>1. 先理解 PRODUCT.md</span>
            <span>2. 跑通静态页面</span>
            <span>3. 看懂 API 和 prompt</span>
            <span>4. 用真实岗位测试</span>
          </div>
        </aside>

        <section className="tool-panel">
          <div className="input-grid">
            <label>
              <span>岗位描述</span>
              <textarea
                value={jobText}
                maxLength={maxInputChars}
                onChange={(event) => setJobText(event.target.value)}
              />
              <small className="input-hint">{jobText.length.toLocaleString("zh-CN")} / {maxInputChars.toLocaleString("zh-CN")}</small>
            </label>
            <label>
              <span>简历文本</span>
              <textarea
                value={resumeText}
                maxLength={maxInputChars}
                onChange={(event) => setResumeText(event.target.value)}
              />
              <small className="input-hint">{resumeText.length.toLocaleString("zh-CN")} / {maxInputChars.toLocaleString("zh-CN")}</small>
            </label>
          </div>

          <div className="actions">
            <button onClick={() => runAnalysis()} disabled={isLoading}>
              {isLoading ? "分析中..." : "生成匹配分析"}
            </button>
            <button className="secondary" onClick={exportResult} disabled={!job || !match}>
              导出结果
            </button>
          </div>

          {error ? <p className="error">{error}</p> : null}

          {job && match ? (
            <section className="results">
              <div className="score-card">
                <div>
                  <span>匹配分</span>
                  <strong>{match.matchScore}</strong>
                </div>
                <p>{priorityLabel(match.priority)}</p>
                <small>评分可信度：{confidenceLabel(scoring.confidence)}</small>
              </div>

              <article>
                <h2>评分依据</h2>
                <p>{scoring.rationale}</p>
                <BulletList
                  items={[
                    `必备要求证据（含近义表达）：${scoring.matchedRequiredSkills.join("、") || "暂未匹配"}（${scoring.requiredPoints} 分）`,
                    `岗位加分项证据（含近义表达）：${scoring.matchedBonusSkills.join("、") || "暂无或未匹配"}（${scoring.bonusPoints} 分）`,
                    `相关项目：${scoring.projectPoints > 0 ? "项目直接证明了岗位能力" : "未找到直接相关的项目证据"}（${scoring.projectPoints} 分）`,
                    `项目成果：${scoring.outcomePoints > 0 ? "项目包含可验证成果" : "建议补充项目结果或量化指标"}（${scoring.outcomePoints} 分）`
                  ]}
                />
              </article>

              <article>
                <h2>项目证据</h2>
                {projectEvidence.length === 0 ? (
                  <p>简历中没有找到可直接核对的相关项目。补充项目名称、职责和结果后，评分会更准确。</p>
                ) : (
                  projectEvidence.map((project) => (
                    <div key={`${project.project}-${project.role}`} className="project-evidence">
                      <strong>{project.project}</strong>
                      <p>对应要求：{project.matchedRequirements.join("、") || "未匹配明确要求"}</p>
                      <p>你的职责：{project.role}</p>
                      <p>成果：{project.outcomes.join("、") || "未提供可验证成果"}</p>
                    </div>
                  ))
                )}
              </article>

              {followUpQuestion ? (
                <section className="follow-up">
                  <h2>补充一个细节</h2>
                  <p>{followUpQuestion}</p>
                  <textarea
                    aria-label="补充项目说明"
                    value={followUpAnswer}
                    onChange={(event) => setFollowUpAnswer(event.target.value)}
                    placeholder="用自己的话写即可，不需要按固定格式。"
                  />
                  <button onClick={submitFollowUp} disabled={isLoading}>
                    用补充信息重新分析
                  </button>
                </section>
              ) : null}

              <article>
                <h2>岗位摘要</h2>
                <p>{job.summary}</p>
                <div className="tag-row">
                  {job.skills.map((skill) => (
                    <span key={skill}>{skill}</span>
                  ))}
                </div>
              </article>

              <article>
                <h2>优势</h2>
                <BulletList items={match.strengths} />
              </article>

              <article>
                <h2>差距</h2>
                <BulletList items={match.gaps} />
              </article>

              <article>
                <h2>简历修改建议</h2>
                <BulletList items={match.resumeSuggestions} />
              </article>

              <article>
                <h2>面试准备点</h2>
                <BulletList items={match.interviewPrep} />
              </article>
            </section>
          ) : (
            <section className="empty-state">
              <h2>先跑通产品闭环</h2>
              <p>点击分析后，你会看到岗位结构化、匹配分、简历建议和历史记录。</p>
            </section>
          )}
        </section>

        <aside className="history-panel">
          <div className="history-heading">
            <h2>分析历史</h2>
            {history.length > 0 ? (
              <button className="clear-history" onClick={clearHistory}>
                清除
              </button>
            ) : null}
          </div>
          {history.length === 0 ? (
            <p className="muted">完成一次分析后会保存在当前浏览器。</p>
          ) : (
            history.map((record) => (
              <button key={record.id} className="history-item" onClick={() => loadRecord(record)}>
                <strong>{record.job.title}</strong>
                <span>{new Date(record.createdAt).toLocaleString("zh-CN")}</span>
                <em>{record.match.matchScore} 分</em>
              </button>
            ))
          )}
        </aside>
      </section>
    </main>
  );
}
