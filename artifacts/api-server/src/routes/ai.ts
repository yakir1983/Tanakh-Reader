import { Router } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";

const router = Router();

// Translation request signals — checked BEFORE question signals
const TRANSLATE_SIGNALS = [
  "תרגם", "תרגמ", "תרגום",
  "מה כתוב פה", "מה כתוב כאן", "מה זה אומר",
];

// Hebrew question-signal words — if transcript contains any, route to Q&A
const QUESTION_SIGNALS = [
  "מה ", "מי ", "למה ", "מדוע ", "כיצד ", "איך ", "האם ",
  "היכן ", "איפה ", "מתי ", "כמה ", "מנין ",
  "הסבר", "ספר לי", "פירוש", "רש\"י", "רשי",
  "על מה", "מה אומר", "מה כתוב", "מה פירוש",
  "מי הם", "מי היה", "מי הייתה", "מי הוא", "מי היא",
  "מה קרה", "מה הסיפור", "מה עשה", "מה עשתה",
];

function wordBoundaryMatch(text: string, signal: string): boolean {
  const idx = text.indexOf(signal);
  if (idx === -1) return false;
  return idx === 0 || text[idx - 1] === ' ';
}

function isTranslateRequest(text: string): boolean {
  return TRANSLATE_SIGNALS.some(s => wordBoundaryMatch(text, s));
}

function isQuestion(text: string): boolean {
  return QUESTION_SIGNALS.some(s => wordBoundaryMatch(text, s));
}

// ── Shared book map ────────────────────────────────────────────────────────────
const BOOK_MAP_STR = `בראשית=Genesis, שמות=Exodus, ויקרא=Leviticus, במדבר=Numbers, דברים=Deuteronomy,
יהושע=Joshua, שופטים=Judges, שמואל א=I Samuel, שמואל ב=II Samuel,
מלכים א=I Kings, מלכים ב=II Kings, ישעיה=Isaiah, ישעיהו=Isaiah,
ירמיה=Jeremiah, יחזקאל=Ezekiel, הושע=Hosea, יואל=Joel, עמוס=Amos,
עובדיה=Obadiah, יונה=Jonah, מיכה=Micah, נחום=Nahum, חבקוק=Habakkuk,
צפניה=Zephaniah, חגי=Haggai, זכריה=Zechariah, מלאכי=Malachi,
תהלים=Psalms, תהילים=Psalms, משלי=Proverbs, איוב=Job,
שיר השירים=Song of Songs, רות=Ruth, איכה=Lamentations,
קהלת=Ecclesiastes, אסתר=Esther, דניאל=Daniel, עזרא=Ezra,
נחמיה=Nehemiah, דברי הימים א=I Chronicles, דברי הימים ב=II Chronicles`;

// ── Biblical character → first major appearance ────────────────────────────────
// Entries list every common alias, honorific, misspelling, and gender form separated by " / "
const CHARACTERS_MAP = `If only a character name or description is mentioned (no explicit book/chapter/verse), use these defaults:
משה / מרע"ה / משה רבנו / הנביא / האיש שהוציא את ישראל → {"book":"Exodus","chapter":2,"verse":1}
אברהם אבינו / אברהם / אברם / אבי האומה → {"book":"Genesis","chapter":12,"verse":1}
שרה אמנו / שרה / שרי / אשת אברהם → {"book":"Genesis","chapter":12,"verse":5}
הגר / שפחת שרה / אמת ישמעאל → {"book":"Genesis","chapter":16,"verse":1}
ישמעאל / ישמעאל בן אברהם / בן הגר → {"book":"Genesis","chapter":16,"verse":11}
יצחק אבינו / יצחק / בן אברהם → {"book":"Genesis","chapter":21,"verse":1}
רבקה / רבקה אמנו / אשת יצחק → {"book":"Genesis","chapter":24,"verse":15}
יעקב אבינו / יעקב / ישראל / האיש שנאבק עם המלאך → {"book":"Genesis","chapter":25,"verse":19}
לאה אמנו / לאה / הבת הגדולה של לבן → {"book":"Genesis","chapter":29,"verse":16}
רחל אמנו / רחל / הבת הקטנה של לבן / האהובה → {"book":"Genesis","chapter":29,"verse":16}
לבן הארמי / לבן / אחי רבקה / אבי רחל ולאה → {"book":"Genesis","chapter":29,"verse":1}
עשו / אדום / עשיו / האח השעיר / בעל הבכורה → {"book":"Genesis","chapter":25,"verse":25}
יוסף הצדיק / יוסף / בן יעקב ורחל / בן הזקנים / הנמכר → {"book":"Genesis","chapter":37,"verse":1}
בנימין / בן ימין / בן האחרון → {"book":"Genesis","chapter":35,"verse":18}
ראובן / הבכור / בן לאה הבכור → {"book":"Genesis","chapter":29,"verse":32}
שמעון → {"book":"Genesis","chapter":29,"verse":33}
לוי / שבט הכהנים → {"book":"Genesis","chapter":29,"verse":34}
יהודה / אבי שבט יהודה → {"book":"Genesis","chapter":29,"verse":35}
דן → {"book":"Genesis","chapter":30,"verse":6}
נפתלי → {"book":"Genesis","chapter":30,"verse":8}
גד → {"book":"Genesis","chapter":30,"verse":11}
אשר → {"book":"Genesis","chapter":30,"verse":13}
יששכר → {"book":"Genesis","chapter":30,"verse":18}
זבולון → {"book":"Genesis","chapter":30,"verse":20}
דינה / דינה בת יעקב / הבת שנאנסה → {"book":"Genesis","chapter":30,"verse":21}
שכם / שכם בן חמור / שאנס את דינה → {"book":"Genesis","chapter":34,"verse":2}
חמור / חמור אבי שכם → {"book":"Genesis","chapter":34,"verse":2}
ער / ער בן יהודה → {"book":"Genesis","chapter":38,"verse":3}
אונן / אונן בן יהודה → {"book":"Genesis","chapter":38,"verse":4}
תמר / תמר כלת יהודה / תמר שהתחפשה → {"book":"Genesis","chapter":38,"verse":6}
אסנת / אשת יוסף → {"book":"Genesis","chapter":41,"verse":45}
מנשה / מנשה בן יוסף → {"book":"Genesis","chapter":41,"verse":51}
אפרים / אפרים בן יוסף → {"book":"Genesis","chapter":41,"verse":52}
פוטיפר / שר הטבחים → {"book":"Genesis","chapter":37,"verse":36}
אשת פוטיפר / האשה שפיתתה את יוסף → {"book":"Genesis","chapter":39,"verse":7}
לוט / לוט בן הרן / אחיין אברהם → {"book":"Genesis","chapter":12,"verse":4}
נח → {"book":"Genesis","chapter":6,"verse":9}
שם / שם בן נח → {"book":"Genesis","chapter":9,"verse":18}
חם / חם בן נח → {"book":"Genesis","chapter":9,"verse":18}
יפת / יפת בן נח → {"book":"Genesis","chapter":9,"verse":18}
אדם הראשון / אדם → {"book":"Genesis","chapter":2,"verse":7}
חוה / אשת אדם / הראשונה → {"book":"Genesis","chapter":2,"verse":20}
קין → {"book":"Genesis","chapter":4,"verse":1}
הבל → {"book":"Genesis","chapter":4,"verse":1}
ציפורה / צפורה / אשת משה / בת יתרו → {"book":"Exodus","chapter":2,"verse":21}
יתרו / יתרו חותן משה / רעואל / חובב → {"book":"Exodus","chapter":2,"verse":18}
בלעם / בלעם בן בעור / הנביא שקילל → {"book":"Numbers","chapter":22,"verse":5}
בלק / בלק מלך מואב → {"book":"Numbers","chapter":22,"verse":2}
פינחס / פינחס בן אלעזר / שקינא לה' → {"book":"Numbers","chapter":25,"verse":7}
זמרי / זמרי בן סלוא → {"book":"Numbers","chapter":25,"verse":14}
קורח / קורח בן יצהר / שמרד במשה → {"book":"Numbers","chapter":16,"verse":1}
דתן ואבירם → {"book":"Numbers","chapter":16,"verse":1}
נדב ואביהו / בני אהרן שמתו / שהביאו אש זרה → {"book":"Leviticus","chapter":10,"verse":1}
אלעזר / אלעזר בן אהרן → {"book":"Numbers","chapter":3,"verse":2}
כלב / כלב בן יפונה → {"book":"Numbers","chapter":13,"verse":6}
אהרן הכהן / אהרן / הכהן הגדול הראשון → {"book":"Exodus","chapter":4,"verse":14}
מרים הנביאה / מרים / אחות משה → {"book":"Exodus","chapter":15,"verse":20}
יהושע בן נון / יהושע → {"book":"Joshua","chapter":1,"verse":1}
עכן / עכן בן כרמי / שגנב מהחרם → {"book":"Joshua","chapter":7,"verse":1}
רחב / רחב הזונה / האשה שהחביאה את המרגלים / מי שתלתה החוט האדום → {"book":"Joshua","chapter":2,"verse":1}
דבורה הנביאה / דבורה / הנביאה שופטת → {"book":"Judges","chapter":4,"verse":1}
יעל / יעל אשת חבר / האשה שהרגה את סיסרא / שתקעה יתד / מי שהרגה בשינה → {"book":"Judges","chapter":4,"verse":17}
סיסרא / שר צבא כנען → {"book":"Judges","chapter":4,"verse":2}
ברק / ברק בן אבינועם → {"book":"Judges","chapter":4,"verse":6}
גדעון / ירובעל / שניצח את מדיין → {"book":"Judges","chapter":6,"verse":1}
יפתח / שנדר נדר / בת יפתח → {"book":"Judges","chapter":11,"verse":1}
שמשון / שמשון הגיבור / הנזיר החזק → {"book":"Judges","chapter":13,"verse":1}
דלילה / מי שגזזה את שמשון / שאנשי פלשת שכרו → {"book":"Judges","chapter":16,"verse":4}
עלי הכהן / עלי → {"book":"I Samuel","chapter":1,"verse":9}
שמואל הנביא / שמואל → {"book":"I Samuel","chapter":1,"verse":1}
חנה אם שמואל / חנה / שהתפללה לילד → {"book":"I Samuel","chapter":1,"verse":1}
שאול המלך / שאול / המלך הראשון → {"book":"I Samuel","chapter":9,"verse":1}
יהונתן / יהונתן בן שאול / ידיד דוד → {"book":"I Samuel","chapter":14,"verse":1}
דוד המלך / דוד / דוד בן ישי / רועה הצאן שנמשח → {"book":"I Samuel","chapter":16,"verse":1}
גוליית / גלית / גלית הפלישתי / הענק → {"book":"I Samuel","chapter":17,"verse":4}
נבל / נבל הכרמלי → {"book":"I Samuel","chapter":25,"verse":3}
אביגיל / אביגיל אשת נבל / שהביאה מנחה → {"book":"I Samuel","chapter":25,"verse":3}
אגג / אגג מלך עמלק → {"book":"I Samuel","chapter":15,"verse":8}
בת שבע / אשת אוריה / אמת שלמה → {"book":"II Samuel","chapter":11,"verse":3}
אוריה החיתי / אוריה / שדוד שלח למות → {"book":"II Samuel","chapter":11,"verse":3}
אבשלום / בן דוד שמרד / בעל השיער הארוך → {"book":"II Samuel","chapter":13,"verse":1}
אמנון / אמנון בן דוד → {"book":"II Samuel","chapter":13,"verse":1}
תמר בת דוד / תמר אחות אבשלום → {"book":"II Samuel","chapter":13,"verse":1}
מפיבשת / מפיבושת / בן יהונתן / פצוע הרגליים → {"book":"II Samuel","chapter":4,"verse":4}
יואב / יואב בן צרויה / שר הצבא → {"book":"II Samuel","chapter":2,"verse":13}
נתן הנביא / נתן / שגילה לדוד חטאו → {"book":"II Samuel","chapter":7,"verse":2}
אחיתופל / אחיתופל הגילוני / היועץ → {"book":"II Samuel","chapter":15,"verse":12}
שמעי / שמעי בן גרא / שקילל את דוד → {"book":"II Samuel","chapter":16,"verse":5}
שלמה המלך / שלמה / ידידיה / החכם מכל האדם → {"book":"I Kings","chapter":3,"verse":5}
מלכת שבא / מלכה מלכת שבא / שבאה לשמוע חכמת שלמה → {"book":"I Kings","chapter":10,"verse":1}
רחבעם / רחבעם בן שלמה / שקרע את הממלכה → {"book":"I Kings","chapter":12,"verse":1}
ירבעם / ירבעם בן נבט / שהעמיד עגלים → {"book":"I Kings","chapter":11,"verse":26}
אחאב / אחאב מלך ישראל / שנשא את איזבל → {"book":"I Kings","chapter":16,"verse":29}
איזבל / איזבל אשת אחאב / שרדפה את הנביאים → {"book":"I Kings","chapter":16,"verse":31}
נבות / נבות היזרעאלי / שנרצח בגלל כרמו → {"book":"I Kings","chapter":21,"verse":1}
אליהו הנביא / אליהו / אליהו התשבי / הנביא שעלה בסערה → {"book":"I Kings","chapter":17,"verse":1}
אלישע הנביא / אלישע / תלמיד אליהו → {"book":"I Kings","chapter":19,"verse":19}
נעמן / נעמן שר צבא ארם / נעמן המצורע / שהתרפא בירדן → {"book":"II Kings","chapter":5,"verse":1}
גיחזי / גחזי / משרת אלישע / שלקח שכר → {"book":"II Kings","chapter":5,"verse":20}
עתליה / אתליה המלכה / שהמליכה עצמה → {"book":"II Kings","chapter":11,"verse":1}
יהוידע / יהוידע הכהן / שהסתיר את יואש → {"book":"II Kings","chapter":11,"verse":4}
חזקיהו המלך / חזקיהו / שסנחריב צר עליו → {"book":"II Kings","chapter":18,"verse":1}
חולדה הנביאה / חולדה → {"book":"II Kings","chapter":22,"verse":14}
יאשיהו המלך / יאשיהו / שמצא את ספר התורה → {"book":"II Kings","chapter":22,"verse":1}
נבוכדנצר / נבוכדראצר / מלך בבל שחרב את המקדש → {"book":"II Kings","chapter":25,"verse":1}
ישעיהו הנביא / ישעיהו / ישעיה → {"book":"Isaiah","chapter":1,"verse":1}
ירמיהו הנביא / ירמיה / ירמיהו / נביא החורבן → {"book":"Jeremiah","chapter":1,"verse":1}
יחזקאל הנביא / יחזקאל / שראה מרכבה → {"book":"Ezekiel","chapter":1,"verse":1}
הושע הנביא / הושע → {"book":"Hosea","chapter":1,"verse":1}
עמוס הנביא / עמוס / רועה התקוע → {"book":"Amos","chapter":1,"verse":1}
יונה הנביא / יונה / שבלע אותו הדג → {"book":"Jonah","chapter":1,"verse":1}
מיכה הנביא / מיכה → {"book":"Micah","chapter":1,"verse":1}
נחום הנביא / נחום → {"book":"Nahum","chapter":1,"verse":1}
חבקוק הנביא / חבקוק → {"book":"Habakkuk","chapter":1,"verse":1}
מלאכי הנביא / מלאכי → {"book":"Malachi","chapter":1,"verse":1}
דניאל / דניאל בגוב האריות → {"book":"Daniel","chapter":1,"verse":1}
חנניה מישאל ועזריה / שדרך מישך ועבד נגו / שלושת החברים בכבשן → {"book":"Daniel","chapter":1,"verse":6}
אסתר המלכה / אסתר / הדסה / הגיבורה של פורים → {"book":"Esther","chapter":2,"verse":7}
מרדכי / מרדכי היהודי → {"book":"Esther","chapter":2,"verse":5}
המן / המן האגגי / שרצה להשמיד את היהודים → {"book":"Esther","chapter":3,"verse":1}
אחשורוש / מלך פרס → {"book":"Esther","chapter":1,"verse":1}
ושתי / המלכה שסירבה → {"book":"Esther","chapter":1,"verse":9}
רות / רות המואביה / שנאמנה לנעמי → {"book":"Ruth","chapter":1,"verse":1}
נעמי → {"book":"Ruth","chapter":1,"verse":2}
בועז / הגואל / הצדיק מבית לחם → {"book":"Ruth","chapter":2,"verse":1}
כורש / כורש מלך פרס / שהרשה לבנות את המקדש → {"book":"Ezra","chapter":1,"verse":1}
זרובבל / זרובבל בן שאלתיאל → {"book":"Ezra","chapter":2,"verse":2}
עזרא הסופר / עזרא → {"book":"Ezra","chapter":1,"verse":1}
נחמיה / נחמיה בן חכליה / שבנה את חומות ירושלים → {"book":"Nehemiah","chapter":1,"verse":1}
איוב / שסבל הרבה → {"book":"Job","chapter":1,"verse":1}`;

// ── Slang / colloquial / informal descriptions of biblical events ──────────────
// Covers everyday speech, slangy paraphrases, and descriptions without official names
const SLANG_MAP = `Informal / colloquial / descriptive phrasings — map to the same locations:
הקטע שרוקדים סביב העגל / כשעם ישראל רקד סביב עגל זהב → {"book":"Exodus","chapter":32,"verse":1}
כשמשה שבר את הלוחות / הלוחות שנשברו → {"book":"Exodus","chapter":32,"verse":19}
כשמשה הכה בסלע / הסלע שממנו יצא מים / טעות משה → {"book":"Numbers","chapter":20,"verse":1}
כשהאדמה בלעה את קורח / שהאדמה נפתחה / שרד המאוד → {"book":"Numbers","chapter":16,"verse":31}
כשנפתחה האדמה / האדמה נבקעה → {"book":"Numbers","chapter":16,"verse":31}
הדג שבלע את יונה / הדג הגדול / האיש בבטן הדג → {"book":"Jonah","chapter":2,"verse":1}
כשיוסף בכה / יוסף נגלה לאחיו / הפגישה הגדולה של יוסף → {"book":"Genesis","chapter":45,"verse":1}
כשיוסף ברח מאשת פוטיפר / הכותונת שנשאר ביד / שנשאר ערום → {"book":"Genesis","chapter":39,"verse":12}
החלום עם הסולם / הסולם שמגיע לשמים / מלאכים עולים ויורדים → {"book":"Genesis","chapter":28,"verse":12}
החלום עם השמש והירח / חלום יוסף הגדול / שאחיו ישתחוו → {"book":"Genesis","chapter":37,"verse":9}
פרות שמנות ופרות רזות / שבע שנות שובע ורעב / חלום פרעה → {"book":"Genesis","chapter":41,"verse":1}
כשעשו מכר את הבכורה / נזיד עדשים / מה הבכורה שווה לי → {"book":"Genesis","chapter":25,"verse":29}
כשיעקב לבש את עורות הגדיים / יצחק יצחק את יעקב לגבינה עשו → {"book":"Genesis","chapter":27,"verse":16}
כשאבן הבאר הוגלגלה / יעקב הגליל את האבן / יעקב פגש את רחל בבאר → {"book":"Genesis","chapter":29,"verse":10}
שבע שנים על שבע שנים / יעקב עבד ארבע עשרה שנה בשביל רחל → {"book":"Genesis","chapter":29,"verse":20}
כשיוסף קיבל את הכותנת / כתונת פסים / בגד הצבעים → {"book":"Genesis","chapter":37,"verse":3}
האיש שישן על האבן / יעקב לן בשדה → {"book":"Genesis","chapter":28,"verse":11}
המאבק בלילה / כשיעקב נאבק עם האיש / ירך יעקב → {"book":"Genesis","chapter":32,"verse":25}
כשנח נכנס לתיבה / נח ובני ביתו בתיבה / חיות בתיבה → {"book":"Genesis","chapter":7,"verse":7}
כשאדם וחוה אכלו מהעץ / עץ הדעת / הנחש שפיתה → {"book":"Genesis","chapter":3,"verse":6}
כשקין הרג את הבל / הרצח הראשון → {"book":"Genesis","chapter":4,"verse":8}
כשנולד משה בסל / תיבת הגומא / הילד שהושלך ליאור → {"book":"Exodus","chapter":2,"verse":3}
בת פרעה מצאה את משה / כשמשה נמצא בנהר → {"book":"Exodus","chapter":2,"verse":5}
כשמשה הרג את המצרי / משה מכה את המצרי → {"book":"Exodus","chapter":2,"verse":12}
כשמשה ראה את הסנה / הסנה שבוער ואינו כלה → {"book":"Exodus","chapter":3,"verse":2}
כשקרעו את הים / הים שנפתח / מצרים טבעו → {"book":"Exodus","chapter":14,"verse":21}
ריקוד מרים / מרים עם תופים / שירת הנשים → {"book":"Exodus","chapter":15,"verse":20}
כשהתורה ניתנה / הר סיני עם ענן ורעם / קולות וברקים → {"book":"Exodus","chapter":19,"verse":16}
כשמשה עלה להר / ארבעים יום בהר → {"book":"Exodus","chapter":19,"verse":20}
כשהמרגלים חזרו עם ענבים גדולים / ענבי אשכול → {"book":"Numbers","chapter":13,"verse":23}
כשבלעם ואתונו דיברו / החמור שדיבר / אתון בלעם → {"book":"Numbers","chapter":22,"verse":28}
הנחש הנחושת שהרפא / נחש על עמוד / שנחשכו ומתו → {"book":"Numbers","chapter":21,"verse":9}
חומות יריחו נפלו / תרועת החצוצרות / שבעה ימים סביב העיר → {"book":"Joshua","chapter":6,"verse":20}
כשהשמש עצרה / יום שהיה ארוך / יהושע ואמר לשמש → {"book":"Joshua","chapter":10,"verse":12}
מי שתקעה יתד בראש / יעל ומסמר / שהרגה את הגנרל → {"book":"Judges","chapter":4,"verse":21}
כשגיזזו את שמשון / שמשון ישן ודלילה גיזזה → {"book":"Judges","chapter":16,"verse":19}
כשהעמודים נפלו / שמשון הפיל את הבניין / מות שמשון → {"book":"Judges","chapter":16,"verse":30}
כשחנה התפללה בבכי / חנה מתפללת בלב / שמואל אמר דיבר → {"book":"I Samuel","chapter":1,"verse":10}
כשדוד ניצח את הגיבור הגדול / אבן מהקלע / ילד נגד ענק → {"book":"I Samuel","chapter":17,"verse":49}
שני הנשים עם התינוק / משפט שלמה / מי האם האמיתית → {"book":"I Kings","chapter":3,"verse":16}
תחרות הנביאים על הכרמל / אליהו נגד נביאי הבעל / אש ירדה מהשמים → {"book":"I Kings","chapter":18,"verse":38}
אליהו עולה לשמים / הרכב האש / אלישע קרע בגדיו → {"book":"II Kings","chapter":2,"verse":11}
כשהעצמות קמו לחיים / בקעת העצמות היבשות / עצמות נתחברו → {"book":"Ezekiel","chapter":37,"verse":7}
כבשן האש שלא שרף / שלושה בתוך האש / ארבעה רואים → {"book":"Daniel","chapter":3,"verse":25}
האריות שלא אכלו את דניאל / גוב האריות / לילה בין האריות → {"book":"Daniel","chapter":6,"verse":22}
כשאסתר נכנסה למלך ללא רשות / חיי הגיבורה / אם אבדתי אבדתי → {"book":"Esther","chapter":4,"verse":16}
כשהמן נתלה על העץ שהכין / מידה כנגד מידה → {"book":"Esther","chapter":7,"verse":10}
כשרות הלכה אחרי נעמי / לאן שתלכי אלך → {"book":"Ruth","chapter":1,"verse":16}`;

// ── Biblical topics/events map ─────────────────────────────────────────────────
const TOPICS_MAP = `If a well-known biblical event, topic, or family/relational context is mentioned (no explicit book/chapter), use these:
בריאת העולם / שבעת ימי הבריאה → {"book":"Genesis","chapter":1,"verse":1}
בריאת האדם / אדם הראשון → {"book":"Genesis","chapter":2,"verse":7}
גן עדן → {"book":"Genesis","chapter":2,"verse":8}
חטא אדם וחוה / עץ הדעת / נחש → {"book":"Genesis","chapter":3,"verse":1}
גירוש מגן עדן → {"book":"Genesis","chapter":3,"verse":23}
קין והבל → {"book":"Genesis","chapter":4,"verse":1}
חנוך → {"book":"Genesis","chapter":5,"verse":18}
הנפילים / בני האלהים → {"book":"Genesis","chapter":6,"verse":1}
המבול / נח ותיבה / תיבת נח → {"book":"Genesis","chapter":6,"verse":9}
קשת בענן / ברית הקשת → {"book":"Genesis","chapter":9,"verse":12}
מגדל בבל → {"book":"Genesis","chapter":11,"verse":1}
לידת יצחק / ברית מילה / הגר וישמעאל → {"book":"Genesis","chapter":17,"verse":1}
ברית בין הבתרים → {"book":"Genesis","chapter":15,"verse":1}
לוט ועיר סדום / סדום ועמורה → {"book":"Genesis","chapter":18,"verse":20}
הפיכת סדום / הצלת לוט → {"book":"Genesis","chapter":19,"verse":1}
עקדת יצחק / עקידה / הר המוריה → {"book":"Genesis","chapter":22,"verse":1}
שידוך רבקה / אליעזר ורבקה / עבד אברהם → {"book":"Genesis","chapter":24,"verse":1}
יעקב ועשו נולדים / תולדות יצחק → {"book":"Genesis","chapter":25,"verse":19}
עשו מוכר הבכורה / בכורת עשו → {"book":"Genesis","chapter":25,"verse":29}
ברכת יצחק / יעקב מקבל ברכה / יעקב ועשו ברכה → {"book":"Genesis","chapter":27,"verse":1}
בריחת יעקב מעשו / יעקב בורח → {"book":"Genesis","chapter":27,"verse":41}
סולם יעקב / חלום יעקב → {"book":"Genesis","chapter":28,"verse":10}
יעקב ולבן / יעקב מגיע לחרן / לבן הארמי ויעקב → {"book":"Genesis","chapter":29,"verse":1}
נישואי יעקב ורחל / יעקב ורחל ולאה / שתי נשות יעקב → {"book":"Genesis","chapter":29,"verse":16}
לידת שבטי ישראל / בני יעקב / שנים עשר שבטים → {"book":"Genesis","chapter":29,"verse":31}
לידת יוסף / רחל יולדת / יוסף בן רחל → {"book":"Genesis","chapter":30,"verse":22}
יעקב עוזב את לבן / יציאת יעקב מחרן → {"book":"Genesis","chapter":31,"verse":1}
מאבק יעקב עם המלאך / יעקב נהיה ישראל → {"book":"Genesis","chapter":32,"verse":25}
פגישת יעקב ועשו / אחים מתפייסים → {"book":"Genesis","chapter":33,"verse":1}
לידת בנימין / מות רחל / רחל מתה → {"book":"Genesis","chapter":35,"verse":16}
כתונת הפסים / יוסף ואחיו → {"book":"Genesis","chapter":37,"verse":1}
חלומות יוסף → {"book":"Genesis","chapter":37,"verse":5}
יוסף בבור / מכירת יוסף → {"book":"Genesis","chapter":37,"verse":23}
יוסף בבית פוטיפר / אשת פוטיפר → {"book":"Genesis","chapter":39,"verse":1}
יוסף בבית הסוהר / יוסף בכלא → {"book":"Genesis","chapter":39,"verse":20}
יוסף מפרש חלומות / חלומות פרעה → {"book":"Genesis","chapter":41,"verse":1}
יוסף נגלה לאחיו / יוסף מתגלה → {"book":"Genesis","chapter":45,"verse":1}
ירידת יעקב למצרים / בני ישראל במצרים → {"book":"Genesis","chapter":46,"verse":1}
ברכת יעקב לבניו / יעקב מברך שבטים → {"book":"Genesis","chapter":49,"verse":1}
הסנה הבוער → {"book":"Exodus","chapter":3,"verse":1}
מכות מצרים / עשר מכות → {"book":"Exodus","chapter":7,"verse":14}
מכת בכורות / מכה אחרונה → {"book":"Exodus","chapter":12,"verse":29}
פסח / ליל הסדר / קרבן פסח → {"book":"Exodus","chapter":12,"verse":1}
יציאת מצרים → {"book":"Exodus","chapter":12,"verse":31}
קריעת ים סוף / ים סוף → {"book":"Exodus","chapter":14,"verse":21}
שירת הים / שירת משה → {"book":"Exodus","chapter":15,"verse":1}
מן במדבר / לחם מן השמים → {"book":"Exodus","chapter":16,"verse":4}
מי מריבה / מי מסה → {"book":"Exodus","chapter":17,"verse":1}
מעמד הר סיני / מתן תורה → {"book":"Exodus","chapter":19,"verse":1}
עשרת הדיברות / לוחות הברית → {"book":"Exodus","chapter":20,"verse":1}
חטא העגל / עגל הזהב → {"book":"Exodus","chapter":32,"verse":1}
שבירת הלוחות → {"book":"Exodus","chapter":32,"verse":19}
המשכן / בניית המשכן → {"book":"Exodus","chapter":25,"verse":1}
ברכת כהנים → {"book":"Numbers","chapter":6,"verse":22}
המרגלים / עשרה מרגלים → {"book":"Numbers","chapter":13,"verse":1}
קורח ועדתו / מחלוקת קורח → {"book":"Numbers","chapter":16,"verse":1}
פרה אדומה → {"book":"Numbers","chapter":19,"verse":1}
נחש הנחושת → {"book":"Numbers","chapter":21,"verse":6}
בלעם ואתונו / אתון בלעם → {"book":"Numbers","chapter":22,"verse":21}
קריאת שמע → {"book":"Deuteronomy","chapter":6,"verse":4}
מות משה / פטירת משה → {"book":"Deuteronomy","chapter":34,"verse":1}
כניסה לארץ / עברית הירדן → {"book":"Joshua","chapter":3,"verse":1}
יריחו / חומות יריחו → {"book":"Joshua","chapter":6,"verse":1}
שמש גבעון / יהושע עוצר השמש → {"book":"Joshua","chapter":10,"verse":12}
דבורה ויעל / שירת דבורה → {"book":"Judges","chapter":4,"verse":1}
גדעון ומדיין → {"book":"Judges","chapter":6,"verse":11}
שמשון ודלילה → {"book":"Judges","chapter":16,"verse":4}
חנה ותפילתה / חנה ושמואל → {"book":"I Samuel","chapter":1,"verse":1}
שאול הראשון / משיחת שאול → {"book":"I Samuel","chapter":10,"verse":1}
דוד וגוליית → {"book":"I Samuel","chapter":17,"verse":1}
דוד ויהונתן → {"book":"I Samuel","chapter":18,"verse":1}
משיחת דוד → {"book":"I Samuel","chapter":16,"verse":1}
בת שבע / דוד ובת שבע → {"book":"II Samuel","chapter":11,"verse":1}
בניית בית המקדש / בית המקדש הראשון → {"book":"I Kings","chapter":6,"verse":1}
חכמת שלמה / משפט שלמה → {"book":"I Kings","chapter":3,"verse":16}
אליהו בכרמל / נביאי הבעל → {"book":"I Kings","chapter":18,"verse":20}
אליהו בחורב → {"book":"I Kings","chapter":19,"verse":9}
עליית אליהו / רכב האש → {"book":"II Kings","chapter":2,"verse":1}
אלישע ושונמית / ילד השונמית → {"book":"II Kings","chapter":4,"verse":8}
חורבן בית המקדש / גלות בבל → {"book":"II Kings","chapter":25,"verse":1}
חזון ישעיה / שרפים → {"book":"Isaiah","chapter":6,"verse":1}
חזון יחזקאל / מרכבה → {"book":"Ezekiel","chapter":1,"verse":1}
עצמות היבשות / בקעת העצמות → {"book":"Ezekiel","chapter":37,"verse":1}
יונה בבטן הדג / יונה והדג → {"book":"Jonah","chapter":2,"verse":1}
כבשן האש / שדרך מישך ועבד נגו → {"book":"Daniel","chapter":3,"verse":1}
דניאל בגוב האריות → {"book":"Daniel","chapter":6,"verse":17}
מגילת אסתר / פורים / המן → {"book":"Esther","chapter":1,"verse":1}
רות ובועז → {"book":"Ruth","chapter":2,"verse":1}
ספר איוב / סבל איוב → {"book":"Job","chapter":1,"verse":1}`;

// ── Navigate prompt ────────────────────────────────────────────────────────────
const NAV_PROMPT = `Extract a Bible reference from the Hebrew text and return JSON.
Book map: ${BOOK_MAP_STR}

Hebrew gematria numbers: א=1 ב=2 ג=3 ד=4 ה=5 ו=6 ז=7 ח=8 ט=9 י=10 יא=11 יב=12 יג=13 יד=14 טו=15 טז=16 יז=17 יח=18 יט=19 כ=20 כא=21 כב=22 כג=23 כד=24 כה=25 כו=26 כז=27 כח=28 כט=29 ל=30 לא=31 לב=32 לג=33 לד=34 לה=35 לו=36 לז=37 לח=38 לט=39 מ=40 נ=50 ס=60 ע=70 פ=80 צ=90 ק=100 ק"נ=150

${CHARACTERS_MAP}

${TOPICS_MAP}

${SLANG_MAP}

Return exactly one of:
{"found":true,"book":"<English name>","chapter":<number>,"verse":<number>}
{"found":false}

Rules:
- If explicit book+chapter+verse given → use them directly.
- If a character name or alias matches (including honorifics like "אבינו", "אמנו", "המלך", "הנביא", "הצדיק") → use character defaults.
- If a relational phrase is used ("אביו של יוסף" → יעקב, "בנות לבן" → לאה ורחל → Genesis 29, "אחי יוסף" → Genesis 37, "בעלה של רחל" → יעקב → Genesis 29) → resolve to the relevant character or event.
- If a topic/event name matches → use topic defaults.
- If only chapter/verse without book → use book "CURRENT".
- Default chapter=1, verse=1 if not mentioned.
- If the input is a place name associated with a biblical event (e.g. "חרן", "באר שבע", "בית לחם") → navigate to the most significant event at that place.
- If nothing in the input maps to a Bible reference → {"found":false}.

Examples:
"תהילים פרק כב פסוק א" → {"found":true,"book":"Psalms","chapter":22,"verse":1}
"המבול" → {"found":true,"book":"Genesis","chapter":6,"verse":9}
"קריעת ים סוף" → {"found":true,"book":"Exodus","chapter":14,"verse":21}
"עקדת יצחק" → {"found":true,"book":"Genesis","chapter":22,"verse":1}
"חטא העגל" → {"found":true,"book":"Exodus","chapter":32,"verse":1}
"דוד המלך" → {"found":true,"book":"I Samuel","chapter":16,"verse":1}
"לבן הארמי" → {"found":true,"book":"Genesis","chapter":29,"verse":1}
"רחל ולאה" → {"found":true,"book":"Genesis","chapter":29,"verse":16}
"בנות לבן" → {"found":true,"book":"Genesis","chapter":29,"verse":16}
"אביו של יוסף" → {"found":true,"book":"Genesis","chapter":25,"verse":19}
"אחי יוסף" → {"found":true,"book":"Genesis","chapter":37,"verse":1}
"פרק ה" → {"found":true,"book":"CURRENT","chapter":5,"verse":1}
"hello" → {"found":false}
"שלום" → {"found":false}`;

// ── Q&A prompt ─────────────────────────────────────────────────────────────────
const QA_PROMPT = `אתה מומחה לתנ"ך, פרשנות חז"ל ורש"י. עניין בשאלות על:
- זהות דמויות תנ"ך (כולל שמות, יחסי משפחה, תפקידים)
- אירועים ומקומות מקראיים
- פרשנות פסוקים ומשמעותם הפנימית
- הקשרים בין דמויות (למשל: "מי הוא לבן הארמי?" → דודו של יעקב, אחי רבקה; "מה הקשר בין רחל ולאה?" → שתיהן בנות לבן ונשות יעקב)

כללים:
- ענה תמיד בעברית תקנית ומודרנית.
- תשובה קצרה: 2–3 משפטים בלבד.
- התחל מיד בתשובה, ללא הקדמה.
- הזכר את הספר והפרק הרלוונטי כשמועיל (למשל: "הסיפור מופיע בבראשית פרק כט").
- כנה דמויות בכבוד: "אברהם אבינו", "משה רבנו", "דוד המלך" וכד'.`;

// ── Translation helpers ─────────────────────────────────────────────────────────

/** Strip HTML tags and common HTML entities from verse text before sending to AI. */
function cleanVerseText(text: string): string {
  return text
    .replace(/<[^>]+>/g, '')          // remove all HTML tags
    .replace(/&thinsp;/g,  ' ')
    .replace(/&nbsp;/g,    ' ')
    .replace(/&amp;/g,     '&')
    .replace(/&lt;/g,      '<')
    .replace(/&gt;/g,      '>')
    .replace(/[\u0591-\u05AF]/g, '')  // strip cantillation (keep nikud)
    .replace(/\s+/g, ' ')
    .trim();
}

// ── Translation prompts ─────────────────────────────────────────────────────────
const TRANSLATE_PROMPT = `You are a Biblical Aramaic expert and translator.
The verse below is in Biblical Aramaic. Translate the ENTIRE verse into clear, simple, modern Hebrew (plain Israeli Hebrew, not Talmudic).
Important rules:
- Translate every word — do not skip or truncate, even if the verse is long.
- Long lists of Aramaic official titles (e.g. אֲחַשְׁדַּרְפְּנַיָּא, סִגְנַיָּא) should be rendered with their Hebrew equivalents or a brief descriptive phrase.
- Return ONLY the Hebrew translation. No source text, no preamble, no parentheses with Aramaic words.`;

/** Simpler fallback prompt used on retry — less strict, forces output. */
const TRANSLATE_PROMPT_FALLBACK = `Translate this Biblical Aramaic verse into modern Hebrew. Be concise but complete. Output only the Hebrew translation.`;

// ── Shared translation helper (with retry) ─────────────────────────────────────
async function translateAramaic(
  verseText: string,
  book?: string,
  chapter?: number,
  verse?: number,
): Promise<string> {
  const cleaned = cleanVerseText(verseText);
  const context = `ספר ${book || ""}, פרק ${chapter || ""}, פסוק ${verse || ""}:\n${cleaned}`;

  // Attempt 1 — full prompt, generous token budget
  const attempt1 = await openai.chat.completions.create({
    model: "gpt-5.6-terra",
    max_completion_tokens: 600,
    messages: [
      { role: "system", content: TRANSLATE_PROMPT },
      { role: "user",   content: context },
    ],
  });
  const text1 = (attempt1.choices[0]?.message?.content ?? "").trim();
  if (text1.length > 5) return text1;

  // Attempt 2 — simpler prompt, higher token budget
  const attempt2 = await openai.chat.completions.create({
    model: "gpt-5.6-terra",
    max_completion_tokens: 900,
    messages: [
      { role: "system", content: TRANSLATE_PROMPT_FALLBACK },
      { role: "user",   content: cleaned },
    ],
  });
  const text2 = (attempt2.choices[0]?.message?.content ?? "").trim();
  if (text2.length > 5) return text2;

  return "לא הצלחתי לתרגם את הפסוק.";
}

// ── POST /api/ai/voice-command ─────────────────────────────────────────────────
router.post("/ai/voice-command", async (req, res) => {
  const { transcript, currentBook, currentChapter, currentVerse, currentVerseText } = req.body as {
    transcript: string;
    currentBook?: string;
    currentChapter?: number;
    currentVerse?: number;
    currentVerseText?: string;
  };

  if (!transcript || typeof transcript !== "string") {
    res.status(400).json({ error: "transcript required" });
    return;
  }

  try {
    if (isTranslateRequest(transcript)) {
      // ── Translate current verse ───────────────────────────────────────────────
      if (!currentVerseText) {
        res.json({ type: "answer", text: "לא נמצא טקסט לתרגום בפסוק הנוכחי." });
        return;
      }
      const text = await translateAramaic(currentVerseText, currentBook, currentChapter, currentVerse);
      res.json({ type: "answer", text });

    } else if (isQuestion(transcript)) {
      // ── Q&A ──────────────────────────────────────────────────────────────────
      const ctxNote = currentBook
        ? `[Currently reading: ${currentBook} chapter ${currentChapter} verse ${currentVerse}] `
        : "";

      const completion = await openai.chat.completions.create({
        model: "gpt-5.6-terra",
        max_completion_tokens: 512,
        messages: [
          { role: "system", content: QA_PROMPT },
          { role: "user",   content: ctxNote + transcript },
        ],
      });

      const text = (completion.choices[0]?.message?.content ?? "").trim();
      res.json({ type: "answer", text: text || "מצטער, לא הצלחתי לענות על השאלה." });

    } else {
      // ── Navigate ─────────────────────────────────────────────────────────────
      const completion = await openai.chat.completions.create({
        model: "gpt-5-mini",
        max_completion_tokens: 512,
        messages: [
          { role: "system", content: NAV_PROMPT },
          { role: "user",   content: transcript },
        ],
      });

      const raw = (completion.choices[0]?.message?.content ?? "").trim();
      const match = raw.match(/\{[\s\S]*?\}/);
      if (!match) { res.json({ type: "unknown" }); return; }

      const data = JSON.parse(match[0]);
      if (data.found) {
        res.json({ type: "navigate", book: data.book, chapter: data.chapter, verse: data.verse });
      } else {
        res.json({ type: "unknown" });
      }
    }
  } catch (err) {
    console.error("AI voice-command error:", err);
    res.status(500).json({ error: "AI error" });
  }
});

// ── POST /api/ai/translate-verse ───────────────────────────────────────────────
// Called automatically by the frontend when an Aramaic verse is displayed.
router.post("/ai/translate-verse", async (req, res) => {
  const { book, chapter, verse, verseText } = req.body as {
    book?: string;
    chapter?: number;
    verse?: number;
    verseText: string;
  };

  if (!verseText || typeof verseText !== "string") {
    res.status(400).json({ error: "verseText required" });
    return;
  }

  try {
    const translation = await translateAramaic(verseText, book, chapter, verse);
    res.json({ translation });
  } catch (err) {
    console.error("Translation error:", err);
    res.status(500).json({ error: "Translation failed" });
  }
});

// ── POST /api/ai/explain-verse ─────────────────────────────────────────────────
// Called automatically for every non-Aramaic verse to show "במילים פשוטות".
const EXPLAIN_PROMPT = `אתה מסביר פסוקים מהתנ"ך בשפה עברית תקנית, זורמת ופשוטה — בנאמנות מלאה לרוח חז"ל והמפרשים.
כתוב 2–3 משפטים שמסבירים מה קורה בפסוק.

עקרון יסוד — עומק ולא שטח:
- אל תסתפק בתיאור טכני או חיצוני של האירוע. חובה להבהיר את המניע, החטא והמשמעות הפנימית לפי המסורת.
- דוגמה: מגדל בבל — לא "הם בנו מגדל ואלוהים בלבל את שפתם", אלא: הם מרדו בה', ביקשו להילחם בו ולכפור בשלטונו על העולם — ועל כך נענשו.
- דוגמה: המבול — לא "ירד גשם ארבעים יום", אלא: העולם הושחת בחמס ובעריות, וה' החליט למחות את כל היצירה ולהתחיל מחדש עם נח הצדיק.
- דוגמה: חטא העגל — לא "העם עשה עגל זהב", אלא: בעוד משה במרום, העם נכשל באמונה, עשה לעצמו אל זהב ועבד אותו — בגידה קשה בברית שנכרתה זה עתה.

כבוד לדמויות התנ"ך — חובה:
- כנה את האבות, האמהות, הנביאים והמלכים בשמם בלבד, או עם תוספת כבוד מקובלת ("אברהם אבינו", "משה רבנו", "דוד המלך") — לפי ההקשר הטבעי.
- מצבים עובדתיים המופיעים במפורש בפסוק (כגון כהיית עיניים, זיקנה, מחלה) מותר לציין אם הם נדרשים להבנת הפשוט — אך אין לחזור עליהם ואין להדגישם שלא לצורך.
- הימנע לחלוטין מניסוחים מכפישים, גסים, או מיותרים שעלולים להישמע כחוסר כבוד.

כללי שפה חובה:
- כתוב עברית מודרנית תקנית בלבד.
- אל תשתמש בצורות עתיקות: "שמעתה", "ויהי", "ויאמר", "אשר" — תמיר אותן במילים טבעיות.
- אל תשתמש במונחים דתיים מורכבים שדורשים הסבר בפני עצמם.
- משפטים קצרים וישירים, ללא קישוטי סגנון וללא חזרות מיותרות.
החזר רק את ההסבר, ללא כותרת ולא הקדמה.`;

router.post("/ai/explain-verse", async (req, res) => {
  const { book, chapter, verse, verseText } = req.body as {
    book?: string;
    chapter?: number;
    verse?: number;
    verseText: string;
  };

  if (!verseText || typeof verseText !== "string") {
    res.status(400).json({ error: "verseText required" });
    return;
  }

  try {
    const cleaned = cleanVerseText(verseText);
    const completion = await openai.chat.completions.create({
      model: "gpt-5.6-terra",
      max_completion_tokens: 300,
      messages: [
        { role: "system", content: EXPLAIN_PROMPT },
        { role: "user",   content: `ספר ${book || ""}, פרק ${chapter || ""}, פסוק ${verse || ""}:\n${cleaned}` },
      ],
    });
    const explanation = (completion.choices[0]?.message?.content ?? "").trim();
    res.json({ explanation: explanation || "לא הצלחתי להסביר את הפסוק." });
  } catch (err) {
    console.error("Explain-verse error:", err);
    res.status(500).json({ error: "Explanation failed" });
  }
});

// ── POST /api/ai/explain-psalm ──────────────────────────────────────────────
// Called for Tikkun HaKlali: explains an entire psalm chapter.
const PSALM_EXPLAIN_PROMPT = `אתה מסביר מזמורי תהילים בשפה עברית תקנית, זורמת ופשוטה — בנאמנות מלאה לרוח חז"ל והמפרשים.
המזמור שיוצג בפניך הוא אחד מעשרת מזמורי התיקון הכללי שגילה רבי נחמן מברסלב.
כתוב 3–4 משפטים שמסבירים:
- מה עיקר תוכנו ורוחו של המזמור
- מה הכוח הרוחני הטמון בו לפי המסורת
- מה המלך דוד מבקש או מביע בו

עקרון יסוד — עומק ולא שטח:
- אל תסתפק בתיאור טכני. חובה לגעת במשמעות הפנימית ובכוח הרוחני.
- כתוב עברית מודרנית תקנית בלבד, ללא מילים עתיקות.
- משפטים קצרים וישירים, ללא קישוטי סגנון וללא חזרות מיותרות.

כבוד לדמויות התנ"ך — חובה:
- כנה את דוד המלך ושאר דמויות התנ"ך בשמם בלבד, או עם תוספת כבוד מקובלת ("דוד המלך", "שלמה המלך") — לפי ההקשר הטבעי.
- מצבים עובדתיים המופיעים במפורש בפסוק מותר לציין אם הם נדרשים להבנת הפשוט — אך אין לחזור עליהם ואין להדגישם שלא לצורך.
- הימנע לחלוטין מניסוחים מכפישים, גסים, או מיותרים שעלולים להישמע כחוסר כבוד.
החזר רק את ההסבר, ללא כותרת ולא הקדמה.`;

router.post("/ai/explain-psalm", async (req, res) => {
  const { psalmNumber, psalmText } = req.body as {
    psalmNumber?: number;
    psalmText: string;
  };

  if (!psalmText || typeof psalmText !== "string") {
    res.status(400).json({ error: "psalmText required" });
    return;
  }

  try {
    const cleaned = cleanVerseText(psalmText);
    const completion = await openai.chat.completions.create({
      model: "gpt-5.6-terra",
      max_completion_tokens: 400,
      messages: [
        { role: "system", content: PSALM_EXPLAIN_PROMPT },
        { role: "user",   content: `תהילים פרק ${psalmNumber || ""}:\n${cleaned}` },
      ],
    });
    const explanation = (completion.choices[0]?.message?.content ?? "").trim();
    res.json({ explanation: explanation || "לא הצלחתי להסביר את המזמור." });
  } catch (err) {
    console.error("Explain-psalm error:", err);
    res.status(500).json({ error: "Explanation failed" });
  }
});

export default router;
