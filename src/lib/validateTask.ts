import { TaskType, VerificationMode } from "@prisma/client";

export type TaskFields = {
  type: TaskType;
  verification: VerificationMode;
  title: string;
  description: string;
  targetUrl: string;
  entries: number;
  timerSeconds: number;
};

export type TaskFieldsResult = { error: string } | { data: TaskFields };

/**
 * Validate the task fields shared by the admin and advertiser create/edit
 * endpoints. Advertiser-specific rules (ownership, allowed verification modes)
 * are enforced by the caller.
 */
export function parseTaskFields(body: Record<string, unknown> | null): TaskFieldsResult {
  const title = String(body?.title ?? "").trim();
  const description = String(body?.description ?? "").trim();
  const targetUrl = String(body?.targetUrl ?? "").trim();
  const entries = Math.min(50, Math.max(1, Number(body?.entries ?? 1) | 0));
  const timerSeconds = Math.min(600, Math.max(5, Number(body?.timerSeconds ?? 30) | 0));
  const type = body?.type as TaskType;
  const verification = body?.verification as VerificationMode;

  if (!title) return { error: "Task title is required." };
  if (!Object.values(TaskType).includes(type)) {
    return { error: "Invalid task type." };
  }
  if (!Object.values(VerificationMode).includes(verification)) {
    return { error: "Invalid verification mode." };
  }
  try {
    new URL(targetUrl.replaceAll("{click_id}", "x"));
  } catch {
    return { error: "Please enter a valid target URL (including https://)." };
  }
  return {
    data: { type, verification, title, description, targetUrl, entries, timerSeconds },
  };
}
