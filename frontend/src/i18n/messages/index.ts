import type { Dict, LangCode } from '../core';
import { base } from './base';
import { auth } from './auth';

// Ogni file raggruppa le frasi di una zona dell'app, con le cinque lingue affiancate.
export type Messages = Record<LangCode, Dict>;

const PARTS: Messages[] = [base, auth];

export const MESSAGES: Messages = { it: {}, en: {}, fr: {}, es: {}, de: {} };
for (const part of PARTS) {
  for (const lang of Object.keys(MESSAGES) as LangCode[]) {
    Object.assign(MESSAGES[lang], part[lang]);
  }
}
