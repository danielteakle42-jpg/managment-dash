'use client';
import {useEffect,useState} from 'react';
import {initialise,db} from './assistant-workspace/client';
import Workspace from './assistant-workspace/Workspace';
import type {Profile} from './shared';
export default function PlatinumAssistant({profile}:{profile:Profile;onLinked?:()=>void}){const [ready,setReady]=useState(false),[error,setError]=useState('');useEffect(()=>{let active=true;initialise().then(()=>{if(active)setReady(true)}).catch(e=>{if(active)setError(e.message)});return()=>{active=false;void db.auth.signOut({scope:'local'});}},[profile.id]);return <div className="platinum-assistant">{error?<section className="panel"><p role="alert">{error}</p><button onClick={()=>{setError('');initialise().then(()=>setReady(true)).catch(e=>setError(e.message))}}>Try again</button></section>:ready?<Workspace/>:<section className="panel">Loading your assistant…</section>}</div>}
