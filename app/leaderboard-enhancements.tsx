"use client";

import {useEffect} from "react";

type AppRole = "creator" | "manager" | "admin";

function appRole(): AppRole {
  if (document.body.classList.contains("role-admin")) return "admin";
  if (document.body.classList.contains("role-manager")) return "manager";
  return "creator";
}

function leaderboardOpen() {
  return Boolean(document.querySelector(".leaderboard-heading") && document.querySelector(".competitive-table"));
}

function agencyFor(element: Element) {
  const text = (element.textContent || "").toLowerCase();
  if (text.includes("platinum pulse")) return "platinum";
  if (text.includes("void")) return "void";
  return "other";
}

function activeMetric() {
  const active = document.querySelector<HTMLElement>(".leader-controls .segmented button.active");
  const text = (active?.textContent || "").toLowerCase();
  if (text.includes("live")) return "live";
  if (text.includes("valid")) return "days";
  return "diamonds";
}

function ensureOverviewBar() {
  const heading = document.querySelector<HTMLElement>(".leaderboard-heading");
  const controls = document.querySelector<HTMLElement>(".leader-controls");
  if (!heading || !controls) return;

  heading.classList.add("leaderboard-upgraded-heading");

  let bar = document.querySelector<HTMLElement>(".leaderboard-filter-bar");
  if (!bar) {
    bar = document.createElement("section");
    bar.className = "leaderboard-filter-bar leaderboard-overview-bar";
    bar.innerHTML = `
      <div class="leaderboard-filter-copy">
        <span class="leaderboard-view-label"></span>
        <strong>One leaderboard. Clear targets.</strong>
        <small>See the full agency ranking in one clean monthly competition view.</small>
      </div>
      <span class="leaderboard-result-count"></span>`;
    controls.insertAdjacentElement("beforebegin", bar);
  }

  bar.querySelector(".leaderboard-agency-switch")?.remove();

  const role = appRole();
  const label = bar.querySelector<HTMLElement>(".leaderboard-view-label");
  if (label) label.textContent = role === "admin" ? "ADMIN LEAGUE VIEW" : role === "manager" ? "MANAGER LEAGUE VIEW" : "CREATOR LEAGUE VIEW";
}

function decorateRows(rows: HTMLElement[]) {
  rows.forEach((row) => {
    row.hidden = false;
    const agency = agencyFor(row);
    row.classList.toggle("agency-platinum-row", agency === "platinum");
    row.classList.toggle("agency-void-row", agency === "void");

    const rank = row.querySelector<HTMLElement>(".rank-number");
    if (rank && row.dataset.originalRank) rank.textContent = row.dataset.originalRank;

    const creatorCell = row.querySelector<HTMLElement>(".creator-cell > span");
    if (!creatorCell || creatorCell.querySelector(".leader-agency-pill")) return;
    if (agency !== "platinum" && agency !== "void") return;

    const pill = document.createElement("span");
    pill.className = `leader-agency-pill ${agency}`;
    pill.textContent = agency === "platinum" ? "Platinum Pulse" : "VOID";
    creatorCell.appendChild(pill);
  });
}

function applyEnhancements() {
  if (!leaderboardOpen()) return;
  const content = document.querySelector<HTMLElement>("main.content");
  const rows = [...document.querySelectorAll<HTMLElement>(".competitive-table .table-row")];
  if (!content) return;

  content.classList.remove("leader-filter-all", "leader-filter-platinum", "leader-filter-void", "leader-metric-live", "leader-metric-diamonds", "leader-metric-days");
  content.classList.add("leader-filter-all", `leader-metric-${activeMetric()}`);

  document.querySelector<HTMLElement>(".competitive-podium")?.removeAttribute("hidden");
  document.querySelector<HTMLElement>(".filtered-agency-podium")?.remove();

  rows.forEach((row) => {
    if (!row.dataset.originalRank) row.dataset.originalRank = row.querySelector<HTMLElement>(".rank-number")?.textContent || "";
  });
  decorateRows(rows);

  const count = document.querySelector<HTMLElement>(".leaderboard-result-count");
  if (count) count.textContent = `${rows.length} creator${rows.length === 1 ? "" : "s"} competing`;

  ensureOverviewBar();
}

export default function LeaderboardEnhancements() {
  useEffect(() => {
    let frame = 0;

    const run = () => {
      if (!leaderboardOpen()) return;
      ensureOverviewBar();
      applyEnhancements();
    };

    const schedule = (delay = 0) => {
      window.setTimeout(() => {
        if (frame) cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
          frame = 0;
          run();
        });
      }, delay);
    };

    const click = () => {
      schedule(30);
      schedule(140);
    };

    const input = (event: Event) => {
      if ((event.target as HTMLElement | null)?.closest(".leader-controls")) schedule(20);
    };

    schedule();
    schedule(160);
    schedule(650);
    document.addEventListener("click", click);
    document.addEventListener("input", input);
    document.addEventListener("change", input);
    window.addEventListener("focus", run);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      document.removeEventListener("click", click);
      document.removeEventListener("input", input);
      document.removeEventListener("change", input);
      window.removeEventListener("focus", run);
    };
  }, []);

  return null;
}
