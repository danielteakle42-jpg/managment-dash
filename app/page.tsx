"use client";

import {
  Award,
  BarChart3,
  CalendarCheck2,
  ChevronRight,
  CircleUserRound,
  Download,
  Eraser,
  ExternalLink,
  Eye,
  Gem,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Megaphone,
  Menu,
  MessageCircle,
  Pencil,
  Search,
  ShieldCheck,
  Sparkles,
  Swords,
  Trash2,
  Trophy,
  Upload,
  Users,
  X,
  Zap,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import ArrangedBattles, { fetchUpcomingBattle, UpcomingBattleCard, type UpcomingBattle } from "./arranged-battles";
import { avatarFor, cleanUsername, type CreatorMetric, type Profile } from "./shared";
import { supabase, supabaseConfigured } from "./supabase";
import { QuickManager, StaffInbox } from "./quick-manager";
import ManagerAdmin from "./manager-admin";
import Notifications from "./notifications";
import PlatinumAssistant from "./platinum-assistant";
import ManagerControl from "./manager-control";
import {CreatorCampaignBanners, AdminCampaignBanners} from "./campaign-banners";

const CAMPAIGN_URL =
  "https://www.tiktok.com/live/reflow/campaign-center?coverUrl=https%3A%2F%2Fp16-webcast-no.tiktokcdn-eu.com%2Fwebcast-no%2Fsub_d1ac9258960e10508e90a238856c248ffdc926aa624dad8ffc4acde2078d9979_1784292650354917~tplv-obj.png&enter_from_merge=live_take_page_campaign_center_new";

type View = "dashboard" | "leaderboard" | "incentives" | "arrangedBattles" | "managerChat" | "admin" | "assistant" | "managerControl";
type SortMetric = "diamonds" | "live_minutes" | "valid_live_days";


type DailyMetric = {
  id?: number;
  username: string;
  metric_date: string;
  diamonds: number;
  live_minutes: number;
  live_duration: string;
  valid_live_days?: number;
};

type MetricSnapshot = {
  username: string;
  period_start: string;
  period_end: string;
  diamonds: number;
  live_minutes: number;
  valid_live_days: number;
  live_streams: number;
  matches: number;
  source_name: string;
};

async function fetchAllDailyMetrics(): Promise<{ data: DailyMetric[]; error: { message: string } | null }> {
  if (!supabase) return { data: [], error: { message: "Supabase is not connected." } };

  // Supabase/PostgREST returns at most 1,000 rows per request by default.
  // The agency can exceed that in only a few days (e.g. 118 creators × 10 days),
  // so fetch the daily history in pages or later dates silently disappear.
  const pageSize = 1000;
  const all: DailyMetric[] = [];

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("creator_daily_metrics")
      .select("*")
      .order("metric_date", { ascending: true })
      .order("username", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) return { data: all, error };
    const page = (data || []) as DailyMetric[];
    all.push(...page);
    if (page.length < pageSize) break;
  }

  return { data: all, error: null };
}

const INCENTIVE_TIERS = [
  { tier: 1, hours: 15, diamonds: 25_000, days: 7 },
  { tier: 2, hours: 25, diamonds: 50_000, days: 10 },
  { tier: 3, hours: 40, diamonds: 100_000, days: 15 },
  { tier: 4, hours: 60, diamonds: 250_000, days: 20 },
  { tier: 5, hours: 100, diamonds: 500_000, days: 30 },
] as const;

function tierFor(record: Pick<CreatorMetric, "live_minutes" | "diamonds" | "valid_live_days">) {
  const qualified = [...INCENTIVE_TIERS].reverse().find(
    ({ hours, diamonds, days }) =>
      record.live_minutes >= hours * 60 &&
      record.diamonds >= diamonds &&
      record.valid_live_days >= days,
  );
  return qualified?.tier ?? 0;
}

function tierLabel(record: Pick<CreatorMetric, "live_minutes" | "diamonds" | "valid_live_days">) {
  const tier = tierFor(record);
  return tier ? `Tier ${tier}` : "Working towards Tier 1";
}

function monthlyRecordsFor(records: CreatorMetric[], dailyRecords: DailyMetric[], month: string) {
  const totals = new Map<string, { diamonds: number; live_minutes: number; valid_live_days: number }>();
  for (const daily of dailyRecords) {
    if (!daily.metric_date.startsWith(`${month}-`)) continue;
    const username = cleanUsername(daily.username);
    const current = totals.get(username) || { diamonds: 0, live_minutes: 0, valid_live_days: 0 };
    current.diamonds += Number(daily.diamonds) || 0;
    current.live_minutes += Number(daily.live_minutes) || 0;
    current.valid_live_days += Number(daily.valid_live_days) || 0;
    totals.set(username, current);
  }

  const hasAnyDailyForMonth = [...totals.keys()].length > 0;

  return records.map((record) => {
    const range = periodRange(record.data_period);
    const latestUploadMonth = range?.end.slice(0, 7);

    // The latest TikTok upload is authoritative for the current month's totals.
    // Daily rows are deltas used for the breakdown and historical months only.
    if (latestUploadMonth === month || (!range && !hasAnyDailyForMonth)) {
      return { ...record, data_period: month };
    }

    const total = totals.get(cleanUsername(record.username));
    if (!total) {
      return {
        ...record,
        data_period: month,
        diamonds: 0,
        live_minutes: 0,
        live_duration: "0m",
        valid_live_days: 0,
      };
    }

    return {
      ...record,
      data_period: month,
      diamonds: total.diamonds,
      live_minutes: total.live_minutes,
      live_duration: minutesToDuration(total.live_minutes),
      valid_live_days: total.valid_live_days,
    };
  });
}

const DEMO_CREATORS: CreatorMetric[] = [
  {
    username: "creator.demo",
    data_period: "Current 28-day period",
    diamonds: 24780,
    live_minutes: 2187,
    live_duration: "36h 27m",
    valid_live_days: 14,
    live_streams: 34,
    matches: 82,
    group_name: "Platinum Pulse",
  },
  {
    username: "nightpulse",
    data_period: "Current 28-day period",
    diamonds: 31890,
    live_minutes: 1760,
    live_duration: "29h 20m",
    valid_live_days: 18,
    live_streams: 28,
    matches: 65,
    group_name: "VOID",
  },
  {
    username: "violetlive",
    data_period: "Current 28-day period",
    diamonds: 16550,
    live_minutes: 2435,
    live_duration: "40h 35m",
    valid_live_days: 19,
    live_streams: 42,
    matches: 91,
    group_name: "Platinum Pulse",
  },
  {
    username: "electricnova",
    data_period: "Current 28-day period",
    diamonds: 12180,
    live_minutes: 1324,
    live_duration: "22h 4m",
    valid_live_days: 12,
    live_streams: 22,
    matches: 54,
    group_name: "VOID",
  },
  {
    username: "pulsevision",
    data_period: "Current 28-day period",
    diamonds: 9040,
    live_minutes: 1042,
    live_duration: "17h 22m",
    valid_live_days: 9,
    live_streams: 18,
    matches: 37,
    group_name: "Platinum Pulse",
  },
];

const DEMO_DAILY: DailyMetric[] = Array.from({ length: 12 }, (_, index) => {
  const minutes = [74, 62, 95, 48, 83, 0, 67, 109, 56, 72, 88, 64][index];
  const diamonds = [1250, 890, 3400, 610, 2750, 0, 1920, 4860, 740, 1580, 2210, 1990][index];
  return {
    username: "creator.demo",
    metric_date: `2026-07-${String(index + 1).padStart(2, "0")}`,
    diamonds,
    live_minutes: minutes,
    live_duration: minutesToDuration(minutes),
  };
});

const emptyEdit: CreatorMetric = {
  username: "",
  data_period: "",
  diamonds: 0,
  live_minutes: 0,
  live_duration: "0m",
  valid_live_days: 0,
};

const WHATSAPP_APPEAL_URL = "https://api.whatsapp.com/send/?phone=%2B447413269978&text&type=phone_number&app_absent=0&wame_ctl=1";

function durationToMinutes(input: unknown) {
  const value = String(input ?? "");
  const hours = Number(value.match(/(\d+)\s*h/i)?.[1] ?? 0);
  const minutes = Number(value.match(/(\d+)\s*m/i)?.[1] ?? 0);
  const seconds = Number(value.match(/(\d+)\s*s/i)?.[1] ?? 0);
  return Math.round(hours * 60 + minutes + seconds / 60);
}

function minutesToDuration(minutes: number) {
  const safe = Math.max(0, Math.round(minutes));
  const hours = Math.floor(safe / 60);
  const mins = safe % 60;
  return hours ? `${hours}h ${mins}m` : `${mins}m`;
}

function number(value: unknown) {
  const parsed = Number(String(value ?? "0").replaceAll(",", ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function dateFromSpreadsheet(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) return `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}`;
  }
  const text = String(value ?? "").trim();
  if (!text) return "";
  const british = text.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
  if (british) return `${british[3]}-${british[2].padStart(2, "0")}-${british[1].padStart(2, "0")}`;
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
}

function periodRange(value: unknown) {
  const text = String(value ?? "").trim();
  const matches = [
    ...text.matchAll(/\b(\d{4})[\/.-](\d{1,2})[\/.-](\d{1,2})\b/g),
    ...text.matchAll(/\b(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})\b/g),
  ].map((match) => match[1].length === 4
    ? `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`
    : `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`);
  const dates = [...new Set(matches)];
  if (!dates.length) {
    const direct = dateFromSpreadsheet(value);
    return direct ? { start: direct, end: direct } : null;
  }
  return { start: dates[0], end: dates.at(-1)! };
}

function rowsFromTikTokSheet(sheet: XLSX.WorkSheet) {
  const grid = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: "" });
  const headerIndex = grid.findIndex((row) =>
    row.some((cell) => String(cell).replace(/\u00a0/g, " ").trim().toLowerCase() === "creator's username"),
  );
  if (headerIndex < 0) return [] as Record<string, unknown>[];
  const headers = grid[headerIndex].map((cell) => String(cell).replace(/\u00a0/g, " ").trim());
  return grid.slice(headerIndex + 1).map((values) =>
    Object.fromEntries(headers.map((header, index) => [header, values[index]])),
  );
}

function recordFromSpreadsheet(row: Record<string, unknown>): CreatorMetric | null {
  const username = String(row["Creator's username"] ?? row.username ?? "").trim();
  if (!username) return null;
  const rawDuration = String(row["LIVE duration"] ?? row.live_duration ?? "0m");
  return {
    username,
    creator_id: String(row["Creator ID"] ?? row.creator_id ?? ""),
    data_period: String(row["Data period"] ?? row.data_period ?? ""),
    group_name: String(row.Group ?? row.group_name ?? ""),
    manager: String(row["Creator Network manager"] ?? row.manager ?? ""),
    diamonds: number(row.Diamonds ?? row.diamonds),
    live_duration: rawDuration,
    live_minutes: durationToMinutes(rawDuration),
    valid_live_days: number(row["Valid go LIVE days"] ?? row.valid_live_days),
    live_streams: number(row["LIVE streams"] ?? row.live_streams),
    matches: number(row.Matches ?? row.matches),
    avatar_url: String(row["Profile picture"] ?? row["Profile picture URL"] ?? row.Avatar ?? row.avatar_url ?? "").trim(),
  };
}

function Login({
  onAccessLogin,busy,error,
}: {onAccessLogin:(credential:string)=>void;busy:boolean;error:string;}) {
  const [credential,setCredential]=useState("");
  const submit=(event:FormEvent)=>{event.preventDefault();onAccessLogin(credential.trim());};
  return <main className="login-page"><div className="ambient ambient-one"/><div className="ambient ambient-two"/>
    <section className="login-art" aria-label="Platinum Pulse VOID"><div className="login-art-copy"><span className="eyebrow"><Zap size={14}/> Creator performance hub</span><h1>Own your hours.<br/><span>Build your pulse.</span></h1><p>One focused place for your LIVE progress, rankings, incentives and active TikTok campaigns.</p><div className="trust-row"><span><ShieldCheck size={16}/> Private creator access</span><span><Sparkles size={16}/> Live performance insights</span></div></div></section>
    <section className="login-panel"><form className="login-card" onSubmit={submit}><img src="/platinum-pulse-void-logo.jpeg" alt="Platinum Pulse VOID Agency" className="login-logo"/><div className="login-heading"><p className="eyebrow">Welcome back</p><h2>Login</h2><p>Enter your TikTok username or your private access code.</p></div>
      <label>TikTok username / access code<div className="input-wrap"><CircleUserRound size={18}/><input value={credential} onChange={e=>setCredential(e.target.value)} autoComplete="off" placeholder="TikTok username or access code" required/></div></label>
      {error&&<p className="form-error">{error}</p>}<button className="primary-button" disabled={busy}>{busy?'Signing in…':'Access dashboard'}<ChevronRight size={18}/></button>
      <p className="login-help">Creator access is matched to uploaded TikTok data. Management access stays separate from creator performance records.</p>
    </form></section></main>;
}

const navigation = [
  { id: "dashboard" as View, label: "My progress", icon: LayoutDashboard },
  { id: "leaderboard" as View, label: "Leaderboard", icon: Trophy },
  { id: "incentives" as View, label: "Incentives/Campaign", icon: Award },
  { id: "arrangedBattles" as View, label: "Arranged Battles", icon: Swords },
  { id: "managerChat" as View, label: "Message Manager/Ban Help", icon: MessageCircle },
];

function AppShell({
  profile,
  records,
  current,
  setCurrent,
  onLogout,
  children,
}: {
  profile: Profile;
  records: CreatorMetric[];
  current: View;
  setCurrent: (view: View) => void;
  onLogout: () => void;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const baseNavigation = profile.role === "creator" ? navigation : [...navigation, {id: "managerControl" as View, label: "Manager Control", icon: ShieldCheck}, {id: "assistant" as View, label: "Platinum Assistant", icon: Sparkles}];
  const items = profile.role === "admin" ? [...baseNavigation, { id: "admin" as View, label: "Admin", icon: ShieldCheck }] : baseNavigation;
  const ownRecord = records.find((item) => cleanUsername(item.username) === cleanUsername(profile.tiktok_username || profile.username));

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileOpen ? "is-open" : ""}`}>
        <div className="brand-lockup">
          <img src="/platinum-pulse-void-logo.jpeg" alt="" />
          <div><strong>PLATINUM PULSE</strong><span>VOID CREATOR HUB</span></div>
          <button className="close-menu" onClick={() => setMobileOpen(false)} aria-label="Close menu"><X /></button>
        </div>
        <nav>
          {items.map(({ id, label, icon: Icon }) => (
            <button key={id} className={current === id ? "active" : ""} onClick={() => { setCurrent(id); setMobileOpen(false); }}>
              <Icon size={19} /><span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="profile-mini">
            <Avatar record={ownRecord || { username: profile.username }} />
            <div><strong>{profile.role === "admin" ? "Owner" : profile.role === "manager" ? (profile.display_name || `@${profile.username}`) : `@${profile.username}`}</strong><small>{profile.role === "admin" ? "Agency owner" : profile.role === "manager" ? "Manager" : ownRecord?.group_name || "Creator"}</small></div>
          </div>
          <button className="logout" onClick={onLogout}><LogOut size={18} /> Sign out</button>
        </div>
      </aside>
      {mobileOpen && <button className="menu-scrim" aria-label="Close menu" onClick={() => setMobileOpen(false)} />}
      <div className="main-column">
        <header className="topbar">
          <button className="menu-button" onClick={() => setMobileOpen(true)} aria-label="Open menu"><Menu /></button>
          <div><span className="live-dot" /> Performance updated securely</div>
          <Notifications profile={profile} onOpen={(view) => setCurrent(view as View)} />
          <button className="avatar-button" onClick={() => setCurrent("dashboard")}><Avatar record={ownRecord || { username: profile.username }} /></button>
        </header>
        <main className="content">{children}</main>
        <nav className="mobile-tabs" aria-label="Main navigation">
          {items.map(({ id, label, icon: Icon }) => (
            <button key={id} className={current === id ? "active" : ""} onClick={() => setCurrent(id)}><Icon /><span>{label.split(" ")[0]}</span></button>
          ))}
        </nav>
      </div>
    </div>
  );
}

function Avatar({ record }: { record: Pick<CreatorMetric, "username" | "avatar_url"> }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <span className="avatar-fallback">{record.username.slice(0, 2).toUpperCase()}</span>;
  return <img className="creator-photo" src={avatarFor(record)} alt={`@${record.username}`} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} />;
}

function StatCard({ icon: Icon, label, value, note, tone }: { icon: typeof Gem; label: string; value: string; note: string; tone: string }) {
  return (
    <article className={`stat-card ${tone}`}>
      <div className="stat-icon"><Icon /></div>
      <div><p>{label}</p><strong>{value}</strong><span>{note}</span></div>
    </article>
  );
}

function Dashboard({ profile, record, dailyRecords, availableMonths, selectedMonth, setSelectedMonth, upcomingBattle, records, onViewBattles }: { profile: Profile; record: CreatorMetric; dailyRecords: DailyMetric[]; availableMonths: string[]; selectedMonth: string; setSelectedMonth: (month: string) => void; upcomingBattle: UpcomingBattle | null; records: CreatorMetric[]; onViewBattles: () => void }) {
  const effectiveMonth = selectedMonth;
  const [year, month] = effectiveMonth.split("-").map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const monthLabel = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(new Date(year, month - 1, 1));
  const dailyByDate = new Map(dailyRecords.map((item) => [item.metric_date, item]));
  const calendarDays = Array.from({ length: daysInMonth }, (_, index) => {
    const date = `${effectiveMonth}-${String(index + 1).padStart(2, "0")}`;
    return { day: index + 1, data: dailyByDate.get(date) };
  });
  const currentTier = tierFor(record);
  const nextTier = INCENTIVE_TIERS.find(({ tier }) => tier > currentTier);
  const target = nextTier || INCENTIVE_TIERS[INCENTIVE_TIERS.length - 1];
  const goals = [
    { label: "LIVE hours", value: record.live_minutes / 60, goal: target.hours, display: record.live_duration, color: "blue" },
    { label: "Diamonds", value: record.diamonds, goal: target.diamonds, display: record.diamonds.toLocaleString(), color: "violet" },
    { label: "Valid LIVE days", value: record.valid_live_days, goal: target.days, display: `${record.valid_live_days} days`, color: "cyan" },
  ];
  return (
    <>
      <section className="page-heading">
        <div><p className="eyebrow">Creator overview</p><h1>Your pulse, @{profile.username}</h1><p>Here’s how your selected month is shaping up.</p></div>
        <div className="heading-pills"><span className="tier-pill"><Trophy size={16} /> {tierLabel(record)}</span><span className="period-pill"><CalendarCheck2 size={16} /> {monthLabel}</span></div>
      </section>
      <section className="stats-grid">
        <StatCard icon={BarChart3} label="LIVE hours" value={record.live_duration} note={`${record.live_streams || 0} streams`} tone="blue" />
        <StatCard icon={Gem} label="Diamonds" value={record.diamonds.toLocaleString()} note={`Total earned in ${monthLabel}`} tone="violet" />
        <StatCard icon={CalendarCheck2} label="Valid LIVE days" value={String(record.valid_live_days)} note="Consistency builds momentum" tone="cyan" />
      </section>
      {upcomingBattle && (
        <UpcomingBattleCard battle={upcomingBattle} currentUsername={profile.username} records={records} onView={onViewBattles} />
      )}
      <CreatorCampaignBanners />
      <section className="dashboard-grid">
        <article className="panel progress-panel">
          <div className="panel-heading"><div><p className="eyebrow">{currentTier ? `Tier ${currentTier} achieved` : "Your next tier"}</p><h2>{nextTier ? `Progress towards Tier ${nextTier.tier}` : "Tier 3 complete"}</h2></div><BarChart3 /></div>
          <div className="progress-chart">
            {goals.map((goal) => {
              const width = Math.min(100, Math.round((goal.value / goal.goal) * 100));
              return (
                <div className="progress-row" key={goal.label}>
                  <div><span>{goal.label}</span><strong>{goal.display}</strong></div>
                  <div className="progress-track"><i className={goal.color} style={{ width: `${width}%` }} /></div>
                  <small>{width}% of {nextTier ? `Tier ${nextTier.tier}` : "top tier"} requirement</small>
                </div>
              );
            })}
          </div>
        </article>
        <article className="panel focus-card">
          <span className="focus-orb"><Zap /></span>
          <p className="eyebrow">Next best move</p>
          <h2>Turn consistency into momentum.</h2>
          <p>Going LIVE for at least one focused hour is the simplest way to build valid days, audience trust and long-term growth.</p>
          <div className="mini-metrics"><span><b>{record.matches || 0}</b> matches</span><span><b>{record.live_streams || 0}</b> streams</span></div>
        </article>
      </section>
      <details className="panel daily-panel dashboard-dropdown">
        <summary className="dashboard-dropdown-summary daily-dropdown-summary">
          <div className="dropdown-summary-copy">
            <span className="dropdown-summary-icon"><CalendarCheck2 size={18} /></span>
            <div><p className="eyebrow">Daily breakdown</p><h2>Hours and diamonds by day</h2><p>Open your day-by-day performance for {monthLabel}.</p></div>
          </div>
          <span className="dropdown-chevron" aria-hidden="true" />
        </summary>
        <div className="dashboard-dropdown-content daily-dropdown-content">
          <div className="daily-controls-row">
            <div className="daily-month-label"><CalendarCheck2 size={16} /> {monthLabel}</div>
            <label className="month-picker">
              <span>Month</span>
              <select value={effectiveMonth} onChange={(event) => setSelectedMonth(event.target.value)}>
                {availableMonths.map((value) => (
                  <option key={value} value={value}>{new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(new Date(`${value}-01T12:00:00`))}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="daily-grid">
            {calendarDays.map(({ day, data }) => (
              <article className={`daily-card ${data ? "has-data" : ""}`} key={day}>
                <strong>{day}</strong>
                <span><Gem size={15} /> {data ? data.diamonds.toLocaleString() : "—"}</span>
                <span><BarChart3 size={15} /> {data ? data.live_duration : "—"}</span>
              </article>
            ))}
          </div>
        </div>
      </details>
    </>
  );
}

function Leaderboard({ records, currentUsername, availableMonths, selectedMonth, setSelectedMonth }: { records: CreatorMetric[]; currentUsername: string; availableMonths: string[]; selectedMonth: string; setSelectedMonth: (month: string) => void }) {
  const [sort, setSort] = useState<SortMetric>("diamonds");
  const [query, setQuery] = useState("");
  const ranked = useMemo(() => [...records].sort((a, b) => b[sort] - a[sort]), [records, sort]);
  const sorted = useMemo(() => ranked.filter((item) => item.username.toLowerCase().includes(query.toLowerCase())), [ranked, query]);
  const metricLabel = sort === "live_minutes" ? "LIVE time" : sort === "valid_live_days" ? "Valid days" : "Diamonds";
  const metricValue = (record: CreatorMetric) => record[sort];
  const displayMetric = (record: CreatorMetric) => sort === "live_minutes" ? record.live_duration : sort === "valid_live_days" ? `${record.valid_live_days} days` : record.diamonds.toLocaleString();
  const gapText = (gap: number) => sort === "live_minutes" ? `${Math.max(1, Math.ceil(gap / 60))}h to overtake` : sort === "valid_live_days" ? `${gap.toLocaleString()} day${gap === 1 ? "" : "s"} to overtake` : `${gap.toLocaleString()} 💎 to overtake`;
  const currentIndex = ranked.findIndex((record) => record.username === currentUsername);
  const currentRecord = currentIndex >= 0 ? ranked[currentIndex] : undefined;
  const nextRecord = currentIndex > 0 ? ranked[currentIndex - 1] : undefined;
  const topTenRecord = currentIndex >= 10 ? ranked[9] : undefined;
  const monthName = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(new Date(`${selectedMonth}-01T12:00:00`));
  const [year, month] = selectedMonth.split("-").map(Number);
  const monthEnd = new Date(year, month, 0);
  const now = new Date();
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() + 1 === month;
  const daysRemaining = isCurrentMonth ? Math.max(0, monthEnd.getDate() - now.getDate()) : 0;
  const podiumRecords = [ranked[1], ranked[0], ranked[2]].filter(Boolean) as CreatorMetric[];
  return (
    <>
      <section className="page-heading leaderboard-heading">
        <div><p className="eyebrow">Monthly creator league</p><h1>Fight for the top spot.</h1><p>{monthName}{isCurrentMonth ? ` · ${daysRemaining} days remaining` : ""} · Every LIVE can move the table.</p></div>
        <label className="month-picker">
          <span>Month</span>
          <select value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)}>
            {availableMonths.map((value) => (
              <option key={value} value={value}>{new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(new Date(`${value}-01T12:00:00`))}</option>
            ))}
          </select>
        </label>
      </section>

      {currentRecord && (
        <section className="your-rank-card">
          <div className="your-rank-avatar"><Avatar record={currentRecord} /></div>
          <div className="your-rank-copy"><span className="eyebrow">Your position</span><strong>#{currentIndex + 1} <small>@{currentRecord.username}</small></strong><p>{displayMetric(currentRecord)} {metricLabel.toLowerCase()}</p></div>
          <div className="rank-targets">
            {nextRecord ? <span><b>↑ {gapText(Math.max(0, metricValue(nextRecord) - metricValue(currentRecord) + 1))}</b><small>Reach #{currentIndex}</small></span> : <span className="leader-status"><b>👑 You’re leading</b><small>Defend the top spot</small></span>}
            {topTenRecord && <span><b>Top 10: {gapText(Math.max(0, metricValue(topTenRecord) - metricValue(currentRecord) + 1)).replace(" to overtake", "")}</b><small>Break into the top ten</small></span>}
          </div>
        </section>
      )}

      <section className="leader-controls">
        <div className="segmented">
          <button className={sort === "diamonds" ? "active" : ""} onClick={() => setSort("diamonds")}><Gem /> Diamonds</button>
          <button className={sort === "live_minutes" ? "active" : ""} onClick={() => setSort("live_minutes")}><BarChart3 /> LIVE hours</button>
          <button className={sort === "valid_live_days" ? "active" : ""} onClick={() => setSort("valid_live_days")}><CalendarCheck2 /> Valid days</button>
        </div>
        <div className="search-box"><Search /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search creators" /></div>
      </section>

      {!query && <section className="podium competitive-podium">
        {podiumRecords.map((record) => {
          const actualIndex = ranked.indexOf(record);
          const place = actualIndex + 1;
          const ahead = actualIndex > 0 ? ranked[actualIndex - 1] : undefined;
          const gap = ahead ? Math.max(0, metricValue(ahead) - metricValue(record) + 1) : 0;
          return (
            <article key={record.username} className={`podium-card place-${place} ${place === 1 ? "champion" : ""}`}>
              {place === 1 && <span className="leader-crown">♛</span>}
              <span className="rank-badge">#{place}</span>
              <div className="creator-avatar"><Avatar record={record} /></div>
              <span className="podium-title">{place === 1 ? "CURRENT LEADER" : place === 2 ? "CHASING #1" : "TOP 3"}</span>
              <strong>@{record.username}</strong><small>{record.group_name || "Creator"} · {tierLabel(record)}</small><b>{displayMetric(record)}</b><em>{metricLabel}</em>
              {ahead ? <span className="overtake-gap">↑ {gapText(gap)}</span> : <span className="overtake-gap leader-gap">Defend the crown</span>}
            </article>
          );
        })}
      </section>}

      <section className="panel table-panel competitive-table">
        <div className="table-kicker"><span>Full rankings</span><small>{ranked.length} creators competing</small></div>
        <div className="leader-table">
          <div className="table-head"><span>Rank</span><span>Creator</span><span>LIVE hours</span><span>Diamonds</span><span>Valid days</span></div>
          {sorted.map((record) => {
            const index = ranked.indexOf(record);
            const ahead = index > 0 ? ranked[index - 1] : undefined;
            const gap = ahead ? Math.max(0, metricValue(ahead) - metricValue(record) + 1) : 0;
            return (
              <div className={`table-row ${record.username === currentUsername ? "is-you" : ""} ${index < 3 ? "top-three-row" : ""}`} key={record.username}>
                <span className="rank-number">#{index + 1}</span>
                <span className="creator-cell"><i><Avatar record={record} /></i><span><b>@{record.username}</b><small>{record.username === currentUsername ? `You · ${tierLabel(record)}` : `${record.group_name || "Creator"} · ${tierLabel(record)}`}{ahead ? ` · ${gapText(gap)}` : " · Current leader"}</small></span></span>
                <span><b>{record.live_duration}</b><small>LIVE time</small></span>
                <span><b>{record.diamonds.toLocaleString()}</b><small>Diamonds</small></span>
                <span><b>{record.valid_live_days}</b><small>Valid days</small></span>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}

function Incentives({ record }: { record: CreatorMetric }) {
  const currentTier = tierFor(record);
  const nextTier = INCENTIVE_TIERS.find(({ tier }) => tier > currentTier);
  const target = nextTier || INCENTIVE_TIERS[INCENTIVE_TIERS.length - 1];
  const progress = [
    { label: "LIVE hours", current: record.live_minutes / 60, goal: target.hours, display: record.live_duration, icon: BarChart3 },
    { label: "Diamonds", current: record.diamonds, goal: target.diamonds, display: record.diamonds.toLocaleString(), icon: Gem },
    { label: "Valid days", current: record.valid_live_days, goal: target.days, display: `${record.valid_live_days} days`, icon: CalendarCheck2 },
  ];
  const overall = Math.min(100, Math.round(Math.min(...progress.map((item) => item.current / item.goal)) * 100));
  return (
    <>
      <section className="page-heading incentive-page-heading"><div><p className="eyebrow">Monthly incentive climb</p><h1>Push the next milestone.</h1><p>Every LIVE, diamond and valid day moves you closer. You need all three targets to unlock each tier.</p></div><span className="incentive-current-badge"><Trophy size={17} /> {currentTier ? `Tier ${currentTier} unlocked` : "Building Tier 1"}</span></section>

      <section className="incentive-push-hero panel">
        <div className="incentive-push-copy">
          <span className="incentive-live-label"><Zap size={14} /> YOUR NEXT TARGET</span>
          <h2>{nextTier ? `Tier ${nextTier.tier} is ${overall}% within reach.` : "You’ve reached the top tier."}</h2>
          <p>{nextTier ? "Your tier is only as strong as your lowest requirement. Keep all three moving together and close the gap." : "You have completed every published incentive requirement for this period. Keep pushing to finish the month strongly."}</p>
          <div className="incentive-overall-track"><i style={{ width: `${overall}%` }} /></div>
          <div className="incentive-overall-meta"><strong>{overall}% complete</strong><span>{nextTier ? `towards Tier ${nextTier.tier}` : "Top tier achieved"}</span></div>
        </div>
        <div className="incentive-goal-stack">
          {progress.map((item) => {
            const Icon = item.icon;
            const pct = Math.min(100, Math.round((item.current / item.goal) * 100));
            const remaining = Math.max(0, item.goal - item.current);
            const left = item.label === "Diamonds" ? `${Math.ceil(remaining).toLocaleString()} left` : item.label === "LIVE hours" ? `${remaining.toFixed(1)}h left` : `${Math.ceil(remaining)} days left`;
            return <article key={item.label} className="incentive-goal-row"><span className="incentive-goal-icon"><Icon size={18} /></span><div><span><b>{item.label}</b><strong>{item.display}</strong></span><div className="incentive-mini-track"><i style={{ width: `${pct}%` }} /></div><small>{pct >= 100 ? "Target hit ✓" : left}</small></div></article>;
          })}
        </div>
      </section>

      <section className="incentive-ladder-head"><div><p className="eyebrow">The climb</p><h2>Five tiers. One month. Keep moving.</h2></div><p>Unlocking a tier means meeting its LIVE hours, diamonds and valid-day target in the same period.</p></section>
      <section className="incentive-grid incentive-ladder">
        {INCENTIVE_TIERS.map((tier, index) => {
          const unlocked = currentTier >= tier.tier;
          const active = nextTier?.tier === tier.tier;
          const Icon = index === 0 ? Zap : index === 1 ? BarChart3 : index === 2 ? Trophy : index === 3 ? Sparkles : Gem;
          return <article className={`panel incentive-card incentive-tier-card ${unlocked ? "unlocked" : ""} ${active ? "active-tier" : ""}`} key={tier.tier}>
            <div className="tier-card-top"><span className="incentive-icon"><Icon /></span><span className="tier-state">{unlocked ? "UNLOCKED" : active ? "NEXT UP" : "LOCKED"}</span></div>
            <p className="eyebrow">Tier {tier.tier}</p><h2>{tier.tier === 1 ? "Starter" : tier.tier === 2 ? "Rising" : tier.tier === 3 ? "Established" : tier.tier === 4 ? "Elite" : "Platinum"}</h2>
            <div className="tier-requirements"><span><BarChart3 size={15} /><b>{tier.hours}h</b><small>LIVE</small></span><span><Gem size={15} /><b>{(tier.diamonds/1000).toLocaleString()}K</b><small>Diamonds</small></span><span><CalendarCheck2 size={15} /><b>{tier.days}</b><small>Valid days</small></span></div>
            <div className="tier-card-footer"><span>{unlocked ? "Milestone complete" : active ? `${overall}% towards unlock` : `Unlock Tier ${tier.tier - 1} first`}</span><ChevronRight size={17} /></div>
          </article>;
        })}
      </section>
      <section className="panel incentive-rule-strip"><Sparkles size={18} /><div><strong>Consistency wins the month.</strong><span>One huge day helps, but regular LIVE hours and valid days keep every requirement moving together.</span></div></section>
      <p className="fine-print">Specific reward amounts and qualification dates are confirmed by agency management for each incentive period.</p>
    </>
  );
}

function Campaigns() {
  return (
    <>
      <section className="page-heading"><div><p className="eyebrow">TikTok LIVE opportunities</p><h1>Campaign centre</h1><p>Find active TikTok campaigns, check eligibility and join the opportunities that fit your content.</p></div></section>
      <section className="campaign-hero panel">
        <div className="campaign-copy"><span className="campaign-badge"><Megaphone /> Official TikTok destination</span><h2>Your next opportunity could already be live.</h2><p>The TikTok Campaign Centre opens securely in a new tab, where you can view current activities and any account-specific requirements.</p><a href={CAMPAIGN_URL} target="_blank" rel="noreferrer">Open TikTok Campaign Centre <ExternalLink /></a></div>
        <div className="campaign-visual"><div className="phone-card"><span className="phone-glow" /><Megaphone /><small>CAMPAIGN CENTRE</small><strong>Discover.<br />Join.<br />Grow.</strong><i><Gem /> LIVE rewards</i></div></div>
      </section>
      <section className="campaign-steps">
        <article><span>01</span><div><h3>Open the centre</h3><p>Use the official link above while signed into the correct TikTok account.</p></div></article>
        <article><span>02</span><div><h3>Check the requirements</h3><p>Read the dates, LIVE goals and eligibility details before joining.</p></div></article>
        <article><span>03</span><div><h3>Track your progress</h3><p>Return here to keep your agency performance goals visible.</p></div></article>
      </section>
    </>
  );
}

function BanHelp() {
  return (
    <>
      <section className="page-heading"><div><p className="eyebrow">If your account gets banned</p><h1>Ban appeal help</h1><p>TikTok bans can usually be appealed. If your appeal gets denied, we can help escalate it — don&apos;t just accept it.</p></div></section>
      <section className="campaign-hero panel">
        <div className="campaign-copy">
          <span className="campaign-badge"><LifeBuoy /> Agency support</span>
          <h2>Got banned? Appeal it first.</h2>
          <p>Use TikTok&apos;s in-app appeal option as soon as you&apos;re banned. If that appeal comes back denied, message the agency directly through the link below and we&apos;ll help you push it further.</p>
          <a href={WHATSAPP_APPEAL_URL} target="_blank" rel="noreferrer"><MessageCircle /> Message us on WhatsApp</a>
        </div>
        <div className="campaign-visual"><div className="phone-card"><span className="phone-glow" /><LifeBuoy /><small>BAN SUPPORT</small><strong>Appeal.<br />Denied?<br />Message us.</strong><i><MessageCircle /> We&apos;ll help</i></div></div>
      </section>
      <section className="campaign-steps">
        <article><span>01</span><div><h3>Submit TikTok&apos;s appeal</h3><p>Always appeal inside the TikTok app first — most bans get reviewed this way.</p></div></article>
        <article><span>02</span><div><h3>Appeal denied?</h3><p>Don&apos;t assume it&apos;s final. Message us straight away with your username and ban screenshot.</p></div></article>
        <article><span>03</span><div><h3>We escalate it</h3><p>The agency will help push your case further and keep you updated on next steps.</p></div></article>
      </section>
      <p className="fine-print">This link opens WhatsApp with the agency&apos;s support number pre-filled: {WHATSAPP_APPEAL_URL}</p>
    </>
  );
}

function Admin({
  records,
  dailyRecords,
  refresh,
  configured,
}: {
  records: CreatorMetric[];
  dailyRecords: DailyMetric[];
  refresh: () => Promise<void>;
  configured: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");
  const [clearing, setClearing] = useState(false);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<CreatorMetric | null>(null);
  const totals = records.reduce((acc, item) => ({ diamonds: acc.diamonds + item.diamonds, minutes: acc.minutes + item.live_minutes, days: acc.days + item.valid_live_days }), { diamonds: 0, minutes: 0, days: 0 });
  const filtered = records.filter((item) => item.username.toLowerCase().includes(query.toLowerCase()));

  const importFiles = async (files: FileList | File[]) => {
    const selectedFiles = Array.from(files);
    if (!selectedFiles.length) return;

    setMessage(`Reading ${selectedFiles.length} creator data export${selectedFiles.length === 1 ? "" : "s"}…`);

    type ParsedImport = {
      file: File;
      parsed: CreatorMetric[];
      range: { start: string; end: string };
      snapshots: MetricSnapshot[];
    };

    const imports: ParsedImport[] = [];

    for (const file of selectedFiles) {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
      const creatorSheetName = workbook.SheetNames.find((name) => name.toLowerCase().includes("creator")) || workbook.SheetNames[0];
      const rows = rowsFromTikTokSheet(workbook.Sheets[creatorSheetName]);
      const parsedRaw = (rows.map(recordFromSpreadsheet).filter(Boolean) as CreatorMetric[])
        .filter((item) => cleanUsername(item.username) !== "ppn777");

      // TikTok exports can occasionally contain the same username more than once. Supabase
      // cannot UPSERT the same conflict key twice in a single request, so collapse duplicates
      // before creating snapshots. If duplicates disagree, keep the row with the strongest
      // cumulative totals rather than letting a smaller/blank duplicate overwrite it.
      const parsedByUsername = new Map<string, CreatorMetric>();
      for (const item of parsedRaw) {
        const key = cleanUsername(item.username);
        const current = parsedByUsername.get(key);
        if (!current ||
            (Number(item.diamonds) || 0) > (Number(current.diamonds) || 0) ||
            ((Number(item.diamonds) || 0) === (Number(current.diamonds) || 0) &&
             (Number(item.live_minutes) || 0) > (Number(current.live_minutes) || 0))) {
          parsedByUsername.set(key, { ...item, username: key });
        }
      }
      const parsed = [...parsedByUsername.values()];
      if (!parsed.length) continue;

      const ranges = parsed.map((item) => periodRange(item.data_period)).filter(Boolean) as { start: string; end: string }[];
      const range = ranges[0];
      if (!range) continue;

      imports.push({
        file,
        parsed,
        range,
        snapshots: parsed.map((item) => ({
          username: cleanUsername(item.username),
          period_start: range.start,
          period_end: range.end,
          diamonds: item.diamonds,
          live_minutes: item.live_minutes,
          valid_live_days: item.valid_live_days,
          live_streams: item.live_streams || 0,
          matches: item.matches || 0,
          source_name: file.name,
        })),
      });
    }

    if (!imports.length) return setMessage("No creator rows were found. Check the spreadsheet headers.");
    if (!supabase) return setMessage(`Preview checked ${imports.length} export${imports.length === 1 ? "" : "s"}. Connect Supabase to save them globally.`);

    // Save every selected month-to-date snapshot first. This means historical files can be
    // selected together and the app can reconstruct every day with cumulative subtraction.
    const snapshotMap = new Map<string, MetricSnapshot>();
    for (const snapshot of imports.flatMap((item) => item.snapshots)) {
      const key = `${cleanUsername(snapshot.username)}|${snapshot.period_start}|${snapshot.period_end}`;
      const current = snapshotMap.get(key);
      if (!current ||
          (Number(snapshot.diamonds) || 0) > (Number(current.diamonds) || 0) ||
          ((Number(snapshot.diamonds) || 0) === (Number(current.diamonds) || 0) &&
           (Number(snapshot.live_minutes) || 0) > (Number(current.live_minutes) || 0))) {
        snapshotMap.set(key, { ...snapshot, username: cleanUsername(snapshot.username) });
      }
    }
    const allSnapshots = [...snapshotMap.values()];
    for (let index = 0; index < allSnapshots.length; index += 400) {
      const { error: snapshotError } = await supabase
        .from("creator_metric_snapshots")
        .upsert(allSnapshots.slice(index, index + 400), { onConflict: "username,period_start,period_end" });
      if (snapshotError) return setMessage(`Could not stack the upload history: ${snapshotError.message}`);
    }

    // Never let a historical backfill roll the live leaderboard backwards. Only update the
    // current totals when the newest selected export is at least as recent as what's stored.
    const latestImport = [...imports].sort((a, b) => a.range.end.localeCompare(b.range.end)).at(-1)!;
    const { data: existingTotals, error: existingTotalsError } = await supabase
      .from("creator_metrics")
      .select("username,data_period");
    if (existingTotalsError) return setMessage(`Upload history saved, but current totals could not be checked: ${existingTotalsError.message}`);

    const existingPeriodByUsername = new Map<string, string>();
    for (const item of existingTotals || []) {
      existingPeriodByUsername.set(cleanUsername(String(item.username || "")), String(item.data_period || ""));
    }

    const totalsToUpdate = latestImport.parsed.filter((item) => {
      const existingPeriod = existingPeriodByUsername.get(cleanUsername(item.username));
      const existingEnd = existingPeriod ? periodRange(existingPeriod)?.end : undefined;
      return !existingEnd || latestImport.range.end >= existingEnd;
    });

    if (totalsToUpdate.length) {
      const { error: creatorError } = await supabase.from("creator_metrics").upsert(totalsToUpdate, { onConflict: "username" });
      if (creatorError) return setMessage(`Upload history saved, but leaderboard totals failed: ${creatorError.message}`);
    }

    // Rebuild daily history inside Supabase from the complete saved snapshot stack.
    // This is date-agnostic: it works for every month/year because snapshots are
    // partitioned by username + period_start and compared by consecutive period_end dates.
    const { data: rebuildResult, error: rebuildError } = await supabase.rpc("rebuild_creator_daily_metrics");
    if (rebuildError) {
      return setMessage(
        rebuildError.message.includes("rebuild_creator_daily_metrics") || rebuildError.message.includes("function")
          ? "Uploads were saved, but automatic daily rebuilding is not installed yet. Run supabase/DAILY-AUTO-REBUILD-MIGRATION.sql once in Supabase, then upload again."
          : `Uploads were saved, but daily history could not be rebuilt: ${rebuildError.message}`,
      );
    }

    const rebuiltCount = Array.isArray(rebuildResult)
      ? Number((rebuildResult[0] as { rebuilt_rows?: number } | undefined)?.rebuilt_rows || 0)
      : Number((rebuildResult as { rebuilt_rows?: number } | null)?.rebuilt_rows || rebuildResult || 0);

    const selectedEnds = imports.map((item) => item.range.end).sort();
    const newestEnd = selectedEnds.at(-1)!;
    setMessage(
      `${imports.length} export${imports.length === 1 ? "" : "s"} stacked. Daily history rebuilt automatically across all saved months and years${rebuiltCount ? ` (${rebuiltCount.toLocaleString()} rows)` : ""}. Latest export ends ${newestEnd}.`,
    );

    await refresh();
    if (inputRef.current) inputRef.current.value = "";
  };

  const clearData = async () => {
    if (!supabase) return setMessage("Connect Supabase before clearing data.");
    const confirmed = window.confirm(
      "Clear all creator totals, daily boxes and stacked uploads? This cannot be undone. Your admin login and database setup will stay in place.",
    );
    if (!confirmed) return;
    setClearing(true);
    setMessage("Clearing creator data and stacked uploads…");
    const { error: snapshotError } = await supabase
      .from("creator_metric_snapshots")
      .delete()
      .neq("id", 0);
    if (snapshotError) {
      setClearing(false);
      return setMessage(snapshotError.message);
    }
    const { error: dailyError } = await supabase
      .from("creator_daily_metrics")
      .delete()
      .neq("id", 0);
    if (dailyError) {
      setClearing(false);
      return setMessage(dailyError.message);
    }
    const { error: creatorError } = await supabase
      .from("creator_metrics")
      .delete()
      .neq("id", 0);
    setClearing(false);
    if (creatorError) return setMessage(creatorError.message);
    setEditing(null);
    setMessage("All creator totals, daily boxes and stacked uploads have been cleared. Your admin login is unchanged.");
    await refresh();
  };

  const exportFile = () => {
    const rows = records.map((item) => ({
      "Creator's username": item.username,
      "Data period": item.data_period,
      Diamonds: item.diamonds,
      "LIVE duration": item.live_duration,
      "Valid go LIVE days": item.valid_live_days,
      "LIVE streams": item.live_streams || 0,
      Matches: item.matches || 0,
      Group: item.group_name || "",
      "Creator Network manager": item.manager || "",
      "Profile picture URL": item.avatar_url || "",
    }));
    const sheet = XLSX.utils.json_to_sheet(rows);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Creator data");
    XLSX.writeFile(book, `platinum-pulse-void-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const saveEdit = async (event: FormEvent) => {
    event.preventDefault();
    if (!editing || !supabase) return setMessage("Connect Supabase to save global changes.");
    const payload = { ...editing, live_duration: minutesToDuration(editing.live_minutes) };
    const { error } = await supabase.from("creator_metrics").upsert(payload, { onConflict: "username" });
    if (error) return setMessage(error.message);
    setEditing(null);
    setMessage(`@${payload.username} updated.`);
    await refresh();
  };

  return (
    <>
      <section className="page-heading"><div><p className="eyebrow">Secure controls</p><h1>Agency admin</h1><p>Import, review, correct and export creator performance from one place.</p></div><span className={`connection-pill ${configured ? "connected" : ""}`}><i />{configured ? "Supabase connected" : "Setup required"}</span></section>
      <AdminCampaignBanners />
      <ManagerAdmin />
      <section className="stats-grid admin-stats">
        <StatCard icon={Users} label="Creators" value={records.length.toLocaleString()} note="Tracked accounts" tone="blue" />
        <StatCard icon={Gem} label="Total diamonds" value={totals.diamonds.toLocaleString()} note="Across current data" tone="violet" />
        <StatCard icon={BarChart3} label="Total LIVE time" value={minutesToDuration(totals.minutes)} note={`${totals.days.toLocaleString()} valid days`} tone="cyan" />
      </section>
      <section className="admin-actions panel">
        <div><p className="eyebrow">Data centre</p><h2>Stack TikTok Creator Data uploads</h2><p>Every export is kept. The first upload is the baseline; each newer export is compared with the previous one to calculate the latest day&apos;s LIVE time and diamonds.</p></div>
        <div className="action-buttons">
          <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" multiple hidden onChange={(event) => event.target.files?.length && importFiles(event.target.files)} />
          <button className="primary-button" onClick={() => inputRef.current?.click()}><Upload /> Import creator data</button>
          <button className="secondary-button" onClick={exportFile}><Download /> Export current data</button>
          <button className="danger-button" onClick={clearData} disabled={clearing}><Eraser /> {clearing ? "Clearing…" : "Clear data"}</button>
        </div>
      </section>
      <p className="daily-import-help">Select one export or select all of your cumulative daily TikTok exports together. The hub sorts them by Data period and uses <b>today&apos;s cumulative total − yesterday&apos;s cumulative total</b> to rebuild every consecutive day. Uploads stay saved until you press <b>Clear data</b>. There are currently {dailyRecords.length.toLocaleString()} calculated daily rows.</p>
      {message && <div className="admin-message"><ShieldCheck />{message}</div>}
      {editing && (
        <form className="edit-panel panel" onSubmit={saveEdit}>
          <div><p className="eyebrow">Quick edit</p><h2>@{editing.username}</h2></div>
          <label>Diamonds<input type="number" value={editing.diamonds} onChange={(e) => setEditing({ ...editing, diamonds: number(e.target.value) })} /></label>
          <label>LIVE minutes<input type="number" value={editing.live_minutes} onChange={(e) => setEditing({ ...editing, live_minutes: number(e.target.value) })} /></label>
          <label>Valid days<input type="number" value={editing.valid_live_days} onChange={(e) => setEditing({ ...editing, valid_live_days: number(e.target.value) })} /></label>
          <label>Profile picture URL<input type="url" value={editing.avatar_url || ""} onChange={(e) => setEditing({ ...editing, avatar_url: e.target.value })} placeholder="Optional override" /></label>
          <button className="primary-button">Save update</button><button type="button" className="icon-button" onClick={() => setEditing(null)}><X /></button>
        </form>
      )}
      <section className="panel table-panel admin-table-panel">
        <div className="admin-table-top"><div><h2>Creator records</h2><p>{filtered.length} visible records</p></div><div className="search-box"><Search /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search usernames" /></div></div>
        <div className="admin-list">
          <div className="admin-list-head"><span>Creator</span><span>LIVE time</span><span>Diamonds</span><span>Valid days</span><span /></div>
          {filtered.map((item) => (
            <div className="admin-list-row" key={item.username}><span className="creator-cell"><i><Avatar record={item} /></i><span><b>@{item.username}</b><small>{item.group_name || "No group"}</small></span></span><span>{item.live_duration}</span><span>{item.diamonds.toLocaleString()}</span><span>{item.valid_live_days}</span><button className="icon-button" onClick={() => setEditing({ ...item })} aria-label={`Edit ${item.username}`}><Pencil /></button></div>
          ))}
        </div>
      </section>
    </>
  );
}

export default function Home() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [records, setRecords] = useState<CreatorMetric[]>([]);
  const [dailyRecords, setDailyRecords] = useState<DailyMetric[]>([]);
  const today = new Date();
  const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [current, setCurrent] = useState<View>(() => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("view") === "assistant" ? "assistant" : "dashboard");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [upcomingBattle, setUpcomingBattle] = useState<UpcomingBattle | null>(null);

  const refreshUpcomingBattle = async (nextProfile = profile) => {
    if (!nextProfile || nextProfile.role !== "creator") return setUpcomingBattle(null);
    setUpcomingBattle(await fetchUpcomingBattle(nextProfile.username));
  };

  const loadData = async (nextProfile = profile) => {
    if (!supabase || !nextProfile) return;
    if(nextProfile.role !== "creator"){const {data:session}=await supabase.auth.getSession();if(session.session){const {data:updated}=await supabase.from("profiles").select("*").eq("id",session.session.user.id).single();if(updated)setProfile(updated as Profile);}}
    const [{ data, error: loadError }, { data: dailyData, error: dailyError }] = await Promise.all([
      supabase.from("creator_metrics").select("*").order("diamonds", { ascending: false }),
      fetchAllDailyMetrics(),
    ]);
    if (loadError) setError(loadError.message);
    else setRecords((data || []) as CreatorMetric[]);
    if (dailyError) setError(dailyError.message);
    else setDailyRecords((dailyData || []) as DailyMetric[]);
  };

  const creatorLogin = async (username: string, restoring = false) => {
    setError("");
    if (!supabase) return setError("The database connection could not be started. Please contact management.");
    setBusy(true);
    const cleaned = cleanUsername(username);
    const [{ data, error: loadError }, { data: dailyData, error: dailyError }] = await Promise.all([
      supabase
        .from("creator_metrics")
        .select("*")
        .order("diamonds", { ascending: false }),
      fetchAllDailyMetrics(),
    ]);
    const creatorRecords = (data || []) as CreatorMetric[];
    const match = creatorRecords.find((item) => cleanUsername(item.username) === cleaned);
    if (loadError || !match) {
      setBusy(false);
      if (restoring) window.localStorage.removeItem("ppv_creator");
      return setError(loadError?.message || "That creator username is not on the leaderboard yet.");
    }
    if (dailyError) {
      setBusy(false);
      return setError(`Creator totals loaded, but daily data could not be read: ${dailyError.message}`);
    }
    const next: Profile = { username: match.username, display_name: match.username, role: "creator" };
    window.localStorage.setItem("ppv_creator", match.username);
    setRecords(creatorRecords);
    setDailyRecords((dailyData || []) as DailyMetric[]);
    setProfile(next);
    setCurrent("dashboard");
    setBusy(false);
    void refreshUpcomingBattle(next);
  };

  const adminLogin = async (code: string) => {
    setError("");
    if (!supabase) return setError("The database connection could not be started. Please contact management.");
    setBusy(true);
    try {
      const response = await fetch("/api/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const result = (await response.json()) as { access_token?: string; refresh_token?: string; user_id?: string; error?: string };
      if (!response.ok || !result.access_token || !result.refresh_token) {
        setBusy(false);
        return setError(result.error || "Owner login failed.");
      }
      const { data, error: sessionError } = await supabase.auth.setSession({
        access_token: result.access_token,
        refresh_token: result.refresh_token,
      });
      if (sessionError || !data.user) {
        setBusy(false);
        return setError(sessionError?.message || "Owner session could not be started.");
      }
      const {data: ownerProfile} = await supabase.from("profiles").select("*").eq("id", result.user_id).single();
        const next: Profile = ownerProfile || { username: "owner", display_name: "Owner", role: "admin" };
      window.localStorage.removeItem("ppv_creator");
      setProfile(next);
      setCurrent("admin");
      await loadData(next);
      setBusy(false);
    } catch (loginError) {
      setBusy(false);
      setError(loginError instanceof Error ? loginError.message : "Owner login failed.");
    }
  };

  const managerLogin = async (username: string, password: string) => {
    setError("");
    if (!supabase) return setError("The global database is not connected yet.");
    setBusy(true);
    try {
      const response = await fetch("/api/staff-login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) });
      const result = await response.json();
      if (!response.ok || !result.access_token || !result.refresh_token) { setBusy(false); return setError(result.error || "Manager login failed."); }
      const { error: sessionError } = await supabase.auth.setSession({ access_token: result.access_token, refresh_token: result.refresh_token });
      if (sessionError) { setBusy(false); return setError(sessionError.message); }
      const next = result.profile as Profile;
      window.localStorage.removeItem("ppv_creator"); setProfile(next); setCurrent("managerChat"); await loadData(next); setBusy(false);
    } catch (e) { setBusy(false); setError(e instanceof Error ? e.message : "Manager login failed."); }
  };

  const accessLogin = async (credential: string) => {
    const value = credential.trim();
    if (!value) return setError("Enter your TikTok username or staff access password.");
    setError("");
    if (!supabase) return setError("The global database is not connected yet.");
    setBusy(true);
    try {
      // Staff passwords are checked first. They are Supabase Auth passwords and are never stored in creator data.
      const staffResponse = await fetch("/api/staff-login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: value }) });
      const staffResult = await staffResponse.json();
      if (staffResponse.ok && staffResult.access_token && staffResult.refresh_token) {
        const { error: sessionError } = await supabase.auth.setSession({ access_token: staffResult.access_token, refresh_token: staffResult.refresh_token });
        if (sessionError) throw sessionError;
        const next = staffResult.profile as Profile;
        window.localStorage.removeItem("ppv_creator"); setProfile(next); setCurrent("managerChat"); await loadData(next); setBusy(false); return;
      }

      // The Owner uses the same single box with ADMIN_LOGIN_CODE.
      const ownerResponse = await fetch("/api/admin-login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: value }) });
      const ownerResult = await ownerResponse.json();
      if (ownerResponse.ok && ownerResult.access_token && ownerResult.refresh_token) {
        const { error: sessionError } = await supabase.auth.setSession({ access_token: ownerResult.access_token, refresh_token: ownerResult.refresh_token });
        if (sessionError) throw sessionError;
        const {data: ownerProfile} = await supabase.from("profiles").select("*").eq("id", ownerResult.user_id).single();
        const next: Profile = ownerProfile || { username: "owner", display_name: "Owner", role: "admin" };
        window.localStorage.removeItem("ppv_creator"); setProfile(next); setCurrent("admin"); await loadData(next); setBusy(false); return;
      }

      // Otherwise treat the value as a creator username and validate it against uploaded creator_metrics.
      setBusy(false);
      await creatorLogin(value);
    } catch (e) {
      setBusy(false);
      setError(e instanceof Error ? e.message : "Login failed.");
    }
  };

  const logout = async () => {
    if (supabase) await supabase.auth.signOut();
    window.localStorage.removeItem("ppv_creator");
    setProfile(null);
    setRecords([]);
    setDailyRecords([]);
    setUpcomingBattle(null);
    setCurrent("dashboard");
  };

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return;
      const { data: found } = await supabase!.from("profiles").select("*").eq("id", data.session.user.id).single();
      if (found) {
        const next = found as Profile;
        setProfile(next);
        if (next.role === "manager" && new URLSearchParams(window.location.search).get("view") !== "assistant") setCurrent("managerChat");
        await loadData(next);
      }
    });
    const savedCreator = window.localStorage.getItem("ppv_creator");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (savedCreator) void creatorLogin(savedCreator, true);
    // Login restoration only runs once when the app first opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!profile) return <Login onAccessLogin={accessLogin} busy={busy} error={error} />;

  const dailyMonths = dailyRecords.map((item) => item.metric_date.slice(0, 7));
  const uploadMonths = records
    .map((item) => periodRange(item.data_period)?.end.slice(0, 7))
    .filter((month): month is string => Boolean(month));
  const savedMonths = [...new Set([...dailyMonths, ...uploadMonths])].sort().reverse();
  const availableMonths = savedMonths.length ? savedMonths : [currentMonth];
  const effectiveMonth = availableMonths.includes(selectedMonth) ? selectedMonth : availableMonths[0];
  const monthlyRecords = monthlyRecordsFor(records, dailyRecords, effectiveMonth);
  const linkedUsername = profile.tiktok_username || (profile.role === "creator" ? profile.username : "");
  const currentRecord = monthlyRecords.find((item) => cleanUsername(item.username) === cleanUsername(linkedUsername)) || {...emptyEdit, username: linkedUsername};
  const dataProfile = {...profile, username: linkedUsername || profile.username};
  return (
    <AppShell profile={profile} records={records} current={current} setCurrent={(view) => {setCurrent(view);const url=new URL(window.location.href);if(view==="assistant")url.searchParams.set("view","assistant");else {url.searchParams.delete("view");url.searchParams.delete("assistantTab");}window.history.replaceState({},"",url.pathname+url.search);}} onLogout={logout}>
      {current === "dashboard" && profile.role !== "creator" && !profile.tiktok_username && <section className="panel"><h2>Link your TikTok account</h2><p>The owner can link your TikTok username in Manager accounts to show your personal performance here.</p></section>}
      {current === "dashboard" && <Dashboard profile={dataProfile} record={currentRecord} dailyRecords={dailyRecords.filter((item) => cleanUsername(item.username) === cleanUsername(profile.tiktok_username || profile.username))} availableMonths={availableMonths} selectedMonth={effectiveMonth} setSelectedMonth={setSelectedMonth} upcomingBattle={upcomingBattle} records={records} onViewBattles={() => setCurrent("arrangedBattles")} />}
      {current === "leaderboard" && <Leaderboard records={monthlyRecords} currentUsername={profile.username} availableMonths={availableMonths} selectedMonth={effectiveMonth} setSelectedMonth={setSelectedMonth} />}
      {current === "incentives" && <><Incentives record={currentRecord} /><Campaigns /></>}
      {current === "arrangedBattles" && <ArrangedBattles profile={profile} records={records} onBattlesChanged={() => refreshUpcomingBattle(profile)} />}
      {current === "managerChat" && <>{profile.role === "creator" ? <QuickManager profile={profile} /> : <StaffInbox profile={profile} />}<details className="panel combined-help"><summary><LifeBuoy size={18} /> Ban help</summary><BanHelp /></details></>}
      {current === "managerControl" && profile.role !== "creator" && <ManagerControl profile={profile} records={records} onBattlesChanged={() => refreshUpcomingBattle(profile)} />}
      {current === "assistant" && profile.role !== "creator" && <PlatinumAssistant profile={profile} onLinked={() => loadData(profile)} />}
      {current === "admin" && profile.role === "admin" && <Admin records={records} dailyRecords={dailyRecords} refresh={() => loadData(profile)} configured={supabaseConfigured} />}
    </AppShell>
  );
}
