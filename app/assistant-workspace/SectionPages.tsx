'use client'
import {assistantFetch as fetch,connectProvider} from './client'
import { useEffect, useState } from 'react'
import { Bell, Cloud, Contact, FileText, FolderKanban, Link2, Mail, MessageCircle, Plus, Send, StickyNote, Target, TrendingUp, Users, X } from 'lucide-react'

function Section({title,actions,children}:{title:string;actions?:React.ReactNode;children:React.ReactNode}){
  return <section><div className="row between sectionHeader"><h2>{title}</h2><div className="row actionWrap">{actions}</div></div>{children}</section>
}
function Empty({text}:{text:string}){return <div className="empty">{text}</div>}

export function ProjectsPage({projects,tasks,setModal,setForm,openProject}:any){
  return <Section title="Projects" actions={<button className="btn" onClick={()=>{setForm({status:'active'});setModal('project')}}><Plus size={17}/> New project</button>}>
    <div className="card projectLibrary"><div className="row between"><div><h3>Project folders</h3><p className="muted">Tasks, notes, meetings, contacts, files and ideas stay tied to the same project.</p></div><FolderKanban size={24}/></div>
    <div className="workspaceGrid">{projects.map((p:any)=>{const count=tasks.filter((t:any)=>t.project_id===p.id&&t.status!=='done').length;return <button className="workspace" key={p.id} onClick={()=>openProject(p.id)}><div className="workspaceIcon"><FolderKanban/></div><div><div className="row between"><b>{p.name}</b><span className="tag">{p.status}</span></div><p>{p.description||'Open this project to manage everything linked to it.'}</p><small className="muted">{count} open tasks</small></div></button>})}{!projects.length&&<Empty text="Create your first project folder."/>}</div></div>
  </Section>
}

export function RecruitmentPage({recruits,setModal,setStage,deleteRow}:any){
  return <Section title="Recruitment" actions={<button className="btn" onClick={()=>setModal('recruit')}><Plus size={17}/> Add recruit</button>}>
    <div className="card"><div className="stack">{recruits.map((r:any)=><div className="listRow" key={r.id}><div className="grow"><b>{r.name}</b><div className="muted">{r.handle||'No handle'}{r.next_follow_up?' · follow up '+new Date(r.next_follow_up).toLocaleString():''}</div></div><select value={r.stage} onChange={e=>setStage(r,e.target.value)}><option>lead</option><option>contacted</option><option>replied</option><option>joining</option><option>onboarded</option><option>not_interested</option></select><button className="ghostDanger" onClick={()=>deleteRow('assistant_recruitment',r.id)}><X size={16}/></button></div>)}{!recruits.length&&<Empty text="No recruits yet."/>}</div></div>
  </Section>
}

export function TrendsPage({trends,setModal,deleteRow}:any){
  return <Section title="Creator trends & ideas" actions={<button className="btn" onClick={()=>setModal('trend')}><Plus size={17}/> Add idea</button>}>
    <div className="hubGrid">{trends.map((t:any)=><div className="card hubCard" key={t.id}><div className="row between"><div><h3>{t.title}</h3><span className="muted">{t.platform} · {t.status}</span></div><button className="ghostDanger" onClick={()=>deleteRow('assistant_trends',t.id)}><X size={16}/></button></div>{t.description&&<p>{t.description}</p>}{t.url&&<a href={t.url} target="_blank">Open reference</a>}</div>)}{!trends.length&&<Empty text="No trends or ideas yet."/>}</div>
  </Section>
}

export function ContactsPage({contacts,setModal,deleteRow}:any){
  return <Section title="Contacts" actions={<button className="btn" onClick={()=>setModal('contact')}><Plus size={17}/> Add contact</button>}>
    <div className="card"><div className="stack">{contacts.map((c:any)=><div className="listRow" key={c.id}><div className="grow"><b>{c.name}</b><div className="muted">{[c.role,c.company,c.handle,c.email].filter(Boolean).join(' · ')}</div></div>{c.phone&&<a href={'tel:'+c.phone}>Call</a>}<button className="ghostDanger" onClick={()=>deleteRow('assistant_contacts',c.id)}><X size={16}/></button></div>)}{!contacts.length&&<Empty text="No contacts yet."/>}</div></div>
  </Section>
}

export function FilesPage({files,setModal,deleteRow}:any){
  const [drive,setDrive]=useState<any[]>([]),[msg,setMsg]=useState('')
  async function loadDrive(){const r=await fetch('/api/integrations/google/drive',{cache:'no-store'});const j=await r.json();if(r.ok)setDrive(j.files||[]);else setMsg(j.error||'Connect Google first.')}
  return <Section title="Files & links" actions={<><button className="btn secondary" onClick={loadDrive}><Cloud size={16}/> Load Drive</button><button className="btn" onClick={()=>setModal('file')}><Plus size={17}/> Add link</button></>}>
    {msg&&<div className="integrationNote">{msg}</div>}<div className="grid main"><div className="card"><h3>Saved files & links</h3><div className="miniList">{files.map((f:any)=><div key={f.id}><span><b>{f.name}</b><small>{f.provider}</small></span><span className="row">{f.url&&<a href={f.url} target="_blank">Open</a>}<button className="ghostDanger" onClick={()=>deleteRow('assistant_files',f.id)}><X size={15}/></button></span></div>)}{!files.length&&<Empty text="No saved files or links."/>}</div></div><div className="card"><h3>Google Drive</h3><div className="miniList">{drive.map((f:any)=><div key={f.id}><span><b>{f.name}</b><small>{f.mimeType}</small></span>{f.webViewLink&&<a href={f.webViewLink} target="_blank">Open</a>}</div>)}{!drive.length&&<Empty text="Press Load Drive to show recent files."/>}</div></div></div>
  </Section>
}

export function NotesPage({notes,setModal,deleteRow}:any){
  return <Section title="Notes & brain dump" actions={<button className="btn" onClick={()=>setModal('note')}><Plus size={17}/> New note</button>}>
    <div className="hubGrid">{notes.map((n:any)=><div className="card note" key={n.id}><div className="row between"><b>{n.title||'Note'}</b><button className="ghostDanger" onClick={()=>deleteRow('assistant_notes',n.id)}><X size={16}/></button></div><p>{n.body}</p></div>)}{!notes.length&&<Empty text="No notes yet."/>}</div>
  </Section>
}

export function RemindersPage({reminders,setModal,deleteRow,go}:any){
  return <Section title="Reminders" actions={<><button className="btn secondary" onClick={()=>go('connections')}><Bell size={16}/> Notification settings</button><button className="btn" onClick={()=>setModal('reminder')}><Plus size={17}/> Add reminder</button></>}>
    <div className="card"><div className="stack">{reminders.map((r:any)=><div className="listRow" key={r.id}><div className="listIcon"><Bell size={18}/></div><div className="grow"><b>{r.title}</b><div className="muted">{new Date(r.remind_at).toLocaleString()} · {r.channel}{r.sent_at?' · sent':''}</div></div><button className="ghostDanger" onClick={()=>deleteRow('assistant_reminders',r.id)}><X size={16}/></button></div>)}{!reminders.length&&<Empty text="No reminders yet."/>}</div></div>
  </Section>
}

export function DiscordPage({go}:any){
  const [status,setStatus]=useState<any>(null),[message,setMessage]=useState(''),[msg,setMsg]=useState(''),[sending,setSending]=useState(false)
  useEffect(()=>{fetch('/api/integrations/status',{cache:'no-store'}).then(r=>r.json()).then(j=>setStatus((j.integrations||[]).find((x:any)=>x.provider==='discord')))},[])
  async function send(){if(!message.trim())return;setSending(true);setMsg('');const r=await fetch('/api/integrations/discord',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({message:message.trim()})});const j=await r.json();if(r.ok){setMessage('');setMsg('Announcement posted to Discord.')}else setMsg(j.error||'Discord message failed');setSending(false)}
  return <Section title="Discord announcements" actions={<button className="btn secondary" onClick={()=>go('connections')}><Link2 size={16}/> Connections</button>}>
    {msg&&<div className="integrationNote">{msg}</div>}<div className="card"><div className="row between"><div><h3>Announcement composer</h3><p className="muted">{status?.status==='connected'?'Posts through your connected Platinum Assistant webhook.':'Connect Discord first in Connections.'}</p></div><span className={'tag '+(status?.status==='connected'?'connectedTag':'')}>{status?.status==='connected'?'Connected':'Not connected'}</span></div><textarea className="textarea emailBody" value={message} onChange={e=>setMessage(e.target.value)} maxLength={1900} placeholder="Write the announcement exactly how you want it posted in Discord…"/><div className="row between"><small className="muted">{message.length}/1900</small><button className="btn" disabled={status?.status!=='connected'||sending||!message.trim()} onClick={send}><Send size={16}/> {sending?'Posting…':'Post to Discord'}</button></div></div>
  </Section>
}

export function SettingsPage({go}:any){
  return <Section title="Settings"><div className="hubGrid"><button className="card workspace" onClick={()=>go('connections')}><div className="workspaceIcon"><Link2/></div><div><b>Connections</b><p>Google, Lark, Discord and phone/browser notifications.</p></div></button><div className="card hubCard"><h3>Account separation</h3><p className="muted">Each assistant login keeps its own projects, tasks, integrations and personal data.</p></div></div></Section>
}

export function MorePage({go}:any){
  const groups:any[]=[
    {title:'Work',items:[['inbox','Smart Inbox',<Bell size={19}/>],['mail','Mail',<Mail size={19}/>],['recruitment','Recruitment',<Users size={19}/>],['trends','Ideas',<TrendingUp size={19}/>]]},
    {title:'Organise',items:[['notes','Notes',<StickyNote size={19}/>],['contacts','Contacts',<Contact size={19}/>],['files','Files',<FileText size={19}/>],['reminders','Reminders',<Bell size={19}/>]]},
    {title:'Connect',items:[['discord','Discord',<MessageCircle size={19}/>],['connections','Connections',<Link2 size={19}/>],['settings','Settings',<Target size={19}/>]]}
  ]
  return <Section title="More"><div className="moreGroups">{groups.map((g:any)=><div className="moreGroup" key={g.title}><h3>{g.title}</h3><div className="simpleMenu">{g.items.map(([id,label,icon]:any)=><button key={id} onClick={()=>go(id)}><span className="workspaceIcon">{icon}</span><b>{label}</b><span className="menuArrow">›</span></button>)}</div></div>)}</div></Section>
}
