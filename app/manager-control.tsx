'use client';
import {useState} from 'react';
import {Megaphone,Swords} from 'lucide-react';
import ArrangedBattles from './arranged-battles';
import {AdminCampaignBanners} from './campaign-banners';
import type {CreatorMetric,Profile} from './shared';
export default function ManagerControl({profile,records,onBattlesChanged}:{profile:Profile;records:CreatorMetric[];onBattlesChanged:()=>void}){
 const [tab,setTab]=useState<'campaigns'|'battles'>('campaigns');
 if(profile.role==='creator')return null;
 return <><section className="page-heading"><div><p className="eyebrow">Agency management</p><h1>Manager Control</h1><p>Set up campaigns and arrange creator battles.</p></div></section><div className="manager-control-tabs" role="tablist" aria-label="Manager setup"><button className={tab==='campaigns'?'primary-button':'secondary-button'} role="tab" aria-selected={tab==='campaigns'} aria-controls="campaign-setup" id="campaign-setup-tab" onClick={()=>setTab('campaigns')}><Megaphone size={18}/> Campaigns</button><button className={tab==='battles'?'primary-button':'secondary-button'} role="tab" aria-selected={tab==='battles'} aria-controls="battle-setup" id="battle-setup-tab" onClick={()=>setTab('battles')}><Swords size={18}/> Arranged Battles</button></div>{tab==='campaigns'?<section id="campaign-setup" role="tabpanel" aria-labelledby="campaign-setup-tab"><AdminCampaignBanners/></section>:<section id="battle-setup" role="tabpanel" aria-labelledby="battle-setup-tab"><ArrangedBattles profile={profile} records={records} onBattlesChanged={onBattlesChanged}/></section>}</>;
}
