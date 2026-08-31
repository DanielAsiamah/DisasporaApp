/**
 * compile-from-xlsx.js
 *
 * Compiles generatedCourses.js from:
 *  1. patois_learn_database.xlsx  – 146 real vocabulary entries with native translations
 *  2. diaspora_10000_content_master.xlsx – Full unit roadmap for all languages
 *
 * Lessons get phrase/meaning from real vocab so the lesson engine
 * (createLessonSteps) can build exercises correctly.
 * Steps are NOT embedded — the engine generates them dynamically.
 */

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const PATOIS_DB = 'C:\\Users\\china\\Downloads\\patois_learn_database.xlsx';
const DIASPORA_MASTER = 'C:\\Users\\china\\Downloads\\diaspora_10000_content_master.xlsx';
const OUTPUT = path.resolve(__dirname, '..', 'src', 'data', 'generatedCourses.js');

// ── Colour palette cycling per language ─────────────────────────────────────
const THEME_COLOURS = [
  '#7B61A8', // patois   – purple
  '#2196F3', // haitian  – blue
  '#FF9800', // belizean – orange
  '#4CAF50', // swahili  – green
  '#E91E63', // igbo     – pink
  '#9C27B0', // yoruba   – deep-purple
  '#00BCD4', // wolof    – cyan
  '#F44336', // nouchi   – red
  '#009688', // gullah   – teal
  '#FF5722', // aave     – deep-orange
  '#607D8B', // sudanese – blue-grey
  '#795548', // nubian   – brown
  '#3F51B5', // fr-swahili – indigo
  '#8BC34A', // ar-swahili – light-green
];

const ACCENT = '#F4B942';

// Flags by language id
const FLAGS = {
  patois: '🇯🇲', haitian: '🇭🇹', belizean: '🇧🇿', swahili: '🇰🇪',
  igbo: '🇳🇬', yoruba: '🇳🇬', wolof: '🇸🇳', nouchi: '🇨🇮',
  gullah: '🇺🇸', aave: '🇺🇸', sudanese: '🇸🇩', nubian: '🇪🇬',
  'fr-swahili': '🇨🇩', 'ar-swahili': '🇰🇪',
};

const TITLES = {
  patois: 'Jamaican Patois', haitian: 'Haitian Creole', belizean: 'Belizean Creole',
  swahili: 'Swahili', igbo: 'Igbo', yoruba: 'Yoruba', wolof: 'Wolof',
  nouchi: 'Ivorian Nouchi', gullah: 'Gullah Geechee', aave: 'Black American English',
  sudanese: 'Sudanese Arabic', nubian: 'Nubian', 'fr-swahili': 'Swahili (French)',
  'ar-swahili': 'Swahili (Arabic)',
};

// Unit objectives, emojis, titles per unit number (shared across all languages)
const UNIT_META = {
  1:  { title: 'Greetings',        objective: 'Say hello, goodbye, and start simple conversations', emoji: '👋' },
  2:  { title: 'Introductions',    objective: 'Introduce yourself and ask basic personal questions', emoji: '🙋' },
  3:  { title: 'Family',           objective: 'Talk about family members and relationships', emoji: '👨‍👩‍👧' },
  4:  { title: 'Food',             objective: 'Name food and order simple meals', emoji: '🍽️' },
  5:  { title: 'Numbers',          objective: 'Count and use numbers in sentences', emoji: '🔢' },
  6:  { title: 'Time',             objective: 'Talk about days, time, and routines', emoji: '⏰' },
  7:  { title: 'Directions',       objective: 'Ask where places are and understand directions', emoji: '📍' },
  8:  { title: 'Shopping',         objective: 'Buy items and ask prices', emoji: '🛒' },
  9:  { title: 'Home',             objective: 'Describe your home and household items', emoji: '🏠' },
  10: { title: 'Work',             objective: 'Talk about jobs and daily work', emoji: '💼' },
  11: { title: 'Emotions',         objective: 'Express feelings and moods', emoji: '😊' },
  12: { title: 'Travel',           objective: 'Ask for transport and travel phrases', emoji: '✈️' },
  13: { title: 'Health',           objective: 'Visit a doctor, describe symptoms', emoji: '🏥' },
  14: { title: 'Weather',          objective: 'Talk about weather and seasons', emoji: '☀️' },
  15: { title: 'Hobbies',          objective: 'Talk about interests and free time', emoji: '🎨' },
  16: { title: 'Culture',          objective: 'Cultural phrases and traditions', emoji: '🎭' },
  17: { title: 'Stories',          objective: 'Tell short personal stories', emoji: '📖' },
  18: { title: 'Opinions',         objective: 'Give opinions and preferences', emoji: '💬' },
  19: { title: 'Conversations',    objective: 'Longer back-and-forth dialogue', emoji: '🗣️' },
  20: { title: 'Fluency',          objective: 'Real-world scenarios end to end', emoji: '🏆' },
};

// ── Hardcoded vocab for languages not in patois_learn_database ───────────────
// These are real phrases — the engine will build exercises from them automatically.
const HARDCODED_VOCAB = {
  haitian: [
    { english: "what's happening", native: "sak pase", pronunciation: "sak pa-say", category: "greetings", audio_name: "sak_pase.mp3" },
    { english: "we are fine", native: "n ap boule", pronunciation: "nap boo-lay", category: "greetings", audio_name: "n_ap_boule.mp3" },
    { english: "I am well", native: "mwen byen", pronunciation: "mwen bjen", category: "greetings", audio_name: "mwen_byen.mp3" },
    { english: "thank you", native: "mèsi", pronunciation: "meh-see", category: "greetings", audio_name: "mesi.mp3" },
    { english: "please", native: "souple", pronunciation: "soo-play", category: "phrases", audio_name: "souple.mp3" },
    { english: "yes", native: "wi", pronunciation: "wee", category: "basics", audio_name: "wi.mp3" },
    { english: "no", native: "non", pronunciation: "nohn", category: "basics", audio_name: "non.mp3" },
    { english: "hello", native: "bonjou", pronunciation: "bon-zhoo", category: "greetings", audio_name: "bonjou.mp3" },
    { english: "goodbye", native: "orevwa", pronunciation: "oh-reh-vwa", category: "greetings", audio_name: "orevwa.mp3" },
    { english: "water", native: "dlo", pronunciation: "dloh", category: "food", audio_name: "dlo.mp3" },
    { english: "food", native: "manje", pronunciation: "man-zhay", category: "food", audio_name: "manje.mp3" },
    { english: "mother", native: "manman", pronunciation: "man-man", category: "family", audio_name: "manman.mp3" },
    { english: "father", native: "papa", pronunciation: "pa-pa", category: "family", audio_name: "papa_h.mp3" },
    { english: "friend", native: "zanmi", pronunciation: "zan-mee", category: "family", audio_name: "zanmi.mp3" },
  ],
  swahili: [
    { english: "hello", native: "jambo", pronunciation: "jam-bo", category: "greetings", audio_name: "jambo.mp3" },
    { english: "hello (respectful)", native: "shikamoo", pronunciation: "shi-ka-moh", category: "greetings", audio_name: "shikamoo.mp3" },
    { english: "how are you", native: "habari gani", pronunciation: "ha-ba-ri ga-ni", category: "greetings", audio_name: "habari_gani.mp3" },
    { english: "I am fine", native: "nzuri", pronunciation: "n-zoo-ri", category: "greetings", audio_name: "nzuri.mp3" },
    { english: "thank you", native: "asante", pronunciation: "a-san-teh", category: "greetings", audio_name: "asante.mp3" },
    { english: "very good", native: "nzuri sana", pronunciation: "n-zoo-ri sa-na", category: "phrases", audio_name: "nzuri_sana.mp3" },
    { english: "yes", native: "ndiyo", pronunciation: "ndi-yo", category: "basics", audio_name: "ndiyo.mp3" },
    { english: "no", native: "hapana", pronunciation: "ha-pa-na", category: "basics", audio_name: "hapana.mp3" },
    { english: "water", native: "maji", pronunciation: "ma-ji", category: "food", audio_name: "maji.mp3" },
    { english: "food", native: "chakula", pronunciation: "cha-koo-la", category: "food", audio_name: "chakula.mp3" },
    { english: "welcome", native: "karibu", pronunciation: "ka-ri-boo", category: "greetings", audio_name: "karibu.mp3" },
    { english: "mother", native: "mama", pronunciation: "ma-ma", category: "family", audio_name: "mama.mp3" },
    { english: "friend", native: "rafiki", pronunciation: "ra-fi-ki", category: "family", audio_name: "rafiki.mp3" },
    { english: "journey", native: "safari", pronunciation: "sa-fa-ri", category: "travel", audio_name: "safari.mp3" },
  ],
  igbo: [
    { english: "how are you", native: "kedu", pronunciation: "ke-du", category: "greetings", audio_name: "kedu.mp3" },
    { english: "I am fine", native: "adị m mma", pronunciation: "a-di m mma", category: "greetings", audio_name: "adi_m_mma.mp3" },
    { english: "thank you", native: "daalu", pronunciation: "daa-loo", category: "greetings", audio_name: "daalu.mp3" },
    { english: "hello", native: "ndewo", pronunciation: "n-deh-wo", category: "greetings", audio_name: "ndewo.mp3" },
    { english: "eat", native: "iri nri", pronunciation: "i-ri n-ri", category: "food", audio_name: "iri_nri.mp3" },
    { english: "mother", native: "nne", pronunciation: "n-neh", category: "family", audio_name: "nne.mp3" },
    { english: "father", native: "nna", pronunciation: "n-na", category: "family", audio_name: "nna.mp3" },
    { english: "you (plural)", native: "unu", pronunciation: "u-noo", category: "basics", audio_name: "unu.mp3" },
    { english: "yes", native: "ee", pronunciation: "eh-eh", category: "basics", audio_name: "ee.mp3" },
    { english: "no", native: "mba", pronunciation: "m-ba", category: "basics", audio_name: "mba.mp3" },
    { english: "good morning", native: "ụtụtụ ọma", pronunciation: "u-tu-tu o-ma", category: "greetings", audio_name: "ututu_oma.mp3" },
    { english: "come", native: "bia", pronunciation: "bee-a", category: "phrases", audio_name: "bia.mp3" },
  ],
  yoruba: [
    { english: "how are you", native: "bawo ni", pronunciation: "ba-wo ni", category: "greetings", audio_name: "bawo_ni.mp3" },
    { english: "I am fine", native: "mo wa dada", pronunciation: "mo wa da-da", category: "greetings", audio_name: "mo_wa_dada.mp3" },
    { english: "thank you", native: "e se", pronunciation: "eh sheh", category: "greetings", audio_name: "e_se.mp3" },
    { english: "hello", native: "e kaaro", pronunciation: "eh ka-ro", category: "greetings", audio_name: "e_kaaro.mp3" },
    { english: "good morning", native: "e kaaro", pronunciation: "eh ka-ro", category: "greetings", audio_name: "e_kaaro.mp3" },
    { english: "goodbye", native: "o dabo", pronunciation: "oh da-bo", category: "greetings", audio_name: "o_dabo.mp3" },
    { english: "yes", native: "beeni", pronunciation: "beh-ni", category: "basics", audio_name: "beeni.mp3" },
    { english: "no", native: "rara", pronunciation: "ra-ra", category: "basics", audio_name: "rara.mp3" },
    { english: "mother", native: "iya", pronunciation: "i-ya", category: "family", audio_name: "iya.mp3" },
    { english: "father", native: "baba", pronunciation: "ba-ba", category: "family", audio_name: "baba.mp3" },
    { english: "food", native: "onje", pronunciation: "on-jeh", category: "food", audio_name: "onje.mp3" },
    { english: "water", native: "omi", pronunciation: "o-mi", category: "food", audio_name: "omi.mp3" },
  ],
  wolof: [
    { english: "how are you", native: "nanga def", pronunciation: "nan-ga def", category: "greetings", audio_name: "nanga_def.mp3" },
    { english: "I am fine", native: "mangi fi", pronunciation: "man-gi fi", category: "greetings", audio_name: "mangi_fi.mp3" },
    { english: "thank you", native: "jërejëf", pronunciation: "jeh-reh-jef", category: "greetings", audio_name: "jerejef.mp3" },
    { english: "hello", native: "salaam aleekum", pronunciation: "sa-lam a-lay-kum", category: "greetings", audio_name: "salaam.mp3" },
    { english: "yes", native: "waaw", pronunciation: "wahw", category: "basics", audio_name: "waaw.mp3" },
    { english: "no", native: "deedeet", pronunciation: "deh-deht", category: "basics", audio_name: "deedeet.mp3" },
    { english: "friend", native: "xarit", pronunciation: "ha-rit", category: "family", audio_name: "xarit.mp3" },
    { english: "mother", native: "ndey", pronunciation: "n-dey", category: "family", audio_name: "ndey.mp3" },
    { english: "eat", native: "lekk", pronunciation: "lehk", category: "food", audio_name: "lekk.mp3" },
    { english: "water", native: "ndox", pronunciation: "n-dokh", category: "food", audio_name: "ndox.mp3" },
    { english: "come here", native: "kaay", pronunciation: "kai", category: "phrases", audio_name: "kaay.mp3" },
    { english: "let's go", native: "dem na", pronunciation: "dem na", category: "phrases", audio_name: "dem_na.mp3" },
  ],
  nouchi: [
    { english: "everything is fine", native: "ça gâte pas", pronunciation: "sa gat pa", category: "greetings", audio_name: "ca_gate_pas.mp3" },
    { english: "stylish/rich person", native: "choco", pronunciation: "cho-ko", category: "slang", audio_name: "choco.mp3" },
    { english: "friend", native: "go", pronunciation: "go", category: "family", audio_name: "go_nouchi.mp3" },
    { english: "money", native: "flouze", pronunciation: "flooz", category: "basics", audio_name: "flouze.mp3" },
    { english: "let's go", native: "on gâte", pronunciation: "on gat", category: "phrases", audio_name: "on_gate.mp3" },
    { english: "how are you", native: "tu vas comment", pronunciation: "too va ko-man", category: "greetings", audio_name: "tu_vas_comment.mp3" },
    { english: "party/celebration", native: "ambiance", pronunciation: "am-bj-ans", category: "culture", audio_name: "ambiance.mp3" },
    { english: "nice/cool", native: "djê", pronunciation: "djeh", category: "slang", audio_name: "dje.mp3" },
    { english: "eat", native: "manger", pronunciation: "man-zhay", category: "food", audio_name: "manger.mp3" },
    { english: "work", native: "boulot", pronunciation: "boo-lo", category: "work", audio_name: "boulot.mp3" },
  ],
  belizean: [
    { english: "what's going on", native: "weh di gwaan", pronunciation: "weh dee gwan", category: "greetings", audio_name: "weh_di_gwaan.mp3" },
    { english: "I am here", native: "a deh ya", pronunciation: "a deh ya", category: "greetings", audio_name: "a_deh_ya.mp3" },
    { english: "boy", native: "bway", pronunciation: "bway", category: "basics", audio_name: "bway.mp3" },
    { english: "girl", native: "gyal", pronunciation: "gyal", category: "basics", audio_name: "gyal.mp3" },
    { english: "yes", native: "ya man", pronunciation: "ya man", category: "basics", audio_name: "ya_man.mp3" },
    { english: "friend", native: "bredda", pronunciation: "bred-da", category: "family", audio_name: "bredda_bz.mp3" },
    { english: "eat", native: "nyam", pronunciation: "nyam", category: "food", audio_name: "nyam_bz.mp3" },
    { english: "cool/good", native: "irie", pronunciation: "i-ree", category: "slang", audio_name: "irie_bz.mp3" },
    { english: "how are you", native: "how yu stay", pronunciation: "how yoo stay", category: "greetings", audio_name: "how_yu_stay.mp3" },
    { english: "money", native: "bread", pronunciation: "bred", category: "basics", audio_name: "bread_bz.mp3" },
    { english: "thank you", native: "tanks", pronunciation: "tanks", category: "greetings", audio_name: "tanks.mp3" },
  ],
  gullah: [
    { english: "how are you all", native: "how oona da do", pronunciation: "how oo-na da do", category: "greetings", audio_name: "how_oona_da_do.mp3" },
    { english: "dawn/morning", native: "dayclean", pronunciation: "day-kleen", category: "time", audio_name: "dayclean.mp3" },
    { english: "we were there", native: "we bin dey", pronunciation: "we bin day", category: "phrases", audio_name: "we_bin_dey.mp3" },
    { english: "you (plural)", native: "oona", pronunciation: "oo-na", category: "basics", audio_name: "oona.mp3" },
    { english: "carry/take", native: "kya", pronunciation: "kya", category: "phrases", audio_name: "kya.mp3" },
    { english: "small", native: "lil bit", pronunciation: "lil bit", category: "basics", audio_name: "lil_bit.mp3" },
    { english: "eat", native: "nyam", pronunciation: "nyam", category: "food", audio_name: "nyam_gu.mp3" },
    { english: "friend", native: "buckra", pronunciation: "buck-ra", category: "family", audio_name: "buckra.mp3" },
    { english: "mother", native: "ma", pronunciation: "ma", category: "family", audio_name: "ma_gu.mp3" },
    { english: "yes", native: "yaas", pronunciation: "yaas", category: "basics", audio_name: "yaas.mp3" },
    { english: "hello", native: "hey", pronunciation: "hey", category: "greetings", audio_name: "hey.mp3" },
  ],
  aave: [
    { english: "what's up", native: "wah gwaan", pronunciation: "wah gwan", category: "greetings", audio_name: "wah_gwaan_aave.mp3" },
    { english: "no lie / for real", native: "no cap", pronunciation: "no cap", category: "slang", audio_name: "no_cap.mp3" },
    { english: "amazing food", native: "bussin", pronunciation: "bus-sin", category: "food", audio_name: "bussin.mp3" },
    { english: "she usually works", native: "she be working", pronunciation: "she bee wurk-in", category: "grammar", audio_name: "she_be_working.mp3" },
    { english: "finished long ago", native: "been done", pronunciation: "bin dun", category: "grammar", audio_name: "been_done.mp3" },
    { english: "secretly/somewhat", native: "lowkey", pronunciation: "loh-kee", category: "slang", audio_name: "lowkey.mp3" },
    { english: "to excel / look great", native: "slay", pronunciation: "slay", category: "slang", audio_name: "slay.mp3" },
    { english: "very good / excellent", native: "fire", pronunciation: "fi-er", category: "slang", audio_name: "fire_aave.mp3" },
    { english: "tired/done", native: "I'm dead", pronunciation: "im ded", category: "slang", audio_name: "im_dead.mp3" },
    { english: "relaxing", native: "chilling", pronunciation: "chill-in", category: "phrases", audio_name: "chilling.mp3" },
    { english: "are you serious", native: "for real though", pronunciation: "for reel tho", category: "phrases", audio_name: "for_real_though.mp3" },
    { english: "fancy/stylish", native: "dripped out", pronunciation: "dript owt", category: "slang", audio_name: "dripped_out.mp3" },
  ],
  sudanese: [
    { english: "welcome", native: "حبابك (hababka)", pronunciation: "ha-bab-ka", category: "greetings", audio_name: "hababka.mp3" },
    { english: "how are you", native: "كيفك (keyfak)", pronunciation: "kay-fak", category: "greetings", audio_name: "keyfak.mp3" },
    { english: "I am fine", native: "تمام (tamam)", pronunciation: "ta-mam", category: "greetings", audio_name: "tamam.mp3" },
    { english: "thank you", native: "شكراً (shukran)", pronunciation: "shook-ran", category: "greetings", audio_name: "shukran.mp3" },
    { english: "yes", native: "أيوه (aywa)", pronunciation: "ay-wa", category: "basics", audio_name: "aywa.mp3" },
    { english: "no", native: "لا (la)", pronunciation: "la", category: "basics", audio_name: "la.mp3" },
    { english: "friend", native: "صاحب (sahib)", pronunciation: "sa-hib", category: "family", audio_name: "sahib.mp3" },
    { english: "food", native: "أكل (akl)", pronunciation: "akl", category: "food", audio_name: "akl.mp3" },
    { english: "water", native: "مية (maya)", pronunciation: "ma-ya", category: "food", audio_name: "maya.mp3" },
    { english: "mother", native: "أم (umm)", pronunciation: "umm", category: "family", audio_name: "umm.mp3" },
  ],
  nubian: [
    { english: "hello", native: "مسكاجرو (maskagro)", pronunciation: "mas-ka-gro", category: "greetings", audio_name: "maskagro.mp3" },
    { english: "how are you", native: "كيفك يا نوبي", pronunciation: "kay-fak ya noo-bi", category: "greetings", audio_name: "keyfak_nubian.mp3" },
    { english: "thank you", native: "شكراً (shukran)", pronunciation: "shook-ran", category: "greetings", audio_name: "shukran_nb.mp3" },
    { english: "yes", native: "أيوه", pronunciation: "ay-wa", category: "basics", audio_name: "aywa_nb.mp3" },
    { english: "water", native: "مية (maya)", pronunciation: "ma-ya", category: "food", audio_name: "maya_nb.mp3" },
    { english: "friend", native: "صاحب (sahib)", pronunciation: "sa-hib", category: "family", audio_name: "sahib_nb.mp3" },
    { english: "grandmother", native: "تيتة (teta)", pronunciation: "teh-ta", category: "family", audio_name: "teta.mp3" },
    { english: "river", native: "نيل (nile)", pronunciation: "nil", category: "places", audio_name: "nile.mp3" },
    { english: "ancient", native: "قديم (qadim)", pronunciation: "qa-dim", category: "culture", audio_name: "qadim.mp3" },
    { english: "king", native: "ملك (malik)", pronunciation: "ma-lik", category: "culture", audio_name: "malik.mp3" },
  ],
  'fr-swahili': [
    { english: "very good", native: "nzuri sana", pronunciation: "n-zoo-ri sa-na", category: "greetings", audio_name: "nzuri_sana.mp3" },
    { english: "hello", native: "jambo", pronunciation: "jam-bo", category: "greetings", audio_name: "jambo.mp3" },
    { english: "thank you", native: "asante", pronunciation: "a-san-teh", category: "greetings", audio_name: "asante.mp3" },
    { english: "how is everything", native: "habari gani", pronunciation: "ha-ba-ri ga-ni", category: "greetings", audio_name: "habari_gani.mp3" },
    { english: "welcome", native: "karibu", pronunciation: "ka-ri-boo", category: "greetings", audio_name: "karibu.mp3" },
    { english: "yes", native: "ndiyo", pronunciation: "ndi-yo", category: "basics", audio_name: "ndiyo.mp3" },
    { english: "no", native: "hapana", pronunciation: "ha-pa-na", category: "basics", audio_name: "hapana.mp3" },
    { english: "friend", native: "rafiki", pronunciation: "ra-fi-ki", category: "family", audio_name: "rafiki.mp3" },
    { english: "food", native: "chakula", pronunciation: "cha-koo-la", category: "food", audio_name: "chakula.mp3" },
    { english: "journey", native: "safari", pronunciation: "sa-fa-ri", category: "travel", audio_name: "safari.mp3" },
  ],
  'ar-swahili': [
    { english: "news/information", native: "habari", pronunciation: "ha-ba-ri", category: "greetings", audio_name: "habari.mp3" },
    { english: "welcome", native: "karibu", pronunciation: "ka-ri-boo", category: "greetings", audio_name: "karibu.mp3" },
    { english: "thank you (Arabic root)", native: "asante / شكراً", pronunciation: "a-san-teh / shook-ran", category: "greetings", audio_name: "asante.mp3" },
    { english: "hello", native: "jambo / مرحباً", pronunciation: "jam-bo", category: "greetings", audio_name: "jambo.mp3" },
    { english: "time/hour", native: "saa / ساعة", pronunciation: "saa", category: "time", audio_name: "saa.mp3" },
    { english: "book", native: "kitabu / كتاب", pronunciation: "ki-ta-boo", category: "culture", audio_name: "kitabu.mp3" },
    { english: "yes", native: "ndiyo / نعم", pronunciation: "ndi-yo", category: "basics", audio_name: "ndiyo.mp3" },
    { english: "no", native: "hapana / لا", pronunciation: "ha-pa-na", category: "basics", audio_name: "hapana.mp3" },
    { english: "journey", native: "safari / سفر", pronunciation: "sa-fa-ri", category: "travel", audio_name: "safari.mp3" },
    { english: "friend", native: "rafiki / صديق", pronunciation: "ra-fi-ki", category: "family", audio_name: "rafiki.mp3" },
  ],
};

// ── Section labels ────────────────────────────────────────────────────────────
function getSectionLabel(unitNumber) {
  if (unitNumber <= 5) return 'SECTION 1';
  if (unitNumber <= 10) return 'SECTION 2';
  if (unitNumber <= 15) return 'SECTION 3';
  return 'SECTION 4';
}

// ── Group vocab by category to form lessons ───────────────────────────────────
function buildLessonsFromVocab(langId, vocabRows, unitMeta, unitIndex) {
  // Group vocab by category
  const byCategory = {};
  vocabRows.forEach(v => {
    const cat = v.category || 'general';
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(v);
  });

  const lessons = [];
  let lessonOrder = 1;
  const themeColor = THEME_COLOURS[Object.keys(TITLES).indexOf(langId) % THEME_COLOURS.length];

  Object.entries(byCategory).forEach(([category, items]) => {
    // Each batch of up to 8 vocab items = 1 lesson
    const batchSize = 8;
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const firstItem = batch[0];
      const lessonId = `${langId}-u${String(unitIndex).padStart(2, '0')}-l${String(lessonOrder).padStart(2, '0')}-${category}`;

      // Use first item as the lesson's headline phrase/meaning
      lessons.push({
        id: lessonId,
        order: lessonOrder,
        status: 'published',
        version: 1,
        title: `${unitMeta.title} – ${category.charAt(0).toUpperCase() + category.slice(1)} ${i > 0 ? Math.floor(i / batchSize) + 1 : ''}`.trim(),
        subtitle: unitMeta.objective,
        phrase: firstItem.native,
        meaning: firstItem.english,
        pronunciation: firstItem.pronunciation || '',
        category: category,
        note: firstItem.pronunciation ? `Pronounced: ${firstItem.pronunciation}` : '',
        type: 'star',
        lessonType: 'vocab',
        exerciseType: 'tap_reveal',
        xp: 10,
        audioKey: firstItem.audio_name ? firstItem.audio_name.replace('.mp3', '') : undefined,
        imageKey: firstItem.image_name || undefined,
        // Embed full vocab pool so the lesson engine has rich choices
        phrasePool: batch.map((v, idx) => ({
          id: `${lessonId}-item-${idx}`,
          phrase: v.native,
          meaning: v.english,
          pronunciation: v.pronunciation || '',
          note: v.pronunciation ? `Pronounced: ${v.pronunciation}` : '',
          category: v.category || category,
          audioKey: v.audio_name ? v.audio_name.replace('.mp3', '') : undefined,
          imageKey: v.image_name || undefined,
          type: 'vocab',
        })),
        // NO steps — let createLessonSteps() build them from phrase/meaning
        steps: [],
      });
      lessonOrder++;
    }
  });

  return lessons;
}

// ── Main ──────────────────────────────────────────────────────────────────────
function main() {
  console.log('Reading patois_learn_database.xlsx...');
  const wb1 = XLSX.readFile(PATOIS_DB);
  const patoisVocab = XLSX.utils.sheet_to_json(wb1.Sheets['vocabulary']);
  const patoisUnits = XLSX.utils.sheet_to_json(wb1.Sheets['units']);

  console.log('Reading diaspora_10000_content_master.xlsx...');
  const wb2 = XLSX.readFile(DIASPORA_MASTER);
  const unitRoadmap = XLSX.utils.sheet_to_json(wb2.Sheets['Unit_Roadmap']);
  const languages = XLSX.utils.sheet_to_json(wb2.Sheets['Languages']);

  console.log(`Loaded ${patoisVocab.length} patois vocab rows, ${unitRoadmap.length} unit roadmap rows`);

  const coursesData = {};
  let colorIdx = 0;

  // ── All language IDs we support ──────────────────────────────────────────
  const allLangIds = Object.keys(TITLES);

  allLangIds.forEach(langId => {
    const themeColor = THEME_COLOURS[colorIdx % THEME_COLOURS.length];
    colorIdx++;

    // Get units for this language from roadmap (or fall back to 20 standard units)
    const roadmapUnits = unitRoadmap.filter(u => u.language_id === langId && u.status === 'published');
    const unitList = roadmapUnits.length > 0 ? roadmapUnits : patoisUnits.map((u, i) => ({
      language_id: langId,
      unit_id: `${langId}_u${String(i+1).padStart(2,'0')}`,
      unit_number: u.unit_number,
      section_number: Math.ceil(u.unit_number / 5),
      section_title: getSectionLabel(u.unit_number).replace('SECTION ', 'Section '),
      unit_title: u.title,
      objective: u.objective,
      emoji: u.emoji || '📚',
      level: 'A1',
      status: 'published',
    }));

    // Get vocab for this language
    let vocab = langId === 'patois'
      ? patoisVocab.filter(v => v.language_id === 'patois')
      : (HARDCODED_VOCAB[langId] || []);

    // Group vocab by unit (use categories as units for non-patois)
    const units = [];

    if (langId === 'patois' && vocab.length > 0) {
      // Patois: group by category, map to the 20-unit structure
      const categories = ['greetings', 'family', 'food', 'phrases', 'slang', 'culture', 'basics', 'numbers', 'time', 'travel'];
      unitList.slice(0, 20).forEach((u, unitIdx) => {
        const unitNum = u.unit_number || (unitIdx + 1);
        const meta = UNIT_META[unitNum] || { title: u.unit_title || `Unit ${unitNum}`, objective: u.objective || '', emoji: u.emoji || '📚' };
        const category = categories[unitIdx % categories.length];
        const unitVocab = vocab.filter(v => v.category === category);
        const allVocab = unitVocab.length >= 3 ? unitVocab : vocab.slice(unitIdx * 3, unitIdx * 3 + 8);
        const lessons = buildLessonsFromVocab(langId, allVocab.length > 0 ? allVocab : vocab.slice(0, 8), meta, unitNum);
        if (lessons.length === 0) return;
        units.push({
          id: u.unit_id || `${langId}_u${String(unitNum).padStart(2,'0')}`,
          order: unitNum,
          status: 'published',
          title: `${getSectionLabel(unitNum)}, UNIT ${unitNum}`,
          description: meta.title,
          goal: meta.objective,
          emoji: meta.emoji,
          themeColor,
          lessons,
        });
      });
    } else {
      // Non-patois: build units from hardcoded vocab grouped by category
      const byCategory = {};
      vocab.forEach(v => {
        const cat = v.category || 'general';
        if (!byCategory[cat]) byCategory[cat] = [];
        byCategory[cat].push(v);
      });

      let unitIdx = 1;
      Object.entries(byCategory).forEach(([category, items]) => {
        const meta = UNIT_META[unitIdx] || { title: category.charAt(0).toUpperCase() + category.slice(1), objective: `Learn ${category} vocabulary`, emoji: '📚' };
        const lessons = buildLessonsFromVocab(langId, items, meta, unitIdx);
        if (lessons.length === 0) return;
        units.push({
          id: `${langId}_u${String(unitIdx).padStart(2,'0')}`,
          order: unitIdx,
          status: 'published',
          title: `SECTION 1, UNIT ${unitIdx}`,
          description: meta.title,
          goal: meta.objective,
          emoji: meta.emoji,
          themeColor,
          lessons,
        });
        unitIdx++;
      });
    }

    coursesData[langId] = {
      id: langId,
      title: TITLES[langId] || langId,
      flag: FLAGS[langId] || '🌍',
      themeColor,
      accentColor: ACCENT,
      units,
    };

    const totalLessons = units.reduce((a, u) => a + u.lessons.length, 0);
    console.log(`  ${langId}: ${units.length} units, ${totalLessons} lessons`);
  });

  const output = `// Compiled from xlsx sources at ${new Date().toISOString()}
// Sources: patois_learn_database.xlsx + diaspora_10000_content_master.xlsx

export const coursesData = ${JSON.stringify(coursesData, null, 2)};
`;

  fs.writeFileSync(OUTPUT, output, 'utf8');
  console.log(`\n✅ Written to ${OUTPUT}`);
  console.log(`   Total courses: ${Object.keys(coursesData).length}`);
  console.log(`   Total lessons: ${Object.values(coursesData).reduce((a, c) => a + c.units.reduce((b, u) => b + u.lessons.length, 0), 0)}`);
}

main();
