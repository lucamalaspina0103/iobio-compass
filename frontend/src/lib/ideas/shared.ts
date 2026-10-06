// Strumenti comuni alle raccolte di idee tradotte (en/fr/es/de). L'italiano resta in ideaLibrary.ts.
// Regole di contenuto, valide in ogni lingua:
//  - solo fonti, libri, film, programmi REALI e conosciuti, citati col loro nome;
//  - niente episodi o dettagli che potremmo indovinare male, nessuna promessa medica;
//  - ogni idea deve poter essere fatta SUBITO;
//  - la musica e' sempre e solo quella delle sessioni binaurali di Suoni, mai musica esterna;
//  - i riferimenti culturali (film, libri) sono scelti per chi parla quella lingua, non tradotti alla lettera.

import type { Idea } from '../ideaLibrary';

export type IdeaPools = { [category: string]: Idea[] };

export const idea = (text: string, pointer?: string, action?: Idea['action']): Idea => ({ text, pointer, action });

// Pulsante verso una sessione di Suoni. Con `minutes` e' la versione "meditazione".
export const sounds = (session: string, minutes?: string): NonNullable<Idea['action']> => ({
  label: '',
  labelKey: 'ideas.openSounds',
  route: '/(tabs)/suoni',
  params: minutes ? { session, minutes } : { session },
  doneLabelKey: minutes ? 'ideas.doneMeditated' : undefined,
});

export interface CuratedLocal {
  passage: string;
  pointer?: string;
}
export type CuratedPools = { [area: string]: CuratedLocal[] };
