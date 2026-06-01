export const Colors = {
  primary:    '#f97316',   // orange logo
  primaryDark:'#ea6c00',
  primaryLight:'#fff7ed',
  secondary:  '#374151',   // charcoal logo
  bg:         '#f8fafc',
  card:       '#ffffff',
  border:     '#e5e7eb',
  text:       '#111827',
  textSub:    '#6b7280',
  textMuted:  '#9ca3af',
  success:    '#16a34a',
  successBg:  '#f0fdf4',
  warning:    '#d97706',
  warningBg:  '#fffbeb',
  error:      '#dc2626',
  errorBg:    '#fef2f2',
  info:       '#2563eb',
  infoBg:     '#eff6ff',
  white:      '#ffffff',
  black:      '#000000',
};

export const StatusColors: Record<string, { bg: string; text: string; label: string }> = {
  PENDING:      { bg: '#f3f4f6', text: '#374151',  label: 'En attente' },
  ACKNOWLEDGED: { bg: '#eff6ff', text: '#2563eb',  label: 'Accusé' },
  IN_PROGRESS:  { bg: '#fff7ed', text: '#f97316',  label: 'En cours' },
  COMPLETED:    { bg: '#f0fdf4', text: '#16a34a',  label: 'Terminée' },
  OPEN:         { bg: '#fef2f2', text: '#dc2626',  label: 'Ouvert' },
  RESOLVED:     { bg: '#f0fdf4', text: '#16a34a',  label: 'Résolu' },
  CLOSED:       { bg: '#f3f4f6', text: '#6b7280',  label: 'Fermé' },
};

export const SeverityColors: Record<string, { bg: string; text: string; label: string }> = {
  LOW:      { bg: '#f0fdf4', text: '#16a34a', label: 'Faible' },
  MEDIUM:   { bg: '#fffbeb', text: '#d97706', label: 'Moyen' },
  HIGH:     { bg: '#fff7ed', text: '#f97316', label: 'Élevé' },
  CRITICAL: { bg: '#fef2f2', text: '#dc2626', label: 'Critique' },
};
