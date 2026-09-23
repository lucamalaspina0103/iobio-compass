// Opzioni condivise di eta'/genere, usate sia dal profilo rapido dei Guest
// (screening/profile.tsx, facoltativo) sia dalla registrazione di un account
// (onboarding/auth.tsx, salva-progressi.tsx, obbligatorio - "preferisco non dirlo" e' una
// scelta valida). Devono corrispondere a ALLOWED_AGE_RANGES/ALLOWED_GENDERS nel backend.

export const AGE_RANGES = [
  { value: '18-24', label: '18-24 anni' },
  { value: '25-34', label: '25-34 anni' },
  { value: '35-44', label: '35-44 anni' },
  { value: '45-54', label: '45-54 anni' },
  { value: '55+', label: '55+ anni' },
  { value: 'preferisco-non-dirlo', label: 'Preferisco non dirlo' },
];

export const GENDERS = [
  { value: 'donna', label: 'Donna', icon: 'woman' },
  { value: 'uomo', label: 'Uomo', icon: 'man' },
  { value: 'non-binario', label: 'Non binario/fluido', icon: 'transgender' },
  { value: 'preferisco-non-dirlo', label: 'Preferisco non dirlo', icon: 'help-circle' },
];
