"use client";

import {useEffect} from "react";

type AppRole = "creator" | "manager" | "admin";
type NavKind = "dashboard" | "leaderboard" | "incentives" | "arranged" | "managerView" | "managerControl" | "assistant" | "managers" | "admin" | "unknown";
type AdminPanel = "overview" | "records" | "campaigns";

const BAN_HELP_URL = "https://api.whatsapp.com/send/?phone=%2B447413269978&text&type=phone_number&app_absent=0&wame_ctl=1";

function currentRole(): AppRole | null {
  if (document.querySelector(".login-page")) return null;
  const role = (document.querySelector<HTMLElement>(".profile-mini small")?.textContent || "").trim().toLowerCase();
  if (role.includes("agency owner")) return "admin";
  if (role === "manager") return "manager";
  if (document.querySelector(".app-shell")) return "creator";
  return null;
}

function navButtons() {
  return [...document.querySelectorAll<HTMLButtonElement>(".sidebar nav button, .mobile-tabs button")];
}

function spanText(button: HTMLButtonElement) {
  return (button.querySelector("span")?.textContent || button.textContent || "").trim().toLowerCase();
}

function rememberAndRestoreLabel(button: HTMLButtonElement) {
  const span = button.querySelector<HTMLElement>("span");
  if (!span) return;
  if (!button.dataset.roleOriginalLabel) button.dataset.roleOriginalLabel = span.textContent || "";
  else if (span.textContent !== button.dataset.roleOriginalLabel) span.textContent = button.dataset.roleOriginalLabel;
}

function kindOf(button: HTMLButtonElement): NavKind {
  const label = spanText(button);
  if (label === "my" || label === "my progress" || label === "progress") return "dashboard";
  if (label.includes("leaderboard")) return "leaderboard";
  if (label.includes("incentive") || label.includes("campaign")) return "incentives";
  if (label === "arranged" || label.includes("arranged battle")) return "arranged";
  if (label === "message" || label.includes("message manager") || label.includes("ban help") || label === "manager view") return "managerView";
  if (label === "manager" || label === "control" || label.includes("manager control")) return "managerControl";
  if (label === "platinum" || label === "assistant" || label.includes("platinum assistant")) return "assistant";
  if (label === "managers" || label.includes("manager accounts")) return "managers";
  if (label === "admin" || label.includes("agency admin")) return "admin";
  return "unknown";
}

function setHidden(button: HTMLButtonElement, hidden: boolean) {
  button.classList.toggle("role-hidden-nav", hidden);
  if (hidden) {
    button.setAttribute("aria-hidden", "true");
    button.setAttribute("tabindex", "-1");
  } else {
    button.removeAttribute("aria-hidden");
    button.removeAttribute("tabindex");
  }
}

function configureRoleNavigation(role: AppRole) {
  const buttons = navButtons();
  for (const button of buttons) rememberAndRestoreLabel(button);

  for (const button of buttons) {
    const kind = kindOf(button);
    let visible = true;

    if (role === "creator") visible = kind === "dashboard" || kind === "leaderboard";
    if (role === "manager") visible = kind === "managerView" || kind === "managerControl";
    if (role === "admin") visible = kind === "admin" || kind === "assistant" || kind === "leaderboard";

    setHidden(button, !visible);

    const span = button.querySelector<HTMLElement>("span");
    if (!span || !visible) continue;

    if (role === "creator" && kind === "dashboard" && button.closest(".mobile-tabs")) span.textContent = "My Progress";
    if (role === "manager" && kind === "managerView") span.textContent = "Manager View";
    if (role === "manager" && kind === "managerControl" && button.closest(".mobile-tabs")) span.textContent = "Control";
    if (role === "admin" && kind === "assistant" && button.closest(".mobile-tabs")) span.textContent = "Assistant";
  }
}

function navButton(kind: NavKind) {
  for (const button of navButtons()) {
    rememberAndRestoreLabel(button);
    if (kindOf(button) === kind) return button;
  }
  return null;
}

function openView(kind: NavKind, focusSelector?: string) {
  const button = navButton(kind);
  if (!button) return;
  button.click();

  if (!focusSelector) {
    window.requestAnimationFrame(() => window.scrollTo({top: 0, behavior: "smooth"}));
    return;
  }

  let tries = 0;
  const focus = () => {
    const target = document.querySelector<HTMLElement>(focusSelector);
    if (target) {
      target.scrollIntoView({behavior: "smooth", block: "start"});
      return;
    }
    tries += 1;
    if (tries < 8) window.setTimeout(focus, 70);
  };
  window.setTimeout(focus, 80);
}

function setRoleClasses(role: AppRole | null) {
  document.body.classList.remove(
    "role-creator", "role-manager", "role-admin",
    "creator-nav-simplified", "manager-nav-simplified", "owner-nav-simplified", "admin-nav-simplified",
  );

  if (!role) return;
  document.body.classList.add(`role-${role}`);
  if (role === "creator") document.body.classList.add("creator-nav-simplified");
  if (role === "manager") document.body.classList.add("manager-nav-simplified");
  if (role === "admin") document.body.classList.add("owner-nav-simplified", "admin-nav-simplified");
}

/* ---------------- Creator ---------------- */

function creatorHeading() {
  return [...document.querySelectorAll<HTMLElement>(".page-heading")].find((section) => {
    const eyebrow = section.querySelector<HTMLElement>(".eyebrow")?.textContent?.trim().toLowerCase() || "";
    const title = section.querySelector<HTMLElement>("h1")?.textContent?.trim().toLowerCase() || "";
    return eyebrow === "creator overview" || eyebrow === "my overview" || title.startsWith("your pulse,") || title === "welcome back";
  }) || null;
}

function ensureCreatorDashboard() {
  const heading = creatorHeading();
  if (!heading) return;
  heading.classList.add("creator-welcome-heading");

  const eyebrow = heading.querySelector<HTMLElement>(".eyebrow");
  const title = heading.querySelector<HTMLElement>("h1");
  const intro = heading.querySelector<HTMLElement>("div > p:last-child");
  if (eyebrow) eyebrow.textContent = "MY OVERVIEW";
  if (title) title.textContent = "Welcome back";
  if (intro) intro.textContent = "Your progress, campaigns and support are all here in one place.";

  const pills = heading.querySelector<HTMLElement>(".heading-pills");
  if (!pills) return;

  const progressTitle = document.querySelector<HTMLElement>(".progress-panel .panel-heading h2");
  const progressEyebrow = document.querySelector<HTMLElement>(".progress-panel .panel-heading .eyebrow");
  const tierPill = pills.querySelector<HTMLElement>(".tier-pill");
  const tierMatch = progressTitle?.textContent?.match(/(?:Progress|Grinding) towards Tier\s+(\d+)/i);
  if (tierMatch) {
    if (progressTitle) progressTitle.textContent = `Grinding towards Tier ${tierMatch[1]}`;
    if (progressEyebrow) progressEyebrow.textContent = "Current tier goal";
    if (tierPill) tierPill.textContent = `Grinding Tier ${tierMatch[1]}`;
  }

  const periodPill = pills.querySelector<HTMLElement>(".period-pill");
  if (periodPill) {
    periodPill.classList.add("creator-header-action");
    periodPill.setAttribute("role", "button");
    periodPill.setAttribute("tabindex", "0");
    periodPill.dataset.roleAction = "creator-month";
  }

  if (!pills.querySelector(".creator-message-manager-top")) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "creator-message-manager-top";
    button.dataset.roleAction = "creator-message";
    button.innerHTML = '<span class="creator-message-dot" aria-hidden="true"></span><span>Message manager</span>';
    pills.appendChild(button);
  }

  if (!pills.querySelector(".creator-book-battle-top")) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "creator-book-battle-top";
    button.dataset.roleAction = "creator-battle";
    button.innerHTML = '<span class="creator-battle-mark" aria-hidden="true">⚔</span><span>Book arranged battle</span>';
    pills.appendChild(button);
  }

  if (!pills.querySelector(".creator-ban-help-top")) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "creator-ban-help-top";
    button.dataset.roleAction = "creator-ban";
    button.innerHTML = '<span class="creator-ban-mark" aria-hidden="true">!</span><span>Ban help</span>';
    pills.appendChild(button);
  }
}

function openCreatorMonth() {
  const details = document.querySelector<HTMLDetailsElement>(".daily-panel");
  if (!details) return;
  details.open = true;
  window.requestAnimationFrame(() => details.scrollIntoView({behavior: "smooth", block: "start"}));
}

/* ---------------- Admin ---------------- */

function adminHeading() {
  return [...document.querySelectorAll<HTMLElement>(".page-heading")].find((section) => {
    const title = section.querySelector<HTMLElement>("h1")?.textContent?.trim().toLowerCase() || "";
    return title === "agency admin" || section.classList.contains("admin-overview-heading");
  }) || null;
}

function setAdminHeading(panel: AdminPanel) {
  const heading = adminHeading();
  if (!heading) return;
  heading.classList.add("admin-overview-heading");
  const eyebrow = heading.querySelector<HTMLElement>(".eyebrow");
  const title = heading.querySelector<HTMLElement>("h1");
  const description = heading.querySelector<HTMLElement>("div > p:last-child");

  const copy = panel === "records"
    ? {eyebrow: "ADMIN", title: "Creator records", description: "Search, review and edit creator performance in one focused view."}
    : panel === "campaigns"
      ? {eyebrow: "ADMIN", title: "Campaign banners", description: "Upload and manage the campaign artwork creators see in their dashboard."}
      : {eyebrow: "ADMIN OVERVIEW", title: "Agency admin", description: "Your agency control centre. Everything important is one tap away."};

  if (eyebrow) eyebrow.textContent = copy.eyebrow;
  if (title) title.textContent = copy.title;
  if (description) description.textContent = copy.description;
}

function setAdminPanel(panel: AdminPanel) {
  document.body.classList.toggle("admin-panel-records-open", panel === "records");
  document.body.classList.toggle("admin-panel-campaigns-open", panel === "campaigns");
  setAdminHeading(panel);

  const target = panel === "records"
    ? document.querySelector<HTMLElement>(".admin-table-panel")
    : panel === "campaigns"
      ? document.querySelector<HTMLElement>(".campaign-admin-panel")
      : adminHeading();
  if (target) window.requestAnimationFrame(() => target.scrollIntoView({behavior: "smooth", block: "start"}));
}

function ensureAdminBack(container: Element | null) {
  if (!container || container.querySelector(".admin-back-overview")) return;
  const button = document.createElement("button");
  button.type = "button";
  button.className = "admin-back-overview";
  button.dataset.roleAction = "admin-overview";
  button.textContent = "Back to overview";
  container.appendChild(button);
}

function ensureAdminHome() {
  const heading = adminHeading();
  if (!heading) return;
  heading.classList.add("admin-overview-heading");
  setAdminHeading(document.body.classList.contains("admin-panel-records-open") ? "records" : document.body.classList.contains("admin-panel-campaigns-open") ? "campaigns" : "overview");

  let compact = heading.querySelector<HTMLElement>(".admin-quick-actions");
  if (!compact) {
    compact = document.createElement("div");
    compact.className = "admin-quick-actions";
    compact.innerHTML = `
      <button type="button" data-role-action="admin-import"><span>Import creators</span></button>
      <button type="button" data-role-action="admin-campaigns"><span>Campaign banners</span></button>`;
    heading.appendChild(compact);
  }

  if (!document.querySelector(".admin-tool-grid")) {
    const grid = document.createElement("section");
    grid.className = "admin-tool-grid";
    grid.innerHTML = `
      <button type="button" data-role-action="admin-records">
        <span class="admin-tool-kicker">CREATORS</span><strong>Creator records</strong><small>Search, edit and review uploaded creator performance.</small><b>Open records →</b>
      </button>
      <button type="button" data-role-action="admin-managers">
        <span class="admin-tool-kicker">TEAM</span><strong>Manager accounts</strong><small>Create managers, link TikTok accounts and manage access.</small><b>Open managers →</b>
      </button>
      <button type="button" data-role-action="admin-battles">
        <span class="admin-tool-kicker">LIVE</span><strong>Arranged battles</strong><small>Review bookings and keep the battle schedule organised.</small><b>Open battles →</b>
      </button>
      <button type="button" data-role-action="admin-support">
        <span class="admin-tool-kicker">SUPPORT</span><strong>Creator support inbox</strong><small>Open creator messages and ban-help conversations.</small><b>Open support →</b>
      </button>`;
    heading.insertAdjacentElement("afterend", grid);
  }

  ensureAdminBack(document.querySelector(".campaign-admin-panel .quick-chat-head"));
  ensureAdminBack(document.querySelector(".admin-table-panel .admin-table-top"));
}

function triggerAdminImport() {
  document.querySelector<HTMLInputElement>(".admin-actions input[type='file']")?.click();
}

/* ---------------- Manager ---------------- */

function ensureManagerHome() {
  const content = document.querySelector<HTMLElement>("main.content");
  if (!content || !content.querySelector(".combined-help")) return;
  if (content.querySelector(".manager-view-redirects")) return;

  const name = document.querySelector<HTMLElement>(".profile-mini strong")?.textContent?.trim() || "Manager";
  const section = document.createElement("section");
  section.className = "panel manager-view-redirects";
  section.innerHTML = `
    <div class="manager-view-copy">
      <p class="eyebrow">MANAGER VIEW</p>
      <h1>Welcome back, ${name.replace(/[<>]/g, "")}</h1>
      <p>Keep creator support in one place and open the rest of your tools only when you need them.</p>
    </div>
    <div class="manager-view-actions">
      <button type="button" data-role-action="manager-progress"><span>My progress</span><small>Your own linked LIVE performance</small></button>
      <button type="button" data-role-action="manager-leaderboard"><span>Leaderboard</span><small>Creator rankings and movement</small></button>
      <button type="button" data-role-action="manager-campaigns"><span>Campaigns & incentives</span><small>Current creator opportunities and targets</small></button>
      <button type="button" data-role-action="manager-battles"><span>Arranged battles</span><small>Open bookings and battle tools</small></button>
      <button type="button" data-role-action="manager-assistant"><span>Platinum Assistant</span><small>Open agency assistant tools</small></button>
    </div>`;
  content.prepend(section);
}

/* ---------------- Shared controller ---------------- */

function clearRoleUi() {
  setRoleClasses(null);
  for (const button of navButtons()) {
    rememberAndRestoreLabel(button);
    setHidden(button, false);
  }
  document.body.classList.remove("admin-panel-records-open", "admin-panel-campaigns-open");
}

function applyRoleExperience() {
  const role = currentRole();
  if (!role) {
    clearRoleUi();
    return;
  }

  setRoleClasses(role);
  configureRoleNavigation(role);

  if (role !== "manager") document.querySelector(".manager-view-redirects")?.remove();
  if (role !== "admin") {
    document.body.classList.remove("admin-panel-records-open", "admin-panel-campaigns-open");
    document.querySelector(".admin-tool-grid")?.remove();
  }

  if (role === "creator") ensureCreatorDashboard();
  if (role === "manager") ensureManagerHome();
  if (role === "admin") ensureAdminHome();
}

function handleRoleAction(target: EventTarget | null) {
  const role = currentRole();
  const element = (target as HTMLElement | null)?.closest<HTMLElement>("[data-role-action]");
  if (!role || !element) return false;
  const action = element.dataset.roleAction || "";

  if (role === "creator") {
    if (action === "creator-message") openView("managerView");
    else if (action === "creator-battle") openView("arranged", ".month-nav");
    else if (action === "creator-month") openCreatorMonth();
    else if (action === "creator-ban") window.open(BAN_HELP_URL, "_blank", "noopener,noreferrer");
    else return false;
    return true;
  }

  if (role === "admin") {
    if (action === "admin-import") triggerAdminImport();
    else if (action === "admin-campaigns") setAdminPanel("campaigns");
    else if (action === "admin-records") setAdminPanel("records");
    else if (action === "admin-overview") setAdminPanel("overview");
    else if (action === "admin-managers") openView("managers");
    else if (action === "admin-battles") openView("arranged");
    else if (action === "admin-support") openView("managerView");
    else return false;
    return true;
  }

  if (action === "manager-progress") openView("dashboard");
  else if (action === "manager-leaderboard") openView("leaderboard");
  else if (action === "manager-campaigns") openView("incentives");
  else if (action === "manager-battles") openView("arranged");
  else if (action === "manager-assistant") openView("assistant");
  else return false;
  return true;
}

export default function RoleExperience() {
  useEffect(() => {
    let frame = 0;
    const scheduled = new Set<number>();

    const run = () => {
      if (frame) window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        applyRoleExperience();
      });
    };

    const later = (delay: number) => {
      const timer = window.setTimeout(() => {
        scheduled.delete(timer);
        run();
      }, delay);
      scheduled.add(timer);
    };

    const onClick = (event: MouseEvent) => {
      const role = currentRole();
      const target = event.target as HTMLElement | null;

      if (role === "admin" && target?.closest(".avatar-button")) {
        event.preventDefault();
        event.stopPropagation();
        setAdminPanel("overview");
        navButton("admin")?.click();
        later(60);
        return;
      }

      if (handleRoleAction(event.target)) {
        event.preventDefault();
        event.stopPropagation();
        later(50);
        later(180);
        return;
      }

      const nav = target?.closest<HTMLButtonElement>(".sidebar nav button, .mobile-tabs button");
      if (role === "admin" && nav && kindOf(nav) === "admin") setAdminPanel("overview");
      later(40);
      later(160);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      if (handleRoleAction(event.target)) {
        event.preventDefault();
        later(50);
        later(180);
      }
    };

    run();
    [80, 240, 700, 1500].forEach(later);
    document.addEventListener("click", onClick, true);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("focus", run);
    window.addEventListener("popstate", run);
    document.addEventListener("visibilitychange", run);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      scheduled.forEach((timer) => window.clearTimeout(timer));
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("focus", run);
      window.removeEventListener("popstate", run);
      document.removeEventListener("visibilitychange", run);
    };
  }, []);

  return null;
}
