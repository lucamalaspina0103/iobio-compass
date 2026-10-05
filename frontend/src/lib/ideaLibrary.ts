// Archivio di idee pronte per i task in cui la persona rischia di non sapere cosa fare
// ("Ascolta musica rilassante", "Prova una nuova ricetta", "Leggi qualcosa di
// ispirazionale"...). Ogni tipo di task ha il suo gruppo di idee, cosi' il consiglio e'
// sempre pertinente a cio' che il task chiede.
//
// Regole di contenuto (da mantenere quando si aggiungono idee):
//  - solo fonti, libri, brani, programmi REALI e conosciuti, citati col loro nome;
//    mai episodi, capitoli o dettagli che potremmo indovinare male;
//  - nessuna promessa medica, nessuna diagnosi;
//  - ogni idea deve poter essere fatta SUBITO, senza preparazione.

export interface Idea {
  text: string; // spiegazione o passaggio, leggibile subito
  pointer?: string; // fonte/brano/titolo da cercare, mostrato come etichetta
}

export type IdeaKind = 'read' | 'listen' | 'try';

export interface IdeaCategory {
  key: string;
  kind: IdeaKind;
  pattern: RegExp; // riconosce il task dal suo testo
  title: string; // intestazione sopra il consiglio
}

const i = (text: string, pointer?: string): Idea => ({ text, pointer });

export const IDEA_CATEGORIES: IdeaCategory[] = [
  { key: 'read_inspire', kind: 'read', pattern: /leggi qualcosa di ispirazionale/i, title: 'Qualcosa da leggere' },
  { key: 'read_relax', kind: 'read', pattern: /leggi .*libro/i, title: 'Una lettura rilassante' },
  { key: 'podcast', kind: 'listen', pattern: /ascolta un podcast/i, title: 'Un podcast da ascoltare' },
  { key: 'music_relax', kind: 'listen', pattern: /ascolta musica rilassante/i, title: 'Musica per rilassarti' },
  { key: 'music_energy', kind: 'listen', pattern: /ascolta musica energizzante/i, title: 'Musica per darti energia' },
  { key: 'laugh', kind: 'try', pattern: /risata/i, title: 'Per farti una risata' },
  { key: 'recipe', kind: 'try', pattern: /nuova ricetta/i, title: 'Una ricetta da provare' },
  { key: 'veg', kind: 'try', pattern: /nuova verdura/i, title: 'Una verdura da provare' },
  { key: 'meal', kind: 'try', pattern: /pasto sano/i, title: 'Un pasto sano' },
  { key: 'snack', kind: 'try', pattern: /snack energetico|snack sano fuori casa/i, title: 'Uno snack sano' },
  { key: 'antiox', kind: 'try', pattern: /mangia cibi ricchi di antiossidanti/i, title: 'Cibi ricchi di antiossidanti' },
  { key: 'tisana', kind: 'try', pattern: /tisana rilassante/i, title: 'Una tisana rilassante' },
  { key: 'sport', kind: 'try', pattern: /nuovo sport/i, title: 'Uno sport da provare' },
  { key: 'yoga', kind: 'try', pattern: /yoga/i, title: 'Yoga in 10 minuti' },
  { key: 'hobby', kind: 'try', pattern: /hobby/i, title: 'Un hobby per 10 minuti' },
  { key: 'nature', kind: 'try', pattern: /nella natura/i, title: 'Tempo nella natura' },
  { key: 'mask', kind: 'try', pattern: /maschera idratante/i, title: 'Maschera idratante' },
  { key: 'face_massage', kind: 'try', pattern: /automassaggio al viso/i, title: 'Automassaggio al viso' },
];

export const IDEAS: { [key: string]: Idea[] } = {
  // ===== Equilibrio mentale =====
  read_inspire: [
    i("Non serve sentirsi pronti per cominciare: si diventa pronti facendo. Oggi scegli un solo gesto piccolo e fallo adesso, prima di decidere se ne hai voglia."),
    i("Le giornate difficili non cancellano i progressi: sono il terreno dove le abitudini mettono radici. Essere qui oggi, anche stanco, vale più di un giorno perfetto."),
    i("Ciò che ti pesa ha spesso a che fare con ciò che ti importa. Prova a chiederti non \"perché sono sotto pressione?\", ma \"cosa sto cercando di proteggere?\"."),
    i("Prendersi cura di sé non è egoismo: è il modo in cui hai più da dare agli altri. Cinque minuti per te non sono tolti a nessuno."),
    i("Lettere brevi, scritte con calore, sul coraggio di vivere le proprie domande senza avere subito le risposte. Leggine anche solo una.", 'Libro "Lettere a un giovane poeta" di Rainer Maria Rilke'),
    i("Pensieri brevissimi di un imperatore che scriveva per tenersi in equilibrio. Apri una pagina a caso e leggi il primo pensiero.", 'Libro "Meditazioni" di Marco Aurelio'),
    i("Un testo breve e limpido su come usare bene il proprio tempo. Bastano poche pagine per cambiare prospettiva sulla giornata.", 'Libro "Sulla brevità della vita" di Seneca'),
    i("Su come ritrovare serenità fermandosi nel momento presente, senza rimandare tutto a quando sarà tutto a posto.", 'Libro "Il potere di adesso" di Eckhart Tolle'),
    i("Sul coraggio di mostrarsi imperfetti. Un capitolo qualsiasi basta per sentirsi meno soli con i propri difetti.", 'Libro "I doni dell\'imperfezione" di Brené Brown'),
  ],
  podcast: [
    i("La scienza della felicità spiegata da una professoressa di Yale: episodi pratici, con piccole abitudini da provare subito. In inglese.", 'Podcast "The Happiness Lab" di Laurie Santos'),
    i("Meditazione e vita quotidiana raccontate con ironia e onestà, ottimo per chi parte da zero. In inglese.", 'Podcast "Ten Percent Happier" con Dan Harris'),
    i("Conversazioni su coraggio, vergogna e relazioni, con ospiti e ricerca. In inglese.", 'Podcast "Unlocking Us" di Brené Brown'),
    i("Perché ci comportiamo come ci comportiamo: psicologia e neuroscienze raccontate come storie. In inglese.", 'Podcast "Hidden Brain" di Shankar Vedantam'),
    i("Un medico che parla di piccole abitudini quotidiane per stare meglio, senza estremismi. In inglese.", 'Podcast "Feel Better, Live More" del Dr Rangan Chatterjee'),
    i("Neuroscienza applicata a sonno, energia e concentrazione. Gli episodi sono lunghi: ascolta anche solo i primi 10 minuti. In inglese.", 'Podcast "Huberman Lab" di Andrew Huberman'),
    i("Conversazioni lente e profonde sul senso delle cose, per quando hai voglia di fermarti. In inglese.", 'Podcast "On Being" con Krista Tippett'),
  ],

  // ===== Sonno =====
  read_relax: [
    i("Pagine brevi e scorrevoli, perfette per staccare: ne bastano 10 per sentire la mente rallentare.", 'Libro "Il piccolo principe" di Antoine de Saint-Exupéry'),
    i("Racconti brevi e leggeri: uno a sera, senza impegno e senza ansia di finire.", 'Libro "Marcovaldo" di Italo Calvino'),
    i("Un libro breve dal ritmo lento e quieto, che accompagna verso il sonno.", 'Libro "Il vecchio e il mare" di Ernest Hemingway'),
    i("Prosa semplice e pacata, adatta a chiudere la giornata.", 'Libro "Siddharta" di Hermann Hesse'),
    i("Capitoli brevissimi e un ritmo dolce: si legge a piccoli sorsi.", 'Libro "Seta" di Alessandro Baricco'),
    i("Un monologo breve e musicale, si legge in poche sere.", 'Libro "Novecento" di Alessandro Baricco'),
    i("Rileggere un libro che hai già amato rilassa più che scoprirne uno nuovo: scegli uno dei tuoi preferiti e leggine solo 10 pagine."),
    i("Se non hai un libro sotto mano, una raccolta di racconti brevi o di poesie è l'ideale: puoi fermarti a qualsiasi pagina senza perdere il filo."),
  ],
  tisana: [
    i("La classica della sera: calda, senza zucchero, bevuta lentamente senza schermi.", 'Camomilla'),
    i("Dal profumo di limone, delicata, ottima dopo cena.", 'Melissa'),
    i("Morbida e dolce al naturale, perfetta per rallentare prima di coricarti.", 'Tiglio'),
    i("Un profumo che invita a rilassarsi, anche in miscela con camomilla.", 'Lavanda'),
    i("Se la digestione è un po' lenta, aiuta a chiudere la serata con calma.", 'Finocchio'),
    i("Il rito conta quanto l'erba: prepara la tisana con calma, tieni la tazza tra le mani e bevila seduto, senza telefono."),
  ],

  // ===== Stress =====
  music_relax: [
    i("Apri la sezione \"Suoni\" qui nell'app e lasciati accompagnare per 10 minuti, ad occhi chiusi."),
    i("Pianoforte semplice e morbido, ideale per rallentare.", 'Ludovico Einaudi – "Nuvole bianche"'),
    i("Poche note lente e sospese: un classico per fermarsi un momento.", 'Erik Satie – "Gymnopédie n. 1"'),
    i("Dolce e luminoso, perfetto per respirare più piano.", 'Claude Debussy – "Clair de lune"'),
    i("Musica pensata per accompagnare l'attesa e il silenzio, senza chiedere attenzione.", 'Brian Eno – "Music for Airports"'),
    i("Archi lenti e quiete, per ritrovare un respiro più lungo.", 'Arvo Pärt – "Spiegel im Spiegel"'),
    i("Una melodia semplice e ripetuta, ottima per staccare dai pensieri.", 'Johann Sebastian Bach – "Aria" dalle Variazioni Goldberg'),
    i("Cuffie, luci basse, occhi chiusi: 10 minuti senza fare altro contano più della scelta del brano."),
  ],
  hobby: [
    i("Colora un mandala o disegna scarabocchi liberi: non serve saper disegnare, serve solo lasciare andare la mano."),
    i("Prenditi cura di una pianta: spolverane le foglie, annaffiala, osservala da vicino."),
    i("Un puzzle o un cruciverba: la mente si concentra su un compito semplice e lascia andare i pensieri."),
    i("Suona o canta un brano che conosci, anche piano piano: la voce libera tensioni più di quanto sembri."),
    i("Scrivi due righe a mano a una persona a cui tieni, anche solo un biglietto."),
    i("Fotografa con il telefono tre cose belle che trovi intorno a te adesso."),
    i("Cucina qualcosa solo per piacere, anche una cosa piccola: un impasto, un dolce semplice, una tisana speciale."),
  ],
  laugh: [
    i("Un classico della comicità italiana, per ridere di gusto in compagnia o da soli.", 'Film "Tre uomini e una gamba" di Aldo, Giovanni e Giacomo'),
    i("Sketch brevissimi, senza parole, che fanno ridere in qualunque lingua: bastano 5 minuti su YouTube.", 'Mr. Bean (sketch su YouTube)'),
    i("L'umorismo amaro e scatenato del ragioniere più sfortunato d'Italia.", 'Film "Fantozzi" (1975)'),
    i("Una commedia popolare e leggera, perfetta per staccare la testa.", 'Film "Quo vado?" con Checco Zalone'),
    i("Comicità muta e geniale, tenera e divertente: anche una sola scena cambia l'umore.", 'Film "Tempi moderni" di Charlie Chaplin'),
    i("Chiama o scrivi alla persona che ti fa ridere di più: anche 5 minuti di battute valgono come una risata guardata."),
  ],

  // ===== Energia =====
  music_energy: [
    i("Ritmo che fa muovere subito le gambe.", 'Earth, Wind & Fire – "September"'),
    i("Impossibile restare fermi.", 'Pharrell Williams – "Happy"'),
    i("Un'esplosione di energia in meno di quattro minuti.", 'Queen – "Don\'t Stop Me Now"'),
    i("Per chi ha bisogno di una scarica di grinta.", 'Survivor – "Eye of the Tiger"'),
    i("Archi veloci e luminosi: il risveglio della primavera in musica.", 'Antonio Vivaldi – "Primavera" (Le quattro stagioni)'),
    i("Allegro e positivo, perfetto per partire con il piede giusto.", 'Jovanotti – "Penso positivo"'),
    i("Crea una mini playlist di 5 brani che ti fanno venire voglia di muoverti, e tienila pronta per i momenti di calo."),
  ],
  snack: [
    i("Frutta fresca e una piccola manciata di mandorle o noci: zuccheri e grassi buoni insieme, per un'energia più stabile."),
    i("Un vasetto di yogurt greco naturale con qualche pezzetto di frutta."),
    i("Carote o sedano a bastoncini con un po' di hummus: croccante e saziante."),
    i("Ceci tostati al forno con un filo d'olio e spezie: una versione sana dello snack salato."),
    i("Una mela a fette con qualche noce, facile da portare in borsa."),
    i("Una banana con un cucchiaino di burro di arachidi (solo arachidi, senza zuccheri aggiunti)."),
    i("Frutta secca non salata in un contenitorino: la porzione giusta è una manciata."),
  ],

  // ===== Movimento =====
  sport: [
    i("Cammina a passo svelto usando due bastoncini (anche una versione semplificata): coinvolge tutto il corpo con poco impatto sulle articolazioni.", 'Camminata nordica'),
    i("Salta la corda per qualche serie da 1 minuto con pause: rapido, efficace e si fa in casa."),
    i("Movimenti lenti e fluidi, con il respiro: ottimo per equilibrio e calma. Cerca un video per principianti di 15 minuti.", 'Tai chi'),
    i("Metti una playlist e balla liberamente per 15 minuti: è allenamento, ma sembra gioco."),
    i("Una passeggiata in bici a ritmo comodo, anche solo intorno al quartiere."),
    i("Prova una breve sessione di stretching dinamico seguendo un video per principianti."),
    i("Una lezione di prova gratuita di qualcosa che ti ha sempre incuriosito: arrampicata indoor, nuoto, danza."),
  ],
  yoga: [
    i("Lezioni gratuite per ogni livello: cerca una sessione di 10 minuti adatta ai principianti e segui senza pensare a niente.", 'Canale YouTube "Yoga With Adriene"'),
    i("Mini-sequenza da fare anche senza video: gatto-mucca per 1 minuto, cane a testa in giù per 1 minuto, posizione del bambino per 2 minuti, piegamento in avanti in piedi per 1 minuto. Respira lento in ogni posizione."),
    i("Se hai poco spazio: siediti a gambe incrociate, allunga la schiena e fai lente torsioni a destra e a sinistra, 5 respiri per lato, poi piegati in avanti."),
  ],

  // ===== Alimentazione =====
  recipe: [
    i("Ceci (anche in scatola, ben risciacquati) scaldati con un filo d'olio, rosmarino e un po' di brodo vegetale. Pronta in 20 minuti."),
    i("Quinoa cotta con verdure di stagione, un filo d'olio e succo di limone. Si prepara in anticipo e si porta in ufficio."),
    i("Frittata al forno con zucchine e cipolla: pochi ingredienti, facile, nutriente."),
    i("Hummus fatto in casa (ceci, tahina, limone, aglio, olio) da mangiare con bastoncini di verdura."),
    i("Overnight oats: fiocchi d'avena, yogurt e frutta la sera prima, colazione pronta al mattino."),
    i("Pesce azzurro al forno (sgombro, alici) con verdure a cubetti e un filo d'olio: veloce e ricco di grassi buoni."),
    i("Vellutata di zucca e zenzero: zucca a cubetti cotta con brodo, un pezzetto di zenzero fresco, frullata."),
    i("Pasta integrale con pomodorini freschi, basilico e un cucchiaio di olio a crudo: semplice, sazia, leggera."),
  ],
  veg: [
    i("Finocchio crudo a fettine sottili con arancia e un filo d'olio: fresco e croccante."),
    i("Cavolo nero saltato in padella con aglio e un goccio d'acqua: pronto in 10 minuti."),
    i("Broccoli al forno con olio e limone: diventano croccanti e dolci."),
    i("Cavolfiore al forno con un pizzico di curcuma e pepe."),
    i("Bietole ripassate con aglio e olio: classiche, economiche, ricche di nutrienti."),
    i("Zucca arrosto a spicchi con rosmarino: dolce e saziante."),
    i("Radicchio rosso scottato in padella o alla griglia: amarognolo e interessante."),
  ],
  meal: [
    i("Il metodo del piatto: metà piatto di verdure, un quarto di proteine (legumi, pesce, uova, carne bianca), un quarto di cereali integrali, e un filo d'olio a crudo."),
    i("Pranzo veloce: legumi in scatola risciacquati, pomodorini, cetriolo, un cucchiaio d'olio e limone. Pronto in 5 minuti."),
    i("Cena semplice: uova strapazzate con spinaci e una fetta di pane integrale."),
    i("Pesce al forno con patate e zucchine tagliate sottili: un'unica teglia, poco da lavare."),
    i("Insalatona completa: verdure a foglia, un cereale (farro, riso integrale), una proteina e una manciata di semi."),
  ],
  antiox: [
    i("Frutti di bosco (mirtilli, lamponi, more), freschi o surgelati: aggiungili allo yogurt o alla colazione."),
    i("Spinaci e verdure a foglia scure, crudi in insalata o saltati."),
    i("Melograno: i chicchi si aggiungono a insalate e yogurt."),
    i("Pomodori, soprattutto cotti, con un filo d'olio."),
    i("Una manciata di noci: ricche di grassi buoni e polifenoli."),
    i("Un quadratino di cioccolato fondente (almeno 70-85% di cacao), mangiato lentamente."),
  ],

  // ===== Pelle =====
  mask: [
    i("Una maschera idratante a base di acido ialuronico o glicerina, applicata su pelle pulita per 10-15 minuti. Se è nuova, prova prima un po' di prodotto sul polso per verificare che non irriti."),
    i("Una versione semplice: yogurt bianco naturale con un cucchiaino di miele, 10 minuti su pelle pulita, poi risciacqua con acqua tiepida. Prova prima sul polso."),
    i("Un tessuto imbevuto di siero idratante, quello monouso: pratico, si dimentica sul viso mentre fai altro per 15 minuti."),
  ],
  face_massage: [
    i("Con le dita pulite e un goccio di crema o olio: parti dal centro della fronte verso le tempie con piccoli cerchi lenti, 30 secondi."),
    i("Poi dagli angoli del naso verso gli zigomi e fino alle orecchie, 30 secondi, con pressione leggera."),
    i("Infine dal mento lungo la mandibola verso le orecchie, 30 secondi. Chiudi con tre respiri lenti e le mani calde sul viso."),
  ],

  // ===== Equilibrio / natura =====
  nature: [
    i("Raggiungi il parco più vicino e siediti 10 minuti sotto un albero, senza telefono in mano."),
    i("Cammina lentamente osservando 5 cose naturali che di solito non noti: una foglia, il cielo, il suono di un uccello, una pianta, la luce."),
    i("Un giardino botanico, un lungofiume o una collina vicina: anche mezz'ora cambia lo stato d'animo."),
    i("La pratica giapponese del bagno nel bosco consiste semplicemente nel camminare piano tra gli alberi, respirando e guardando intorno.", 'Shinrin-yoku ("bagno di foresta")'),
    i("Se esci poco: apri la finestra, guarda il cielo e ascolta i suoni per 5 minuti; o curati di una pianta sul balcone."),
  ],
};
