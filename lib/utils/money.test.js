import { describe, it, expect } from 'vitest';
import { formatMoney, computeInvoiceTotals } from './money';

describe('formatMoney', () => {
  it('formats a plain number as currency', () => {
    expect(formatMoney(49, 'usd')).toBe('$49.00');
  });

  it('defaults to usd when no currency given', () => {
    expect(formatMoney(10)).toBe('$10.00');
  });

  it('treats non-numeric input as zero', () => {
    expect(formatMoney('not a number', 'usd')).toBe('$0.00');
    expect(formatMoney(null, 'usd')).toBe('$0.00');
    expect(formatMoney(undefined, 'usd')).toBe('$0.00');
  });

  it('falls back to a plain string for an unrecognized currency code', () => {
    expect(formatMoney(10, 'not-a-currency')).toBe('10.00 NOT-A-CURRENCY');
  });
});

describe('computeInvoiceTotals', () => {
  it('sums quantity times unit price across line items', () => {
    const { subtotal, taxAmount, total } = computeInvoiceTotals(
      [
        { quantity: 2, unit_price: 100 },
        { quantity: 1, unit_price: 50 },
      ],
      0
    );
    expect(subtotal).toBe(250);
    expect(taxAmount).toBe(0);
    expect(total).toBe(250);
  });

  it('applies a percentage tax rate on top of the subtotal', () => {
    const { subtotal, taxAmount, total } = computeInvoiceTotals([{ quantity: 1, unit_price: 100 }], 10);
    expect(subtotal).toBe(100);
    expect(taxAmount).toBe(10);
    expect(total).toBe(110);
  });

  it('treats missing or malformed line items as zero rather than throwing', () => {
    expect(computeInvoiceTotals(null, 10)).toEqual({ subtotal: 0, taxAmount: 0, total: 0 });
    expect(computeInvoiceTotals([{ quantity: 'x', unit_price: 'y' }], 0).total).toBe(0);
  });

  it('defaults a missing tax rate to zero', () => {
    const { taxAmount } = computeInvoiceTotals([{ quantity: 1, unit_price: 100 }], undefined);
    expect(taxAmount).toBe(0);
  });
});
