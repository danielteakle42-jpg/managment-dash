'use client'
import {assistantFetch as fetch,connectProvider} from './client'
import { useEffect, useMemo, useState } from 'react'
import { Bell, CalendarDays, CheckCircle2, Cloud, Link2, Mail, MessageCircle, RefreshCw, Unplug, XCircle } from 'lucide-react'

type Integration={provider:string;status:string;account_label?:string|null;scopes?:string[];metadata?:any;updated_at?:string}

export default function ConnectionsTab(){
  const [items,setItems]=useState<Integration[]>([]),[loading,setLoading]=useState(true),[msg,setMsg]=useState(''),[discordUrl,setDiscordUrl]=useState(''),[discordMessage,setDiscordMessage]=useState(''),[sendingDiscord,setSendingDiscord]=useState(false),[drive,setDrive]=useState<any[]>([]),[larkCalendars,setLarkCalendars]=useState<any[]>([])
  const map=useMemo(()=>Object.fromEntries(items.map(x=>[x.provider,x])),[items])
  async function load(){setLoading(true);const r=await fetch('/api/integrations/status',{cache:'no-store'});const j=await r.json();setItems(j.integrations||[]);setLoading(false)}
  useEffect(()=>{load()},[])
  async function disconnect(provider:string){await fetch('/api/integrations/disconnect',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({provider})});setDrive([]);setLarkCalendars([]);setMsg(`${provider} disconnected`);load()}
  async function connectDiscord(){setMsg('');const r=await fetch('/api/integrations/discord',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({webhook_url:discordUrl,label:'Platinum Assistant'})});const j=await r.json();setMsg(r.ok?'Discord connected and test message sent.':j.error||'Discord connection failed');if(r.ok){setDiscordUrl('');load()}}
  async function sendDiscordAnnouncement(){
    const message=discordMessage.trim()
    if(!message){setMsg('Write an announcement first.');return}
    setSendingDiscord(true);setMsg('')
    try{
      const r=await fetch('/api/integrations/discord',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({message})})
      const j=await r.json()
      if(!r.ok) throw new Error(j.error||'Discord message failed')
      setDiscordMessage('')
      setMsg('Announcement posted to Discord.')
    }catch(error:any){setMsg(error?.message||'Discord message failed')}
    finally{setSendingDiscord(false)}
  }
  async function enablePush(){
    setMsg('')
    if(!('Notification' in window)){setMsg('Notifications are not supported in this browser.');return}
    try{
      if('serviceWorker' in navigator) await navigator.serviceWorker.register('/assistant-sw.js')
      const permission=await Notification.requestPermission()
      await fetch('/api/integrations/push',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({permission})})
      if(permission!=='granted'){setMsg('Notification permission was not granted.');load();return}
      const reg=await navigator.serviceWorker.ready
      await reg.showNotification('Platinum Assistant',{body:'Notifications are working on this device.',tag:'platinum-test'})
      setMsg('Notifications enabled — test notification sent.')
      load()
    }catch(error:any){setMsg(error?.message||'Could not enable notifications.')}
  }
  async function testPush(){
    try{
      const reg=await navigator.serviceWorker.ready
      await reg.showNotification('Platinum Assistant',{body:'Test notification — your browser alerts are working.',tag:'platinum-test'})
      setMsg('Test notification sent.')
    }catch(error:any){setMsg(error?.message||'Test notification failed.')}
  }
  async function loadDrive(){const r=await fetch('/api/integrations/google/drive',{cache:'no-store'});const j=await r.json();setMsg(r.ok?'':j.error||'Drive failed');setDrive(j.files||[])}
  async function loadLark(){const r=await fetch('/api/integrations/lark/calendar',{cache:'no-store'});const j=await r.json();setMsg(r.ok?'':j.error||'Lark failed');setLarkCalendars(j.calendars||[])}
  const Card=({icon,title,provider,description,connect,children}:{icon:any;title:string;provider:string;description:string;connect:()=>void;children?:any})=>{
    const item=map[provider], connected=item?.status==='connected'
    return <div className="card connectionCard"><div className="row between"><div className="row"><div className="hubIcon">{icon}</div><div><h3>{title}</h3><p className="muted">{connected?(item.account_label||'Connected'):description}</p></div></div><span className={'tag '+(connected?'connectedTag':'')}>{connected?'Connected':'Not connected'}</span></div><div className="connectionActions">{connected?<button className="btn secondary" onClick={()=>disconnect(provider)}><Unplug size={16}/> Disconnect</button>:<button className="btn" onClick={connect}><Link2 size={16}/> Connect</button>}{children}</div></div>
  }
  return <section><div className="row between sectionHeader"><div><span className="eyebrow">ACCOUNT CONNECTIONS</span><h2>Connections</h2><p className="muted">Each signed-in assistant account connects its own services. Your data does not mix with another account.</p></div><button className="btn secondary" onClick={load}><RefreshCw size={16}/> Refresh</button></div>
    {msg&&<div className="integrationNote">{msg}</div>}
    {loading?<div className="card">Loading connections…</div>:<div className="hubGrid">
      <Card icon={<Mail/>} title="Google / Gmail" provider="google" description="Gmail, Calendar and Drive use one Google connection." connect={()=>void connectProvider('google').catch(e=>setMsg(e.message))}>
        {map.google?.status==='connected'&&<button className="btn secondary" onClick={loadDrive}><Cloud size={16}/> Load Drive</button>}
      </Card>
      <Card icon={<CalendarDays/>} title="Lark" provider="lark" description="Connect your own Lark identity and calendars." connect={()=>void connectProvider('lark').catch(e=>setMsg(e.message))}>
        {map.lark?.status==='connected'&&<button className="btn secondary" onClick={loadLark}><CalendarDays size={16}/> Check calendars</button>}
      </Card>
      <div className="card connectionCard"><div className="row between"><div className="row"><div className="hubIcon"><MessageCircle/></div><div><h3>Discord</h3><p className="muted">{map.discord?.status==='connected'?(map.discord.account_label||'Connected'):'Connect a Discord channel webhook, then post announcements straight from the assistant.'}</p></div></div><span className={'tag '+(map.discord?.status==='connected'?'connectedTag':'')}>{map.discord?.status==='connected'?'Connected':'Not connected'}</span></div>{map.discord?.status==='connected'?<div className="stack"><textarea className="textarea" value={discordMessage} onChange={e=>setDiscordMessage(e.target.value)} placeholder="Type an announcement to post in Discord…" maxLength={1900}/><div className="connectionActions"><button className="btn" onClick={sendDiscordAnnouncement} disabled={sendingDiscord||!discordMessage.trim()}><MessageCircle size={16}/> {sendingDiscord?'Posting…':'Post to Discord'}</button><button className="btn secondary" onClick={()=>disconnect('discord')}><Unplug size={16}/> Disconnect</button></div><small className="muted">{discordMessage.length}/1900 characters</small></div>:<div className="stack"><input className="input" value={discordUrl} onChange={e=>setDiscordUrl(e.target.value)} placeholder="Discord webhook URL"/><button className="btn" onClick={connectDiscord}><Link2 size={16}/> Connect & test</button></div>}</div>
      <Card icon={<Bell/>} title="Phone / browser alerts" provider="push" description="Enable meeting and reminder notifications on this browser." connect={enablePush}>
        {map.push?.status==='connected'&&<button className="btn secondary" onClick={testPush}><Bell size={16}/> Test notification</button>}
      </Card>
    </div>}
    {!!drive.length&&<div className="card connectionResult"><div className="row between"><h3>Google Drive</h3><span className="tag">{drive.length} recent files</span></div><div className="miniList">{drive.slice(0,12).map(f=><div key={f.id}><span><b>{f.name}</b><small>{f.mimeType}</small></span>{f.webViewLink&&<a href={f.webViewLink} target="_blank">Open</a>}</div>)}</div></div>}
    {!!larkCalendars.length&&<div className="card connectionResult"><div className="row between"><h3>Lark calendars</h3><span className="tag">{larkCalendars.length}</span></div><div className="miniList">{larkCalendars.slice(0,12).map((c:any,i)=><div key={c.calendar_id||i}><span><b>{c.summary||c.name||'Calendar'}</b><small>{c.description||c.type||''}</small></span></div>)}</div></div>}
  </section>
}
