// Single source of truth for the task catalogue. Imported by client components
// (the advertiser/admin create forms and the public TaskCard), so keep it free
// of any server-only imports.

export type TaskTypeKey =
  | "PARTNER_SIGNUP"
  | "APP_INSTALL"
  | "VISIT_WEBSITE"
  | "WATCH_VIDEO"
  | "NEWSLETTER_SIGNUP"
  | "YOUTUBE_SUBSCRIBE"
  | "YOUTUBE_LIKE"
  | "INSTAGRAM_FOLLOW"
  | "TIKTOK_FOLLOW"
  | "X_FOLLOW"
  | "FACEBOOK_FOLLOW"
  | "DISCORD_JOIN"
  | "TELEGRAM_JOIN"
  | "TWITCH_FOLLOW"
  | "REFER_FRIEND"
  | "SURVEY"
  | "CUSTOM";

export type VerificationKey = "POSTBACK" | "MANUAL" | "TIMER";

export type TaskTypeMeta = {
  label: string;
  emoji: string;
  /** call-to-action verb shown on the user's "start" button */
  cta: string;
  /** placeholder for the advertiser's target-URL field */
  urlHint: string;
  /** the verification we recommend for this type in the create form */
  suggested: VerificationKey;
  /** grouping in the picker */
  group: "Acquisition" | "Social" | "Community" | "Other";
};

export const TASK_TYPES: Record<TaskTypeKey, TaskTypeMeta> = {
  PARTNER_SIGNUP: {
    label: "Partner signup",
    emoji: "🤝",
    cta: "Sign up",
    urlHint: "https://partner.com/signup?ref={click_id}",
    suggested: "POSTBACK",
    group: "Acquisition",
  },
  APP_INSTALL: {
    label: "App install",
    emoji: "📱",
    cta: "Install app",
    urlHint: "https://apps.apple.com/... or Play Store link",
    suggested: "POSTBACK",
    group: "Acquisition",
  },
  VISIT_WEBSITE: {
    label: "Visit website",
    emoji: "🌐",
    cta: "Visit site",
    urlHint: "https://your-site.com/landing",
    suggested: "TIMER",
    group: "Acquisition",
  },
  WATCH_VIDEO: {
    label: "Watch a video",
    emoji: "🎬",
    cta: "Watch video",
    urlHint: "https://youtube.com/watch?v=…",
    suggested: "TIMER",
    group: "Acquisition",
  },
  NEWSLETTER_SIGNUP: {
    label: "Newsletter signup",
    emoji: "✉️",
    cta: "Subscribe",
    urlHint: "https://your-site.com/newsletter",
    suggested: "POSTBACK",
    group: "Acquisition",
  },
  YOUTUBE_SUBSCRIBE: {
    label: "YouTube subscribe",
    emoji: "▶️",
    cta: "Subscribe",
    urlHint: "https://youtube.com/@yourchannel?sub_confirmation=1",
    suggested: "MANUAL",
    group: "Social",
  },
  YOUTUBE_LIKE: {
    label: "YouTube like",
    emoji: "👍",
    cta: "Like video",
    urlHint: "https://youtube.com/watch?v=…",
    suggested: "MANUAL",
    group: "Social",
  },
  INSTAGRAM_FOLLOW: {
    label: "Instagram follow",
    emoji: "📸",
    cta: "Follow",
    urlHint: "https://instagram.com/yourhandle",
    suggested: "MANUAL",
    group: "Social",
  },
  TIKTOK_FOLLOW: {
    label: "TikTok follow",
    emoji: "🎵",
    cta: "Follow",
    urlHint: "https://tiktok.com/@yourhandle",
    suggested: "MANUAL",
    group: "Social",
  },
  X_FOLLOW: {
    label: "X / Twitter follow",
    emoji: "🐦",
    cta: "Follow",
    urlHint: "https://x.com/yourhandle",
    suggested: "MANUAL",
    group: "Social",
  },
  FACEBOOK_FOLLOW: {
    label: "Facebook follow",
    emoji: "👥",
    cta: "Follow",
    urlHint: "https://facebook.com/yourpage",
    suggested: "MANUAL",
    group: "Social",
  },
  DISCORD_JOIN: {
    label: "Join Discord",
    emoji: "🎮",
    cta: "Join server",
    urlHint: "https://discord.gg/yourinvite",
    suggested: "MANUAL",
    group: "Community",
  },
  TELEGRAM_JOIN: {
    label: "Join Telegram",
    emoji: "✈️",
    cta: "Join channel",
    urlHint: "https://t.me/yourchannel",
    suggested: "MANUAL",
    group: "Community",
  },
  TWITCH_FOLLOW: {
    label: "Twitch follow",
    emoji: "🟣",
    cta: "Follow",
    urlHint: "https://twitch.tv/yourchannel",
    suggested: "MANUAL",
    group: "Community",
  },
  REFER_FRIEND: {
    label: "Refer a friend",
    emoji: "🎁",
    cta: "Share",
    urlHint: "https://your-site.com/refer?ref={click_id}",
    suggested: "POSTBACK",
    group: "Other",
  },
  SURVEY: {
    label: "Complete a survey",
    emoji: "📝",
    cta: "Take survey",
    urlHint: "https://your-survey.com?tid={click_id}",
    suggested: "POSTBACK",
    group: "Other",
  },
  CUSTOM: {
    label: "Custom task",
    emoji: "⭐",
    cta: "Start task",
    urlHint: "https://…",
    suggested: "MANUAL",
    group: "Other",
  },
};

export const TASK_TYPE_KEYS = Object.keys(TASK_TYPES) as TaskTypeKey[];

/** Task types grouped for a nicer <optgroup> picker. */
export const TASK_TYPE_GROUPS: { group: TaskTypeMeta["group"]; keys: TaskTypeKey[] }[] =
  (["Acquisition", "Social", "Community", "Other"] as const).map((group) => ({
    group,
    keys: TASK_TYPE_KEYS.filter((k) => TASK_TYPES[k].group === group),
  }));

export function taskLabel(type: string): string {
  const meta = TASK_TYPES[type as TaskTypeKey];
  return meta ? `${meta.emoji} ${meta.label}` : type;
}

export function taskCta(type: string): string {
  return TASK_TYPES[type as TaskTypeKey]?.cta ?? "Start task";
}

export const VERIFICATION_LABELS: Record<VerificationKey, string> = {
  POSTBACK: "Postback (server-to-server, best quality)",
  MANUAL: "Manual review (user submits proof)",
  TIMER: "Timer (auto-credit after N seconds on page)",
};

export const GIVEAWAY_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  PENDING: "Pending review",
  ACTIVE: "Active",
  PAUSED: "Paused",
  ENDED: "Ended",
  REJECTED: "Rejected",
};

/** Tailwind classes for a `pill` — pair with the *_STATUS_LABELS text. */
export const GIVEAWAY_STATUS_PILL: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-600",
  PENDING: "bg-amber-100 text-amber-700",
  ACTIVE: "bg-emerald-100 text-emerald-700",
  PAUSED: "bg-orange-100 text-orange-700",
  ENDED: "bg-slate-100 text-slate-500",
  REJECTED: "bg-red-100 text-red-700",
};

export const TASK_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export const TASK_STATUS_PILL: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  APPROVED: "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-red-100 text-red-700",
};
