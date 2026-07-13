import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { parseTaskFields } from "@/lib/validateTask";

/**
 * Advertiser adds an offer/task to one of their own giveaways. Created as
 * PENDING; an admin must approve it before users see it.
 */
export async function POST(req: NextRequest) {
  const user = await requireRole("ADVERTISER", "ADMIN");
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const giveawayId = String(body?.giveawayId ?? "");

  const giveaway = await db.giveaway.findUnique({ where: { id: giveawayId } });
  if (!giveaway) {
    return NextResponse.json({ error: "Pick one of your giveaways." }, { status: 400 });
  }
  if (user.role !== "ADMIN" && giveaway.createdById !== user.id) {
    return NextResponse.json(
      { error: "You can only add offers to your own giveaways." },
      { status: 403 }
    );
  }
  if (giveaway.status === "ENDED") {
    return NextResponse.json(
      { error: "This giveaway has ended." },
      { status: 409 }
    );
  }

  const parsed = parseTaskFields(body);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  if (parsed.data.verification === "POSTBACK" && !user.postbackKey) {
    return NextResponse.json(
      { error: "Postback offers need your tracking key — contact us to enable it." },
      { status: 400 }
    );
  }

  const task = await db.task.create({
    data: {
      giveawayId,
      advertiserId: user.id,
      status: "PENDING",
      ...parsed.data,
    },
  });
  return NextResponse.json({ ok: true, id: task.id });
}
