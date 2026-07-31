import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { notifyStudio } from '@/lib/notifications';
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
