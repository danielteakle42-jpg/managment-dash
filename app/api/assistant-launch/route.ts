import {NextResponse} from 'next/server';
import {serverClient,staffFromRequest} from '../_server';
export async function POST(request:Request){try{const staff=await staffFromRequest(request);if(!staff)return NextResponse.json({error:'Staff access required.'},{status:403});const db=serverClient();const {data,error}=await db.auth.admin.getUserById(staff.id);if(error||!data.user?.email)throw new Error('Staff account not found.');
// Preserve the owner's existing assistant workspace. Managers use their own hub identity.
const email=staff.role==='admin'?'danielteakle42@gmail.com':data.user.email;
const {data:link,error:linkError}=await db.auth.admin.generateLink({type:'magiclink',email});if(linkError||!link.properties?.hashed_token)throw new Error('Could not open your assistant.');return NextResponse.json({token_hash:link.properties.hashed_token},{headers:{'Cache-Control':'no-store'}});}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Assistant login failed.'},{status:500});}}
