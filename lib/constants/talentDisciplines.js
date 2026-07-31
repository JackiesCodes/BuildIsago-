export const TALENT_DISCIPLINES = [
  { value: 'designer', label: 'Designer' },
  { value: 'developer', label: 'Developer' },
  { value: 'creative', label: 'Creative Talent' },
  { value: 'other', label: 'Other' },
];

export const TALENT_DISCIPLINE_MAP = Object.fromEntries(TALENT_DISCIPLINES.map((d) => [d.value, d]));

export function talentDisciplineLabel(value) {
  return TALENT_DISCIPLINE_MAP[value]?.label || value;
}

export const RATE_UNITS = [
  { value: 'hourly', label: 'Per hour' },
  { value: 'project', label: 'Per project' },
];
