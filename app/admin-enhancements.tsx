"use client";

import {useEffect} from "react";

type AdminPanel = "overview" | "records" | "campaigns";

function roleFromShell(){
  const role=(document.querySelector<HTMLElement>(".profile-mini small")?.textContent||"").trim().toLowerCase();
  if(role.includes("agency owner"))return "admin";
  if(role==="manager")return "manager";
  return "creator";
}

function isAdmin(){
  return roleFromShell()==="admin" && !document.querySelector(".login-page");
}

function navButtonContaining(text:string){
  const needle=text.toLowerCase();
  const buttons=[...document.querySelectorAll<HTMLButtonElement>(".mobile-tabs button, .sidebar nav button")];
  return buttons.find((button)=>button.textContent?.toLowerCase().includes(needle));
}

function isAdminHome(){
  if(!isAdmin())return false;
  return [...document.querySelectorAll<HTMLElement>(".page-heading h1")]
    .some((heading)=>heading.textContent?.trim().toLowerCase()==="agency admin");
}

function clearAdminState(){
  document.body.classList.remove("admin-nav-simplified","admin-panel-records-open","admin-panel-campaigns-open");
  const buttons=[...document.querySelectorAll<HTMLButtonElement>(".mobile-tabs button, .sidebar nav button")];
  for(const button of buttons){
    button.classList.remove("admin-hidden-nav-item");
    button.removeAttribute("aria-hidden");
    button.removeAttribute("tabindex");
  }
}

function simplifyAdminNavigation(){
  if(!isAdmin() || !document.body.classList.contains("admin-nav-simplified"))return;
  const buttons=[...document.querySelectorAll<HTMLButtonElement>(".mobile-tabs button, .sidebar nav button")];
  for(const button of buttons){
    const label=button.textContent?.toLowerCase()||"";
    const hidden=label.includes("my progress")||label.includes("dashboard")||label.includes("incentives")||label.includes("leaderboard");
    if(hidden){
      button.classList.add("admin-hidden-nav-item");
      button.setAttribute("aria-hidden","true");
      button.setAttribute("tabindex","-1");
    }else{
      button.classList.remove("admin-hidden-nav-item");
      button.removeAttribute("aria-hidden");
      button.removeAttribute("tabindex");
    }
  }
}

function setHeading(panel:AdminPanel){
  if(!isAdmin())return;
  const heading=[...document.querySelectorAll<HTMLElement>(".page-heading")].find((section)=>
    section.querySelector("h1")?.textContent?.trim().toLowerCase()==="agency admin" ||
    section.classList.contains("admin-overview-heading")
  );
  if(!heading)return;
  heading.classList.add("admin-overview-heading");
  const eyebrow=heading.querySelector<HTMLElement>(".eyebrow");
  const title=heading.querySelector<HTMLElement>("h1");
  const description=heading.querySelector<HTMLElement>("div > p:last-child");

  const copy = panel === "records"
    ? {eyebrow:"ADMIN",title:"Creator records",description:"Search, review and edit creator performance without cluttering your main admin screen."}
    : panel === "campaigns"
      ? {eyebrow:"ADMIN",title:"Campaign banners",description:"Upload and manage the banners creators see inside their dashboard."}
      : {eyebrow:"ADMIN OVERVIEW",title:"Agency admin",description:"Your main control centre. Open only the tools you need, when you need them."};

  if(eyebrow)eyebrow.textContent=copy.eyebrow;
  if(title)title.textContent=copy.title;
  if(description)description.textContent=copy.description;
}

function setPanel(panel:AdminPanel){
  if(!isAdmin())return;
  document.body.classList.toggle("admin-panel-records-open",panel==="records");
  document.body.classList.toggle("admin-panel-campaigns-open",panel==="campaigns");
  setHeading(panel);

  const target = panel === "records"
    ? document.querySelector<HTMLElement>(".admin-table-panel")
    : panel === "campaigns"
      ? document.querySelector<HTMLElement>(".campaign-admin-panel")
      : document.querySelector<HTMLElement>(".admin-overview-heading");
  if(target)window.requestAnimationFrame(()=>target.scrollIntoView({behavior:"smooth",block:"start"}));
}

function ensureBackButton(container:Element|null){
  if(!isAdmin() || !container || container.querySelector(".admin-back-overview"))return;
  const button=document.createElement("button");
  button.type="button";
  button.className="admin-back-overview";
  button.dataset.adminAction="overview";
  button.textContent="Back to overview";
  container.appendChild(button);
}

function ensureAdminActions(){
  if(!isAdmin())return;
  const heading=[...document.querySelectorAll<HTMLElement>(".page-heading")].find((section)=>
    section.querySelector("h1")?.textContent?.trim().toLowerCase()==="agency admin" ||
    section.classList.contains("admin-overview-heading")
  );
  if(!heading)return;

  document.body.classList.add("admin-nav-simplified");
  heading.classList.add("admin-overview-heading");

  if(!heading.querySelector(".admin-quick-actions")){
    const actions=document.createElement("div");
    actions.className="admin-quick-actions";
    actions.innerHTML=`
      <button type="button" data-admin-action="import"><span>Import creators</span></button>
      <button type="button" data-admin-action="campaigns"><span>Campaign banners</span></button>
      <button type="button" data-admin-action="records"><span>Creator records</span></button>
      <button type="button" data-admin-action="leaderboard"><span>Leaderboard</span></button>
    `;
    heading.appendChild(actions);
  }

  ensureBackButton(document.querySelector(".campaign-admin-panel .quick-chat-head"));
  ensureBackButton(document.querySelector(".admin-table-panel .admin-table-top"));
  simplifyAdminNavigation();
}

function activateAdminAction(target:EventTarget|null){
  if(!isAdmin())return false;
  const element=(target as HTMLElement|null)?.closest<HTMLElement>("[data-admin-action]");
  if(!element)return false;
  const action=element.dataset.adminAction;

  if(action==="import"){
    const input=document.querySelector<HTMLInputElement>(".admin-actions input[type='file']");
    input?.click();
  }
  if(action==="campaigns")setPanel("campaigns");
  if(action==="records")setPanel("records");
  if(action==="overview")setPanel("overview");
  if(action==="leaderboard"){
    const button=navButtonContaining("leaderboard");
    button?.click();
    window.scrollTo({top:0,behavior:"smooth"});
  }
  return true;
}

function runAdminEnhancements(){
  if(!isAdmin()){
    clearAdminState();
    return;
  }
  if(isAdminHome())ensureAdminActions();
  if(document.body.classList.contains("admin-nav-simplified"))simplifyAdminNavigation();
}

export default function AdminEnhancements(){
  useEffect(()=>{
    let frame=0;
    const schedule=()=>{
      if(frame)window.cancelAnimationFrame(frame);
      frame=window.requestAnimationFrame(()=>{
        frame=0;
        runAdminEnhancements();
      });
    };

    const onClick=(event:MouseEvent)=>{
      if(isAdmin()){
        const button=(event.target as HTMLElement|null)?.closest<HTMLButtonElement>("button");
        if(button && document.body.classList.contains("admin-nav-simplified")){
          const label=button.textContent?.trim().toLowerCase()||"";
          if(label==="admin")setPanel("overview");
        }
        if(activateAdminAction(event.target))event.preventDefault();
      }
      window.setTimeout(schedule,80);
      window.setTimeout(schedule,400);
    };
    const onKeyDown=(event:KeyboardEvent)=>{
      if(!isAdmin() || (event.key!=="Enter"&&event.key!==" "))return;
      if(activateAdminAction(event.target))event.preventDefault();
    };

    schedule();
    const startupChecks=[250,700,1400,2600,4500].map((delay)=>window.setTimeout(schedule,delay));
    document.addEventListener("click",onClick);
    document.addEventListener("keydown",onKeyDown);
    window.addEventListener("focus",schedule);
    window.addEventListener("popstate",schedule);

    return()=>{
      if(frame)window.cancelAnimationFrame(frame);
      startupChecks.forEach((timer)=>window.clearTimeout(timer));
      document.removeEventListener("click",onClick);
      document.removeEventListener("keydown",onKeyDown);
      window.removeEventListener("focus",schedule);
      window.removeEventListener("popstate",schedule);
    };
  },[]);
  return null;
}
