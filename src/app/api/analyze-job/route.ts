import { NextResponse } from "next/server";
import { analyzeJob } from "@/lib/ai";

export async function POST(request: Request) {
  const body = (await request.json()) as { jobText?: string };
  const jobText = body.jobText?.trim();

  if (!jobText) {
    return NextResponse.json({ error: "请先粘贴岗位描述。" }, { status: 400 });
  }

  try {
    const job = await analyzeJob(jobText);
    return NextResponse.json({ job });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "岗位分析失败。" },
      { status: 500 }
    );
  }
}
