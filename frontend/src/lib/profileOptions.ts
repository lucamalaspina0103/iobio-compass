// Opzioni condivise di eta'/genere, usate sia dal profilo rapido dei Guest
// (screening/profile.tsx, facoltativo) sia dalla registrazione di un account
// (onboarding/auth.tsx, salva-progressi.tsx, obbligatorio - "preferisco non dirlo" e' una
// scelta valida). I "value" devono corrispondere a ALLOWED_AGE_RANGES/ALLOWED_GENDERS nel
// backend e NON si traducono; l'etichetta si traduce con t(labelKey).

export const AGE_RANGES = [
  { value: '18-24', labelKey: 'profile.age.18-24' },
  { value: '25-34', labelKey: 'profile.age.25-34' },
  { value: '35-44', labelKey: 'profile.age.35-44' },
  { value: '45-54', labelKey: 'profile.age.45-54' },
  { value: '55+', labelKey: 'profile.age.55+' },
  { value: 'preferisco-non-dirlo', labelKey: 'profile.preferNot' },
];

export const GENDERS = [
  { value: 'donna', labelKey: 'profile.gender.donna', icon: 'woman' },
  { value: 'uomo', labelKey: 'profile.gender.uomo', icon: 'man' },
  { value: 'non-binario', labelKey: 'profile.gender.non-binario', icon: 'transgender' },
  { value: 'preferisco-non-dirlo', labelKey: 'profile.preferNot', icon: 'help-circle' },
];
