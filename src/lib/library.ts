import { supabase } from './supabase';
export function isStoragePath(url?: string | null){ return !!url && !/^https?:\/\//i.test(url); }
export async function signFromLibrary(path:string, seconds=60*60*24*30){
  const { data, error } = await supabase.storage.from('library').createSignedUrl(path, seconds);
  if (error) throw error; return data.signedUrl;
}
export async function uploadLibraryImage(userId:string, folder:'spines'|'covers', basename:string, file:File){
  const ext = (file.name.split('.').pop() || 'png').toLowerCase();
  const path = `${folder}/${userId}/${basename}.${ext}`;
  const up = await supabase.storage.from('library').upload(path, file, { upsert:true, contentType: file.type || 'image/png' });
  if (up.error) throw up.error;
  const signed = await supabase.storage.from('library').createSignedUrl(path, 60*60*24*365);
  if (signed.error) throw signed.error;
  return { path, signedUrl: signed.data.signedUrl };
}
