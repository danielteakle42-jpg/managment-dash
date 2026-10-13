"use client";
import {useEffect,useRef,useState} from "react";
import {Download, ExternalLink, Megaphone, Share2, Trash2, Upload} from "lucide-react";
import {supabase} from "./supabase";

const CAMPAIGN_URL="https://www.tiktok.com/live/reflow/campaign-center?coverUrl=https%3A%2F%2Fp16-webcast-no.tiktokcdn-eu.com%2Fwebcast-no%2Fsub_d1ac9258960e10508e90a238856c248ffdc926aa624dad8ffc4acde2078d9979_1784292650354917~tplv-obj.png&enter_from_merge=live_take_page_campaign_center_new";

async function authHeaders(): Promise<Headers>{
  const headers = new Headers();
  const sessionResult = await supabase?.auth.getSession();
  const token = sessionResult?.data.session?.access_token;
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return headers;
}

type Banner={id:number;title:string;image_url:string;created_at:string};

function safeFileName(title:string,contentType:string){
  const ext=contentType.includes("png")?"png":contentType.includes("webp")?"webp":"jpg";
  const base=(title||"campaign-banner").trim().replace(/[^a-z0-9]+/gi,"-").replace(/^-+|-+$/g,"").toLowerCase()||"campaign-banner";
  return `${base}.${ext}`;
}

async function saveBanner(b:Banner,setStatus:(value:string)=>void){
  setStatus("Preparing banner…");
  try{
    const response=await fetch(b.image_url,{cache:"no-store"});
    if(!response.ok)throw new Error("Could not load banner");
    const blob=await response.blob();
    const file=new File([blob],safeFileName(b.title,blob.type),{type:blob.type||"image/jpeg"});

    if(typeof navigator!=="undefined" && navigator.share && (!navigator.canShare || navigator.canShare({files:[file]}))){
      try{
        await navigator.share({files:[file],title:b.title});
        setStatus("Choose Save Image / Save to Photos to add it to your camera roll.");
        return;
      }catch(error){
        if(error instanceof DOMException && error.name==="AbortError"){
          setStatus("");
          return;
        }
      }
    }

    const objectUrl=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=objectUrl;
    a.download=file.name;
    a.rel="noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(()=>URL.revokeObjectURL(objectUrl),1500);
    setStatus("Banner saved to your device downloads.");
  }catch{
    window.open(b.image_url,"_blank","noopener,noreferrer");
    setStatus("Banner opened. Press and hold the image to save it to Photos.");
  }
}

export function CreatorCampaignBanners(){
  const [items,setItems]=useState<Banner[]>([]);
  const [saving,setSaving]=useState<number|null>(null);
  const [status,setStatus]=useState<Record<number,string>>({});
  useEffect(()=>{fetch('/api/campaign-banners').then(r=>r.json()).then(x=>setItems(x.banners||[])).catch(()=>{})},[]);
  const runSave=async(b:Banner)=>{
    setSaving(b.id);
    await saveBanner(b,(value)=>setStatus(prev=>({...prev,[b.id]:value})));
    setSaving(null);
  };
  return <details className="panel dashboard-dropdown campaign-banner-panel">
    <summary className="dashboard-dropdown-summary"><div className="dropdown-summary-copy"><span className="dropdown-summary-icon"><Megaphone size={18}/></span><div><p className="eyebrow">Campaigns</p><h2>Campaign centre & banners</h2><p>Campaign artwork and TikTok opportunities together in one place.</p></div></div><span className="dropdown-chevron" aria-hidden="true"/></summary>
    <div className="dashboard-dropdown-content campaign-banner-list">
      <div className="campaign-centre-inline">
        <div><span className="eyebrow">TikTok LIVE</span><h3>Open Campaign Centre</h3><p>Check active campaigns, eligibility and requirements without leaving your creator workflow.</p></div>
        <a className="primary-button campaign-centre-button" href={CAMPAIGN_URL} target="_blank" rel="noreferrer">Open campaigns <ExternalLink size={16}/></a>
      </div>
      {items.length?items.map(b=><article key={b.id} className="campaign-banner-card">
        <h3>{b.title}</h3>
        <img src={b.image_url} alt={b.title}/>
        <div className="campaign-banner-save-row">
          <button className="primary-button campaign-save-button" type="button" disabled={saving===b.id} onClick={()=>void runSave(b)}>{saving===b.id?<><Download size={16}/> Preparing…</>:<><Share2 size={16}/> Save banner</>}</button>
          <small>{status[b.id]||"On mobile, tap Save banner then choose Save Image / Save to Photos."}</small>
        </div>
      </article>):<div className="campaign-empty-inline">No management banner is live right now. You can still open TikTok Campaign Centre above.</div>}
    </div>
  </details>
}

export function AdminCampaignBanners(){const input=useRef<HTMLInputElement>(null);const [items,setItems]=useState<Banner[]>([]);const [title,setTitle]=useState('');const [msg,setMsg]=useState('');const load=()=>fetch('/api/campaign-banners').then(r=>r.json()).then(x=>setItems(x.banners||[]));useEffect(()=>{load()},[]);const upload=async()=>{const file=input.current?.files?.[0];if(!file)return setMsg('Choose a banner image first.');const fd=new FormData();fd.append('file',file);fd.append('title',title||file.name.replace(/\.[^.]+$/,''));const r=await fetch('/api/campaign-banners',{method:'POST',headers:await authHeaders(),body:fd});const x=await r.json();setMsg(x.error||'Campaign banner uploaded.');if(r.ok){setTitle('');if(input.current)input.current.value='';load()}};const remove=async(id:number)=>{if(!confirm('Remove this campaign banner?'))return;const headers=await authHeaders();headers.set('Content-Type','application/json');await fetch('/api/campaign-banners',{method:'DELETE',headers,body:JSON.stringify({id})});load()};return <section className="panel campaign-admin-panel"><div className="quick-chat-head"><Megaphone/><div><h2>Creator campaign banners</h2><p>Upload banners here and they appear inside the creators’ combined Campaign Centre card.</p></div></div><div className="campaign-upload-row"><input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Campaign title"/><input ref={input} type="file" accept="image/png,image/jpeg,image/webp"/><button className="primary-button" type="button" onClick={upload}><Upload size={16}/> Upload banner</button></div>{msg&&<div className="admin-message">{msg}</div>}<div className="campaign-admin-list">{items.map(b=><div key={b.id}><span><b>{b.title}</b><small>{new Date(b.created_at).toLocaleDateString('en-GB')}</small></span><button className="danger-button" onClick={()=>remove(b.id)}><Trash2 size={15}/> Remove</button></div>)}</div></section>}
