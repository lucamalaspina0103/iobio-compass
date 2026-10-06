// Banca delle domande dello screening: 21 domande, 3 per ognuna delle 7 aree.
//  - screening completo: tutte e 21
//  - controllo rapido: la prima di ogni area (id che finisce con _1), le domande generali
//  - revisione del mese: le 7 generali + le altre 2 di un'area a rotazione (approfondimento)
// Tutte sulla stessa scala, cosi' l'Indice IOBIO resta confrontabile nel tempo.

// Question structure
export interface Question {
  id: string;
  area: string;
  text: string;
  scaleType: 'frequency' | 'quality' | 'intensity';
  polarity: 'positive' | 'negative';
  weight: number;
}

// FIXED 21 QUESTIONS (3 per area × 7 areas)
// Il controllo rapido usa solo la prima domanda di ogni area (id che finisce con _1): sono le
// domande generali, sulla stessa scala, cosi' l'Indice resta confrontabile nel tempo.
export const ALL_QUESTIONS: Question[] = [
  // ENERGIA (3)
  { id: 'energia_1', area: 'energia', text: 'Come valuti il tuo livello di energia durante il giorno?', scaleType: 'quality', polarity: 'positive', weight: 1 },
  { id: 'energia_2', area: 'energia', text: 'Quanto spesso ti senti stanco/a senza un motivo chiaro?', scaleType: 'frequency', polarity: 'negative', weight: 1 },
  { id: 'energia_3', area: 'energia', text: 'Nel pomeriggio, quanto ti è facile mantenere concentrazione e lucidità?', scaleType: 'quality', polarity: 'positive', weight: 1 },
  
  // SONNO (3)
  { id: 'sonno_1', area: 'sonno', text: 'Come valuti la qualità complessiva del tuo sonno nell\'ultima settimana?', scaleType: 'quality', polarity: 'positive', weight: 1.2 },
  { id: 'sonno_2', area: 'sonno', text: 'Quanto spesso ti svegli durante la notte?', scaleType: 'frequency', polarity: 'negative', weight: 1.2 },
  { id: 'sonno_3', area: 'sonno', text: 'Quanto ti senti riposato/a al risveglio?', scaleType: 'quality', polarity: 'positive', weight: 1 },
  
  // STRESS (3)
  { id: 'stress_1', area: 'stress', text: 'Negli ultimi 7 giorni, quanto ti sei sentito/a sotto pressione o in tensione?', scaleType: 'frequency', polarity: 'negative', weight: 1.2 },
  { id: 'stress_2', area: 'stress', text: 'Quanto spesso ti capita di rimuginare o di non riuscire a "staccare" mentalmente?', scaleType: 'frequency', polarity: 'negative', weight: 1.2 },
  { id: 'stress_3', area: 'stress', text: 'Quanto ti senti in grado di recuperare calma durante la giornata?', scaleType: 'quality', polarity: 'positive', weight: 1 },
  
  // MOVIMENTO (3)
  { id: 'movimento_1', area: 'movimento', text: 'Negli ultimi 7 giorni, quanto ti sei mosso/a (camminate, sport, attività)?', scaleType: 'frequency', polarity: 'positive', weight: 1 },
  { id: 'movimento_2', area: 'movimento', text: 'Quanto spesso senti rigidità o dolori muscolari/articolari che limitano i movimenti?', scaleType: 'frequency', polarity: 'negative', weight: 1 },
  { id: 'movimento_3', area: 'movimento', text: 'Come valuti la tua sensazione di corpo "sciolto e reattivo" durante la giornata?', scaleType: 'quality', polarity: 'positive', weight: 1 },
  
  // ALIMENTAZIONE (3)
  { id: 'alimentazione_1', area: 'alimentazione', text: 'Come valuti l\'equilibrio della tua alimentazione nell\'ultima settimana?', scaleType: 'quality', polarity: 'positive', weight: 1 },
  { id: 'alimentazione_2', area: 'alimentazione', text: 'Quanto spesso mangi in modo affrettato o distratto, senza ascoltare fame e sazietà?', scaleType: 'frequency', polarity: 'negative', weight: 1 },
  { id: 'alimentazione_3', area: 'alimentazione', text: 'Quanto ti senti stabile come energia dopo i pasti (senza cali forti)?', scaleType: 'frequency', polarity: 'positive', weight: 1 },
  
  // PELLE (3)
  { id: 'pelle_1', area: 'pelle', text: 'Come valuti lo stato generale della tua pelle in questo periodo?', scaleType: 'quality', polarity: 'positive', weight: 1 },
  { id: 'pelle_2', area: 'pelle', text: 'Quanto spesso noti sensibilità, rossori o imperfezioni che ti danno fastidio?', scaleType: 'frequency', polarity: 'negative', weight: 1 },
  { id: 'pelle_3', area: 'pelle', text: 'Quanto ti senti soddisfatto/a di idratazione e comfort della pelle (senza "tirare")?', scaleType: 'quality', polarity: 'positive', weight: 1 },
  
  // EQUILIBRIO MENTALE (3)
  { id: 'equilibrio_mentale_1', area: 'equilibrio_mentale', text: 'Quanto ti senti emotivamente centrato/a negli ultimi 7 giorni?', scaleType: 'quality', polarity: 'positive', weight: 1 },
  { id: 'equilibrio_mentale_2', area: 'equilibrio_mentale', text: 'Quanto spesso ti senti sopraffatto/a da pensieri o emozioni difficili da gestire?', scaleType: 'frequency', polarity: 'negative', weight: 1 },
  { id: 'equilibrio_mentale_3', area: 'equilibrio_mentale', text: 'Quanto valuti la tua capacità di ritagliarti pochi minuti per ricaricarti (pausa, respiro, silenzio)?', scaleType: 'quality', polarity: 'positive', weight: 1 },
];

// Scale labels with defensive fallback
export const SCALE_LABELS: { [key: string]: string[] } = {
  frequency: ['Mai', 'Raramente', 'A volte', 'Spesso', 'Sempre'],
  quality: ['Insufficiente', 'Scarsa', 'Discreta', 'Buona', 'Eccellente'],
  intensity: ['Per niente', 'Poco', 'Moderata', 'Alta', 'Molto alta'],
};

// Defensive getter for scale labels
export const getScaleLabels = (scaleType: string): string[] => {
  return SCALE_LABELS[scaleType] || SCALE_LABELS.frequency;
};

export const isCoreQuestion = (q: Question) => q.id.endsWith('_1');

export const getCoreQuestions = (): Question[] => ALL_QUESTIONS.filter(isCoreQuestion);

// Le due domande di approfondimento di un'area (quelle che il controllo rapido non fa)
export const getDeepDiveQuestions = (area: string): Question[] =>
  ALL_QUESTIONS.filter(q => q.area === area && !isCoreQuestion(q));

// Ordine in cui la revisione del mese approfondisce le aree, una al mese
export const REVIEW_AREA_ROTATION = [
  'sonno',
  'stress',
  'energia',
  'movimento',
  'alimentazione',
  'pelle',
  'equilibrio_mentale',
];
