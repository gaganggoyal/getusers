import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function upsertUser({ email, name, role, password, postbackKey }) {
  return db.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name,
      role,
      postbackKey: postbackKey ?? null,
      passwordHash: await bcrypt.hash(password, 10),
    },
  });
}

const admin = await upsertUser({
  email: "admin@getusers.local",
  name: "Site Admin",
  role: "ADMIN",
  password: "admin1234",
});

const advertiser = await upsertUser({
  email: "advertiser@acme.test",
  name: "Acme Advertiser",
  role: "ADVERTISER",
  password: "advertiser1",
  postbackKey: "demo-postback-key-acme",
});

await upsertUser({
  email: "user@test.local",
  name: "Demo User",
  role: "USER",
  password: "user12345",
});

const existing = await db.giveaway.findFirst({
  where: { title: "iPhone 17 Pro Giveaway" },
});

if (!existing) {
  await db.giveaway.create({
    data: {
      title: "iPhone 17 Pro Giveaway",
      slug: "iphone-17-pro-giveaway",
      prize: "iPhone 17 Pro 256GB",
      description:
        "Complete partner offers below to earn entries. Winner drawn when the timer ends. The more tasks you finish, the higher your chances!",
      endsAt: new Date(Date.now() + 30 * 24 * 3600 * 1000),
      status: "ACTIVE",
      tasks: {
        create: [
          {
            type: "PARTNER_SIGNUP",
            verification: "POSTBACK",
            advertiserId: advertiser.id,
            title: "Create a free Acme account",
            description:
              "Sign up with a real email and confirm it. Entries are credited automatically once Acme confirms your signup.",
            targetUrl: "https://example.com/signup?ref=getusers&click_id={click_id}",
            entries: 5,
          },
          {
            type: "NEWSLETTER_SIGNUP",
            verification: "TIMER",
            title: "Check out our partner's blog",
            description: "Read the article for at least 30 seconds.",
            targetUrl: "https://example.com/blog",
            entries: 1,
            timerSeconds: 30,
          },
          {
            type: "YOUTUBE_SUBSCRIBE",
            verification: "MANUAL",
            title: "Subscribe to the Acme YouTube channel",
            description:
              "Subscribe and submit your YouTube username so we can verify.",
            targetUrl: "https://youtube.com/@acme",
            entries: 2,
          },
        ],
      },
    },
  });
}

console.log("Seeded:");
console.log("  admin       admin@getusers.local    / admin1234");
console.log("  advertiser  advertiser@acme.test    / advertiser1 (postback key: demo-postback-key-acme)");
console.log("  user        user@test.local         / user12345");

await db.$disconnect();
