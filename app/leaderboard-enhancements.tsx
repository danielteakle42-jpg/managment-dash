"use client";

import {useEffect} from "react";

type AgencyFilter = "all" | "platinum" | "void";
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

function metricValueFromRow(row: HTMLElement) {
  const metric = activeMetric();
  const children = [...row.children] as HTMLElement[];
  const index = metric === "live" ? 2 : metric === "diamonds" ? 3 : 4;
  return children[index]?.querySelector("b")?.textContent?.trim() || "—";
}

function metricLabel() {
  const metric = activeMetric();
  return metric === "live" ? "LIVE hours" : metric === "days" ? "Valid days" : "Diamonds";
}

function ensureFilterBar(filter: AgencyFilter) {
  const heading = document.querySelector<HTMLElement>(".leaderboard-heading");
  const controls = document.querySelector<HTMLElement>(".leader-controls");
  if (!heading || !controls) return;

  heading.classList.add("leaderboard-upgraded-heading");

  let bar = document.querySelector<HTMLElement>(".leaderboard-filter-bar");
  if (!bar) {
    bar = document.createElement("section");
    bar.className = "leaderboard-filter-bar";
    bar.innerHTML = `
      <div class="leaderboard-filter-copy">
        <span class="leaderboard-view-label"></span>
        <strong>One leaderboard. Clear targets.</strong>
        <small>Switch agency without losing the monthly competition view.</small>
      </div>
      <div class="leaderboard-agency-switch" role="group" aria-label="Filter leaderboard by agency">
        <button type="button" data-leader-agency="all">All agency</button>
        <button type="button" data-leader-agency="platinum">Platinum Pulse</button>
        <button type="button" data-leader-agency="void">VOID</button>
      </div>
      <span class="leaderboard-result-count"></span>`;
    controls.insertAdjacentElement("beforebegin", bar);
  }

  const role = appRole();
  const label = bar.querySelector<HTMLElement>(".leaderboard-view-label");
  if (label) label.textContent = role === "admin" ? "ADMIN LEAGUE VIEW" : role === "manager" ? "MANAGER LEAGUE VIEW" : "CREATOR LEAGUE VIEW";

  bar.querySelectorAll<HTMLButtonElement>("[data-leader-agency]").forEach((button) => {
    const selected = button.dataset.leaderAgency === filter;
    button.classList.toggle("active", selected);
    button.setAttribute("aria-pressed", selected ? "true" : "false");
  });
}

function ensureFilteredPodium() {
  const original = document.querySelector<HTMLElement>(".competitive-podium");
  const table = document.querySelector<HTMLElement>(".competitive-table");
  if (!table) return null;

  let filtered = document.querySelector<HTMLElement>(".filtered-agency-podium");
  if (!filtered) {
    filtered = document.createElement("section");
    filtered.className = "filtered-agency-podium";
    if (original) original.insertAdjacentElement("afterend", filtered);
    else table.insertAdjacentElement("beforebegin", filtered);
  }
  return filtered;
}

function buildFilteredPodium(rows: HTMLElement[], filter: AgencyFilter) {
  const original = document.querySelector<HTMLElement>(".competitive-podium");
  const filtered = ensureFilteredPodium();
  if (!filtered) return;

  if (filter === "all") {
    if (original) original.hidden = false;
    filtered.hidden = true;
    filtered.replaceChildren();
    return;
  }

  if (original) original.hidden = true;
  filtered.hidden = false;
  filtered.replaceChildren();

  const top = rows.slice(0, 3);
  if (!top.length) {
    const empty = document.createElement("div");
    empty.className = "filtered-podium-empty";
    empty.textContent = "No creators match this agency filter for the current search.";
    filtered.appendChild(empty);
    return;
  }

  const title = document.createElement("div");
  title.className = "filtered-podium-heading";
  title.innerHTML = `<span>${filter === "platinum" ? "PLATINUM PULSE" : "VOID"}</span><strong>Top creators</strong><small>Ranked by ${metricLabel().toLowerCase()}</small>`;
  filtered.appendChild(title);

  const cards = document.createElement("div");
  cards.className = "filtered-podium-cards";

  top.forEach((row, index) => {
    const card = document.createElement("article");
    card.className = `filtered-podium-card filtered-place-${index + 1}`;

    const avatar = row.querySelector<HTMLElement>(".creator-cell i")?.cloneNode(true) as HTMLElement | undefined;
    const username = row.querySelector<HTMLElement>(".creator-cell b")?.textContent?.trim() || "Creator";
    const metric = metricValueFromRow(row);

    const rank = document.createElement("span");
    rank.className = "filtered-rank";
    rank.textContent = `#${index + 1}`;
    card.appendChild(rank);
    if (avatar) {
      avatar.classList.add("filtered-avatar");
      card.appendChild(avatar);
    }
    const name = document.createElement("strong");
    name.textContent = username;
    card.appendChild(name);
    const value = document.createElement("b");
    value.textContent = metric;
    card.appendChild(value);
    const metricName = document.createElement("small");
    metricName.textContent = metricLabel();
    card.appendChild(metricName);
    cards.appendChild(card);
  });

  filtered.appendChild(cards);
}

function decorateRows(rows: HTMLElement[]) {
  rows.forEach((row) => {
    const agency = agencyFor(row);
    row.classList.toggle("agency-platinum-row", agency === "platinum");
    row.classList.toggle("agency-void-row", agency === "void");

    const creatorCell = row.querySelector<HTMLElement>(".creator-cell > span");
    if (!creatorCell || creatorCell.querySelector(".leader-agency-pill")) return;
    if (agency !== "platinum" && agency !== "void") return;

    const pill = document.createElement("span");
    pill.className = `leader-agency-pill ${agency}`;
    pill.textContent = agency === "platinum" ? "Platinum Pulse" : "VOID";
    creatorCell.appendChild(pill);
  });
}

function applyFilter(filter: AgencyFilter) {
  if (!leaderboardOpen()) return;
  const content = document.querySelector<HTMLElement>("main.content");
  const rows = [...document.querySelectorAll<HTMLElement>(".competitive-table .table-row")];
  if (!content) return;

  content.classList.remove("leader-filter-all", "leader-filter-platinum", "leader-filter-void", "leader-metric-live", "leader-metric-diamonds", "leader-metric-days");
  content.classList.add(`leader-filter-${filter}`, `leader-metric-${activeMetric()}`);

  decorateRows(rows);

  const matching = rows.filter((row) => filter === "all" || agencyFor(row) === filter);
  rows.forEach((row) => {
    if (!row.dataset.originalRank) row.dataset.originalRank = row.querySelector<HTMLElement>(".rank-number")?.textContent || "";
    const show = filter === "all" || agencyFor(row) === filter;
    row.hidden = !show;
  });

  matching.forEach((row, index) => {
    const rank = row.querySelector<HTMLElement>(".rank-number");
    if (!rank) return;
    rank.textContent = filter === "all" ? (row.dataset.originalRank || `#${index + 1}`) : `#${index + 1}`;
  });

  if (filter === "all") {
    rows.forEach((row) => {
      const rank = row.querySelector<HTMLElement>(".rank-number");
      if (rank && row.dataset.originalRank) rank.textContent = row.dataset.originalRank;
    });
  }

  buildFilteredPodium(matching, filter);

  const count = document.querySelector<HTMLElement>(".leaderboard-result-count");
  if (count) count.textContent = `${matching.length} creator${matching.length === 1 ? "" : "s"} shown`;

  ensureFilterBar(filter);
}

export default function LeaderboardEnhancements() {
  useEffect(() => {
    let frame = 0;
    let filter: AgencyFilter = "all";

    const run = () => {
      if (!leaderboardOpen()) return;
      ensureFilterBar(filter);
      applyFilter(filter);
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

    const click = (event: MouseEvent) => {
      const agencyButton = (event.target as HTMLElement | null)?.closest<HTMLButtonElement>("[data-leader-agency]");
      if (agencyButton) {
        const next = agencyButton.dataset.leaderAgency as AgencyFilter | undefined;
        if (next === "all" || next === "platinum" || next === "void") filter = next;
        schedule();
        return;
      }
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
