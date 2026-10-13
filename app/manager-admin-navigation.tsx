"use client";

import {useEffect} from "react";

function roleFromShell(){
  const role=(document.querySelector<HTMLElement>(".profile-mini small")?.textContent||"").trim().toLowerCase();
  if(role.includes("agency owner"))return "admin";
  if(role==="manager")return "manager";
  return "creator";
}

function navButtons(){
  return [...document.querySelectorAll<HTMLButtonElement>(".sidebar nav button, .mobile-tabs button")];
}

function buttonByText(text:string){
  const needle=text.toLowerCase();
  return navButtons().find(button=>(button.textContent||"").toLowerCase().includes(needle));
}

function activateNav(text:string){
  const button=buttonByText(text);
  if(!button)return;
  button.click();
  window.requestAnimationFrame(()=>window.scrollTo({top:0,behavior:"smooth"}));
}

function setHidden(button:HTMLButtonElement,hidden:boolean){
  button.classList.toggle("role-hidden-nav",hidden);
  if(hidden){
    button.setAttribute("aria-hidden","true");
    button.setAttribute("tabindex","-1");
  }else{
    button.removeAttribute("aria-hidden");
    button.removeAttribute("tabindex");
  }
}

function resetRoleNavigation(){
  document.body.classList.remove("owner-nav-simplified","manager-nav-simplified");
  for(const button of navButtons()){
    button.classList.remove("role-hidden-nav");
    button.removeAttribute("aria-hidden");
    button.removeAttribute("tabindex");
  }
}

function simplifyNavigation(){
  const role=roleFromShell();
  const buttons=navButtons();

  if(role==="creator"){
    resetRoleNavigation();
    return;
  }

  if(role==="admin"){
    document.body.classList.add("owner-nav-simplified");
    document.body.classList.remove("manager-nav-simplified");
    for(const button of buttons){
      const label=(button.textContent||"").toLowerCase();
      const hide=label.includes("my progress")||label.includes("dashboard")||label.includes("incentives")||label.includes("campaign")||label.includes("manager control");
      setHidden(button,hide);
    }
    return;
  }

  document.body.classList.add("manager-nav-simplified");
  document.body.classList.remove("owner-nav-simplified");
  for(const button of buttons){
    const label=(button.textContent||"").toLowerCase();
    const managerView=label.includes("message manager")||label.includes("ban help")||label.includes("manager view");
    const managerControl=label.includes("manager control");
    setHidden(button,!(managerView||managerControl));
    if(managerView){
      const span=button.querySelector("span");
      if(span)span.textContent="Manager View";
    }
  }
}

function ensureManagerRedirects(){
  if(roleFromShell()!=="manager")return;
  const content=document.querySelector<HTMLElement>("main.content");
  if(!content)return;
  const staffInbox=content.querySelector(".staff-inbox, .quick-manager, .quick-chat-panel, .quick-chat");
  const currentManagerView=Boolean(staffInbox)||Boolean(content.querySelector(".combined-help"));
  if(!currentManagerView)return;
  if(content.querySelector(".manager-view-redirects"))return;

  const section=document.createElement("section");
  section.className="panel manager-view-redirects";
  section.innerHTML=`
    <div class="manager-view-copy">
      <p class="eyebrow">MANAGER VIEW</p>
      <h1>Everything you need, without the clutter.</h1>
      <p>Open a tool when you need it. Manager Control stays in your navigation for day-to-day creator management.</p>
    </div>
    <div class="manager-view-actions">
      <button type="button" data-manager-destination="my progress"><span>My progress</span><small>View your own linked LIVE performance</small></button>
      <button type="button" data-manager-destination="leaderboard"><span>Leaderboard</span><small>See creator rankings and movement</small></button>
      <button type="button" data-manager-destination="incentives"><span>Campaigns & incentives</span><small>Open active creator opportunities</small></button>
      <button type="button" data-manager-destination="arranged"><span>Arranged battles</span><small>View and manage battle bookings</small></button>
      <button type="button" data-manager-destination="platinum assistant"><span>Platinum Assistant</span><small>Open your agency assistant tools</small></button>
    </div>`;
  content.prepend(section);
}

function keepAdminOnAdminView(event:MouseEvent){
  if(roleFromShell()!=="admin")return false;
  const avatar=(event.target as HTMLElement|null)?.closest(".avatar-button");
  if(!avatar)return false;
  const adminButton=buttonByText("admin");
  if(adminButton){
    event.preventDefault();
    event.stopPropagation();
    adminButton.click();
    return true;
  }
  return false;
}

function apply(){
  simplifyNavigation();
  ensureManagerRedirects();
}

export default function ManagerAdminNavigation(){
  useEffect(()=>{
    let frame=0;
    const schedule=()=>{
      if(frame)cancelAnimationFrame(frame);
      frame=requestAnimationFrame(()=>{frame=0;apply();});
    };

    const click=(event:MouseEvent)=>{
      if(keepAdminOnAdminView(event))return;
      const action=(event.target as HTMLElement|null)?.closest<HTMLElement>("[data-manager-destination]");
      if(action && roleFromShell()==="manager"){
        event.preventDefault();
        activateNav(action.dataset.managerDestination||"");
      }
      schedule();
      window.setTimeout(schedule,80);
    };

    schedule();
    window.setTimeout(schedule,120);
    document.addEventListener("click",click,true);
    window.addEventListener("focus",schedule);
    window.addEventListener("popstate",schedule);
    document.addEventListener("visibilitychange",schedule);
    return()=>{
      if(frame)cancelAnimationFrame(frame);
      document.removeEventListener("click",click,true);
      window.removeEventListener("focus",schedule);
      window.removeEventListener("popstate",schedule);
      document.removeEventListener("visibilitychange",schedule);
    };
  },[]);
  return null;
}
