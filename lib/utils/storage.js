/** Public URL for an object in the public product-previews bucket — safe
 *  to call from anon/server contexts since it's pure string construction,
 *  no auth check (the bucket itself is public). */
export function publicPreviewUrl(supabase, path) {
  if (!path) return null;
  return supabase.storage.from('product-previews').getPublicUrl(path).data.publicUrl;
}

/** Same idea, for the public course-covers bucket. */
export function publicCourseCoverUrl(supabase, path) {
  if (!path) return null;
  return supabase.storage.from('course-covers').getPublicUrl(path).data.publicUrl;
}
