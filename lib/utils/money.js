export function formatMoney(amount, currency) {
  const value = Number(amount) || 0;
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: (currency || 'usd').toUpperCase() }).format(
      value
    );
  } catch {
    return `${value.toFixed(2)} ${(currency || 'usd').toUpperCase()}`;
  }
}

export function computeInvoiceTotals(lineItems, taxRate) {
  const subtotal = (lineItems || []).reduce(
    (sum, li) => sum + (Number(li.quantity) || 0) * (Number(li.unit_price) || 0),
    0
  );
  const taxAmount = subtotal * ((Number(taxRate) || 0) / 100);
  return { subtotal, taxAmount, total: subtotal + taxAmount };
}
