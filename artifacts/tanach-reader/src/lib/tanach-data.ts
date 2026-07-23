// Tanach book list with Hebrew names and Sefaria API slugs
export interface TanachBook {
  hebrew: string;
  english: string;
  section: 'Torah' | 'Nevi\'im' | 'Ketuvim';
}

export const TANACH_BOOKS: TanachBook[] = [
  // Torah
  { hebrew: 'בראשית', english: 'Genesis', section: 'Torah' },
  { hebrew: 'שמות', english: 'Exodus', section: 'Torah' },
  { hebrew: 'ויקרא', english: 'Leviticus', section: 'Torah' },
  { hebrew: 'במדבר', english: 'Numbers', section: 'Torah' },
  { hebrew: 'דברים', english: 'Deuteronomy', section: 'Torah' },
  
  // Nevi'im
  { hebrew: 'יהושע', english: 'Joshua', section: 'Nevi\'im' },
  { hebrew: 'שופטים', english: 'Judges', section: 'Nevi\'im' },
  { hebrew: 'שמואל א', english: 'I Samuel', section: 'Nevi\'im' },
  { hebrew: 'שמואל ב', english: 'II Samuel', section: 'Nevi\'im' },
  { hebrew: 'מלכים א', english: 'I Kings', section: 'Nevi\'im' },
  { hebrew: 'מלכים ב', english: 'II Kings', section: 'Nevi\'im' },
  { hebrew: 'ישעיהו', english: 'Isaiah', section: 'Nevi\'im' },
  { hebrew: 'ירמיהו', english: 'Jeremiah', section: 'Nevi\'im' },
  { hebrew: 'יחזקאל', english: 'Ezekiel', section: 'Nevi\'im' },
  { hebrew: 'הושע', english: 'Hosea', section: 'Nevi\'im' },
  { hebrew: 'יואל', english: 'Joel', section: 'Nevi\'im' },
  { hebrew: 'עמוס', english: 'Amos', section: 'Nevi\'im' },
  { hebrew: 'עובדיה', english: 'Obadiah', section: 'Nevi\'im' },
  { hebrew: 'יונה', english: 'Jonah', section: 'Nevi\'im' },
  { hebrew: 'מיכה', english: 'Micah', section: 'Nevi\'im' },
  { hebrew: 'נחום', english: 'Nahum', section: 'Nevi\'im' },
  { hebrew: 'חבקוק', english: 'Habakkuk', section: 'Nevi\'im' },
  { hebrew: 'צפניה', english: 'Zephaniah', section: 'Nevi\'im' },
  { hebrew: 'חגי', english: 'Haggai', section: 'Nevi\'im' },
  { hebrew: 'זכריה', english: 'Zechariah', section: 'Nevi\'im' },
  { hebrew: 'מלאכי', english: 'Malachi', section: 'Nevi\'im' },
  
  // Ketuvim
  { hebrew: 'תהלים', english: 'Psalms', section: 'Ketuvim' },
  { hebrew: 'משלי', english: 'Proverbs', section: 'Ketuvim' },
  { hebrew: 'איוב', english: 'Job', section: 'Ketuvim' },
  { hebrew: 'שיר השירים', english: 'Song of Songs', section: 'Ketuvim' },
  { hebrew: 'רות', english: 'Ruth', section: 'Ketuvim' },
  { hebrew: 'איכה', english: 'Lamentations', section: 'Ketuvim' },
  { hebrew: 'קהלת', english: 'Ecclesiastes', section: 'Ketuvim' },
  { hebrew: 'אסתר', english: 'Esther', section: 'Ketuvim' },
  { hebrew: 'דניאל', english: 'Daniel', section: 'Ketuvim' },
  { hebrew: 'עזרא', english: 'Ezra', section: 'Ketuvim' },
  { hebrew: 'נחמיה', english: 'Nehemiah', section: 'Ketuvim' },
  { hebrew: 'דברי הימים א', english: 'I Chronicles', section: 'Ketuvim' },
  { hebrew: 'דברי הימים ב', english: 'II Chronicles', section: 'Ketuvim' },
];

// Helper to get book by english name
export function getBookByEnglish(english: string): TanachBook | undefined {
  return TANACH_BOOKS.find(b => b.english === english);
}

// Helper to get book by hebrew name
export function getBookByHebrew(hebrew: string): TanachBook | undefined {
  return TANACH_BOOKS.find(b => b.hebrew === hebrew);
}
