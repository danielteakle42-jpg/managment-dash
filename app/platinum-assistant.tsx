'use client';
import {useState} from 'react';
import {Sparkles} from 'lucide-react';
import {supabase} from './supabase';
import type {Profile} from './shared';
export default function PlatinumAssistant({profile,onLinked}:{profile:Profile;onLinked:()=>void}){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[tiktok,setTiktok]=useState(profile.tiktok_username||'');
 async function headers(){const token=(await supabase?.auth.getSession())?.data.session?.access_token;return {'Authorization':`Bearer ${token||''}`,'Content-Type':'application/json'};}
 async function open(){setBusy(true);setMessage('');try{const r=await fetch('/api/assistant-launch',{method:'POST',headers:await headers()});const x=await r.json();if(!r.ok)throw new Error(x.error);const form=document.createElement('form');form.method='POST';form.action='https://life-assitant.vercel.app/api/hub-login';const input=document.createElement('input');input.type='hidden';input.name='token_hash';input.value=x.token_hash;form.appendChild(input);document.body.appendChild(form);form.submit();}catch(e){setMessage(e instanceof Error?e.message:'Could not open assistant.');setBusy(false);}}
 async function link(){try{const r=await fetch('/api/managers',{method:'PATCH',headers:await headers(),body:JSON.stringify({id:profile.id,tiktok_username:tiktok})});const x=await r.json();setMessage(x.error||'TikTok linked.');if(r.ok)onLinked();}catch{setMessage('Could not save TikTok link.');}}
 return <><section className="page-heading"><div><p className="eyebrow">Your workspace</p><h1>Platinum Assistant</h1></div></section><section className="panel"><h2>Your personal assistant</h2><p>Your tasks, projects, meetings and connections stay separate from other accounts.</p><button className="primary-button" onClick={open} disabled={busy}><Sparkles size={18}/>{busy?'Opening…':'Open my assistant'}</button>{message&&<p role="status">{message}</p>}</section>{profile.role==='admin'&&<section className="panel"><h2>Your TikTok account</h2><input aria-label="Your linked TikTok username" value={tiktok} onChange={e=>setTiktok(e.target.value)} placeholder="TikTok username"/><button className="secondary-button" onClick={link}>Save TikTok link</button></section>}</>;
}
