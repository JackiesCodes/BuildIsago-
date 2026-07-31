import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { notifyStudio, notifyUser } from '@/lib/notifications';
import { getOrigin } from '@/lib/utils/origin';

// No user session ever reaches this route — Stripe calls it directly, so
// every write here goes through the admin client (service role) rather
// than the normal cookie-based Supabase client used everywhere else.
export async function POST(req) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('Stripe webhook received but STRIPE_SECRET_KEY/STRIPE_WEBHOOK_SECRET are not set.');
    return NextResponse.json({ error: 'Stripe is not configured.' }, { status: 500 });
  }

  const signature = req.headers.get('stripe-signature');
  const rawBody = await req.text();

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const invoiceId = session.metadata?.invoice_id;
    const productId = session.metadata?.type === 'product' ? session.metadata?.product_id : null;
    const buyerId = session.metadata?.buyer_id;

    if (productId && buyerId) {
      const supabase = createAdminClient();
      const { data: product } = await supabase
        .from('products')
        .select('id, title, slug, created_by')
        .eq('id', productId)
        .single();

      if (product) {
        // Idempotent via the unique(product_id, buyer_id) constraint — a
        // retried Stripe event just no-ops the second time.
        const { error: insertError } = await supabase.from('product_purchases').insert({
          product_id: productId,
          buyer_id: buyerId,
          amount_paid: (session.amount_total || 0) / 100,
          currency: session.currency || 'usd',
          stripe_checkout_session_id: session.id,
          stripe_payment_intent_id: session.payment_intent,
          status: 'paid',
        });

        if (!insertError) {
          const origin = await getOrigin();
          await notifyStudio({
            subject: `Sale: ${product.title}`,
            text: `Someone bought "${product.title}" for ${((session.amount_total || 0) / 100).toFixed(2)} ${(session.currency || 'usd').toUpperCase()}.`,
          });
          await notifyUser(buyerId, {
            subject: `Your download: ${product.title}`,
            text: `Thanks for your purchase! Download "${product.title}" any time from your BuildIsago account.\n\n${origin}/dashboard/downloads`,
          });
        }
      }
    }

    if (invoiceId) {
      const supabase = createAdminClient();
      const { data: invoice } = await supabase
        .from('project_invoices')
        .select('id, project_id, status, invoice_number, created_by')
        .eq('id', invoiceId)
        .single();

      // Idempotency guard — Stripe can retry the same event.
      if (invoice && invoice.status !== 'paid') {
        await supabase
          .from('project_invoices')
          .update({
            status: 'paid',
            paid_at: new Date().toISOString(),
            stripe_checkout_session_id: session.id,
            stripe_payment_intent_id: session.payment_intent,
          })
          .eq('id', invoiceId);

        await supabase.from('messages').insert({
          project_id: invoice.project_id,
          sender_id: invoice.created_by,
          body: `Payment received for invoice ${invoice.invoice_number}. Thank you!`,
        });

        const origin = await getOrigin();
        await notifyStudio({
          subject: `Payment received — invoice ${invoice.invoice_number}`,
          text: `Payment received for invoice ${invoice.invoice_number}.\n\nView it: ${origin}/dashboard/studio/${invoice.project_id}/invoices/${invoiceId}`,
        });
      }
    }
  }

  return NextResponse.json({ received: true });
}
