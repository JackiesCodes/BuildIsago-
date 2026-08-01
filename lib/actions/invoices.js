'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient, getSessionProfile } from '@/lib/supabase/server';
import { getStripe } from '@/lib/stripe';
import { computeInvoiceTotals, formatMoney } from '@/lib/utils/money';
import { getOrigin } from '@/lib/utils/origin';
import { notifyUser } from '@/lib/notifications';
import { logAudit, logError } from '@/lib/logging';

function paths(projectId) {
  revalidatePath(`/dashboard/client/${projectId}`);
  revalidatePath(`/dashboard/studio/${projectId}`);
  revalidatePath(`/dashboard/client/${projectId}/invoices`);
  revalidatePath(`/dashboard/studio/${projectId}/invoices`);
}

export async function createInvoice(projectId) {
  const { user, profile } = await getSessionProfile();
  if (!user || profile?.role !== 'studio') redirect('/login');

  const supabase = await createClient();
  const { data: invoiceNumber, error: numberError } = await supabase.rpc('next_invoice_number');
  if (numberError) return { error: numberError.message };

  const { data, error } = await supabase
    .from('project_invoices')
    .insert({ project_id: projectId, created_by: user.id, invoice_number: invoiceNumber })
    .select('id')
    .single();
  if (error) return { error: error.message };

  paths(projectId);
  redirect(`/dashboard/studio/${projectId}/invoices/${data.id}`);
}

export async function updateInvoice(invoiceId, projectId, payload) {
  const { user, profile } = await getSessionProfile();
  if (!user || profile?.role !== 'studio') redirect('/login');

  const supabase = await createClient();
  const { data: existing, error: fetchError } = await supabase
    .from('project_invoices')
    .select('status')
    .eq('id', invoiceId)
    .single();
  if (fetchError || !existing) return { error: 'Invoice not found.' };
  if (existing.status !== 'draft') return { error: 'Only draft invoices can be edited.' };

  const { error } = await supabase
    .from('project_invoices')
    .update({
      line_items: payload.lineItems,
      tax_rate: payload.taxRate,
      currency: payload.currency,
      due_date: payload.dueDate || null,
      notes: payload.notes || null,
    })
    .eq('id', invoiceId);
  if (error) return { error: error.message };

  paths(projectId);
  return { error: null };
}

export async function sendInvoice(invoiceId, projectId) {
  const { user, profile } = await getSessionProfile();
  if (!user || profile?.role !== 'studio') redirect('/login');

  const supabase = await createClient();
  const { data: invoice, error: fetchError } = await supabase
    .from('project_invoices')
    .select('status, invoice_number, line_items, tax_rate, currency')
    .eq('id', invoiceId)
    .single();
  if (fetchError || !invoice) return { error: 'Invoice not found.' };
  if (invoice.status !== 'draft') return { error: 'This invoice was already sent.' };

  const { total } = computeInvoiceTotals(invoice.line_items, invoice.tax_rate);
  if (!invoice.line_items?.length || total <= 0) {
    return { error: 'Add at least one line item with a value before sending.' };
  }

  const { error } = await supabase
    .from('project_invoices')
    .update({ status: 'sent', sent_at: new Date().toISOString() })
    .eq('id', invoiceId);
  if (error) return { error: error.message };

  await supabase.from('messages').insert({
    project_id: projectId,
    sender_id: user.id,
    body: `Invoice ${invoice.invoice_number} for ${formatMoney(total, invoice.currency)} is ready — view and pay it in the Invoices tab.`,
  });

  const { data: project } = await supabase.from('projects').select('client_id, title').eq('id', projectId).single();
  if (project) {
    const origin = await getOrigin();
    await notifyUser(project.client_id, {
      subject: `Invoice ${invoice.invoice_number} — ${formatMoney(total, invoice.currency)}`,
      text: `Invoice ${invoice.invoice_number} for ${formatMoney(total, invoice.currency)} is ready for "${project.title}".\n\nView and pay: ${origin}/dashboard/client/${projectId}/invoices/${invoiceId}`,
    });
  }

  paths(projectId);
  return { error: null };
}

export async function markInvoicePaidManually(invoiceId, projectId) {
  const { user, profile } = await getSessionProfile();
  if (!user || profile?.role !== 'studio') redirect('/login');

  const supabase = await createClient();
  const { data: invoice, error: fetchError } = await supabase
    .from('project_invoices')
    .select('status')
    .eq('id', invoiceId)
    .single();
  if (fetchError || !invoice) return { error: 'Invoice not found.' };
  if (invoice.status !== 'sent') return { error: 'Only sent invoices can be marked paid.' };

  const { error } = await supabase
    .from('project_invoices')
    .update({ status: 'paid', paid_at: new Date().toISOString() })
    .eq('id', invoiceId);
  if (error) return { error: error.message };

  paths(projectId);
  return { error: null };
}

export async function voidInvoice(invoiceId, projectId) {
  const { user, profile } = await getSessionProfile();
  if (!user || profile?.role !== 'studio') redirect('/login');

  const supabase = await createClient();
  const { data: invoice, error: fetchError } = await supabase
    .from('project_invoices')
    .select('status')
    .eq('id', invoiceId)
    .single();
  if (fetchError || !invoice) return { error: 'Invoice not found.' };
  if (invoice.status === 'paid') return { error: 'A paid invoice cannot be voided.' };

  const { error } = await supabase.from('project_invoices').update({ status: 'void' }).eq('id', invoiceId);
  if (error) return { error: error.message };

  paths(projectId);
  return { error: null };
}

export async function refundInvoice(invoiceId, projectId) {
  const { user, profile, supabase } = await getSessionProfile();
  if (!user || profile?.role !== 'studio') redirect('/login');
  if (!profile?.is_owner) return { error: 'Only a studio owner can issue refunds.' };

  const { data: invoice, error: fetchError } = await supabase
    .from('project_invoices')
    .select('status, stripe_payment_intent_id, invoice_number')
    .eq('id', invoiceId)
    .single();
  if (fetchError || !invoice) return { error: 'Invoice not found.' };
  if (invoice.status !== 'paid') return { error: 'Only a paid invoice can be refunded.' };
  if (!invoice.stripe_payment_intent_id) {
    return { error: 'This invoice was marked paid manually — refund it directly with however the payment was received.' };
  }

  let stripe;
  try {
    stripe = getStripe();
  } catch {
    return { error: 'Stripe is not configured.' };
  }

  let refund;
  try {
    refund = await stripe.refunds.create({ payment_intent: invoice.stripe_payment_intent_id });
  } catch (err) {
    await logError('refundInvoice', err, { invoiceId });
    return { error: `Stripe refund failed: ${err.message}` };
  }

  const { error } = await supabase
    .from('project_invoices')
    .update({ status: 'refunded', refunded_at: new Date().toISOString(), stripe_refund_id: refund.id })
    .eq('id', invoiceId);
  if (error) return { error: error.message };

  await logAudit(supabase, 'invoice.refunded', 'project_invoices', invoiceId, { stripe_refund_id: refund.id });

  paths(projectId);
  return { error: null };
}

export async function deleteInvoice(invoiceId, projectId) {
  const { user, profile } = await getSessionProfile();
  if (!user || profile?.role !== 'studio') redirect('/login');

  const supabase = await createClient();
  const { error } = await supabase.from('project_invoices').delete().eq('id', invoiceId);
  if (error) return { error: error.message };

  paths(projectId);
  return { error: null };
}

export async function createInvoiceCheckoutSession(invoiceId, projectId) {
  const { user, profile, supabase } = await getSessionProfile();
  if (!user) redirect('/login');

  const { data: invoice, error: fetchError } = await supabase
    .from('project_invoices')
    .select('id, invoice_number, status, currency, line_items, tax_rate')
    .eq('id', invoiceId)
    .eq('project_id', projectId)
    .single();
  if (fetchError || !invoice) return { error: 'Invoice not found.' };
  if (invoice.status !== 'sent') return { error: 'This invoice is not open for payment.' };

  const { taxAmount, total } = computeInvoiceTotals(invoice.line_items, invoice.tax_rate);
  if (total <= 0) return { error: 'This invoice has no payable amount.' };

  let stripe;
  try {
    stripe = getStripe();
  } catch {
    return { error: 'Online payment is not configured yet. Contact the studio to arrange payment.' };
  }

  const lineItems = (invoice.line_items || [])
    .filter((li) => Number(li.quantity) > 0 && Number(li.unit_price) > 0)
    .map((li) => ({
      price_data: {
        currency: invoice.currency,
        product_data: { name: li.description || 'Line item' },
        unit_amount: Math.round(Number(li.unit_price) * 100),
      },
      quantity: Number(li.quantity),
    }));

  if (taxAmount > 0) {
    lineItems.push({
      price_data: {
        currency: invoice.currency,
        product_data: { name: `Tax (${invoice.tax_rate}%)` },
        unit_amount: Math.round(taxAmount * 100),
      },
      quantity: 1,
    });
  }

  const roleBase = profile?.role === 'studio' ? 'studio' : 'client';
  const origin = await getOrigin();

  let session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems,
      success_url: `${origin}/dashboard/${roleBase}/${projectId}/invoices/${invoiceId}?paid=1`,
      cancel_url: `${origin}/dashboard/${roleBase}/${projectId}/invoices/${invoiceId}`,
      metadata: { invoice_id: invoice.id, project_id: projectId },
      payment_intent_data: { metadata: { invoice_id: invoice.id } },
    });
  } catch (err) {
    console.error('Stripe checkout session failed for invoice', invoiceId, err);
    return { error: 'Could not start checkout. Please try again.' };
  }

  redirect(session.url);
}
