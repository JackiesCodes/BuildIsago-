export const DESIGN_FORMATS = [
  { value: 'instagram_post', label: 'Instagram Post', width: 1080, height: 1080 },
  { value: 'instagram_story', label: 'Instagram Story', width: 1080, height: 1920 },
  { value: 'presentation_slide', label: 'Presentation Slide (16:9)', width: 1920, height: 1080 },
  { value: 'facebook_cover', label: 'Facebook Cover', width: 820, height: 312 },
  { value: 'flyer_a4', label: 'Flyer (A4)', width: 794, height: 1123 },
  { value: 'square_card', label: 'Square Card', width: 1200, height: 1200 },
];

export const DESIGN_FORMAT_MAP = Object.fromEntries(DESIGN_FORMATS.map((f) => [f.value, f]));
