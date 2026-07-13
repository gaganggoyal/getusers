import { NextRequest, NextResponse } from "next/server";
import { TaskStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { parseTaskFields } from "@/lib/validateTask";

/**
 * Moderate / manage a task.
 * Body is one of:
 *   { action: "approve" | "reject", note? }  — moderation
 *   { active: boolean }                       — pause / resume
 *   { ...task fields }                        — edit
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireRole("ADMIN");
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const task = await db.task.findUnique({ where: { id } });
  if (!task) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const body = await req.json().catch(() => null);
  const action = body?.action ? String(body.action) : null;

  if (action) {
    const map: Record<string, TaskStatus> = {
      approve: "APPROVED",
      reject: "REJECTED",
    };
    const status = map[action];
    if (!status) {
      return NextResponse.json({ error: "Unknown action." }, { status: 400 });
    }
    await db.task.update({
      where: { id },
      data: {
        status,
        reviewNote: action === "reject" ? String(body?.note ?? "").trim() || null : null,
      },
    });
    return NextResponse.json({ ok: true, status });
  }

  if (typeof body?.active === "boolean" && Object.keys(body).length === 1) {
    await db.task.update({ where: { id }, data: { active: body.active } });
    return NextResponse.json({ ok: true });
  }

  const parsed = parseTaskFields(body);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  await db.task.update({ where: { id }, data: { ...parsed.data } });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireRole("ADMIN");
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const task = await db.task.findUnique({ where: { id } });
  if (!task) return NextResponse.json({ error: "Not found." }, { status: 404 });

  await db.task.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
