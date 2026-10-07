// L'AI Coach a volte risponde con simboli di formattazione (**grassetto**, # titoli, - elenchi)
// che nell'app comparirebbero cosi' come sono. Qui si tolgono, tenendo il testo leggibile.

export const cleanMarkdown = (text: string): string => {
  if (!text) return '';
  return text
    .replace(/\r\n/g, '\n')
    .replace(/^\s{0,3}#{1,6}\s*/gm, '') // titoli "# Titolo"
    .replace(/\*\*(.+?)\*\*/gs, '$1') // **grassetto**
    .replace(/__(.+?)__/gs, '$1') // __grassetto__
    .replace(/(^|[\s(])\*(?!\s)(.+?)\*(?=[\s).,;:!?]|$)/g, '$1$2') // *corsivo*
    .replace(/`([^`]+)`/g, '$1') // `codice`
    .replace(/^\s*[-*+]\s+/gm, '• ') // elenchi puntati
    .replace(/^\s*---+\s*$/gm, '') // separatori
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};
