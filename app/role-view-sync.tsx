"use client";

import {useEffect} from "react";

const injectedUiSelector = [
  ".admin-quick-actions",
  ".admin-tool-grid",
  ".admin-back-overview",
  ".manager-view-redirects",
  ".creator-message-manager-top",
  ".creator-book-battle-top",
  ".creator-ban-help-top",
  ".leaderboard-filter-bar",
  ".leader-agency-pill",
  ".filtered-agency-podium",
].join(",");

function isInjectedUi(element: HTMLElement) {
  return element.matches(injectedUiSelector) || Boolean(element.closest(injectedUiSelector));
}

export default function RoleViewSync() {
  useEffect(() => {
    let frame = 0;

    const sync = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        frame = 0;
        // RoleExperience and LeaderboardEnhancements already listen for focus.
        // Reuse that single refresh path once React has actually committed a new view.
        window.dispatchEvent(new Event("focus"));
      });
    };

    const observer = new MutationObserver((mutations) => {
      const relevant = mutations.some((mutation) => {
        const target = mutation.target instanceof HTMLElement ? mutation.target : null;
        if (target && isInjectedUi(target)) return false;

        return [...mutation.addedNodes].some((node) => {
          if (!(node instanceof HTMLElement)) return false;
          if (isInjectedUi(node)) return false;

          if (
            node.matches(".app-shell, .login-page, .profile-mini, main.content") ||
            node.querySelector(".app-shell, .login-page, .profile-mini, main.content")
          ) {
            return true;
          }

          return Boolean(target?.closest("main.content"));
        });
      });

      if (relevant) sync();
    });

    observer.observe(document.body, {childList: true, subtree: true});

    return () => {
      if (frame) cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  return null;
}
