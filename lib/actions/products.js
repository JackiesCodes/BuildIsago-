'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { randomUUID } from 'crypto';
import { createClient, getSessionProfile } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getStripe } from '@/lib/stripe';
import { getOrigin } from '@/lib/utils/origin';
import { notifyUser, notifyStudio } from '@/lib/notifications';

function paths(slug) {
  revalidatePath('/store');
  revalidatePath('/dashboard/studio/products');
  revalidatePath('/dashboard/downloads');
  if (slug) revalidatePath(`/store/${slug}`);
}

function slugify(text) {
  return (text || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export async function createProduct() {
  const { user, profile } = await getSessionProfile();
  if (!user || profile?.role !== 'studio') redirect('/login');

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('products')
    .insert({ created_by: user.id, slug: `product-${randomUUID().slice(0, 8)}` })
    .select('id')
    .single();
  if (error) return { error: error.message };

  paths();
  redirect(`/dashboard/studio/products/${data.id}`);
}

export async function updateProduct(productId, payload) {
  const { user, profile } = await getSessionProfile();
  if (!user || profile?.role !== 'studio') redirect('/login');

  const slug = slugify(payload.slug || payload.title);
  if (!slug) return { error: 'Give the product a title or a URL slug.' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('products')
    .update({
      title: payload.title?.trim() || 'New Product',
      slug,
      description: payload.description || null,
      category: payload.category,
      price: Number(payload.price) || 0,
      currency: payload.currency,
    })
    .eq('id', productId);

  if (error) {
    if (error.code === '23505') return { error: 'That URL slug is already taken by another product.' };
    return { error: error.message };
  }

  paths(slug);
  return { error: null };
}

export async function recordProductPreview(productId, storagePath) {
  const { user, profile } = await getSessionProfile();
  if (!user || profile?.role !== 'studio') redirect('/login');

  const supabase = await createClient();
  const { error } = await supabase.from('products').update({ preview_image_path: storagePath }).eq('id', productId);
  if (error) return { error: error.message };

  paths();
  return { error: null };
}

export async function recordProductFile(productId, storagePath) {
  const { user, profile } = await getSessionProfile();
  if (!user || profile?.role !== 'studio') redirect('/login');

  const supabase = await createClient();
  const { error } = await supabase.from('products').update({ file_path: storagePath }).eq('id', productId);
  if (error) return { error: error.message };

  paths();
  return { error: null };
}

export async function publishProduct(productId) {
  const { user, profile } = await getSessionProfile();
  if (!user || profile?.role !== 'studio') redirect('/login');

  const supabase = await createClient();
  const { data: product, error: fetchError } = await supabase
    .from('products')
    .select('title, file_path, slug')
    .eq('id', productId)
    .single();
  if (fetchError || !product) return { error: 'Product not found.' };
  if (!product.file_path) return { error: 'Upload the downloadable file before publishing.' };

  const { error } = await supabase.from('products').update({ status: 'published' }).eq('id', productId);
  if (error) return { error: error.message };

  paths(product.slug);
  return { error: null };
}

export async function unpublishProduct(productId) {
  const { user, profile } = await getSessionProfile();
  if (!user || profile?.role !== 'studio') redirect('/login');

  const supabase = await createClient();
  const { data: product } = await supabase.from('products').select('slug').eq('id', productId).single();
  const { error } = await supabase.from('products').update({ status: 'draft' }).eq('id', productId);
  if (error) return { error: error.message };

  paths(product?.slug);
  return { error: null };
}

export async function archiveProduct(productId) {
  const { user, profile } = await getSessionProfile();
  if (!user || profile?.role !== 'studio') redirect('/login');

  const supabase = await createClient();
  const { data: product } = await supabase.from('products').select('slug').eq('id', productId).single();
  const { error } = await supabase.from('products').update({ status: 'archived' }).eq('id', productId);
  if (error) return { error: error.message };

  paths(product?.slug);
  return { error: null };
}

export async function deleteProduct(productId) {
  const { user, profile } = await getSessionProfile();
  if (!user || profile?.role !== 'studio') redirect('/login');

  const supabase = await createClient();
  const { count } = await supabase
    .from('product_purchases')
    .select('id', { count: 'exact', head: true })
    .eq('product_id', productId);
  if (count) return { error: "This product has purchases and can't be deleted — archive it instead." };

  const { error } = await supabase.from('products').delete().eq('id', productId);
  if (error) return { error: error.message };

  paths();
  return { error: null };
}

export async function buyProduct(slug) {
  const { user, profile, supabase } = await getSessionProfile();
  if (!user) redirect(`/login?next=/store/${slug}`);

  const { data: product, error: fetchError } = await supabase
    .rpc('get_published_product', { p_slug: slug })
    .maybeSingle();
  if (fetchError || !product) return { error: 'This product is not available.' };

  if (Number(product.price) === 0) {
    const { error } = await supabase.rpc('claim_free_product', { p_product_id: product.id });
    if (error) return { error: error.message };

    const clientName = profile?.full_name || user.email;
    await notifyStudio({
      subject: `Free download claimed: ${product.title}`,
      text: `${clientName} claimed the free product "${product.title}".`,
    });
    await notifyUser(user.id, {
      subject: `Your download: ${product.title}`,
      text: `Thanks for grabbing "${product.title}"! Download it any time from your BuildIsago account.\n\n${await getOrigin()}/dashboard/downloads`,
    });

    redirect(`/dashboard/downloads?claimed=${product.slug}`);
  }

  let stripe;
  try {
    stripe = getStripe();
  } catch {
    return { error: 'Online payment is not configured yet. Please check back soon.' };
  }

  const origin = await getOrigin();
  let session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: product.currency,
            product_data: { name: product.title },
            unit_amount: Math.round(Number(product.price) * 100),
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/dashboard/downloads?purchased=${product.slug}`,
      cancel_url: `${origin}/store/${slug}`,
      metadata: { type: 'product', product_id: product.id, buyer_id: user.id },
    });
  } catch (err) {
    console.error('Stripe checkout session failed for product', product.id, err);
    return { error: 'Could not start checkout. Please try again.' };
  }

  redirect(session.url);
}

export async function getProductDownloadUrl(productId) {
  const { user, supabase } = await getSessionProfile();
  if (!user) redirect('/login');

  const { data: purchase } = await supabase
    .from('product_purchases')
    .select('id')
    .eq('product_id', productId)
    .eq('buyer_id', user.id)
    .eq('status', 'paid')
    .maybeSingle();
  if (!purchase) return { error: "You don't have access to this download." };

  const admin = createAdminClient();
  const { data: product } = await admin.from('products').select('file_path, title').eq('id', productId).single();
  if (!product?.file_path) return { error: 'This file is no longer available.' };

  const { data, error } = await supabase.storage.from('product-files').createSignedUrl(product.file_path, 300);
  if (error || !data?.signedUrl) return { error: 'Could not generate a download link. Please try again.' };

  return { error: null, url: data.signedUrl };
}
