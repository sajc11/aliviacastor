import { supabase } from './supabase';
export async function uploadJournalThumb(userId: string, id: string, dataUrl: string) {
  const res = await fetch(dataUrl); const blob = await res.blob();
  const path = `thumbs/${userId}/${id}.png`;
  const up = await supabase.storage.from('journal').upload(path, blob, { contentType:'image/png', upsert:true });
  if (up.error) throw up.error;
  const signed = await supabase.storage.from('journal').createSignedUrl(path, 60*60*24*365);
  if (signed.error) throw signed.error;
  return signed.data.signedUrl;
}