import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * Server-to-server postback endpoint for advertisers.
 *
 * Advertisers call this when a referred user converts (signs up, installs,
 * pays, ...). Example:
 *
 *   GET /api/postback?click_id={click_id}&key={postback_key}&payout=1.50
 *
 * - click_id: the id we appended to the outbound redirect
 * - key:      the advertiser's secret postback key (proves the call is theirs)
 * - payout:   optional, advertiser-reported conversion value
 * - status:   optional, "approved" (default) or "rejected" (e.g. chargeback)
 *
 * Responds with plain text "OK" / error strings, as affiliate trackers expect.
 * Idempotent: repeated postbacks for the same click are acknowledged, not duplicated.
 */
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const clickId = p.get("click_id");
  const key = p.get("key");
  const status = (p.get("status") ?? "approved").toLowerCase();
  const payout = p.get("payout") ? Number(p.get("payout")) : null;

  if (!clickId || !key) {
    return new NextResponse("MISSING_PARAMS", { status: 400 });
  }

  const click = await db.click.findUnique({
    where: { clickId },
    include: { task: { include: { advertiser: true } } },
  });
  if (!click) {
    return new NextResponse("UNKNOWN_CLICK_ID", { status: 404 });
  }

  const advertiserKey = click.task.advertiser?.postbackKey;
  if (!advertiserKey || advertiserKey !== key) {
    return new NextResponse("INVALID_KEY", { status: 403 });
  }

  const newStatus = status === "rejected" ? "REJECTED" : "APPROVED";

  await db.completion.upsert({
    where: { taskId_userId: { taskId: click.taskId, userId: click.userId } },
    create: {
      taskId: click.taskId,
      userId: click.userId,
      clickDbId: click.id,
      status: newStatus,
      source: "POSTBACK",
      payout: Number.isFinite(payout) ? payout : null,
      ip: click.ip,
      reviewedAt: new Date(),
    },
    update: {
      status: newStatus,
      payout: Number.isFinite(payout) ? payout : undefined,
      reviewedAt: new Date(),
    },
  });

  return new NextResponse("OK");
}
