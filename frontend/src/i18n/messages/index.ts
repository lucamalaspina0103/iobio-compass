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
import { plan } from './plan';
import { profilo } from './profilo';
import { sounds } from './sounds';
import { misc } from './misc';
import { notifs } from './notifs';
import { account } from './account';
import { review } from './review';

// Ogni file raggruppa le frasi di una zona dell'app, con le cinque lingue affiancate.
export type Messages = Record<LangCode, Dict>;

const PARTS: Messages[] = [base, auth, questionnaire, results, tasks1, tasks2, oggi, notices, ideas, plan, profilo, sounds, misc, notifs, account, review];

export const MESSAGES: Messages = { it: {}, en: {}, fr: {}, es: {}, de: {} };
for (const part of PARTS) {
  for (const lang of Object.keys(MESSAGES) as LangCode[]) {
    Object.assign(MESSAGES[lang], part[lang]);
  }
}
