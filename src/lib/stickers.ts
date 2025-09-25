import { supabase } from './supabase';
export async function uploadSticker(file:File, userId:string){
  const ext=(file.name.split('.').pop()||'png').toLowerCase();
  const name=`${userId}/${crypto.randomUUID()}.${ext}`;
  const up=await supabase.storage.from('stickers').upload(name,file,{upsert:true,contentType:file.type||'image/png'});
  if (up.error) throw up.error; const s=await supabase.storage.from('stickers').createSignedUrl(name,60*60*24*365);
  if (s.error) throw s.error; return {path:name, url:s.data.signedUrl};
}
export async function listStickers(userId:string, limit=200){
  const res=await supabase.storage.from('stickers').list(userId,{limit}); if(res.error||!res.data) return [];
  const out=[] as {path:string,url:string}[];
  for(const f of res.data){ const p=`${userId}/${f.name}`; const s=await supabase.storage.from('stickers').createSignedUrl(p,60*60*24*30); if(!s.error) out.push({path:p,url:s.data.signedUrl}); }
  return out;
}