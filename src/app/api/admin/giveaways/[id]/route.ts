import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";

/**
 * Delete a giveaway. Cascades to its tasks, and in turn their clicks and
 * completions, via the schema's onDelete: Cascade rules.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireRole("ADMIN");
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const giveaway = await db.giveaway.findUnique({ where: { id } });
  if (!giveaway) return NextResponse.json({ error: "Not found." }, { status: 404 });

  await db.giveaway.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
