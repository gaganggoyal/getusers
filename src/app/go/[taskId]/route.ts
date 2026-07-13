import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

/**
 * Tracked outbound redirect. Every task click goes through here so we can
 * attach a unique click_id that the advertiser echoes back in the postback.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await params;
  // Behind a reverse proxy, req.url is the internal bind address; anchor
  // same-site redirects to the canonical site URL when configured.
  const base = process.env.NEXT_PUBLIC_SITE_URL || req.url;
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.redirect(new URL(`/login?next=/`, base));
  }

  const task = await db.task.findUnique({
    where: { id: taskId },
    include: { giveaway: true },
  });
  if (!task || !task.active || task.giveaway.status !== "ACTIVE") {
    return NextResponse.redirect(new URL("/", base));
  }

  // Reuse an existing click for this user+task so repeat clicks don't
  // generate new tracking ids (keeps advertiser-side dedup clean).
  let click = await db.click.findFirst({
    where: { taskId: task.id, userId: user.id },
    orderBy: { createdAt: "desc" },
  });
  if (!click) {
    click = await db.click.create({
      data: {
        clickId: randomBytes(16).toString("hex"),
        taskId: task.id,
        userId: user.id,
        ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
        userAgent: req.headers.get("user-agent"),
      },
    });
  }

  // Build the outbound URL: honor a {click_id} placeholder, else append it.
  let target: URL;
  try {
    if (task.targetUrl.includes("{click_id}")) {
      target = new URL(task.targetUrl.replaceAll("{click_id}", click.clickId));
    } else {
      target = new URL(task.targetUrl);
      target.searchParams.set("click_id", click.clickId);
    }
  } catch {
    return NextResponse.redirect(new URL("/", base));
  }

  return NextResponse.redirect(target);
}
