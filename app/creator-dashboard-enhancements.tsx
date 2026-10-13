"use client";

import {useEffect} from "react";

function navButtonContaining(text:string){
  const needle=text.toLowerCase();
  const buttons=[...document.querySelectorAll<HTMLButtonElement>(".mobile-tabs button, .sidebar nav button")];
  return buttons.find((button)=>button.textContent?.toLowerCase().includes(needle));
}

function goToNavigation(text:string,focusSelector?:string){
  const button=navButtonContaining(text);
  if(button){
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
      if(tries<12)window.setTimeout(focus,60);
    };
    window.setTimeout(focus,60);
  }
}

function openDailyBreakdown(){
  const details=document.querySelector<HTMLDetailsElement>(".daily-panel");
  if(!details)return;
  details.open=true;
  window.setTimeout(()=>details.scrollIntoView({behavior:"smooth",block:"start"}),40);
}

function simplifyCreatorNavigation(){
  if(!document.body.classList.contains("creator-nav-simplified"))return;
  const buttons=[...document.querySelectorAll<HTMLButtonElement>(".mobile-tabs button, .sidebar nav button")];
  for(const button of buttons){
    const label=button.textContent?.toLowerCase()||"";
    const hidden=label.includes("incentives")||label.includes("arranged")||label.includes("message");
    button.classList.toggle("creator-hidden-nav-item",hidden);
    if(hidden)button.setAttribute("aria-hidden","true");
  }
}

function ensureHeaderActions(){
  const heading=[...document.querySelectorAll<HTMLElement>(".page-heading h1")].find((item)=>item.textContent?.trim().startsWith("Your pulse,"));
  if(!heading)return;

  document.body.classList.add("creator-nav-simplified");

  const pageHeading=heading.closest<HTMLElement>(".page-heading");
  const pills=pageHeading?.querySelector<HTMLElement>(".heading-pills");
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
}

function simplifyTierCopy(){
  const progressTitle=document.querySelector<HTMLElement>(".progress-panel .panel-heading h2");
  const progressEyebrow=document.querySelector<HTMLElement>(".progress-panel .panel-heading .eyebrow");
  const tierPill=document.querySelector<HTMLElement>(".page-heading .tier-pill");
  if(!progressTitle)return;

  const match=progressTitle.textContent?.match(/Progress towards Tier\s+(\d+)/i);
  if(match){
    progressTitle.textContent=`Grinding towards Tier ${match[1]}`;
    if(progressEyebrow)progressEyebrow.textContent="Current tier goal";
    if(tierPill)tierPill.textContent=`Grinding Tier ${match[1]}`;
  }
}

export default function CreatorDashboardEnhancements(){
  useEffect(()=>{
    const run=()=>{
      ensureHeaderActions();
      simplifyTierCopy();
      simplifyCreatorNavigation();
    };

    const activate=(target:EventTarget|null)=>{
      const element=(target as HTMLElement|null)?.closest<HTMLElement>("[data-creator-action]");
      if(!element)return false;
      const action=element.dataset.creatorAction;
      if(action==="message")goToNavigation("message");
      if(action==="battle")goToNavigation("arranged",".month-nav");
      if(action==="month")openDailyBreakdown();
      return true;
    };

    const onClick=(event:MouseEvent)=>{
      if(activate(event.target))event.preventDefault();
    };
    const onKeyDown=(event:KeyboardEvent)=>{
      if(event.key!=="Enter"&&event.key!==" ")return;
      if(activate(event.target))event.preventDefault();
    };

    run();
    const observer=new MutationObserver(()=>run());
    observer.observe(document.body,{childList:true,subtree:true});
    document.addEventListener("click",onClick);
    document.addEventListener("keydown",onKeyDown);
    return()=>{
      observer.disconnect();
      document.removeEventListener("click",onClick);
      document.removeEventListener("keydown",onKeyDown);
    };
  },[]);
  return null;
}
