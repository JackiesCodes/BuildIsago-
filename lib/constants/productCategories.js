export const PRODUCT_CATEGORIES = [
  { value: 'ui_kit', label: 'UI Kit' },
  { value: 'website_template', label: 'Website Template' },
  { value: 'brand_template', label: 'Brand Template' },
  { value: 'design_system', label: 'Design System' },
];

export const PRODUCT_CATEGORY_MAP = Object.fromEntries(PRODUCT_CATEGORIES.map((c) => [c.value, c]));

export function productCategoryLabel(value) {
  return PRODUCT_CATEGORY_MAP[value]?.label || value;
}
