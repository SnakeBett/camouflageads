/**
 * Ofuscação visual para texto: parece igual ao original na maior parte dos sistemas,
 * mas os codepoints Unicode são outros — pesquisas literais (ex.: Google entre aspas)
 * em ASCII/Latin normal deixam de coincidir com o trecho copiado.
 *
 * Combina homóglifos (cirílico, grego, latino largura total) e, em níveis altos,
 * separadores de largura zero entre letras.
 */

const ZWSP = "\u200B"; // zero-width space
const ZWNJ = "\u200C"; // zero-width non-joiner
const WJ = "\u2060"; // word joiner

/** Letras latinas básicas → um carácter visualmente parecido (não é o mesmo codepoint). */
const HOMO_UPPER: Record<string, string> = {
  A: "\u0410",
  B: "\u0412",
  C: "\u0421",
  D: "\uFF24",
  E: "\u0415",
  F: "\uFF26",
  G: "\uFF27",
  H: "\u041D",
  I: "\u0406",
  J: "\u0408",
  K: "\u041A",
  L: "\uFF2C",
  M: "\u041C",
  N: "\u039D",
  O: "\u041E",
  P: "\u0420",
  Q: "\uFF31",
  R: "\uFF32",
  S: "\u0405",
  T: "\u0422",
  U: "\uFF35",
  V: "\uFF36",
  W: "\uFF37",
  X: "\u0425",
  Y: "\u04AE",
  Z: "\u0396",
};

const HOMO_LOWER: Record<string, string> = {
  a: "\u0430",
  b: "\u0432",
  c: "\u0441",
  d: "\uFF44",
  e: "\u0435",
  f: "\uFF46",
  g: "\uFF47",
  h: "\u043D",
  i: "\u0456",
  j: "\u0458",
  k: "\u043A",
  l: "\u04CF",
  m: "\u043C",
  n: "\uFF4E",
  o: "\u043E",
  p: "\u0440",
  q: "\uFF51",
  r: "\uFF52",
  s: "\u0455",
  t: "\u0442",
  u: "\u0443",
  v: "\u0475",
  w: "\uFF57",
  x: "\u0445",
  y: "\uFF59",
  z: "\u0437",
};

/** Dígitos 0–9 → variantes que quebram match literal com teclado numérico normal. */
const HOMO_DIGIT: Record<string, string> = {
  "0": "\uFF10",
  "1": "\uFF11",
  "2": "\uFF12",
  "3": "\uFF13",
  "4": "\uFF14",
  "5": "\uFF15",
  "6": "\uFF16",
  "7": "\uFF17",
  "8": "\uFF18",
  "9": "\uFF19",
};

export type ObfuscateIntensity = "leve" | "medio" | "pesado";

function homoglyphFor(ch: string): string {
  if (HOMO_UPPER[ch]) return HOMO_UPPER[ch];
  if (HOMO_LOWER[ch]) return HOMO_LOWER[ch];
  if (HOMO_DIGIT[ch]) return HOMO_DIGIT[ch];
  return ch;
}

function pickInvisible(): string {
  const pool = [ZWSP, ZWNJ, WJ];
  return pool[Math.floor(Math.random() * pool.length)]!;
}

/**
 * @param text - texto original
 * @param intensity - leve: ~45% letras trocadas; médio: ~85%; pesado: todas + separadores invisíveis entre letras
 */
export function obfuscateTextForSearch(text: string, intensity: ObfuscateIntensity): string {
  const replaceProb =
    intensity === "leve" ? 0.45 : intensity === "medio" ? 0.85 : 1;
  const insertInvisibleBetweenLetters = intensity === "pesado";

  let out = "";
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    const isLetter = /[A-Za-z]/.test(ch);
    const isDigit = /[0-9]/.test(ch);

    if (isLetter || isDigit) {
      const useHomo = Math.random() < replaceProb;
      const next = useHomo ? homoglyphFor(ch) : ch;
      out += next;
      if (insertInvisibleBetweenLetters) {
        out += pickInvisible();
      }
    } else {
      out += ch;
    }
  }

  return out;
}
