'use client'

import { useEffect, useMemo, useState } from 'react'
import { db, assistantFetch as fetch } from './client'
import ConnectionsTab from './ConnectionsTab'
import { ProjectsPage, RecruitmentPage, TrendsPage, ContactsPage, FilesPage, NotesPage, RemindersPage, DiscordPage, SettingsPage, MorePage } from './SectionPages'
import {
  Bell, CalendarDays, CheckSquare, FileText, FolderKanban, Home, LogOut,
  Mail, Menu, Plus, Search, Shirt, StickyNote, Target, TrendingUp, Users,
  Contact, Send, Link2, Clock3, CheckCircle2,
  Sparkles, X, ArrowLeft, RefreshCw
} from 'lucide-react'

type Task={id:string;title:string;notes?:string|null;status:string;priority:number;difficulty:number;due_at:string|null;project_id?:string|null}
type Meeting={id:string;title:string;starts_at:string;ends_at?:string|null;join_url:string|null;source:string;location?:string|null;notes?:string|null;project_id?:string|null}
type Note={id:string;title:string|null;body:string;pinned:boolean;project_id?:string|null}
type Project={id:string;name:string;category:string;status:string;description?:string|null}
type Recruit={id:string;name:string;handle:string|null;stage:string;notes?:string|null;next_follow_up?:string|null}
type Trend={id:string;title:string;platform:string;status:string;assigned_to:string|null;url?:string|null;description?:string|null;project_id?:string|null}
type ContactRow={id:string;name:string;email:string|null;phone:string|null;platform:string|null;handle:string|null;company:string|null;role:string|null;tags:string[];notes:string|null;project_id?:string|null}
type FileRow={id:string;name:string;provider:string;url:string|null;project_id:string|null}
type Draft={id:string;recipient:string;subject:string;body:string;status:string;created_at:string;sent_at?:string|null}
type Reminder={id:string;title:string;remind_at:string;channel:string;sent_at:string|null}


export default function Page(){
  const initialTab=typeof window!=='undefined'?(new URLSearchParams(window.location.search).get('assistantTab')||'home'):'home'
  const [session,setSession]=useState<any>(null),[loading,setLoading]=useState(true),[tab,setTab]=useState(initialTab)
  const [tasks,setTasks]=useState<Task[]>([]),[meetings,setMeetings]=useState<Meeting[]>([]),[notes,setNotes]=useState<Note[]>([]),[projects,setProjects]=useState<Project[]>([])
  const [recruits,setRecruits]=useState<Recruit[]>([]),[trends,setTrends]=useState<Trend[]>([]),[contacts,setContacts]=useState<ContactRow[]>([]),[files,setFiles]=useState<FileRow[]>([])
  const [drafts,setDrafts]=useState<Draft[]>([]),[reminders,setReminders]=useState<Reminder[]>([])
  const [quick,setQuick]=useState(''),[modal,setModal]=useState<string|null>(null),[form,setForm]=useState<any>({}),[query,setQuery]=useState(''),[toast,setToast]=useState(''),[quickMenu,setQuickMenu]=useState(false)
  const [selectedProjectId,setSelectedProjectId]=useState<string|null>(null)

  useEffect(()=>{
    db.auth.getSession().then(({data})=>{setSession(data.session);setLoading(false)})
    const {data:{subscription}}=db.auth.onAuthStateChange((_e,s)=>setSession(s))
    return()=>subscription.unsubscribe()
  },[])
  useEffect(()=>{if(session) loadAll()},[session])
  useEffect(()=>{const onPop=()=>setTab(new URLSearchParams(window.location.search).get('assistantTab')||'home');window.addEventListener('popstate',onPop);return()=>window.removeEventListener('popstate',onPop)},[])
  function go(next:string){setTab(next);window.history.replaceState({},'',`/?view=assistant&assistantTab=${encodeURIComponent(next)}`)}
  useEffect(()=>{const open=()=>go('connections');window.addEventListener('open-connections',open as EventListener);return()=>window.removeEventListener('open-connections',open as EventListener)},[])
  useEffect(()=>{
    if(!session) return
    const timer=setInterval(()=>checkReminders(),30000)
    checkReminders()
    return()=>clearInterval(timer)
  },[session,reminders])

  async function loadAll(){
    const [a,b,c,d,e,f,g,h,i,j]=await Promise.all([
      db.from('assistant_tasks').select('*').order('status').order('difficulty').order('priority',{ascending:false}),
      db.from('assistant_meetings').select('*').gte('starts_at',new Date(Date.now()-86400000).toISOString()).order('starts_at').limit(50),
      db.from('assistant_notes').select('*').order('pinned',{ascending:false}).order('created_at',{ascending:false}).limit(100),
      db.from('assistant_projects').select('*').order('created_at',{ascending:false}),
      db.from('assistant_recruitment').select('*').order('created_at',{ascending:false}),
      db.from('assistant_trends').select('*').order('created_at',{ascending:false}),
      db.from('assistant_contacts').select('*').order('name'),
      db.from('assistant_files').select('*').order('created_at',{ascending:false}),
      db.from('assistant_email_drafts').select('*').order('created_at',{ascending:false}),
      db.from('assistant_reminders').select('*').order('remind_at')
    ])
    setTasks(a.data||[]);setMeetings(b.data||[]);setNotes(c.data||[]);setProjects(d.data||[]);setRecruits(e.data||[]);setTrends(f.data||[])
    setContacts(g.data||[]);setFiles(h.data||[]);setDrafts(i.data||[]);setReminders(j.data||[])
  }

  async function addQuick(){
    if(!quick.trim()||!session)return
    await db.from('assistant_tasks').insert({user_id:session.user.id,title:quick.trim(),difficulty:1,priority:3})
    setQuick('');showToast('Task added');loadAll()
  }
  async function toggleTask(t:Task){await db.from('assistant_tasks').update({status:t.status==='done'?'todo':'done'}).eq('id',t.id);loadAll()}
  async function setStage(r:Recruit,stage:string){await db.from('assistant_recruitment').update({stage}).eq('id',r.id);loadAll()}
  async function deleteRow(table:string,id:string){if(!confirm('Delete this item?'))return;await db.from(table).delete().eq('id',id);loadAll()}
  function showToast(msg:string){setToast(msg);setTimeout(()=>setToast(''),2200)}

  async function checkReminders(){
    if(typeof window==='undefined'||Notification.permission!=='granted')return
    const now=Date.now()
    const due=reminders.filter(r=>!r.sent_at&&new Date(r.remind_at).getTime()<=now)
    for(const r of due){
      new Notification('Platinum Assistant',{body:r.title})
      await db.from('assistant_reminders').update({sent_at:new Date().toISOString()}).eq('id',r.id)
    }
    if(due.length) loadAll()
  }

  async function save(){
    if(!session||!modal)return
    const uid=session.user.id
    let table='',payload:any={user_id:uid,...form}
    if(modal==='task'){table='assistant_tasks';payload={...payload,priority:Number(form.priority||3),difficulty:Number(form.difficulty||2),due_at:form.due_at?new Date(form.due_at).toISOString():null}}
    if(modal==='meeting'){table='assistant_meetings';payload={...payload,source:'manual',starts_at:new Date(form.starts_at).toISOString(),ends_at:form.ends_at?new Date(form.ends_at).toISOString():null}}
    if(modal==='reminder'){table='assistant_reminders';payload={...payload,channel:form.channel||'push',remind_at:new Date(form.remind_at).toISOString()}}
    if(modal==='note')table='assistant_notes'
    if(modal==='project'){table='assistant_projects';payload={...payload,category:'general'}}
    if(modal==='recruit')table='assistant_recruitment'
    if(modal==='trend')table='assistant_trends'
    if(modal==='contact'){table='assistant_contacts';payload={...payload,tags:(form.tags||'').split(',').map((x:string)=>x.trim()).filter(Boolean)}}
    if(modal==='file')table='assistant_files'
    if(modal==='email'){table='assistant_email_drafts';payload={...payload,status:'draft'}}
    if(table){
      const {error}=await db.from(table).insert(payload)
      if(error){showToast(error.message);return}
      setModal(null);setForm({});showToast('Saved');loadAll()
    }
  }

  async function runCommand(){
    const text=query.trim()
    if(!text||!session)return
    const lower=text.toLowerCase()
    if(lower.startsWith('add task ')){
      await db.from('assistant_tasks').insert({user_id:session.user.id,title:text.slice(9),difficulty:1,priority:3});setQuery('');showToast('Task added');loadAll();return
    }
    if(lower.startsWith('note ')){
      await db.from('assistant_notes').insert({user_id:session.user.id,title:'Quick note',body:text.slice(5)});setQuery('');showToast('Note saved');loadAll();return
    }
    setModal('search')
  }

  const openTasks=useMemo(()=>tasks.filter(t=>t.status!=='done'&&t.status!=='cancelled'),[tasks])
  const todayKey=new Date().toDateString()
  const todayMeetings=useMemo(()=>meetings.filter(m=>new Date(m.starts_at).toDateString()===todayKey),[meetings,todayKey])
  const next=useMemo(()=>meetings.find(m=>new Date(m.starts_at).getTime()>=Date.now()),[meetings])
  const overdue=useMemo(()=>openTasks.filter(t=>t.due_at&&new Date(t.due_at).getTime()<Date.now()),[openTasks])
  const priorityTasks=useMemo(()=>[...openTasks].sort((a,b)=>(a.difficulty-b.difficulty)||(b.priority-a.priority)).slice(0,8),[openTasks])
  const searchResults=useMemo(()=>{
    const q=query.trim().toLowerCase();if(!q)return [] as {type:string;title:string;meta:string}[]
    const out:{type:string;title:string;meta:string}[]=[]
    tasks.forEach(x=>x.title.toLowerCase().includes(q)&&out.push({type:'Task',title:x.title,meta:x.status}))
    meetings.forEach(x=>x.title.toLowerCase().includes(q)&&out.push({type:'Meeting',title:x.title,meta:new Date(x.starts_at).toLocaleString()}))
    notes.forEach(x=>(x.title||x.body).toLowerCase().includes(q)&&out.push({type:'Note',title:x.title||'Note',meta:x.body.slice(0,80)}))
    projects.forEach(x=>x.name.toLowerCase().includes(q)&&out.push({type:'Project',title:x.name,meta:x.category}))
    recruits.forEach(x=>(x.name+' '+(x.handle||'')).toLowerCase().includes(q)&&out.push({type:'Recruit',title:x.name,meta:x.stage}))
    contacts.forEach(x=>(x.name+' '+(x.handle||'')+' '+(x.email||'')).toLowerCase().includes(q)&&out.push({type:'Contact',title:x.name,meta:x.email||x.handle||''}))
    trends.forEach(x=>x.title.toLowerCase().includes(q)&&out.push({type:'Trend',title:x.title,meta:x.status}))
    return out.slice(0,30)
  },[query,tasks,meetings,notes,projects,recruits,contacts,trends])

  if(loading)return <div className="auth"><div className="card">Loading…</div></div>
  if(!session){return <div className="auth"><div className="card loginCard"><div className="adminIcon"><Sparkles size={26}/></div><h1>Platinum Assistant</h1><p className="muted">Opening secure login…</p></div></div>}

  return <>
    <main className="wrap">
      <header className="top">
        <div className="brand"><div className="eyebrow">PERSONAL HQ</div><h1>Platinum Assistant</h1><p>Run your day, agency and projects from one place.</p></div>
        <div className="row"><button className="iconBtn hideMobile" onClick={()=>setModal('search')} title="Search"><Search size={18}/></button></div>
      </header>

      {tab==='home'&&<><div className="commandBar"><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==='Enter'&&runCommand()} placeholder="Search or quickly add something…"/><button onClick={runCommand}>Go</button></div>
      {query&&searchResults.length>0&&<div className="searchDrop">{searchResults.slice(0,6).map((r,i)=><button key={i} onClick={()=>setModal('search')}><span className="searchType">{r.type}</span><b>{r.title}</b><small>{r.meta}</small></button>)}</div>}</>}

      {tab==='home'&&<HomeTab openTasks={openTasks} todayMeetings={todayMeetings} projects={projects} recruits={recruits} priorityTasks={priorityTasks} next={next} overdue={overdue} quick={quick} setQuick={setQuick} addQuick={addQuick} setModal={setModal} go={go} />}
      {tab==='inbox'&&<SmartInbox tasks={tasks} meetings={meetings} reminders={reminders} recruits={recruits} drafts={drafts} go={go} toggleTask={toggleTask} setStage={setStage}/>}
      {tab==='calendar'&&<CalendarTab meetings={meetings} reminders={reminders} setModal={setModal} deleteRow={deleteRow}/>} 
      {tab==='tasks'&&<TasksTab tasks={tasks} projects={projects} notes={notes} toggleTask={toggleTask} setModal={setModal} setForm={setForm} deleteRow={deleteRow} openProject={(id:string)=>{setSelectedProjectId(id);setTab('project')}}/>} 
      {tab==='mail'&&<MailTab drafts={drafts} setModal={setModal} deleteRow={deleteRow} loadAll={loadAll}/>} 
      {tab==='projects'&&<ProjectsPage projects={projects} tasks={tasks} setModal={setModal} setForm={setForm} openProject={(id:string)=>{setSelectedProjectId(id);setTab('project')}}/>}
      {tab==='recruitment'&&<RecruitmentPage recruits={recruits} setModal={setModal} setStage={setStage} deleteRow={deleteRow}/>}
      {tab==='trends'&&<TrendsPage trends={trends} setModal={setModal} deleteRow={deleteRow}/>}
      {tab==='contacts'&&<ContactsPage contacts={contacts} setModal={setModal} deleteRow={deleteRow}/>}
      {tab==='files'&&<FilesPage files={files} setModal={setModal} deleteRow={deleteRow}/>}
      {tab==='notes'&&<NotesPage notes={notes} setModal={setModal} deleteRow={deleteRow}/>}
      {tab==='reminders'&&<RemindersPage reminders={reminders} setModal={setModal} deleteRow={deleteRow} go={go}/>}
      {tab==='discord'&&<DiscordPage go={go}/>}
      {tab==='connections'&&<ConnectionsTab/>}
      {tab==='settings'&&<SettingsPage go={go}/>}
      {tab==='more'&&<MorePage go={go}/>}
      {tab==='project'&&selectedProjectId&&<ProjectTab project={projects.find(p=>p.id===selectedProjectId)} tasks={tasks} meetings={meetings} notes={notes} contacts={contacts} files={files} trends={trends} setModal={setModal} setForm={setForm} deleteRow={deleteRow} toggleTask={toggleTask} back={()=>{setTab('projects');setSelectedProjectId(null)}}/>}
    </main>

    <div className="quickFabWrap">
      {quickMenu&&<div className="quickFabMenu">
        <button onClick={()=>{setModal('task');setQuickMenu(false)}}><CheckSquare size={17}/> Task</button>
        <button onClick={()=>{setModal('reminder');setQuickMenu(false)}}><Bell size={17}/> Reminder</button>
        <button onClick={()=>{setModal('note');setQuickMenu(false)}}><StickyNote size={17}/> Note</button>
        <button onClick={()=>{setModal('meeting');setQuickMenu(false)}}><CalendarDays size={17}/> Meeting</button>
        <button onClick={()=>{setModal('recruit');setQuickMenu(false)}}><Users size={17}/> Recruit</button>
      </div>}
      <button className={'quickFab '+(quickMenu?'open':'')} onClick={()=>setQuickMenu(!quickMenu)} aria-label="Quick add"><Plus size={24}/></button>
    </div>

    <nav className="nav">
      <Nav active={tab==='home'} label="Home" icon={<Home size={19}/>} on={()=>go('home')}/>
      <Nav active={tab==='calendar'} label="Calendar" icon={<CalendarDays size={19}/>} on={()=>go('calendar')}/>
      <Nav active={tab==='tasks'} label="Tasks" icon={<CheckSquare size={19}/>} on={()=>go('tasks')}/>
      <Nav active={tab==='projects'||tab==='project'} label="Projects" icon={<FolderKanban size={19}/>} on={()=>go('projects')}/>
      <Nav active={!['home','calendar','tasks','projects','project'].includes(tab)} label="More" icon={<Menu size={19}/>} on={()=>go('more')}/>
    </nav>
    {modal&&<Modal type={modal} form={form} setForm={setForm} close={()=>{setModal(null);setForm({})}} save={save} searchResults={searchResults} projects={projects}/>} 
    {toast&&<div className="toast">{toast}</div>}
  </>
}

function SmartInbox({tasks,meetings,reminders,recruits,drafts,go,toggleTask,setStage}:any){
  const now=Date.now(), soon=now+24*60*60*1000
  const overdueTasks=tasks.filter((t:Task)=>t.status!=='done'&&t.due_at&&new Date(t.due_at).getTime()<now)
  const dueReminders=reminders.filter((r:Reminder)=>!r.sent_at&&new Date(r.remind_at).getTime()<=soon)
  const followUps=recruits.filter((r:Recruit)=>r.next_follow_up&&new Date(r.next_follow_up).getTime()<=soon&&r.stage!=='onboarded'&&r.stage!=='not_interested')
  const upcoming=meetings.filter((m:Meeting)=>{const t=new Date(m.starts_at).getTime();return t>=now&&t<=soon})
  const unsent=drafts.filter((d:Draft)=>d.status!=='sent')
  const total=overdueTasks.length+dueReminders.length+followUps.length+upcoming.length+unsent.length
  return <Section title="Smart Inbox" actions={<span className="tag">{total} need attention</span>}>
    {total===0?<div className="card"><Empty text="Nothing needs your attention right now."/></div>:<div className="stack inboxStack">
      {overdueTasks.length>0&&<div className="card inboxCard"><div className="row between"><div><h3>Overdue tasks</h3><p className="muted compactText">{overdueTasks.length} need finishing</p></div><button className="btn secondary" onClick={()=>go('tasks')}>View all</button></div><div className="stack">{overdueTasks.slice(0,4).map((t:Task)=><div className="listRow" key={t.id}><div className="grow"><b>{t.title}</b><div className="muted">Due {new Date(t.due_at!).toLocaleString()}</div></div><button className="btn secondary" onClick={()=>toggleTask(t)}>Done</button></div>)}</div></div>}
      {dueReminders.length>0&&<div className="card inboxCard"><div className="row between"><div><h3>Reminders</h3><p className="muted compactText">Coming up in the next 24 hours</p></div><button className="btn secondary" onClick={()=>go('reminders')}>View</button></div><div className="stack">{dueReminders.slice(0,4).map((r:Reminder)=><div className="listRow" key={r.id}><Bell size={17}/><div className="grow"><b>{r.title}</b><div className="muted">{new Date(r.remind_at).toLocaleString()}</div></div></div>)}</div></div>}
      {followUps.length>0&&<div className="card inboxCard"><div className="row between"><div><h3>Recruitment follow-ups</h3><p className="muted compactText">People you need to get back to</p></div><button className="btn secondary" onClick={()=>go('recruitment')}>Open</button></div><div className="stack">{followUps.slice(0,4).map((r:Recruit)=><div className="listRow" key={r.id}><div className="grow"><b>{r.name}</b><div className="muted">{r.handle||''} · {new Date(r.next_follow_up!).toLocaleString()}</div></div><button className="btn secondary" onClick={()=>setStage(r,'contacted')}>Contacted</button></div>)}</div></div>}
      {upcoming.length>0&&<div className="card inboxCard"><div className="row between"><div><h3>Upcoming meetings</h3><p className="muted compactText">Next 24 hours</p></div><button className="btn secondary" onClick={()=>go('calendar')}>Calendar</button></div><div className="stack">{upcoming.slice(0,4).map((m:Meeting)=><div className="listRow" key={m.id}><div className="grow"><b>{m.title}</b><div className="muted">{new Date(m.starts_at).toLocaleString()}</div></div>{m.join_url&&<a href={m.join_url} target="_blank">Join</a>}</div>)}</div></div>}
      {unsent.length>0&&<div className="card inboxCard"><div className="row between"><div><h3>Email drafts</h3><p className="muted compactText">{unsent.length} waiting to send</p></div><button className="btn secondary" onClick={()=>go('mail')}>Mail</button></div><div className="stack">{unsent.slice(0,3).map((d:Draft)=><div className="listRow" key={d.id}><Mail size={17}/><div className="grow"><b>{d.subject||'(No subject)'}</b><div className="muted">To {d.recipient}</div></div></div>)}</div></div>}
    </div>}
  </Section>
}

function HomeTab({openTasks,todayMeetings,projects,recruits,priorityTasks,next,overdue,quick,setQuick,addQuick,setModal,go}:any){
  const focus=priorityTasks.slice(0,3)
  return <>
    <section className="brief card calmHero"><div><span className="eyebrow">TODAY</span><h2>{overdue.length?overdue.length+' overdue item'+(overdue.length===1?'':'s'):'You’re up to date'}</h2><p className="muted">{todayMeetings.length} meeting{todayMeetings.length===1?'':'s'} today · {openTasks.length} open task{openTasks.length===1?'':'s'}</p></div><button className="btn secondary" onClick={()=>go('inbox')}><Bell size={16}/> Smart Inbox</button></section>
    <section className="grid main calmMain">
      <div className="stack">
        <div className="card quickCard"><h3>Quick add</h3><div className="quick"><input className="input" placeholder="What do you need to do?" value={quick} onChange={e=>setQuick(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addQuick()}/><button className="btn" onClick={addQuick}><Plus size={18}/></button></div></div>
        <div className="card"><div className="row between"><div><h3>Focus next</h3><p className="muted compactText">Just your top 3. Everything else stays in Tasks.</p></div><button className="btn secondary" onClick={()=>setModal('task')}>+ Task</button></div><div className="stack focusList">{focus.map((t:Task)=><TaskItem key={t.id} t={t}/>) }{!focus.length&&<Empty text="Nothing urgent right now."/>}</div></div>
      </div>
      <div className="card nextCard"><div className="row between"><h3>Next meeting</h3><Clock3 size={18}/></div>{next?<div className="meeting"><b>{next.title}</b><div className="muted">{new Date(next.starts_at).toLocaleString()}</div>{next.location&&<div className="muted">{next.location}</div>}{next.join_url&&<a href={next.join_url} target="_blank"><button className="btn joinBtn">Join</button></a>}</div>:<Empty text="No upcoming meetings."/>}<button className="btn secondary full" onClick={()=>setModal('meeting')}>Add meeting</button></div>
    </section>
  </>
}
function CalendarTab({meetings,reminders,setModal,deleteRow}:any){
  const [googleEvents,setGoogleEvents]=useState<any[]>([]),[calendarMsg,setCalendarMsg]=useState('')
  async function loadGoogle(){setCalendarMsg('');const r=await fetch('/api/integrations/google/calendar',{cache:'no-store'});const j=await r.json();if(r.ok)setGoogleEvents(j.events||[]);else setCalendarMsg(j.error||'Connect Google first.')}
  async function addToGoogle(m:Meeting){const r=await fetch('/api/integrations/google/calendar',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(m)});const j=await r.json();setCalendarMsg(r.ok?'Meeting added to Google Calendar.':j.error||'Could not add meeting')}
  return <Section title="Calendar" actions={<><button className="btn secondary" onClick={loadGoogle}><RefreshCw size={16}/> Sync Google</button><button className="btn" onClick={()=>setModal('meeting')}><Plus size={17}/> Meeting</button></>}>
    {calendarMsg&&<div className="integrationNote">{calendarMsg}</div>}
    <div className="grid main">
      <div className="card"><h3>Your meetings</h3><div className="stack">{meetings.map((m:Meeting)=><div className="listRow" key={m.id}><div className="listIcon"><CalendarDays size={18}/></div><div className="grow"><b>{m.title}</b><div className="muted">{new Date(m.starts_at).toLocaleString()} · {m.source}</div></div>{m.source==='manual'&&<button className="btn secondary" onClick={()=>addToGoogle(m)}>Add to Google</button>}{m.join_url&&<a href={m.join_url} target="_blank"><button className="btn secondary">Join</button></a>}<button className="ghostDanger" onClick={()=>deleteRow('assistant_meetings',m.id)}><X size={16}/></button></div>)}{!meetings.length&&<Empty text="No meetings yet."/>}</div></div>
      <div className="card"><h3>Google Calendar</h3><div className="stack">{googleEvents.map((m:any)=><div className="listRow" key={m.id}><div className="listIcon"><CalendarDays size={18}/></div><div className="grow"><b>{m.title}</b><div className="muted">{m.starts_at?new Date(m.starts_at).toLocaleString():''}</div></div>{m.join_url&&<a href={m.join_url} target="_blank">Open</a>}</div>)}{!googleEvents.length&&<Empty text="Press Sync Google when you want to load your calendar."/>}</div></div>
    </div>
  </Section>
}
function TasksTab({tasks,projects,notes,toggleTask,setModal,setForm,deleteRow,openProject}:any){
  const open=tasks.filter((t:Task)=>t.status!=='done'&&t.status!=='cancelled')
  const done=tasks.filter((t:Task)=>t.status==='done')
  return <Section title="Tasks" actions={<button className="btn" onClick={()=>setModal('task')}><Plus size={17}/> New task</button>}>
    <div className="card"><div className="row between simpleHeader"><div><h3>Open tasks</h3><p className="muted compactText">{open.length} remaining</p></div></div><div className="stack">{open.map((t:Task)=><div className="task" key={t.id}><div className="row between"><div className="grow"><b>{t.title}</b><div className="muted">Priority {t.priority}/5{t.due_at?' · '+new Date(t.due_at).toLocaleDateString():''}</div></div><button className="btn secondary" onClick={()=>toggleTask(t)}>Done</button><button className="ghostDanger" onClick={()=>deleteRow('assistant_tasks',t.id)}><X size={16}/></button></div></div>)}{!open.length&&<Empty text="No open tasks."/>}</div></div>
    {done.length>0&&<details className="card collapsedCard"><summary>Completed ({done.length})</summary><div className="stack completedStack">{done.map((t:Task)=><div className="task done" key={t.id}><div className="row between"><div className="grow"><b>{t.title}</b></div><button className="btn secondary" onClick={()=>toggleTask(t)}>Undo</button></div></div>)}</div></details>}
  </Section>
}
function MailTab({drafts,setModal,deleteRow,loadAll}:any){
  const [inbox,setInbox]=useState<any[]>([]),[loadingInbox,setLoadingInbox]=useState(false),[mailMsg,setMailMsg]=useState('')
  async function loadInbox(){setLoadingInbox(true);setMailMsg('');const r=await fetch('/api/integrations/google/gmail',{cache:'no-store'});const j=await r.json();if(r.ok)setInbox(j.messages||[]);else setMailMsg(j.error||'Connect Google first.');setLoadingInbox(false)}
  async function sendDraft(d:Draft){setMailMsg('');const r=await fetch('/api/integrations/google/send',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({to:d.recipient,subject:d.subject,body:d.body,draftId:d.id})});const j=await r.json();setMailMsg(r.ok?'Email sent through Gmail.':j.error||'Send failed');if(r.ok)loadAll()}
  return <Section title="Mail hub" actions={<><button className="btn secondary" onClick={()=>window.dispatchEvent(new CustomEvent('open-connections'))}><Link2 size={16}/> Connections</button><button className="btn" onClick={()=>setModal('email')}><Send size={16}/> Compose</button></>}>
    {mailMsg&&<div className="integrationNote">{mailMsg}</div>}
    <div className="grid main"><div className="card"><div className="row between"><div><h3>Gmail inbox</h3><p className="muted">Your connected Gmail account stays private to this assistant login.</p></div><button className="btn secondary" onClick={loadInbox}><RefreshCw size={16}/> {loadingInbox?'Loading…':'Refresh inbox'}</button></div><div className="stack">{inbox.map((m:any)=><div className="listRow" key={m.id}><div className="listIcon"><Mail size={18}/></div><div className="grow"><b>{m.subject}</b><div className="muted">{m.from}</div><small>{m.snippet}</small></div></div>)}{!inbox.length&&!loadingInbox&&<Empty text="Connect Google, then refresh to load your inbox."/>}</div></div>
    <div className="card"><h3>Outbox / drafts</h3><div className="stack">{drafts.map((d:Draft)=><div className="listRow" key={d.id}><div className="listIcon"><Mail size={18}/></div><div className="grow"><b>{d.subject||'(No subject)'}</b><div className="muted">To: {d.recipient} · {d.status}</div></div>{d.status!=='sent'&&<button className="btn secondary" onClick={()=>sendDraft(d)}><Send size={15}/> Send</button>}<button className="ghostDanger" onClick={()=>deleteRow('assistant_email_drafts',d.id)}><X size={16}/></button></div>)}{!drafts.length&&<Empty text="No drafts yet."/>}</div></div></div>
  </Section>
}

function MoreTab({recruits,trends,contacts,files,projects,setModal,setForm,setStage,deleteRow,openProject}:any){
  return <Section title="Projects & hub" actions={<><button className="btn secondary" onClick={()=>window.dispatchEvent(new CustomEvent('open-connections'))}><Link2 size={16}/> Connections</button><button className="btn" onClick={()=>{setForm({status:'active'});setModal('project')}}><Plus size={17}/> New project</button></>}>
    <div className="card projectLibrary"><div className="row between"><div><h3>Project folders</h3><p className="muted">Name these however you want — agency work, Fortnite maps, clothing, personal jobs, anything.</p></div><FolderKanban size={24}/></div><div className="workspaceGrid">{projects.map((p:Project)=><button className="workspace" key={p.id} onClick={()=>openProject(p.id)}><div className="workspaceIcon"><FolderKanban/></div><div><div className="row between"><b>{p.name}</b><span className="tag">{p.status}</span></div><p>{p.description||'Open this folder to manage its tasks, notes, meetings, contacts and files.'}</p></div></button>)}{!projects.length&&<Empty text="Create your first project folder."/>}</div></div>
    <div className="hubGrid">
      <HubCard icon={<Users/>} title="Recruitment" count={recruits.length} action={()=>setModal('recruit')}><div className="miniList">{recruits.slice(0,4).map((r:Recruit)=><div key={r.id}><span><b>{r.name}</b><small>{r.handle||'No handle'}</small></span><select value={r.stage} onChange={e=>setStage(r,e.target.value)}><option>lead</option><option>contacted</option><option>replied</option><option>joining</option><option>onboarded</option><option>not_interested</option></select></div>)}</div></HubCard>
      <HubCard icon={<TrendingUp/>} title="Creator trends" count={trends.filter((t:Trend)=>!t.project_id).length} action={()=>setModal('trend')}><div className="miniList">{trends.filter((t:Trend)=>!t.project_id).slice(0,4).map((t:Trend)=><div key={t.id}><span><b>{t.title}</b><small>{t.platform} · {t.status}</small></span></div>)}</div></HubCard>
      <HubCard icon={<Contact/>} title="General contacts" count={contacts.filter((c:ContactRow)=>!c.project_id).length} action={()=>setModal('contact')}><div className="miniList">{contacts.filter((c:ContactRow)=>!c.project_id).slice(0,4).map((c:ContactRow)=><div key={c.id}><span><b>{c.name}</b><small>{c.role||c.company||c.handle||''}</small></span></div>)}</div></HubCard>
      <HubCard icon={<FileText/>} title="General files & links" count={files.filter((f:FileRow)=>!f.project_id).length} action={()=>setModal('file')}><div className="miniList">{files.filter((f:FileRow)=>!f.project_id).slice(0,4).map((f:FileRow)=><div key={f.id}><span><b>{f.name}</b><small>{f.provider}</small></span>{f.url&&<a href={f.url} target="_blank">Open</a>}</div>)}</div></HubCard>
    </div>
  </Section>
}

function ProjectTab({project,tasks,meetings,notes,contacts,files,trends,setModal,setForm,deleteRow,toggleTask,back}:any){
  if(!project)return <Empty text="Project not found."/>
  const pid=project.id
  const pt=tasks.filter((x:Task)=>x.project_id===pid), pm=meetings.filter((x:Meeting)=>x.project_id===pid), pn=notes.filter((x:Note)=>x.project_id===pid), pc=contacts.filter((x:ContactRow)=>x.project_id===pid), pf=files.filter((x:FileRow)=>x.project_id===pid), pr=trends.filter((x:Trend)=>x.project_id===pid)
  const add=(type:string,extra:any={})=>{setForm({project_id:pid,...extra});setModal(type)}
  return <Section title={project.name} actions={<><button className="btn secondary" onClick={back}><ArrowLeft size={16}/> Back</button><button className="btn" onClick={()=>add('task')}><Plus size={16}/> Task</button></>}>
    <div className="projectHero card"><div><span className="eyebrow">PROJECT FOLDER</span><h2>{project.name}</h2><p className="muted">{project.description||'Everything for this project lives here.'}</p></div><span className="tag">{project.status}</span></div>
    <div className="projectActions"><button onClick={()=>add('task')}><CheckSquare size={17}/> Task</button><button onClick={()=>add('note')}><StickyNote size={17}/> Note</button><button onClick={()=>add('meeting')}><CalendarDays size={17}/> Meeting</button><button onClick={()=>add('contact')}><Contact size={17}/> Contact</button><button onClick={()=>add('file')}><FileText size={17}/> File / link</button><button onClick={()=>add('trend')}><TrendingUp size={17}/> Idea</button></div>
    <div className="hubGrid">
      <div className="card hubCard"><h3>Tasks <span className="tag">{pt.length}</span></h3><div className="miniList">{pt.map((t:Task)=><div key={t.id}><span><b>{t.title}</b><small>{t.status} · difficulty {t.difficulty}/5</small></span><button className="miniButton" onClick={()=>toggleTask(t)}>{t.status==='done'?'Undo':'Done'}</button></div>)}{!pt.length&&<Empty text="No tasks in this project."/>}</div></div>
      <div className="card hubCard"><h3>Notes <span className="tag">{pn.length}</span></h3><div className="miniList">{pn.map((n:Note)=><div key={n.id}><span><b>{n.title||'Note'}</b><small>{n.body.slice(0,90)}</small></span><button className="ghostDanger" onClick={()=>deleteRow('assistant_notes',n.id)}><X size={15}/></button></div>)}{!pn.length&&<Empty text="No notes in this project."/>}</div></div>
      <div className="card hubCard"><h3>Meetings <span className="tag">{pm.length}</span></h3><div className="miniList">{pm.map((m:Meeting)=><div key={m.id}><span><b>{m.title}</b><small>{new Date(m.starts_at).toLocaleString()}</small></span>{m.join_url&&<a href={m.join_url} target="_blank">Join</a>}</div>)}{!pm.length&&<Empty text="No meetings in this project."/>}</div></div>
      <div className="card hubCard"><h3>Contacts <span className="tag">{pc.length}</span></h3><div className="miniList">{pc.map((c:ContactRow)=><div key={c.id}><span><b>{c.name}</b><small>{c.role||c.company||c.email||c.handle||''}</small></span></div>)}{!pc.length&&<Empty text="No contacts in this project."/>}</div></div>
      <div className="card hubCard"><h3>Files & links <span className="tag">{pf.length}</span></h3><div className="miniList">{pf.map((f:FileRow)=><div key={f.id}><span><b>{f.name}</b><small>{f.provider}</small></span>{f.url&&<a href={f.url} target="_blank">Open</a>}</div>)}{!pf.length&&<Empty text="No files or links in this project."/>}</div></div>
      <div className="card hubCard"><h3>Ideas / trends <span className="tag">{pr.length}</span></h3><div className="miniList">{pr.map((t:Trend)=><div key={t.id}><span><b>{t.title}</b><small>{t.status} · {t.platform}</small></span></div>)}{!pr.length&&<Empty text="No ideas in this project."/>}</div></div>
    </div>
  </Section>
}

function TaskItem({t}:{t:Task}){return <div className="task"><div className="row between"><div className="grow"><b>{t.title}</b><div className="muted">Difficulty {t.difficulty}/5 · Priority {t.priority}/5{t.due_at?` · due ${new Date(t.due_at).toLocaleDateString()}`:''}</div></div><CheckCircle2 size={18}/></div></div>}
function Stat({label,value}:{label:string,value:number}){return <div className="card stat"><span className="muted">{label}</span><b>{value}</b></div>}
function Connect({name,status,action}:{name:string,status:string,action?:()=>void}){return <div className="task row between"><div><b>{name}</b><div className="muted">{status}</div></div><button className="btn secondary" onClick={action}>Connect</button></div>}
function Section({title,actions,children}:{title:string,actions?:React.ReactNode,children:React.ReactNode}){return <section><div className="row between sectionHeader"><h2>{title}</h2><div className="row actionWrap">{actions}</div></div>{children}</section>}
function Nav({active,label,icon,on}:{active:boolean,label:string,icon:React.ReactNode,on:()=>void}){return <button className={active?'active':''} onClick={on}><div>{icon}</div><small>{label}</small></button>}
function Empty({text}:{text:string}){return <div className="empty">{text}</div>}
function HubCard({icon,title,count,action,children}:{icon:React.ReactNode,title:string,count:number,action:()=>void,children:React.ReactNode}){return <div className="card hubCard"><div className="row between"><div className="row"><div className="hubIcon">{icon}</div><div><h3>{title}</h3><span className="muted">{count} items</span></div></div><button className="btn secondary" onClick={action}><Plus size={16}/></button></div>{children}</div>}

function Modal({type,form,setForm,close,save,searchResults,projects}:{type:string,form:any,setForm:(v:any)=>void,close:()=>void,save:()=>void,searchResults:any[],projects:Project[]}){
  const field=(k:string,p:string,t='text')=><input className="input" type={t} placeholder={p} value={form[k]||''} onChange={e=>setForm({...form,[k]:e.target.value})}/>
  const projectSelect=<select className="select" value={form.project_id||''} onChange={e=>setForm({...form,project_id:e.target.value||null})}><option value="">General / no project</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>
  return <div className="modal"><div className="card modalCard"><div className="row between"><div><div className="eyebrow">PLATINUM ASSISTANT</div><h2>{type==='search'?'Search results':`Add ${type}`}</h2></div><button className="iconBtn" onClick={close}><X size={18}/></button></div><div className="stack modalBody">
    {type==='task'&&<>{field('title','Task title')}{field('notes','Notes')}{field('due_at','Due date/time','datetime-local')}<div className="twoCols">{field('priority','Priority 1-5','number')}{field('difficulty','Difficulty 1-5','number')}</div>{projectSelect}</>}
    {type==='meeting'&&<>{field('title','Meeting title')}{projectSelect}<div className="twoCols">{field('starts_at','Start','datetime-local')}{field('ends_at','End','datetime-local')}</div>{field('location','Location')}{field('join_url','Meeting / Lark / Zoom link')}{field('notes','Notes')}</>}
    {type==='reminder'&&<>{field('title','What should I remind you about?')}{field('remind_at','Reminder date/time','datetime-local')}<select className="select" value={form.channel||'push'} onChange={e=>setForm({...form,channel:e.target.value})}><option value="push">Phone/browser notification</option><option value="lark">Lark (when connected)</option><option value="email">Email (when connected)</option></select></>}
    {type==='note'&&<>{field('title','Note title')}{projectSelect}<textarea className="textarea" placeholder="Write your note…" value={form.body||''} onChange={e=>setForm({...form,body:e.target.value})}/></>}
    {type==='project'&&<>{field('name','Project / folder name')}<select className="select" value={form.status||'active'} onChange={e=>setForm({...form,status:e.target.value})}><option value="active">Active</option><option value="paused">Paused</option><option value="completed">Completed</option><option value="archived">Archived</option></select><textarea className="textarea" placeholder="Project description" value={form.description||''} onChange={e=>setForm({...form,description:e.target.value})}/></>}
    {type==='recruit'&&<>{field('name','Name')}{field('handle','TikTok / handle')}<select className="select" value={form.stage||'lead'} onChange={e=>setForm({...form,stage:e.target.value})}><option>lead</option><option>contacted</option><option>replied</option><option>joining</option><option>onboarded</option></select>{field('next_follow_up','Follow-up date','datetime-local')}<textarea className="textarea" placeholder="Notes" value={form.notes||''} onChange={e=>setForm({...form,notes:e.target.value})}/></>}
    {type==='trend'&&<>{field('title','Trend / creator LIVE idea')}{projectSelect}{field('platform','Platform')}{field('assigned_to','Assign to')}{field('url','Reference link')}<select className="select" value={form.status||'idea'} onChange={e=>setForm({...form,status:e.target.value})}><option>idea</option><option>testing</option><option>working</option><option>retired</option></select><textarea className="textarea" placeholder="How to use it" value={form.description||''} onChange={e=>setForm({...form,description:e.target.value})}/></>}
    {type==='contact'&&<>{field('name','Name')}{projectSelect}<div className="twoCols">{field('email','Email','email')}{field('phone','Phone')}</div><div className="twoCols">{field('company','Company')}{field('role','Role')}</div><div className="twoCols">{field('platform','Platform')}{field('handle','Handle')}</div>{field('tags','Tags, separated by commas')}<textarea className="textarea" placeholder="Notes" value={form.notes||''} onChange={e=>setForm({...form,notes:e.target.value})}/></>}
    {type==='file'&&<>{field('name','File / link name')}{projectSelect}<select className="select" value={form.provider||'drive'} onChange={e=>setForm({...form,provider:e.target.value})}><option value="drive">Google Drive</option><option value="lark">Lark</option><option value="url">Web link</option><option value="other">Other</option></select>{field('url','Link')}</>}
    {type==='email'&&<>{field('recipient','Recipient email','email')}{field('cc','CC')}{field('bcc','BCC')}{field('subject','Subject')}<textarea className="textarea emailBody" placeholder="Write your email…" value={form.body||''} onChange={e=>setForm({...form,body:e.target.value})}/><div className="integrationNote">This saves as a draft now. Sending through Gmail activates once Google OAuth is connected.</div></>}
    {type==='search'&&<div className="stack">{searchResults.length?searchResults.map((r,i)=><div className="listRow" key={i}><span className="searchType">{r.type}</span><div><b>{r.title}</b><div className="muted">{r.meta}</div></div></div>):<Empty text="Start typing in the search bar to search across your assistant."/>}</div>}
    {type!=='search'&&<button className="btn saveBtn" onClick={save}>Save</button>}
  </div></div></div>
}
