import { NextResponse } from 'next/server';
import { serverClient, staffFromRequest } from '../_server';
const clean=(v:unknown)=>String(v||'').trim().replace(/^@/,'').toLowerCase();
export async function GET(request:Request){
 try { const url=new URL(request.url); const staff=await staffFromRequest(request); const creator=clean(url.searchParams.get('creator'));
  const db=serverClient();
  if(staff){ const {data,error}=await db.from('support_messages').select('*').order('created_at',{ascending:true}); if(error) throw error; return NextResponse.json({messages:data||[]}); }
  if(!creator) return NextResponse.json({error:'Creator required.'},{status:400});
  const {data,error}=await db.from('support_messages').select('*').eq('creator_username',creator).order('created_at',{ascending:true}); if(error) throw error;
  return NextResponse.json({messages:data||[]});
 } catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Could not load chat.'},{status:500});}
}
export async function POST(request:Request){
 try { const body=await request.json(); const db=serverClient(); const staff=await staffFromRequest(request); const creator=clean(body.creator); const text=String(body.message||'').trim();
  if(!creator||!text) return NextResponse.json({error:'Creator and message are required.'},{status:400});
  const sender=staff?staff.role:'creator'; const senderName=staff?(staff.display_name||staff.username):creator;
  const {data,error}=await db.from('support_messages').insert({creator_username:creator,sender_role:sender,sender_name:senderName,message:text}).select().single(); if(error) throw error;
  if(staff){ await db.from('hub_notifications').insert({recipient_username:creator,type:'support_reply',title:'Management replied',body:`${senderName} replied to your message.`,link_view:'managerChat'}); }
  else { await db.from('hub_notifications').insert({recipient_role:'staff',type:'support_request',title:'Creator needs help',body:`@${creator} sent a question to management.`,link_view:'managerChat'}); }
  return NextResponse.json({message:data});
 } catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Could not send message.'},{status:500});}
}
