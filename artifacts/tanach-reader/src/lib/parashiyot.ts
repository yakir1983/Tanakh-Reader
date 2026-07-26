/**
 * Weekly Torah portions (parashiyot) with their starting chapter and verse.
 * Keyed by the Sefaria English book name.
 */

export interface Parasha {
  hebrew: string;   // display name
  chapter: number;
  verse: number;
}

export const PARASHIYOT: Record<string, Parasha[]> = {
  Genesis: [
    { hebrew: 'בְּרֵאשִׁית', chapter: 1,  verse: 1  },
    { hebrew: 'נֹחַ',        chapter: 6,  verse: 9  },
    { hebrew: 'לֶךְ לְךָ',   chapter: 12, verse: 1  },
    { hebrew: 'וַיֵּרָא',    chapter: 18, verse: 1  },
    { hebrew: 'חַיֵּי שָׂרָה', chapter: 23, verse: 1 },
    { hebrew: 'תּוֹלְדוֹת', chapter: 25, verse: 19  },
    { hebrew: 'וַיֵּצֵא',   chapter: 28, verse: 10  },
    { hebrew: 'וַיִּשְׁלַח', chapter: 32, verse: 4  },
    { hebrew: 'וַיֵּשֶׁב',   chapter: 37, verse: 1  },
    { hebrew: 'מִקֵּץ',      chapter: 41, verse: 1  },
    { hebrew: 'וַיִּגַּשׁ',  chapter: 44, verse: 18 },
    { hebrew: 'וַיְחִי',     chapter: 47, verse: 28 },
  ],
  Exodus: [
    { hebrew: 'שְׁמוֹת',     chapter: 1,  verse: 1  },
    { hebrew: 'וָאֵרָא',     chapter: 6,  verse: 2  },
    { hebrew: 'בֹּא',        chapter: 10, verse: 1  },
    { hebrew: 'בְּשַׁלַּח',  chapter: 13, verse: 17 },
    { hebrew: 'יִתְרוֹ',     chapter: 18, verse: 1  },
    { hebrew: 'מִשְׁפָּטִים', chapter: 21, verse: 1 },
    { hebrew: 'תְּרוּמָה',   chapter: 25, verse: 1  },
    { hebrew: 'תְּצַוֶּה',   chapter: 27, verse: 20 },
    { hebrew: 'כִּי תִשָּׂא', chapter: 30, verse: 11 },
    { hebrew: 'וַיַּקְהֵל',  chapter: 35, verse: 1  },
    { hebrew: 'פְקוּדֵי',    chapter: 38, verse: 21 },
  ],
  Leviticus: [
    { hebrew: 'וַיִּקְרָא',  chapter: 1,  verse: 1  },
    { hebrew: 'צַו',         chapter: 6,  verse: 1  },
    { hebrew: 'שְׁמִינִי',   chapter: 9,  verse: 1  },
    { hebrew: 'תַזְרִיעַ',   chapter: 12, verse: 1  },
    { hebrew: 'מְצֹרָע',     chapter: 14, verse: 1  },
    { hebrew: 'אַחֲרֵי מוֹת', chapter: 16, verse: 1 },
    { hebrew: 'קְדֹשִׁים',   chapter: 19, verse: 1  },
    { hebrew: 'אֱמֹר',       chapter: 21, verse: 1  },
    { hebrew: 'בְּהַר',      chapter: 25, verse: 1  },
    { hebrew: 'בְּחֻקֹּתַי', chapter: 26, verse: 3  },
  ],
  Numbers: [
    { hebrew: 'בְּמִדְבַּר', chapter: 1,  verse: 1  },
    { hebrew: 'נָשֹׂא',      chapter: 4,  verse: 21 },
    { hebrew: 'בְּהַעֲלֹתְךָ', chapter: 8, verse: 1 },
    { hebrew: 'שְׁלַח',      chapter: 13, verse: 1  },
    { hebrew: 'קֹרַח',       chapter: 16, verse: 1  },
    { hebrew: 'חֻקַּת',      chapter: 19, verse: 1  },
    { hebrew: 'בָּלָק',      chapter: 22, verse: 2  },
    { hebrew: 'פִּינְחָס',   chapter: 25, verse: 10 },
    { hebrew: 'מַּטּוֹת',    chapter: 30, verse: 2  },
    { hebrew: 'מַסְעֵי',     chapter: 33, verse: 1  },
  ],
  Deuteronomy: [
    { hebrew: 'דְּבָרִים',    chapter: 1,  verse: 1  },
    { hebrew: 'וָאֶתְחַנַּן',  chapter: 3,  verse: 23 },
    { hebrew: 'עֵקֶב',        chapter: 7,  verse: 12 },
    { hebrew: 'רְאֵה',        chapter: 11, verse: 26 },
    { hebrew: 'שֹׁפְטִים',    chapter: 16, verse: 18 },
    { hebrew: 'כִּי תֵצֵא',   chapter: 21, verse: 10 },
    { hebrew: 'כִּי תָבוֹא',  chapter: 26, verse: 1  },
    { hebrew: 'נִצָּבִים',    chapter: 29, verse: 9  },
    { hebrew: 'וַיֵּלֶךְ',    chapter: 31, verse: 1  },
    { hebrew: 'הַאֲזִינוּ',   chapter: 32, verse: 1  },
    { hebrew: 'וְזֹאת הַבְּרָכָה', chapter: 33, verse: 1 },
  ],
};

/** Returns the parasha list for a given Sefaria English book name, or null if not Torah. */
export function getParashiyot(englishBook: string): Parasha[] | null {
  return PARASHIYOT[englishBook] ?? null;
}

/** Returns the parasha that covers a given chapter (the last parasha whose chapter ≤ given chapter). */
export function getParashaForChapter(englishBook: string, chapter: number): Parasha | null {
  const list = PARASHIYOT[englishBook];
  if (!list) return null;
  let best: Parasha | null = null;
  for (const p of list) {
    if (p.chapter <= chapter) best = p;
    else break;
  }
  return best;
}
