import type { Dict, LangCode } from '../core';
import { base } from './base';
import { auth } from './auth';
import { questionnaire } from './questionnaire';
import { results } from './results';
import { tasks1 } from './tasks1';
import { tasks2 } from './tasks2';
import { oggi } from './oggi';
import { notices } from './notices';
import { ideas } from './ideas';

// Ogni file raggruppa le frasi di una zona dell'app, con le cinque lingue affiancate.
export type Messages = Record<LangCode, Dict>;

const PARTS: Messages[] = [base, auth, questionnaire, results, tasks1, tasks2, oggi, notices, ideas];

export const MESSAGES: Messages = { it: {}, en: {}, fr: {}, es: {}, de: {} };
for (const part of PARTS) {
  for (const lang of Object.keys(MESSAGES) as LangCode[]) {
    Object.assign(MESSAGES[lang], part[lang]);
  }
}
