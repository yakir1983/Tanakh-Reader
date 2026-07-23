// Convert an Arabic number to traditional Hebrew numeral with geresh/gershayim
// Special cases: 15 = טו (not יה), 16 = טז (not יו)
const HEBREW_DIGITS: [number, string][] = [
  [400, 'ת'], [300, 'ש'], [200, 'ר'], [100, 'ק'],
  [90, 'צ'], [80, 'פ'], [70, 'ע'], [60, 'ס'], [50, 'נ'],
  [40, 'מ'], [30, 'ל'], [20, 'כ'],
  [16, 'טז'], [15, 'טו'],
  [10, 'י'], [9, 'ט'], [8, 'ח'], [7, 'ז'], [6, 'ו'],
  [5, 'ה'], [4, 'ד'], [3, 'ג'], [2, 'ב'], [1, 'א'],
];

export function toHebrewNumeral(num: number): string {
  if (num <= 0) return '';
  let result = '';
  let n = num;
  for (const [value, letter] of HEBREW_DIGITS) {
    while (n >= value) {
      result += letter;
      n -= value;
    }
  }
  // Single letter → add geresh ('), multiple → insert gershayim (") before last letter
  if (result.length === 1) return result + "'";
  return result.slice(0, -1) + '"' + result.slice(-1);
}
