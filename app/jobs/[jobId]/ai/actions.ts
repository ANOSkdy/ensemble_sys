"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { aiProposalSchema } from "@/lib/ai-proposals";
import { hasDatabaseUrl, query } from "@/lib/db";
import { getMeeting } from "@/lib/meetings";
import { requireUser } from "@/lib/server/auth";
import { generateGeminiContent } from "@/src/server/gemini";

export type ProposalActionState = {
  ok: boolean;
  message?: string;
  proposalId?: string;
};

const jobIdSchema = z.string().uuid();
const meetingIdSchema = z.string().uuid();
const constraintSchema = z.string().trim().min(1).max(2000);

type JobPayload = {
  title?: string;
  subtitle?: string;
  description?: string;
  job_type?: string;
};

function buildPrompt(options: {
  jobTitle: string;
  clientName: string;
  payload: JobPayload;
  meetingMemo?: string;
  constraints?: string;
}) {
  return [
    "You are an expert job posting editor.",
    "Return ONLY valid JSON without Markdown or code fences.",
    "JSON contract:",
    `{"summary": string, "changes": [{"field_key":"title|subtitle|description|job_type","after": string, "reason": string}], "risk_checks": [{"type": string, "message": string}], "questions_for_human": [string]}`,
    "Rules:",
    "- Use Japanese for all text.",
    "- Only propose changes for the allowed field_key list.",
    "- If no changes are needed, return an empty changes array and explain why in summary.",
    "",
    `Client: ${options.clientName}`,
    `Job internal title: ${options.jobTitle}`,
    "Current payload JSON:",
    JSON.stringify(options.payload, null, 2),
    options.meetingMemo
      ? `Meeting memo:\n${options.meetingMemo}`
      : "Meeting memo: (none provided)",
    options.constraints
      ? `Constraints from user:\n${options.constraints}`
      : "Constraints from user: (none provided)",
    "Focus on clarity, compliance, and factual consistency."
  ].join("\n");
}

function extractJsonText(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\\s*([\\s\\S]*?)\\s*```/i);
  return fenced ? fenced[1].trim() : trimmed;
}

export async function generateProposalAction(
  jobId: string,
  _prevState: ProposalActionState,
  formData: FormData
): Promise<ProposalActionState> {
  if (!hasDatabaseUrl()) {
    return { ok: false, message: "DATABASE_URL が未設定です。" };
  }

  const parsedJobId = jobIdSchema.safeParse(jobId);
  if (!parsedJobId.success) {
    return { ok: false, message: "求人IDが不正です。" };
  }

  const meetingIdValue = formData.get("meeting_id");
  const constraintsValue = formData.get("constraints");

  const constraintsRaw =
    typeof constraintsValue === "string" ? constraintsValue : "";
  const hasConstraints = constraintsRaw.trim().length > 0;
  const constraintsParsed = constraintSchema.safeParse(constraintsRaw);
  if (hasConstraints && !constraintsParsed.success) {
    return { ok: false, message: "制約メモが長すぎます。" };
  }

  let user;
  try {
    user = await requireUser();
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      redirect("/login");
    }
    throw error;
  }

  if (user.orgId === null) {
    return { ok: false, message: "組織情報が見つかりません。" };
  }

  const jobResult = await query<{
    job_id: string;
    internal_title: string;
    client_name: string;
    job_posting_id: string | null;
  }>(
    `SELECT jobs.id AS job_id,
            jobs.internal_title,
            clients.name AS client_name,
            posting.id AS job_posting_id
     FROM jobs
     JOIN clients ON clients.id = jobs.client_id AND clients.org_id = jobs.org_id
     LEFT JOIN LATERAL (
       SELECT id
       FROM job_postings
       WHERE job_postings.job_id = jobs.id AND job_postings.channel = $3
       ORDER BY job_postings.created_at DESC NULLS LAST
       LIMIT 1
     ) AS posting ON true
     WHERE jobs.org_id = $1 AND jobs.id = $2
     LIMIT 1`,
    [user.orgId, parsedJobId.data, "airwork"]
  );

  const job = jobResult.rows[0];
  if (!job?.job_posting_id) {
    return { ok: false, message: "求人の投稿枠が見つかりません。" };
  }

  const revisionResult = await query<{ payload_json: JobPayload }>(
    `SELECT payload_json
     FROM job_revisions
     WHERE job_posting_id = $1 AND status = $2
     ORDER BY approved_at DESC NULLS LAST, updated_at DESC NULLS LAST, created_at DESC NULLS LAST
     LIMIT 1`,
    [job.job_posting_id, "approved"]
  );

  const payload = revisionResult.rows[0]?.payload_json;
  if (!payload) {
    return { ok: false, message: "承認済みの求人内容が見つかりません。" };
  }

  let meetingMemo: string | undefined;
  let meetingId: string | null = null;

  if (typeof meetingIdValue === "string" && meetingIdValue.trim().length > 0) {
    const parsedMeetingId = meetingIdSchema.safeParse(meetingIdValue);
    if (!parsedMeetingId.success) {
      return { ok: false, message: "会議ログIDが不正です。" };
    }
    const meeting = await getMeeting(user.orgId, parsedMeetingId.data);
    if (!meeting) {
      return { ok: false, message: "会議ログが見つかりません。" };
    }
    meetingMemo = meeting.memo;
    meetingId = meeting.id;
  }

  const prompt = buildPrompt({
    jobTitle: job.internal_title,
    clientName: job.client_name,
    payload,
    meetingMemo,
    constraints: constraintsParsed.success ? constraintsParsed.data : undefined
  });

  let model = "gemini-3-flash-preview";
  let rawOutput = "";
  try {
    const result = await generateGeminiContent(prompt, { model });
    model = result.model;
    rawOutput = result.text;
  } catch (error) {
    const message =
      error instanceof Error && error.message === "Missing GEMINI_API_KEY"
        ? "GEMINI_API_KEY が未設定のため、生成できません。"
        : "AI生成に失敗しました。";
    return { ok: false, message };
  }

  const extracted = extractJsonText(rawOutput);
  let outputJson: unknown;
  let errorMessage: string | null = null;

  try {
    outputJson = JSON.parse(extracted);
  } catch (error) {
    errorMessage = "AIのJSON出力を解析できませんでした。";
    outputJson = { error_message: errorMessage, raw_output: rawOutput };
  }

  if (!errorMessage) {
    const parsedOutput = aiProposalSchema.safeParse(outputJson);
    if (!parsedOutput.success) {
      errorMessage = "AIの出力形式が仕様に一致しませんでした。";
      outputJson = { error_message: errorMessage, raw_output: rawOutput };
    } else {
      outputJson = parsedOutput.data;
    }
  }

  const result = await query<{ id: string }>(
    `INSERT INTO ai_proposals (
       job_posting_id,
       meeting_id,
       input_prompt,
       model,
       thinking_level,
       output_json
     )
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [job.job_posting_id, meetingId, prompt, model, null, outputJson]
  );

  const proposalId = result.rows[0]?.id;
  if (!proposalId) {
    return { ok: false, message: "提案の保存に失敗しました。" };
  }

  redirect(`/jobs/${job.job_id}/ai/${proposalId}`);
}
