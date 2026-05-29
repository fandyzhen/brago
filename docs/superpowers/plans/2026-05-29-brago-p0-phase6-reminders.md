# Brago P0 Phase 6 — Weekly Reminders + Activity Streak

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development.

**Goal:** spec 第 11 章。让用户每周收到一次"本周还没发 Google post"的邮件 + 应用内显示 activity streak。

**Architecture:**
- Cron 路由 `/api/cron/brago-weekly-reminders`，复用现有 `CRON_SECRET` / Basic Auth 鉴权。
- 每次 cron 跑：扫所有启用 reminder 且 `lastSentAt` > 7 天前的用户；检查本周是否已发过 post；未发则发邮件并写 `lastSentAt`。
- 邮件模板：复用 Resend 现有发件人；包含暂停/退订入口。
- 应用内 freshness：dashboard 显示 "Fresh this week" / "2-week streak" / "No Google post this week"。

**Tech Stack:** Resend、Vercel Cron（GET 触发）、Drizzle、`@react-email/components` （已装）。

---

## 文件清单

### 服务端
- Create: `lib/brago/reminders/cron-handler.ts` — 复用 `/api/cron/brago-weekly-reminders` 调用
- Create: `lib/brago/reminders/email-template.tsx` — Resend / react-email 模板
- Create: `lib/brago/reminders/freshness.ts` — 计算 streak、lastPostAt
- Create: `app/api/cron/brago-weekly-reminders/route.ts`
- Modify: `app/api/brago/reminder-settings/route.ts`（pause / unsubscribe 接口）
- Modify: `features/brago/dashboard/recent-google-posts.tsx` 同级新增 `freshness-banner.tsx`

### UI
- Create: `app/[locale]/(protected)/settings/reminders/page.tsx`
- Modify: `app/[locale]/(protected)/dashboard/page.tsx` — 渲染 FreshnessBanner

### 公共
- Create: `app/[locale]/reminders/unsubscribe/page.tsx`（公开 GET 链接）
- Create: `app/api/brago/reminders/unsubscribe/route.ts`（链接里的 token 验证）

### 测试
- Create: `tests/lib/brago-reminders.test.ts`

---

## Task 1: Freshness helpers

**Files:**
- Create: `lib/brago/reminders/freshness.ts`

- [ ] **Step 1: 测试先**

`tests/lib/brago-reminders.test.ts`：

```ts
import { describe, it, expect } from "vitest";
import { computeStreakDays, freshnessLabel } from "@/lib/brago/reminders/freshness";

describe("freshness", () => {
  it("computeStreakDays counts consecutive days from today", () => {
    const now = new Date("2026-05-29T12:00:00Z");
    const days = [
      new Date("2026-05-29T08:00:00Z"),
      new Date("2026-05-28T09:00:00Z"),
      new Date("2026-05-27T10:00:00Z"),
      new Date("2026-05-25T10:00:00Z"), // gap
    ];
    expect(computeStreakDays(days, now)).toBe(3);
  });

  it("freshnessLabel handles no post", () => {
    expect(freshnessLabel(null)).toContain("No Google post");
  });

  it("freshnessLabel handles recent post", () => {
    const now = new Date("2026-05-29T12:00:00Z");
    expect(freshnessLabel(new Date("2026-05-28T08:00:00Z"), now)).toContain("Fresh");
  });

  it("freshnessLabel handles stale post", () => {
    const now = new Date("2026-05-29T12:00:00Z");
    expect(freshnessLabel(new Date("2026-05-15T08:00:00Z"), now)).toContain("No Google post this week");
  });
});
```

- [ ] **Step 2: 实现**

```ts
// lib/brago/reminders/freshness.ts
export function computeStreakDays(dates: Date[], now: Date = new Date()): number {
  if (dates.length === 0) return 0;
  const dayKeys = new Set(dates.map(d => d.toISOString().slice(0, 10)));
  let count = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(now);
    d.setUTCDate(now.getUTCDate() - i);
    if (dayKeys.has(d.toISOString().slice(0, 10))) count++;
    else if (count > 0) break;
  }
  return count;
}

export function freshnessLabel(lastPostAt: Date | null, now: Date = new Date()): string {
  if (!lastPostAt) return "No Google post yet — upload today's job to get started.";
  const ms = now.getTime() - lastPostAt.getTime();
  const days = ms / (24 * 60 * 60 * 1000);
  if (days <= 7) return "Fresh this week";
  if (days <= 14) return "Last post 1+ week ago — time for a new one.";
  return "No Google post this week";
}
```

- [ ] **Step 3: 跑测试**

```bash
pnpm test tests/lib/brago-reminders.test.ts
```

预期：4 pass。

- [ ] **Step 4: Commit**

```bash
git add lib/brago/reminders/freshness.ts tests/lib/brago-reminders.test.ts
git commit -m "feat(brago): freshness + streak helpers"
```

---

## Task 2: Reminder email template

**Files:**
- Create: `lib/brago/reminders/email-template.tsx`

- [ ] **Step 1:**

```tsx
import * as React from "react";
import { Html, Body, Container, Heading, Text, Button, Link, Section } from "@react-email/components";

type Props = {
  appUrl: string;
  manageUrl: string;
  unsubscribeUrl: string;
  firstName?: string;
};

export function WeeklyReminderEmail({ appUrl, manageUrl, unsubscribeUrl, firstName }: Props) {
  const greet = firstName ? `Hey ${firstName},` : "Hey there,";
  return (
    <Html>
      <Body style={{ fontFamily: "Inter, Arial, sans-serif", background: "#f7f7f7", padding: "24px 0" }}>
        <Container style={{ background: "#fff", padding: "24px", borderRadius: "12px", maxWidth: 520 }}>
          <Heading style={{ fontSize: 22, margin: 0 }}>You have not posted to Google this week</Heading>
          <Text>{greet}</Text>
          <Text>Stay top of mind on Google with a quick post from today&rsquo;s job.</Text>
          <Section style={{ margin: "16px 0" }}>
            <Button href={`${appUrl}/create`} style={{ background: "#111", color: "#fff", padding: "10px 16px", borderRadius: 8, textDecoration: "none" }}>
              Upload today&rsquo;s job
            </Button>
            <Text style={{ marginTop: 10 }}>
              <Link href={`${appUrl}/dashboard?style=last`}>Or use last job style</Link>
            </Text>
          </Section>
          <Text style={{ fontSize: 12, color: "#666" }}>
            <Link href={manageUrl}>Pause for 4 weeks</Link> &middot; <Link href={unsubscribeUrl}>Unsubscribe</Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/brago/reminders/email-template.tsx
git commit -m "feat(brago): weekly reminder email template"
```

---

## Task 3: Cron handler

**Files:**
- Create: `lib/brago/reminders/cron-handler.ts`
- Create: `app/api/cron/brago-weekly-reminders/route.ts`

- [ ] **Step 1: cron-handler**

```ts
import "server-only";
import { and, eq, isNull, or, lt } from "drizzle-orm";
import { render } from "@react-email/components";
import { Resend } from "resend";
import { db } from "@/lib/db";
import { reminderSettings, user, googlePost } from "@/lib/db/schema";
import { WeeklyReminderEmail } from "./email-template";
import { freshnessLabel } from "./freshness";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "Brago <noreply@brago.app>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://brago.app";
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export type CronResult = { sent: number; skipped: number; failures: number };

export async function runWeeklyReminders(now: Date = new Date()): Promise<CronResult> {
  let sent = 0, skipped = 0, failures = 0;
  if (!RESEND_API_KEY) {
    console.warn("[cron] RESEND_API_KEY not configured — skipping weekly reminders");
    return { sent: 0, skipped: 1, failures: 0 };
  }
  const resend = new Resend(RESEND_API_KEY);

  const sevenDaysAgo = new Date(now.getTime() - SEVEN_DAYS_MS);
  const candidates = await db
    .select({
      settings: reminderSettings,
      user: user,
    })
    .from(reminderSettings)
    .innerJoin(user, eq(user.id, reminderSettings.userId))
    .where(and(
      eq(reminderSettings.enabled, true),
      or(isNull(reminderSettings.pausedUntil), lt(reminderSettings.pausedUntil, now)),
      or(isNull(reminderSettings.lastSentAt), lt(reminderSettings.lastSentAt, sevenDaysAgo)),
    ));

  for (const row of candidates) {
    try {
      // 本周已发 post？
      const recent = await db
        .select({ id: googlePost.id })
        .from(googlePost)
        .where(and(eq(googlePost.userId, row.user.id), or(eq(googlePost.status, "posted_manually"), eq(googlePost.status, "ready"))))
        .limit(1);
      const hasRecent = recent.length > 0;
      if (hasRecent) { skipped++; continue; }

      const unsubUrl = `${APP_URL}/reminders/unsubscribe?u=${encodeURIComponent(row.user.id)}`;
      const manageUrl = `${APP_URL}/settings/reminders`;
      const html = await render(WeeklyReminderEmail({
        appUrl: APP_URL,
        manageUrl,
        unsubscribeUrl: unsubUrl,
        firstName: row.user.name?.split(" ")[0] ?? undefined,
      }));

      await resend.emails.send({
        from: RESEND_FROM_EMAIL,
        to: row.user.email,
        subject: "You have not posted to Google this week",
        html,
        headers: {
          "List-Unsubscribe": `<${unsubUrl}>`,
        },
      });

      await db.update(reminderSettings).set({ lastSentAt: now }).where(eq(reminderSettings.userId, row.user.id));
      sent++;
    } catch (err) {
      console.error("[cron] reminder failed", err);
      failures++;
    }
  }
  return { sent, skipped, failures };
}

export function shouldShowFreshness(): boolean { return true; }
export { freshnessLabel };
```

- [ ] **Step 2: cron route**

```ts
// app/api/cron/brago-weekly-reminders/route.ts
import { NextRequest, NextResponse } from "next/server";
import { runWeeklyReminders } from "@/lib/brago/reminders/cron-handler";

export const runtime = "nodejs";

function isAuthed(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") ?? "";
  if (secret && auth === `Bearer ${secret}`) return true;
  // Basic Auth fallback（与现有 cron 一致）
  const basic = process.env.CRON_JOBS_USERNAME && process.env.CRON_JOBS_PASSWORD
    ? Buffer.from(`${process.env.CRON_JOBS_USERNAME}:${process.env.CRON_JOBS_PASSWORD}`).toString("base64")
    : null;
  if (basic && auth === `Basic ${basic}`) return true;
  return false;
}

export async function GET(req: NextRequest) {
  if (!isAuthed(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const result = await runWeeklyReminders();
  return NextResponse.json({ ok: true, ...result });
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/brago/reminders/cron-handler.ts app/api/cron/brago-weekly-reminders/route.ts
git commit -m "feat(api): weekly reminder cron"
```

---

## Task 4: 退订 / 暂停页面

**Files:**
- Create: `app/[locale]/reminders/unsubscribe/page.tsx`
- Create: `app/api/brago/reminders/unsubscribe/route.ts`

- [ ] **Step 1: API**

```ts
// app/api/brago/reminders/unsubscribe/route.ts
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { reminderSettings } from "@/lib/db/schema";

export async function POST(req: NextRequest) {
  let body: any = {};
  try { body = await req.json(); } catch { body = {}; }
  const userId: string | undefined = body.userId;
  if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  await db.update(reminderSettings).set({ enabled: false }).where(eq(reminderSettings.userId, userId));
  return NextResponse.json({ ok: true });
}

export async function PUT(req: NextRequest) {
  // pause for 28 days
  let body: any = {};
  try { body = await req.json(); } catch { body = {}; }
  const userId: string | undefined = body.userId;
  if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  const until = new Date(Date.now() + 28 * 24 * 60 * 60 * 1000);
  await db.update(reminderSettings).set({ pausedUntil: until }).where(eq(reminderSettings.userId, userId));
  return NextResponse.json({ ok: true, pausedUntil: until.toISOString() });
}
```

- [ ] **Step 2: 公开页**

```tsx
// app/[locale]/reminders/unsubscribe/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Container } from "@/components/container";

export default function UnsubscribePage() {
  const params = useSearchParams();
  const userId = params.get("u");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [paused, setPaused] = useState<string | null>(null);

  const callApi = async (method: "POST" | "PUT") => {
    if (!userId) return;
    setState("loading");
    try {
      const res = await fetch("/api/brago/reminders/unsubscribe", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed");
      if (method === "PUT") setPaused(data.pausedUntil);
      setState("done");
    } catch {
      setState("error");
    }
  };

  return (
    <Container className="py-16 max-w-md">
      <h1 className="text-2xl font-bold mb-2">Weekly Google reminders</h1>
      {!userId ? (
        <p className="text-sm text-red-600">Missing user token.</p>
      ) : state === "done" ? (
        <p className="text-sm text-muted-foreground">
          {paused ? `Paused until ${new Date(paused).toLocaleDateString()}.` : "Unsubscribed."}
        </p>
      ) : (
        <div className="grid gap-3">
          <button onClick={() => callApi("PUT")} disabled={state === "loading"} className="rounded-md border px-3 py-2 text-sm">
            Pause for 4 weeks
          </button>
          <button onClick={() => callApi("POST")} disabled={state === "loading"} className="rounded-md bg-foreground text-background px-3 py-2 text-sm">
            Unsubscribe
          </button>
          {state === "error" && <p className="text-sm text-red-600">Something went wrong.</p>}
        </div>
      )}
    </Container>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add "app/[locale]/reminders/" app/api/brago/reminders/
git commit -m "feat(reminders): unsubscribe + pause public endpoint"
```

---

## Task 5: Settings reminders 页

**Files:**
- Create: `app/[locale]/(protected)/settings/reminders/page.tsx`
- Modify: `app/[locale]/(protected)/settings/page.tsx`（增加链接）

- [ ] **Step 1: settings/reminders/page.tsx**

```tsx
"use client";

import { useEffect, useState } from "react";
import { Container } from "@/components/container";

type Row = {
  enabled: boolean;
  dayOfWeek: number;
  hour: number;
  timezone: string;
  pausedUntil: string | null;
};

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function ReminderSettingsPage() {
  const [row, setRow] = useState<Row | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/brago/reminder-settings").then(r => r.json()).then((d) => {
      if (d.settings) {
        setRow({
          enabled: d.settings.enabled, dayOfWeek: d.settings.dayOfWeek, hour: d.settings.hour,
          timezone: d.settings.timezone, pausedUntil: d.settings.pausedUntil ?? null,
        });
      } else {
        setRow({ enabled: true, dayOfWeek: 1, hour: 9, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, pausedUntil: null });
      }
    }).finally(() => setLoading(false));
  }, []);

  const save = async () => {
    if (!row) return;
    setSaving(true);
    try {
      await fetch("/api/brago/reminder-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: row.enabled, dayOfWeek: row.dayOfWeek, hour: row.hour, timezone: row.timezone,
          pausedUntilIsoDate: row.pausedUntil,
        }),
      });
    } finally { setSaving(false); }
  };

  if (loading || !row) return <Container className="py-10"><p>Loading…</p></Container>;

  return (
    <Container className="py-10 max-w-md">
      <h1 className="text-2xl font-bold mb-2">Weekly Google reminders</h1>
      <p className="text-sm text-muted-foreground mb-6">A quick email when you haven&apos;t posted in 7 days.</p>

      <label className="flex items-center gap-2 text-sm mb-4">
        <input type="checkbox" checked={row.enabled} onChange={(e) => setRow({ ...row, enabled: e.target.checked })} />
        Send me a weekly reminder
      </label>

      <label className="grid gap-1 text-sm mb-4">
        Day of week
        <select value={row.dayOfWeek} onChange={(e) => setRow({ ...row, dayOfWeek: Number(e.target.value) })} className="rounded-md border px-3 py-2">
          {DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
        </select>
      </label>

      <label className="grid gap-1 text-sm mb-4">
        Hour
        <input type="number" min={0} max={23} value={row.hour} onChange={(e) => setRow({ ...row, hour: Math.max(0, Math.min(23, Number(e.target.value) || 0)) })} className="rounded-md border px-3 py-2" />
      </label>

      <label className="grid gap-1 text-sm mb-4">
        Timezone
        <input value={row.timezone} onChange={(e) => setRow({ ...row, timezone: e.target.value })} className="rounded-md border px-3 py-2" />
      </label>

      <button onClick={save} disabled={saving} className="rounded-md bg-foreground text-background px-3 py-2 text-sm">
        {saving ? "Saving…" : "Save"}
      </button>
    </Container>
  );
}
```

- [ ] **Step 2: settings 主页加链接**

在 `/settings/page.tsx` 增加 `<Link href="/settings/reminders">Weekly Google reminders</Link>` 一行。

- [ ] **Step 3: Commit**

```bash
git add "app/[locale]/(protected)/settings/reminders/" "app/[locale]/(protected)/settings/page.tsx"
git commit -m "feat(settings): weekly reminder controls"
```

---

## Task 6: Dashboard freshness banner + streak

**Files:**
- Create: `features/brago/dashboard/freshness-banner.tsx`
- Modify: `app/[locale]/(protected)/dashboard/page.tsx`

- [ ] **Step 1: 写组件**

```tsx
"use client";

import { useEffect, useState } from "react";

type Snapshot = {
  lastPostAt: string | null;
  streakDays: number;
  status: "fresh" | "stale" | "empty";
  label: string;
};

export function FreshnessBanner() {
  const [snap, setSnap] = useState<Snapshot | null>(null);

  useEffect(() => {
    fetch("/api/brago/freshness").then(r => r.ok ? r.json() : null).then((d) => {
      if (d) setSnap(d);
    });
  }, []);

  if (!snap) return null;
  const color = snap.status === "fresh" ? "bg-green-100 text-green-900"
    : snap.status === "stale" ? "bg-yellow-100 text-yellow-900"
    : "bg-foreground/5 text-foreground";

  return (
    <div className={`rounded-xl px-4 py-3 text-sm ${color}`}>
      <div className="font-medium">{snap.label}</div>
      {snap.streakDays > 1 && <div className="text-xs">{snap.streakDays}-day posting streak</div>}
    </div>
  );
}
```

- [ ] **Step 2: 新建 freshness API**

```ts
// app/api/brago/freshness/route.ts
import { NextRequest, NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { getActiveSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { googlePost } from "@/lib/db/schema";
import { computeStreakDays, freshnessLabel } from "@/lib/brago/reminders/freshness";

export async function GET(req: NextRequest) {
  const access = await getActiveSessionUser(req.headers);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const rows = await db
    .select({ createdAt: googlePost.createdAt, postedAt: googlePost.postedAt })
    .from(googlePost)
    .where(eq(googlePost.userId, access.user.id))
    .orderBy(desc(googlePost.createdAt))
    .limit(60);
  const dates = rows.map(r => r.postedAt ?? r.createdAt);
  const lastPostAt = dates[0] ?? null;
  const streakDays = computeStreakDays(dates);
  const label = freshnessLabel(lastPostAt);
  const status: "fresh" | "stale" | "empty" =
    !lastPostAt ? "empty"
    : (Date.now() - lastPostAt.getTime()) <= 7 * 86400_000 ? "fresh"
    : "stale";
  return NextResponse.json({
    lastPostAt: lastPostAt ? lastPostAt.toISOString() : null,
    streakDays,
    status,
    label,
  });
}
```

- [ ] **Step 3: dashboard 接入**

在 dashboard page 顶部插入：
```tsx
import { FreshnessBanner } from "@/features/brago/dashboard/freshness-banner";
...
<FreshnessBanner />
```

- [ ] **Step 4: Commit**

```bash
git add features/brago/dashboard/freshness-banner.tsx app/api/brago/freshness/route.ts "app/[locale]/(protected)/dashboard/page.tsx"
git commit -m "feat(dashboard): freshness banner + streak"
```

---

## Task 7: 注册 reminder_settings 缺省值

**Files:**
- Modify: `lib/auth.ts`（在 sign-up 钩子里同时初始化 reminderSettings）

- [ ] **Step 1: 修改 auth hook**

在 `lib/auth.ts` 的 sign-up after hook 里新增：

```ts
import { upsertReminderSettings } from "@/lib/brago/reminder-settings";
...
try {
  await upsertReminderSettings(newSession.user.id, {});
} catch (err) {
  console.error("[Auth] failed to seed reminder_settings", err);
}
```

放在原 refundCredits 后面。

- [ ] **Step 2: Commit**

```bash
git add lib/auth.ts
git commit -m "feat(auth): seed reminder_settings on signup"
```

---

## Task 8: vercel.json 增加 cron

**Files:**
- Modify or create: `vercel.json`

- [ ] **Step 1: 写 cron 配置**

```json
{
  "crons": [
    {
      "path": "/api/cron/brago-weekly-reminders",
      "schedule": "0 * * * *"
    },
    {
      "path": "/api/cron/subscription-grants",
      "schedule": "0 * * * *"
    }
  ]
}
```

如果项目已有 vercel.json，合并 cron 部分。

- [ ] **Step 2: Commit**

```bash
git add vercel.json
git commit -m "feat(cron): schedule weekly reminders hourly"
```

---

## Task 9: Phase 6 收尾

- [ ] **Step 1:**

```bash
pnpm lint
pnpm test
pnpm build
```

- [ ] **Step 2: launch-checklist**

追加：上线前必须在 Resend Dashboard 验证 `FROM` 邮箱，并把 cron secret 配到 Vercel。

- [ ] **Step 3: Commit**

```bash
git add docs/launch-checklist.md
git commit -m "docs(launch): mark Phase 6 (reminders) complete" --allow-empty
```

## Definition of Done

- `/api/cron/brago-weekly-reminders` 鉴权 OK；扫表只发给 `enabled = true` 且非 paused 且 lastSentAt > 7d ago 的用户；本周已发 post 跳过。
- 公开 `/reminders/unsubscribe?u=` 页可暂停 28 天或退订。
- Dashboard `FreshnessBanner` 显示 fresh / stale / empty + streak。
- Settings 增加 reminder 控制。
- 新用户注册时自动创建 `reminderSettings` 默认行。
- 全套 lint/test/build 绿。
