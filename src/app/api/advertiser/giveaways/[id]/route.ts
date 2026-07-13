import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";

/** Advertisers may edit/delete only giveaways they own that are not yet live. */
async function loadOwned(id: string, userId: string, isAdmin: boolean) {
  const giveaway = await db.giveaway.findUnique({ where: { id } });
  if (!giveaway) return { error: "Not found.", status: 404 as const };
  if (!isAdmin && giveaway.createdById !== userId) {
    return { error: "Forbidden", status: 403 as const };
  }
  return { giveaway };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireRole("ADVERTISER", "ADMIN");
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const res = await loadOwned(id, user.id, user.role === "ADMIN");
  if ("error" in res) {
    return NextResponse.json({ error: res.error }, { status: res.status });
  }
  const { giveaway } = res;

  // Editing a live/ended giveaway from the advertiser side is not allowed; they
  // can only edit while it is still a draft, pending, or was rejected.
  if (
    user.role !== "ADMIN" &&
    !["DRAFT", "PENDING", "REJECTED"].includes(giveaway.status)
  ) {
    return NextResponse.json(
      { error: "This giveaway is live — ask an admin to make changes." },
      { status: 409 }
    );
  }

  const body = await req.json().catch(() => null);
  const title = String(body?.title ?? giveaway.title).trim();
  const description = String(body?.description ?? giveaway.description).trim();
  const prize = String(body?.prize ?? giveaway.prize).trim();
  const imageUrl = String(body?.imageUrl ?? giveaway.imageUrl ?? "").trim();
  const endsAt = body?.endsAt ? new Date(String(body.endsAt)) : giveaway.endsAt;

  if (!title || !prize || Number.isNaN(endsAt.getTime())) {
    return NextResponse.json(
      { error: "Title, prize and a valid end date are required." },
      { status: 400 }
    );
  }

  // Re-submitting a rejected giveaway puts it back in the pending queue.
  const status =
    user.role !== "ADMIN" && giveaway.status === "REJECTED"
      ? "PENDING"
      : giveaway.status;

  await db.giveaway.update({
    where: { id },
    data: {
      title,
      description,
      prize,
      imageUrl: imageUrl || null,
      endsAt,
      status,
      reviewNote: status === "PENDING" ? null : giveaway.reviewNote,
    },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireRole("ADVERTISER", "ADMIN");
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const res = await loadOwned(id, user.id, user.role === "ADMIN");
  if ("error" in res) {
    return NextResponse.json({ error: res.error }, { status: res.status });
  }
  if (user.role !== "ADMIN" && res.giveaway.status === "ACTIVE") {
    return NextResponse.json(
      { error: "A live giveaway can't be deleted — ask an admin." },
      { status: 409 }
    );
  }

  await db.giveaway.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
