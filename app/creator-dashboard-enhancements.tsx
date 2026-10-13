"use client";

import {useEffect} from "react";

const BAN_HELP_URL="https://api.whatsapp.com/send/?phone=%2B447413269978&text&type=phone_number&app_absent=0&wame_ctl=1";

function navButtonContaining(text:string){
  const needle=text.toLowerCase();
  const buttons=[...document.querySelectorAll<HTMLButtonElement>(".mobile-tabs button, .sidebar nav button")];
  return buttons.find((button)=>button.textContent?.toLowerCase().includes(needle));
}

function goToNavigation(text:string,focusSelector?:string){
  const button=navButtonContaining(text);
  if(!button)return;
  button.click();
  if(!focusSelector){
    window.scrollTo({top:0,behavior:"smooth"});
    return;
  }
  let tries=0;
  const focus=()=>{
    const target=document.querySelector<HTMLElement>(focusSelector);
    if(target){
      target.scrollIntoView({behavior:"smooth",block:"start"});
      return;
    }
    tries+=1;
    if(tries<8)window.setTimeout(focus,70);
  };
  window.setTimeout(focus,80);
}

function openDailyBreakdown(){
  const details=document.querySelector<HTMLDetailsElement>(".daily-panel");
  if(!details)return;
  details.open=true;
  window.requestAnimationFrame(()=>details.scrollIntoView({behavior:"smooth",block:"start"}));
}

function simplifyCreatorNavigation(){
  if(!document.body.classList.contains("creator-nav-simplified"))return;
  const buttons=[...document.querySelectorAll<HTMLButtonElement>(".mobile-tabs button, .sidebar nav button")];
  for(const button of buttons){
    const label=button.textContent?.toLowerCase()||"";
    const hidden=label.includes("incentives")||label.includes("arranged")||label.includes("message");
    if(hidden){
      button.classList.add("creator-hidden-nav-item");
      button.setAttribute("aria-hidden","true");
      button.setAttribute("tabindex","-1");
    }else{
      button.classList.remove("creator-hidden-nav-item");
      button.removeAttribute("aria-hidden");
      button.removeAttribute("tabindex");
    }
  }
}

function personalizeDashboardHeading(){
  const headings=[...document.querySelectorAll<HTMLElement>(".page-heading")];
  const pageHeading=headings.find((section)=>{
    const eyebrow=section.querySelector<HTMLElement>(".eyebrow")?.textContent?.trim().toLowerCase()||"";
    const title=section.querySelector<HTMLElement>("h1")?.textContent?.trim().toLowerCase()||"";
    return eyebrow==="creator overview"||eyebrow==="my overview"||title.startsWith("your pulse,")||title==="welcome back";
  });
  if(!pageHeading)return null;

  document.body.classList.add("creator-nav-simplified");
  pageHeading.classList.add("creator-welcome-heading");

  const eyebrow=pageHeading.querySelector<HTMLElement>(".eyebrow");
  const title=pageHeading.querySelector<HTMLElement>("h1");
  const intro=pageHeading.querySelector<HTMLElement>("div > p:last-child");

  if(eyebrow&&eyebrow.textContent!=="MY OVERVIEW")eyebrow.textContent="MY OVERVIEW";
  if(title&&title.textContent!=="Welcome back")title.textContent="Welcome back";
  const introCopy="Your progress, campaigns and support are all here in one place.";
  if(intro&&intro.textContent!==introCopy)intro.textContent=introCopy;

  return pageHeading;
}

function ensureHeaderActions(){
  const pageHeading=personalizeDashboardHeading();
  if(!pageHeading)return;

  const pills=pageHeading.querySelector<HTMLElement>(".heading-pills");
  if(!pills)return;

  const tierPill=pills.querySelector<HTMLElement>(".tier-pill");
  if(tierPill){
    tierPill.classList.remove("creator-header-action");
    tierPill.removeAttribute("role");
    tierPill.removeAttribute("tabindex");
    tierPill.removeAttribute("aria-label");
    delete tierPill.dataset.creatorAction;
  }

  const periodPill=pills.querySelector<HTMLElement>(".period-pill");
  if(periodPill){
    periodPill.classList.add("creator-header-action");
    periodPill.setAttribute("role","button");
    periodPill.setAttribute("tabindex","0");
    periodPill.setAttribute("aria-label","Open daily monthly breakdown");
    periodPill.dataset.creatorAction="month";
  }

  if(!pills.querySelector(".creator-message-manager-top")){
    const button=document.createElement("button");
    button.type="button";
    button.className="creator-message-manager-top";
    button.dataset.creatorAction="message";
    button.setAttribute("aria-label","Message your manager");
    button.innerHTML='<span class="creator-message-dot" aria-hidden="true"></span><span>Message manager</span>';
    pills.appendChild(button);
  }

  if(!pills.querySelector(".creator-book-battle-top")){
    const button=document.createElement("button");
    button.type="button";
    button.className="creator-book-battle-top";
    button.dataset.creatorAction="battle";
    button.setAttribute("aria-label","Book an arranged battle");
    button.innerHTML='<span class="creator-battle-mark" aria-hidden="true">⚔</span><span>Book arranged battle</span>';
    pills.appendChild(button);
  }

  if(!pills.querySelector(".creator-ban-help-top")){
    const button=document.createElement("button");
    button.type="button";
    button.className="creator-ban-help-top";
    button.dataset.creatorAction="ban";
    button.setAttribute("aria-label","Open ban help");
    button.innerHTML='<span class="creator-ban-mark" aria-hidden="true">!</span><span>Ban help</span>';
    pills.appendChild(button);
  }
}

function simplifyTierCopy(){
  const progressTitle=document.querySelector<HTMLElement>(".progress-panel .panel-heading h2");
  const progressEyebrow=document.querySelector<HTMLElement>(".progress-panel .panel-heading .eyebrow");
  const tierPill=document.querySelector<HTMLElement>(".page-heading .tier-pill");
  if(!progressTitle)return;

  const match=progressTitle.textContent?.match(/(?:Progress|Grinding) towards Tier\s+(\d+)/i);
  if(match){
    const nextTitle=`Grinding towards Tier ${match[1]}`;
    if(progressTitle.textContent!==nextTitle)progressTitle.textContent=nextTitle;
    if(progressEyebrow&&progressEyebrow.textContent!=="Current tier goal")progressEyebrow.textContent="Current tier goal";
    const pillCopy=`Grinding Tier ${match[1]}`;
    if(tierPill&&tierPill.textContent?.trim()!==pillCopy)tierPill.textContent=pillCopy;
  }
}

function applyCreatorEnhancements(){
  ensureHeaderActions();
  simplifyTierCopy();
  simplifyCreatorNavigation();
}

export default function CreatorDashboardEnhancements(){
  useEffect(()=>{
    let frame=0;
    const scheduleRun=()=>{
      if(frame)window.cancelAnimationFrame(frame);
      frame=window.requestAnimationFrame(()=>{
        frame=0;
        applyCreatorEnhancements();
      });
    };

    const activate=(target:EventTarget|null)=>{
      const element=(target as HTMLElement|null)?.closest<HTMLElement>("[data-creator-action]");
      if(!element)return false;
      const action=element.dataset.creatorAction;
      if(action==="message")goToNavigation("message");
      if(action==="battle")goToNavigation("arranged",".month-nav");
      if(action==="month")openDailyBreakdown();
      if(action==="ban")window.open(BAN_HELP_URL,"_blank","noopener,noreferrer");
      return true;
    };

    const onClick=(event:MouseEvent)=>{
      if(activate(event.target))event.preventDefault();
      scheduleRun();
    };
    const onKeyDown=(event:KeyboardEvent)=>{
      if(event.key!=="Enter"&&event.key!==" ")return;
      if(activate(event.target))event.preventDefault();
      scheduleRun();
    };
    const onVisibility=()=>{
      if(document.visibilityState==="visible")scheduleRun();
    };

    scheduleRun();
    window.setTimeout(scheduleRun,120);
    document.addEventListener("click",onClick);
    document.addEventListener("keydown",onKeyDown);
    document.addEventListener("visibilitychange",onVisibility);
    window.addEventListener("popstate",scheduleRun);
    window.addEventListener("focus",scheduleRun);

    return()=>{
      if(frame)window.cancelAnimationFrame(frame);
      document.removeEventListener("click",onClick);
      document.removeEventListener("keydown",onKeyDown);
      document.removeEventListener("visibilitychange",onVisibility);
      window.removeEventListener("popstate",scheduleRun);
      window.removeEventListener("focus",scheduleRun);
    };
  },[]);
  return null;
}
