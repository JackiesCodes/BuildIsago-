export const COURSE_LEVELS = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

export const COURSE_LEVEL_MAP = Object.fromEntries(COURSE_LEVELS.map((l) => [l.value, l]));

export function courseLevelLabel(value) {
  return COURSE_LEVEL_MAP[value]?.label || value;
}
