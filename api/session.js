import { get, put } from '@vercel/blob';
import { timingSafeEqual } from 'node:crypto';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// The complete workshop stays in private Blob. Firestore receives ONLY published sections.
// Firebase Admin credentials stay exclusively in the Vercel server environment.
let firestoreDatabase;
function liveFirestore(){
  if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_SERVICE_ACCOUNT_JSON ||
      !process.env.FIREBASE_API_KEY || !process.env.FIREBASE_APP_ID) return null;
  if (firestoreDatabase) return firestoreDatabase;
  const serviceAccount=JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  if (serviceAccount.project_id !== process.env.FIREBASE_PROJECT_ID) throw Error('Firebase project mismatch');
  const app=getApps().find(a=>a.name==='unfold-live') ||
    initializeApp({credential:cert(serviceAccount),projectId:process.env.FIREBASE_PROJECT_ID},'unfold-live');
  firestoreDatabase=getFirestore(app);
  return firestoreDatabase;
}
function publicState(s){
  return {title:s.title,subtitle:s.subtitle,accent:s.accent,
    published:s.published,active:s.active,sections:s.sections.slice(0,s.published+1)};
}

const PATH = 'unfold/live-session.json';
const noCache = { 'Cache-Control': 'no-store, private', 'X-Content-Type-Options': 'nosniff' };
const send = (res, code, data) => { res.writeHead(code, {'Content-Type':'application/json; charset=utf-8',...noCache});res.end(JSON.stringify(data)); };
function hasAdminKey(req){
  const expected = process.env.UNFOLD_ADMIN_KEY;
  const supplied = req.headers['x-unfold-key'];
  if (!expected || typeof supplied !== 'string') return false;
  const a=Buffer.from(supplied), b=Buffer.from(expected);
  return a.length===b.length && timingSafeEqual(a,b);
}
function clean(v,limit=10000){return typeof v==='string'?v.slice(0,limit):''}
function normalize(data){
  if(!data || typeof data!=='object'|| !Array.isArray(data.sections)||data.sections.length<1||data.sections.length>50) return null;
  const types=new Set(['text','image','video','link','audio','qr','prompt','quote']);
  const sections=[];
  for(const s of data.sections){
    if(!s||!Array.isArray(s.blocks)||s.blocks.length>100) return null;
    const blocks=[];
    for(const b of s.blocks){if(!b||!types.has(b.type)) return null;
      blocks.push({id:clean(b.id,40),type:b.type,heading:clean(b.heading,300),body:clean(b.body,15000),url:clean(b.url,2400),label:clean(b.label,200)});
    }
    sections.push({title:clean(s.title,150),desc:clean(s.desc,500),blocks});
  }
  const published=Math.max(0,Math.min(sections.length-1,Math.trunc(Number(data.published)||0)));
  const active=Math.max(0,Math.min(published,Math.trunc(Number(data.active)||0)));
  return {title:clean(data.title,200),subtitle:clean(data.subtitle,500),accent:/^#[0-9a-fA-F]{6}$/.test(data.accent)?data.accent:'#c5fa71',published,active,sections};
}
async function read(){
  const result=await get(PATH,{access:'private',useCache:false});
  if (!result || result.statusCode!==200) return null;
  return JSON.parse(await new Response(result.stream).text());
}
export default async function handler(req,res){
  if(!process.env.BLOB_READ_WRITE_TOKEN) return send(res,503,{error:'ストレージの接続が未完了です'});
  if(req.method==='GET'){
    try{
      const doc=await read();
      if(!doc) return send(res,200,{ok:true,version:0,state:null,admin:hasAdminKey(req)});
      if(hasAdminKey(req)) return send(res,200,{ok:true,version:doc.version,state:doc.state,admin:true});
      const s=doc.state;
      return send(res,200,{ok:true,version:doc.version,admin:false,state:publicState(s)});
    }catch(e){console.error('UNFOLD read failure',e?.message);return send(res,503,{error:'同期データを取得できませんでした'});}
  }
  if(req.method==='POST'){
    if(!hasAdminKey(req)) return send(res,401,{error:'管理者キーが正しくありません'});
    try{
      const input=typeof req.body==='string'?JSON.parse(req.body):req.body;
      if(JSON.stringify(input).length>250000) return send(res,413,{error:'教材データが大きすぎます'});
      const state=normalize(input?.state);
      if(!state) return send(res,400,{error:'教材データの形式が不正です'});
      const version=Date.now();
      await put(PATH,JSON.stringify({state,version}),{access:'private',addRandomSuffix:false,allowOverwrite:true,contentType:'application/json',cacheControlMaxAge:60});
      // Firestore provides push events via onSnapshot; avoid periodic polling when configured.
      const db=liveFirestore();
      if(db){
        await db.collection('unfoldLive').doc('main').set({state:publicState(state),version,updatedAt:new Date()});
      }
      return send(res,200,{ok:true,version,transport:db?'firestore':'blob'});
    }catch(e){console.error('UNFOLD write failure',e?.message);return send(res,503,{error:'同期データを保存できませんでした'});}
  }
  res.setHeader('Allow','GET, POST');return send(res,405,{error:'Method not allowed'});
}
