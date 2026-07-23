import { NextResponse } from "next/server";
import { analyzeJobAndMatchResume } from "@/lib/ai";

const maxInputChars = 12000;
export const maxDuration = 60;

export async function POST(request: Request) {
  let body: { jobText?: string; resumeText?: string };

  try {
    body = (await request.json()) as { jobText?: string; resumeText?: string };
  } catch {
    return NextResponse.json({ error: "请求内容格式不正确，请重新提交。" }, { status: 400 });
  }

  const jobText = body.jobText?.trim();
  const resumeText = body.resumeText?.trim();

  if (!jobText || !resumeText) {
    return NextResponse.json({ error: "请同时粘贴岗位描述和简历文本。" }, { status: 400 });
  }

  if (jobText.length > maxInputChars || resumeText.length > maxInputChars) {
    return NextResponse.json(
      { error: `单段文本最多 ${maxInputChars.toLocaleString("zh-CN")} 个字符，请删减后重试。` },
      { status: 400 }
    );
  }

  try {
    console.info("Starting job analysis", {
      provider: process.env.AI_PROVIDER || "auto",
      hasNvidiaKey: Boolean(process.env.NVIDIA_API_KEY),
      hasOpenAIKey: Boolean(process.env.OPENAI_API_KEY)
    });
    const result = await analyzeJobAndMatchResume(jobText, resumeText);
    console.info("Job and resume analysis completed");
    return NextResponse.json(result);
  } catch (error) {
    console.error("Job analysis failed", error);
    return NextResponse.json(
      { error: "分析暂时失败，请确认网络和模型配置后重试。" },
      { status: 500 }
    );
  }
}
