import { supabase } from './supabase';
export async function uploadPhoto(file:File, folder='public'){
  const ext=(file.name.split('.').pop()||'jpg').toLowerCase();
  const name=crypto.randomUUID()+'.'+ext; const path=`${folder}/${name}`;
  const up=await supabase.storage.from('photos').upload(path,file,{upsert:true,contentType:file.type||'image/jpeg'});
  if (up.error) throw up.error; const s=await supabase.storage.from('photos').createSignedUrl(path,60*60*24*365);
  if (s.error) throw s.error; return {path, url:s.data.signedUrl};
}
export async function listPhotos(prefix='public', limit=60){
  const res=await supabase.storage.from('photos').list(prefix,{limit}); if(res.error||!res.data) return [];
  const out=[] as string[]; for (const f of res.data){ const s=await supabase.storage.from('photos').createSignedUrl(`${prefix}/${f.name}`,60*60*24*7); if(!s.error) out.push(s.data.signedUrl); }
  return out;
}