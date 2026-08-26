"use client";

import {
  CalendarCheck2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Swords,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { avatarFor, cleanUsername, type CreatorMetric, type Profile } from "./shared";
import { supabase, supabaseConfigured } from "./supabase";

/* ================= TYPES ================= */

export type BattleType = "1v1";

export type BattleBooking = {
  id: number;
  username: string;
  battle_date: string; // YYYY-MM-DD
  battle_time: string; // HH:MM, 24h
  battle_type: BattleType;
  paired_match_id: number | null;
};

export type BattleMatch = {
  id: number;
  battle_type: BattleType;
  created_at: string;
};

export type BattleMatchEntry = {
  id: number;
  match_id: number;
  booking_id: number | null;
  username: string;
  team: "A" | "B";
  battle_date: string;
  battle_time: string;
};

export type MatchWithEntries = BattleMatch & { battle_match_entries: BattleMatchEntry[] };

export type UpcomingBattle = { match: BattleMatch; entries: BattleMatchEntry[] };

/* ================= HELPERS ================= */

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const BATTLE_TYPES: BattleType[] = ["1v1"];

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function dateStr(y: number, m: number, d: number) {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}
function timeLabel(t: string) {
  const [h, m] = t.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${pad(m)} ${period}`;
}
function timeOptions() {
  const out: string[] = [];
  for (let h = 0; h < 24; h++) for (let m = 0; m < 60; m += 15) out.push(`${pad(h)}:${pad(m)}`);
  return out;
}
const TIME_OPTIONS = timeOptions();

function photoFor(username: string, photos: Record<string, string>, records: CreatorMetric[]) {
  const key = cleanUsername(username);
  if (photos[key]) return photos[key];
  const record = records.find((item) => cleanUsername(item.username) === key);
  return avatarFor(record || { username });
}

function BattlePhoto({ username, photos, records, size = 28 }: { username: string; photos: Record<string, string>; records: CreatorMetric[]; size?: number }) {
  const [failed, setFailed] = useState(false);
  const src = photoFor(username, photos, records);
  if (failed) return <span className="battle-avatar-fallback" style={{ width: size, height: size, fontSize: size * 0.38 }}>{username.slice(0, 2).toUpperCase()}</span>;
  return <img className="battle-avatar" style={{ width: size, height: size }} src={src} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} />;
}

/* ================= UPCOMING BATTLE LOOKUP (used by the main dashboard) ================= */

export async function fetchUpcomingBattle(username: string): Promise<UpcomingBattle | null> {
  if (!supabase) return null;
  const now = new Date();
  const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const currentTime = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

  // Load the creator's future entries directly, then fetch the chosen match and all
  // of its entries separately. This mirrors the reliable Arranged Battles page loader
  // and avoids embedded-relation results disappearing on the dashboard.
  const { data: entryRows, error: entryError } = await supabase
    .from("battle_match_entries")
    .select("*")
    .eq("username", cleanUsername(username))
    .gte("battle_date", today)
    .order("battle_date", { ascending: true })
    .order("battle_time", { ascending: true });
  if (entryError) return null;

  const nextEntry = (((entryRows as BattleMatchEntry[] | null) || [])
    .find((entry) => entry.battle_date > today || (entry.battle_date === today && (entry.battle_time || "00:00") >= currentTime)));
  if (!nextEntry) return null;

  const [{ data: matchRow, error: matchError }, { data: allEntries, error: entriesError }] = await Promise.all([
    supabase.from("battle_matches").select("*").eq("id", nextEntry.match_id).single(),
    supabase.from("battle_match_entries").select("*").eq("match_id", nextEntry.match_id),
  ]);
  if (matchError || entriesError || !matchRow) return null;

  const entries = ((allEntries as BattleMatchEntry[] | null) || [])
    .sort((a, b) => a.team.localeCompare(b.team) || a.username.localeCompare(b.username));
  if (entries.length < 2) return null;
  return { match: matchRow as BattleMatch, entries };
}

export function UpcomingBattleCard({ battle, currentUsername, records }: { battle: UpcomingBattle; currentUsername: string; records: CreatorMetric[]; onView?: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const [posterPhotos, setPosterPhotos] = useState<Record<string,string>>({});
  const [posterGroup, setPosterGroup] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const mine = battle.entries.find((e) => cleanUsername(e.username) === cleanUsername(currentUsername));
  const teamA = battle.entries.filter((e) => e.team === "A");
  const teamB = battle.entries.filter((e) => e.team === "B");
  const left = teamA[0];
  const right = teamB[0];

  useEffect(() => {
    fetch(`/api/creator-affiliation?username=${encodeURIComponent(currentUsername)}`).then(r=>r.json()).then(x=>setPosterGroup(String(x.group||''))).catch(()=>{});
  }, [currentUsername, records]);

  useEffect(() => {
    if (!supabase || !left || !right) return;
    supabase.from("creator_battle_photos").select("username,photo_data").in("username", [cleanUsername(left.username), cleanUsername(right.username)]).then(({data}) => {
      const next: Record<string,string> = {};
      ((data || []) as {username:string;photo_data:string}[]).forEach(r => next[cleanUsername(r.username)] = r.photo_data);
      setPosterPhotos(next);
    });
  }, [left?.username, right?.username]);

  useEffect(() => {
    let cancelled = false;
    const loadImage = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = src;
    });
    const avatarSrc = (username: string) => {
      const saved = posterPhotos[cleanUsername(username)];
      if (saved) return saved;
      const record = records.find((r) => cleanUsername(r.username) === cleanUsername(username));
      const raw = avatarFor(record || { username });
      return `/api/battle-image?url=${encodeURIComponent(raw)}`;
    };
    const draw = async () => {
      if (!left || !right || !canvasRef.current) return;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d"); if (!ctx) return;
      try {
        const currentRecord = records.find((r) => cleanUsername(r.username) === cleanUsername(currentUsername));
        const creatorGroup = String(currentRecord?.group_name || posterGroup || "").trim().toLowerCase();
        // VOID creators use the VOID artwork. Everyone else (including creators with no group) uses Platinum Pulse.
        const useVoidPoster = creatorGroup.includes("void");
        const posterSrc = useVoidPoster ? "/void-arranged-battle-poster.jpg" : "/arranged-battle-poster.jpg";
        const [bg, leftImg, rightImg] = await Promise.all([
          loadImage(posterSrc), loadImage(avatarSrc(left.username)), loadImage(avatarSrc(right.username))
        ]);
        if (cancelled) return;
        canvas.width = bg.naturalWidth; canvas.height = bg.naturalHeight;
        ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);
        const circle = (img: HTMLImageElement, cx: number, cy: number, r: number) => {
          // Crop like CSS object-fit: cover, then clip just inside the neon ring.
          // Keeping the image a few pixels inside the ring leaves the original blue glow fully visible.
          ctx.save();
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.closePath();
          ctx.clip();

          const diameter = r * 2;
          const sourceW = img.naturalWidth || img.width;
          const sourceH = img.naturalHeight || img.height;
          const scale = Math.max(diameter / sourceW, diameter / sourceH);
          const drawW = sourceW * scale;
          const drawH = sourceH * scale;
          ctx.drawImage(img, cx - drawW / 2, cy - drawH / 2, drawW, drawH);
          ctx.restore();
        };
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        const date = mine?.battle_date || left.battle_date;
        const time = mine?.battle_time || left.battle_time;
        const [y,m,d] = date.split("-").map(Number);
        const dateText = `${d} ${MONTH_NAMES[m-1]} ${y}  •  ${timeLabel(time)}`;

        if (useVoidPoster) {
          // Measured from the supplied 1024 x 1536 VOID artwork.
          // Keep the photos inside the illuminated purple rings so the ring itself remains visible.
          circle(leftImg, 212, 935, 136);
          circle(rightImg, 807, 936, 136);
          ctx.font = "700 28px Arial"; ctx.fillStyle = "#f8f2ff";
          ctx.shadowColor = "#a855f7"; ctx.shadowBlur = 12;
          ctx.fillText(`@${left.username}`, 246, 1144, 315);
          ctx.fillText(`@${right.username}`, 778, 1144, 315);
          ctx.font = "700 30px Arial"; ctx.shadowBlur = 14;
          ctx.fillText(dateText.toUpperCase(), 512, 1332, 760);
        } else {
          // Measured directly from the supplied 710 x 1536 Platinum Pulse artwork.
          // Neon ring centres are ~189,1094 and ~523,1093 with an outer radius of ~73px.
          circle(leftImg, 189, 1094, 68);
          circle(rightImg, 523, 1093, 68);
          ctx.font = "700 21px Arial"; ctx.fillStyle = "#eef7ff";
          ctx.shadowColor = "#168cff"; ctx.shadowBlur = 8;
          ctx.fillText(`@${left.username}`, 189, 1191, 190);
          ctx.fillText(`@${right.username}`, 523, 1191, 190);
          ctx.shadowBlur = 10; ctx.font = "700 25px Arial";
          ctx.fillText(dateText.toUpperCase(), 355, 1303, 570);
        }
        setReady(true);
      } catch (e) { console.error("Could not render battle poster", e); setReady(false); }
    };
    draw(); return () => { cancelled = true; };
  }, [battle.match.id, currentUsername, records, left?.username, right?.username, mine?.battle_date, mine?.battle_time, posterPhotos, posterGroup]);

  const savePoster = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !ready) return;

    setSaveMessage("");
    const filename = `arranged-battle-${left?.username || "creator"}-vs-${right?.username || "creator"}.png`;

    try {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("Could not create poster image");

      const file = new File([blob], filename, { type: "image/png" });
      const shareData: ShareData = { files: [file], title: "Arranged battle poster" };

      if (typeof navigator.share === "function" && (!navigator.canShare || navigator.canShare(shareData))) {
        try {
          await navigator.share(shareData);
          setSaveMessage("Poster opened in your device save/share menu.");
          return;
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") return;
        }
      }

      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = filename;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      setSaveMessage("Poster saved/downloaded to this device.");
    } catch (error) {
      console.error("Could not save battle poster", error);
      setSaveMessage("Could not save automatically. Press and hold the poster image to save it.");
    }
  };

  if (!left || !right) return null;
  return (
    <details className="panel dashboard-dropdown battle-poster-panel">
      <summary className="dashboard-dropdown-summary">
        <div className="dropdown-summary-copy">
          <span className="dropdown-summary-icon"><Swords size={18} /></span>
          <div><p className="eyebrow">Upcoming arranged battle</p><h2>Your downloadable battle poster</h2><p>Tap to preview, then save the finished poster to your device.</p></div>
        </div>
        <span className="dropdown-chevron" aria-hidden="true" />
      </summary>
      <div className="dashboard-dropdown-content battle-poster-content">
        <canvas ref={canvasRef} className="battle-poster-canvas" aria-label="Your arranged battle poster" />
        <button type="button" className="primary-button battle-poster-download" onClick={savePoster} disabled={!ready}>Save poster</button>
        {saveMessage && <p className="battle-poster-save-message" role="status">{saveMessage}</p>}
      </div>
    </details>
  );
}
/* ================= MATCH CARD ================= */

function MatchCard({ match, entries, banner, isAdmin, onUnpair, photos, records }: { match: BattleMatch; entries: BattleMatchEntry[]; banner?: boolean; isAdmin: boolean; onUnpair: (matchId: number) => void; photos: Record<string, string>; records: CreatorMetric[] }) {
  const left = entries.find((e) => e.team === "A");
  const right = entries.find((e) => e.team === "B");
  if (!left || !right) return null;

  const date = left.battle_date || right.battle_date;
  const time = left.battle_time || right.battle_time;
  const [y, m, d] = date.split("-").map(Number);
  const dateLabel = `${MONTH_NAMES[m - 1]} ${d}, ${y}`;
  const when = new Date(`${date}T${time}:00`);
  const diff = when.getTime() - Date.now();
  const days = Math.ceil(diff / 86400000);
  const status = diff <= 0 ? "Battle time" : days <= 1 ? "Up next" : `${days} days away`;

  return (
    <div className={`battle-match-card battle-arena-card ${banner ? "banner featured" : ""}`}>
      {banner && <div className="battle-ribbon">Next battle</div>}
      <div className="battle-card-status"><span className="battle-status-dot" />{status}</div>
      <div className="battle-arena-matchup">
        <div className="battle-contender">
          <div className="battle-avatar-ring"><BattlePhoto username={left.username} photos={photos} records={records} size={banner ? 82 : 58} /></div>
          <strong>@{left.username}</strong>
          <span>LEFT</span>
        </div>
        <div className="battle-centre-stack">
          <span className="battle-one-v-one">1V1</span>
          <span className="battle-vs-mark">VS</span>
          <b>{timeLabel(time)}</b>
          <small>{dateLabel}</small>
        </div>
        <div className="battle-contender">
          <div className="battle-avatar-ring"><BattlePhoto username={right.username} photos={photos} records={records} size={banner ? 82 : 58} /></div>
          <strong>@{right.username}</strong>
          <span>RIGHT</span>
        </div>
      </div>
      {isAdmin && (
        <button type="button" className="icon-button battle-unpair-btn" onClick={() => onUnpair(match.id)} aria-label="Unpair this match"><X size={15} /> Unpair</button>
      )}
    </div>
  );
}
/* ================= MAIN COMPONENT ================= */

export default function ArrangedBattles({ profile, records, onBattlesChanged }: { profile: Profile; records: CreatorMetric[]; onBattlesChanged?: () => void }) {
  const isAdmin = profile.role === "admin";
  const canPair = profile.role === "admin" || profile.role === "manager";
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [bookings, setBookings] = useState<BattleBooking[]>([]);
  const [matches, setMatches] = useState<MatchWithEntries[]>([]);
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [dayModal, setDayModal] = useState<number | null>(null);
  const [bookingModal, setBookingModal] = useState<number | null>(null);
  const [bookingTime, setBookingTime] = useState("18:00");
  const bookingType: BattleType = "1v1";
  const [pairSelection, setPairSelection] = useState<Map<number, "A" | "B">>(new Map());
  const [showMoreBattles, setShowMoreBattles] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const loadAll = async () => {
    if (!supabase) return;

    // Load matches and entries separately. This is more reliable than depending on
    // PostgREST's embedded relationship result and guarantees freshly paired
    // battles appear in the Upcoming section immediately.
    const [bookingResult, matchResult, entryResult, photoResult] = await Promise.all([
      supabase.from("battle_bookings").select("*"),
      supabase.from("battle_matches").select("*").order("created_at", { ascending: false }),
      supabase.from("battle_match_entries").select("*").order("battle_date", { ascending: true }).order("battle_time", { ascending: true }),
      supabase.from("creator_battle_photos").select("*"),
    ]);

    const bookingRows = (bookingResult.data as BattleBooking[] | null) || [];
    const rawMatches = ((matchResult.data as BattleMatch[] | null) || []).filter((match) => match.battle_type === "1v1");
    const entryRows = (entryResult.data as BattleMatchEntry[] | null) || [];

    const entriesByMatch = new Map<number, BattleMatchEntry[]>();
    entryRows.forEach((entry) => {
      const list = entriesByMatch.get(entry.match_id) || [];
      list.push(entry);
      entriesByMatch.set(entry.match_id, list);
    });

    setBookings(bookingRows.filter((booking) => booking.battle_type === "1v1"));
    setMatches(rawMatches.map((match) => ({ ...match, battle_match_entries: entriesByMatch.get(match.id) || [] })));

    const photoMap: Record<string, string> = {};
    (((photoResult.data as { username: string; photo_data: string }[]) || [])).forEach((row) => {
      photoMap[cleanUsername(row.username)] = row.photo_data;
    });
    setPhotos(photoMap);
  };

  useEffect(() => {
    loadAll();
    const interval = setInterval(loadAll, 20000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const monthBookings = useMemo(() => {
    const prefix = `${viewYear}-${pad(viewMonth + 1)}-`;
    return bookings.filter((b) => b.battle_date.startsWith(prefix));
  }, [bookings, viewYear, viewMonth]);

  const myBookings = useMemo(
    () => monthBookings.filter((b) => cleanUsername(b.username) === cleanUsername(profile.username)).sort((a, b) => a.battle_date.localeCompare(b.battle_date) || a.battle_time.localeCompare(b.battle_time)),
    [monthBookings, profile.username],
  );

  const unpairedByType = useMemo(() => {
    const open = bookings.filter((b) => !b.paired_match_id).sort((a, b) => a.battle_date.localeCompare(b.battle_date) || a.battle_time.localeCompare(b.battle_time));
    return BATTLE_TYPES.map((type) => ({ type, items: open.filter((b) => b.battle_type === type) }));
  }, [bookings]);

  const upcomingMatches = useMemo(() => {
    const now = new Date();
    const matchDateTime = (match: MatchWithEntries) => {
      const entries = match.battle_match_entries || [];
      if (!entries.length) return Number.POSITIVE_INFINITY;
      return Math.min(...entries.map((entry) => {
        const value = new Date(`${entry.battle_date}T${entry.battle_time || "00:00"}:00`).getTime();
        return Number.isFinite(value) ? value : Number.POSITIVE_INFINITY;
      }));
    };

    return [...matches]
      .filter((match) => matchDateTime(match) >= now.getTime())
      .sort((a, b) => matchDateTime(a) - matchDateTime(b) || a.id - b.id);
  }, [matches]);

  // The featured "Next Up" battle is always the earliest upcoming battle by scheduled date + time.
  const banner = upcomingMatches[0];
  const restMatches = useMemo(() => upcomingMatches.slice(1), [upcomingMatches]);

  const notify = (text: string) => {
    setMessage(text);
    window.setTimeout(() => setMessage((current) => (current === text ? "" : current)), 4000);
  };

  const bookAvailability = async () => {
    if (dayModal === null || !supabase) return;
    setBusy(true);
    const { error } = await supabase.from("battle_bookings").insert({
      username: cleanUsername(profile.username),
      battle_date: dateStr(viewYear, viewMonth, dayModal),
      battle_time: bookingTime,
      battle_type: bookingType,
    });
    setBusy(false);
    if (error) return notify(error.message);
    setBookingModal(null);
    setDayModal(null);
    notify("Availability added.");
    await loadAll();
  };

  const removeBooking = async (booking: BattleBooking) => {
    if (!supabase) return;
    setBusy(true);
    if (booking.paired_match_id) {
      await supabase.from("battle_matches").delete().eq("id", booking.paired_match_id);
    }
    const { error } = await supabase.from("battle_bookings").delete().eq("id", booking.id);
    setBusy(false);
    if (error) return notify(error.message);
    notify("Availability removed.");
    await loadAll();
    onBattlesChanged?.();
  };

  const toggleTeam = (bookingId: number, team: "A" | "B") => {
    setPairSelection((prev) => {
      const next = new Map(prev);
      if (next.get(bookingId) === team) next.delete(bookingId);
      else next.set(bookingId, team);
      return next;
    });
  };

  const pairingSummary = (type: BattleType, items: BattleBooking[]) => {
    const selected = items.filter((b) => pairSelection.has(b.id));
    const countA = selected.filter((b) => pairSelection.get(b.id) === "A").length;
    const countB = selected.filter((b) => pairSelection.get(b.id) === "B").length;
    const expected = 1;
    const ready = countA === expected && countB === expected;
    return { selected, countA, countB, expected, ready };
  };

  const approvePairing = async (type: BattleType, items: BattleBooking[]) => {
    if (!supabase) return;
    const { selected, ready } = pairingSummary(type, items);
    if (!ready) return;

    const left = selected.find((b) => pairSelection.get(b.id) === "A");
    const right = selected.find((b) => pairSelection.get(b.id) === "B");
    if (!left || !right) return notify("Choose one LEFT creator and one RIGHT creator.");
    if (cleanUsername(left.username) === cleanUsername(right.username)) return notify("A creator cannot battle themselves.");
    if (left.battle_date !== right.battle_date || left.battle_time !== right.battle_time) {
      return notify("Both creators must be booked for the same date and time before pairing.");
    }

    setBusy(true);

    // Re-check the two bookings immediately before pairing so stale admin state
    // cannot create a match from bookings that were already paired elsewhere.
    const { data: freshBookings, error: freshError } = await supabase
      .from("battle_bookings")
      .select("*")
      .in("id", [left.id, right.id]);
    if (freshError) { setBusy(false); return notify(freshError.message); }
    const fresh = (freshBookings as BattleBooking[] | null) || [];
    if (fresh.length !== 2 || fresh.some((b) => b.paired_match_id)) {
      setBusy(false);
      await loadAll();
      return notify("One of these bookings has already been paired. Refresh and choose again.");
    }

    const { data: matchRow, error: matchError } = await supabase
      .from("battle_matches")
      .insert({ battle_type: type })
      .select()
      .single();
    if (matchError || !matchRow) {
      setBusy(false);
      return notify(matchError?.message || "Could not create the match.");
    }

    const matchId = (matchRow as BattleMatch).id;
    const entryRows = [left, right].map((b) => ({
      match_id: matchId,
      booking_id: b.id,
      username: cleanUsername(b.username),
      team: pairSelection.get(b.id),
      battle_date: b.battle_date,
      battle_time: b.battle_time,
    }));

    const { error: entryError } = await supabase.from("battle_match_entries").insert(entryRows);
    if (entryError) {
      // Do not leave an empty match behind if inserting its creators fails.
      await supabase.from("battle_matches").delete().eq("id", matchId);
      setBusy(false);
      return notify(entryError.message);
    }

    const { error: updateError } = await supabase
      .from("battle_bookings")
      .update({ paired_match_id: matchId })
      .in("id", [left.id, right.id]);
    if (updateError) {
      await supabase.from("battle_matches").delete().eq("id", matchId);
      setBusy(false);
      return notify(updateError.message);
    }

    setPairSelection(new Map());
    await loadAll();
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    if (token) {
      const when = `${left.battle_date} at ${timeLabel(left.battle_time)}`;
      await Promise.all([left.username, right.username].map((creator) => fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ creator, title: "New arranged battle", body: `Your arranged battle has been confirmed for ${when}.`, link_view: "arrangedBattles" }),
      })));
    }
    setBusy(false);
    notify("Arranged battle approved and posted.");
    onBattlesChanged?.();
  };

  const unpairMatch = async (matchId: number) => {
    if (!supabase) return;
    if (!window.confirm("Unpair this arranged battle? Both creators go back to open availability.")) return;
    setBusy(true);
    const { error } = await supabase.from("battle_matches").delete().eq("id", matchId);
    setBusy(false);
    if (error) return notify(error.message);
    notify("Match unpaired.");
    await loadAll();
    onBattlesChanged?.();
  };

  const clearMonth = async () => {
    if (!supabase) return;
    const label = `${MONTH_NAMES[viewMonth]} ${viewYear}`;
    if (!window.confirm(`Clear every arranged-battle booking for ${label}? This can't be undone.`)) return;
    if (monthBookings.length === 0) return notify(`Nothing to clear for ${label}.`);
    setBusy(true);
    const matchIds = [...new Set(monthBookings.filter((b) => b.paired_match_id).map((b) => b.paired_match_id as number))];
    if (matchIds.length) await supabase.from("battle_matches").delete().in("id", matchIds);
    const { error } = await supabase.from("battle_bookings").delete().in("id", monthBookings.map((b) => b.id));
    setBusy(false);
    if (error) return notify(error.message);
    notify(`Cleared ${label}.`);
    await loadAll();
    onBattlesChanged?.();
  };

  const resizeToDataUrl = (file: File, size: number) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("read-failed"));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error("image-failed"));
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext("2d");
          if (!ctx) return reject(new Error("no-canvas"));
          const scale = Math.max(size / img.width, size / img.height);
          const w = img.width * scale;
          const h = img.height * scale;
          ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
          resolve(canvas.toDataURL("image/jpeg", 0.82));
        };
        img.src = String(reader.result);
      };
      reader.readAsDataURL(file);
    });

  const uploadPhoto = async (file: File) => {
    if (!supabase) return;
    setBusy(true);
    try {
      const dataUrl = await resizeToDataUrl(file, 512);
      const { error } = await supabase.from("creator_battle_photos").upsert({ username: cleanUsername(profile.username), photo_data: dataUrl }, { onConflict: "username" });
      if (error) throw error;
      notify("Battle photo updated.");
      await loadAll();
    } catch {
      notify("Couldn't use that photo — try a smaller image.");
    } finally {
      setBusy(false);
    }
  };

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const isCurrentRealMonth = viewYear === today.getFullYear() && viewMonth === today.getMonth();

  if (!supabaseConfigured) {
    return (
      <>
        <section className="page-heading"><div><p className="eyebrow">Book creator vs. creator fights</p><h1>Arranged Battles</h1><p>Connect Supabase to start booking arranged battles.</p></div></section>
      </>
    );
  }

  return (
    <>
      <section className="page-heading">
        <div><p className="eyebrow">1v1 creator battle arena</p><h1>Arranged Battles</h1><p>Book a time, get paired, then show up ready. Every arranged battle is now a clean 1v1.</p></div>
        <button type="button" className="secondary-button" onClick={() => loadAll()} disabled={busy}><RefreshCw size={16} /> Refresh</button>
      </section>

      <section className="panel battle-matches-panel">
        <div className="battle-section-heading"><div><p className="eyebrow">Battle arena</p><h3>Upcoming 1v1 battles</h3><p className="panel-sub">The next matchup takes centre stage. More confirmed battles sit underneath.</p></div><div className="battle-live-pill"><span></span>{upcomingMatches.length} upcoming</div></div>
        {upcomingMatches.length === 0 && <div className="empty-state">No upcoming arranged battles paired yet.</div>}
        {banner && (
          <>
            <MatchCard match={banner} entries={banner.battle_match_entries} banner isAdmin={isAdmin} onUnpair={unpairMatch} photos={photos} records={records} />
            {restMatches.length > 0 && (
              <div className={`battle-more-wrap ${showMoreBattles ? "open" : ""}`}>
                <button
                  type="button"
                  className="battle-more-toggle"
                  onClick={() => setShowMoreBattles((open) => !open)}
                  aria-expanded={showMoreBattles}
                >
                  <span className="battle-more-copy">
                    <span className="battle-more-kicker">More upcoming battles</span>
                    <strong>{restMatches.length} more confirmed {restMatches.length === 1 ? "battle" : "battles"}</strong>
                  </span>
                  <span className="battle-more-action">
                    {showMoreBattles ? "Hide battles" : "View battles"}
                    <ChevronDown size={19} />
                  </span>
                </button>

                <div className="battle-more-content" aria-hidden={!showMoreBattles}>
                  <div className="battle-upcoming-grid">
                    {restMatches.map((m) => (
                      <MatchCard key={m.id} match={m} entries={m.battle_match_entries} isAdmin={isAdmin} onUnpair={unpairMatch} photos={photos} records={records} />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      <div className="month-nav">
        <button type="button" className="icon-button" onClick={() => { if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); } else setViewMonth((m) => m - 1); }}><ChevronLeft /></button>
        <div className="month-label">{MONTH_NAMES[viewMonth]} {viewYear}</div>
        <button type="button" className="icon-button" onClick={() => { if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); } else setViewMonth((m) => m + 1); }}><ChevronRight /></button>
        {isAdmin && <button type="button" className="danger-button" onClick={clearMonth} disabled={busy}><Trash2 size={16} /> Clear month</button>}
      </div>

      {message && <div className="admin-message"><CalendarCheck2 />{message}</div>}

      <div className="battle-calendar">
        {DOW.map((d) => <div key={d} className="battle-dow">{d}</div>)}
        {Array.from({ length: firstDay }, (_, i) => <div key={`empty-${i}`} className="battle-day-cell empty" />)}
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
          const dayBookings = monthBookings.filter((b) => Number(b.battle_date.slice(8, 10)) === day);
          const mine = dayBookings.some((b) => cleanUsername(b.username) === cleanUsername(profile.username));
          const paired = dayBookings.some((b) => b.paired_match_id);
          const isToday = isCurrentRealMonth && day === today.getDate();
          return (
            <button type="button" key={day} className={`battle-day-cell ${isToday ? "today" : ""}`} onClick={() => setDayModal(day)}>
              <span className="battle-day-num">{day}</span>
              {dayBookings.length > 0 && (
                <span className={`battle-day-badge ${paired ? "paired" : ""} ${mine ? "mine" : ""}`}>{dayBookings.length} booked</span>
              )}
            </button>
          );
        })}
      </div>

      {!isAdmin && (
        <section className="panel">
          <h3>My availability</h3>
          <p className="panel-sub">Slots you&apos;ve booked this month. Remove anything you no longer need.</p>
          {myBookings.length === 0 && <div className="empty-state">No availability booked for {MONTH_NAMES[viewMonth]} yet — tap a day on the calendar to add a slot.</div>}
          {myBookings.map((b) => {
            const [, , d] = b.battle_date.split("-").map(Number);
            return (
              <div key={b.id} className="battle-slot-row">
                <div className="battle-slot-meta"><b>{MONTH_NAMES[viewMonth]} {d}</b> · {timeLabel(b.battle_time)} · {b.paired_match_id ? <span className="tag paired">Paired ✓</span> : <span className="tag">Unpaired</span>}</div>
                <button type="button" className="danger-button" onClick={() => removeBooking(b)} disabled={busy}>Remove</button>
              </div>
            );
          })}
        </section>
      )}

      {!isAdmin && (
        <section className="panel">
          <h3>My battle photo</h3>
          <p className="panel-sub">Upload a photo so people recognise you on the arranged battle cards.</p>
          <div className="battle-photo-row">
            <BattlePhoto username={profile.username} photos={photos} records={records} size={56} />
            <input ref={photoInputRef} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && uploadPhoto(e.target.files[0])} />
            <button type="button" className="secondary-button" onClick={() => photoInputRef.current?.click()}><Upload size={16} /> Upload photo</button>
          </div>
        </section>
      )}

      {canPair && (
        <section className="panel">
          <h3>Pair a 1v1 battle</h3>
          <p className="panel-sub">Choose one creator for the left side and one for the right side, then approve the 1v1 matchup.</p>
          {unpairedByType.map(({ type, items }) => {
            const summary = pairingSummary(type, items);
            return (
              <div className="battle-type-section" key={type}>
                <div className="battle-type-title"><Users size={16} /> Open creators <span className="count">{items.length} available</span></div>
                {items.length === 0 && <div className="empty-state">No open 1v1 availability right now.</div>}
                {items.map((b) => {
                  const [y, m, d] = b.battle_date.split("-").map(Number);
                  const team = pairSelection.get(b.id);
                  return (
                    <div key={b.id} className={`battle-pair-row ${team === "A" ? "checked-a" : team === "B" ? "checked-b" : ""}`}>
                      <BattlePhoto username={b.username} photos={photos} records={records} size={24} />
                      <div className="battle-pair-meta"><b>@{b.username}</b> — {MONTH_NAMES[m - 1]} {d}, {y} · {timeLabel(b.battle_time)}</div>
                      <div className="battle-team-toggle">
                        <button type="button" className={`battle-team-btn a ${team === "A" ? "active" : ""}`} onClick={() => toggleTeam(b.id, "A")}>LEFT</button>
                        <button type="button" className={`battle-team-btn b ${team === "B" ? "active" : ""}`} onClick={() => toggleTeam(b.id, "B")}>RIGHT</button>
                      </div>
                    </div>
                  );
                })}
                <div className="battle-approve-bar">
                  <span className={`battle-approve-msg ${summary.selected.length > 0 && !summary.ready ? "err" : ""}`}>
                    {summary.selected.length === 0
                      ? "Choose one creator for LEFT and one for RIGHT to build a matchup."
                      : `LEFT (${summary.countA}) vs RIGHT (${summary.countB}) — choose one creator on each side.`}
                  </span>
                  <button type="button" className="primary-button" disabled={!summary.ready || busy} onClick={() => approvePairing(type, items)}>Confirm 1v1</button>
                </div>
              </div>
            );
          })}
        </section>
      )}

      {dayModal !== null && (
        <div className="overlay show" onClick={(e) => { if (e.target === e.currentTarget) setDayModal(null); }}>
          <div className="modal">
            <h3>{MONTH_NAMES[viewMonth]} {dayModal}, {viewYear}</h3>
            <p className="modal-sub">Everyone booked in on this day so far.</p>
            {monthBookings.filter((b) => Number(b.battle_date.slice(8, 10)) === dayModal).length === 0 && (
              <div className="empty-state">No one&apos;s booked this day yet — be the first.</div>
            )}
            {monthBookings.filter((b) => Number(b.battle_date.slice(8, 10)) === dayModal).sort((a, b) => a.battle_time.localeCompare(b.battle_time)).map((b) => (
              <div key={b.id} className="battle-dayview-row">
                <BattlePhoto username={b.username} photos={photos} records={records} size={28} />
                <div className="battle-pair-meta"><b>@{b.username}</b> · {timeLabel(b.battle_time)} {b.paired_match_id ? <span className="tag paired">Paired ✓</span> : null}</div>
              </div>
            ))}
            <div className="modal-actions">
              <button type="button" className="secondary-button" onClick={() => setDayModal(null)}>Close</button>
              {!isAdmin && <button type="button" className="primary-button" onClick={() => { setBookingModal(dayModal); }}>Book your availability</button>}
            </div>
          </div>
        </div>
      )}

      {bookingModal !== null && (
        <div className="overlay show" onClick={(e) => { if (e.target === e.currentTarget) setBookingModal(null); }}>
          <div className="modal">
            <h3>Book 1v1 availability</h3>
            <p className="modal-sub">{MONTH_NAMES[viewMonth]} {bookingModal}, {viewYear} — as @{profile.username}</p>
            <div className="form-group">
              <label className="field-label">Battle time</label>
              <select value={bookingTime} onChange={(e) => setBookingTime(e.target.value)}>
                {TIME_OPTIONS.map((t) => <option key={t} value={t}>{timeLabel(t)}</option>)}
              </select>
            </div>
            <div className="battle-format-note"><Swords size={16} /><div><b>1v1 battle</b><span>All arranged battles are creator vs creator.</span></div></div>
            <div className="modal-actions">
              <button type="button" className="secondary-button" onClick={() => setBookingModal(null)}>Cancel</button>
              <button type="button" className="primary-button" disabled={busy} onClick={bookAvailability}>Add availability</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
