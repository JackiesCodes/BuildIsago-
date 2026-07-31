export const VENTURE_STAGES = [
  { value: 'idea', label: 'Idea' },
  { value: 'incubating', label: 'Incubating' },
  { value: 'launched', label: 'Launched' },
  { value: 'exited', label: 'Exited' },
];

export const APPLICATION_STAGES = VENTURE_STAGES.filter((s) => s.value !== 'exited');

export const VENTURE_STAGE_MAP = Object.fromEntries(VENTURE_STAGES.map((s) => [s.value, s]));

export function ventureStageLabel(value) {
  return VENTURE_STAGE_MAP[value]?.label || value;
}
