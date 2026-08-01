import { describe, it, expect } from 'vitest';
import { courseLevelLabel } from './courseLevels';
import { productCategoryLabel } from './productCategories';
import { talentDisciplineLabel } from './talentDisciplines';
import { ventureStageLabel } from './ventureStages';
import { billingIntervalLabel } from './billingIntervals';

// One of these label helpers regressing to "undefined" or a raw enum
// value in the UI is exactly the kind of silent bug that never fails
// loudly — worth locking down even though the logic is trivial.
describe('label lookup helpers', () => {
  it('map known values to their display label', () => {
    expect(courseLevelLabel('beginner')).toBe('Beginner');
    expect(productCategoryLabel('ui_kit')).toBe('UI Kit');
    expect(talentDisciplineLabel('designer')).toBe('Designer');
    expect(ventureStageLabel('incubating')).toBe('Incubating');
    expect(billingIntervalLabel('month')).toBe('Monthly');
  });

  it('fall back to the raw value for an unknown key instead of throwing', () => {
    expect(courseLevelLabel('not-a-level')).toBe('not-a-level');
    expect(productCategoryLabel('not-a-category')).toBe('not-a-category');
  });

  it('fall back gracefully for undefined input', () => {
    expect(courseLevelLabel(undefined)).toBe(undefined);
  });
});
