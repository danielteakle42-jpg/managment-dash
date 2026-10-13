"use client";

import {useEffect} from "react";

function buttonForMessageManager(){
  const buttons=[...document.querySelectorAll<HTMLButtonElement>(".sidebar nav button, .mobile-tabs button")];
  return buttons.find((button)=>button.textContent?.toLowerCase().includes("message"));
}

function replaceTextKeepingMeaning(element:HTMLElement,text:string){
  element.textContent=text;
}

function enhanceCreatorDashboard(){
  const heading=[...document.querySelectorAll<HTMLElement>(".page-heading h1")].find((item)=>item.textContent?.trim().startsWith("Your pulse,"));
  if(!heading)return;

  const pageHeading=heading.closest<HTMLElement>(".page-heading");
  const pills=pageHeading?.querySelector<HTMLElement>(".heading-pills");
  const progressTitle=document.querySelector<HTMLElement>(".progress-panel .panel-heading h2");
  const progressEyebrow=document.querySelector<HTMLElement>(".progress-panel .panel-heading .eyebrow");
  const tierPill=pills?.querySelector<HTMLElement>(".tier-pill");

  if(progressTitle){
    const match=progressTitle.textContent?.match(/Progress towards Tier\s+(\d+)/i);
    if(match){
      replaceTextKeepingMeaning(progressTitle,`Grinding towards Tier ${match[1]}`);
      if(progressEyebrow)replaceTextKeepingMeaning(progressEyebrow,"Current tier goal");
      if(tierPill)replaceTextKeepingMeaning(tierPill,`Grinding Tier ${match[1]}`);
    }else if(progressTitle.textContent?.toLowerCase().includes("complete")){
      replaceTextKeepingMeaning(progressTitle,"Top tier complete");
      if(progressEyebrow)replaceTextKeepingMeaning(progressEyebrow,"Tier progress");
      if(tierPill)replaceTextKeepingMeaning(tierPill,"Top tier achieved");
    }
  }

  if(pills && !pills.querySelector(".creator-message-manager-top")){
    const button=document.createElement("button");
    button.type="button";
    button.className="creator-message-manager-top";
    button.setAttribute("aria-label","Message your manager");
    button.innerHTML='<span class="creator-message-dot" aria-hidden="true"></span><span>Message manager</span>';
    button.addEventListener("click",()=>buttonForMessageManager()?.click());
    pills.appendChild(button);
  }
}

function enhanceIncentives(){
  const heroTitle=document.querySelector<HTMLElement>(".incentive-push-copy h2");
  if(!heroTitle)return;
  const match=heroTitle.textContent?.match(/Tier\s+(\d+)\s+is/i);
  const badge=document.querySelector<HTMLElement>(".incentive-current-badge");
  if(match && badge)replaceTextKeepingMeaning(badge,`Grinding Tier ${match[1]}`);
}

export default function CreatorDashboardEnhancements(){
  useEffect(()=>{
    const run=()=>{
      enhanceCreatorDashboard();
      enhanceIncentives();
    };
    run();
    const observer=new MutationObserver(run);
    observer.observe(document.body,{childList:true,subtree:true});
    return()=>observer.disconnect();
  },[]);
  return null;
}
