/**
 * Duas estratégias:
 *
 * 1) leve | medio | pesado — só alfabeto latino + acentos comuns; insere ZWSP/ZWNJ/WJ *entre*
 *    letras (nada de cirílico).
 *
 * 2) arquivo — padrão típico de páginas arquivadas / “bio trick”: letras que *parecem* latinas mas são
 *    outro codepoint (sobretudo cirílico confundível, ex. Т/e/s como T/e/s) + ZWSP entre caracteres,
 *    como em “​Т​е​ѕ​t​е​ ​1”.
 */

const ZWSP = "\u200B";
const ZWNJ = "\u200C";
const WJ = "\u2060";

const LATIN_ALNUM_BLOCK = /^[A-Za-z0-9\u00C0-\u024F]+$/;

export type ObfuscateIntensity = "leve" | "medio" | "pesado" | "arquivo";

function pickInvisible(): string {
  const pool = [ZWSP, ZWNJ, WJ];
  return pool[Math.floor(Math.random() * pool.length)]!;
}

function weaveInvisiblesInRun(run: string, insertProb: number): string {
  if (run.length <= 1) return run;
  let out = "";
  for (let i = 0; i < run.length; i++) {
    out += run[i]!;
    if (i < run.length - 1 && Math.random() < insertProb) {
      out += pickInvisible();
    }
  }
  return out;
}

/**
 * Cirílico / grego com o mesmo desenho que letras latinas comuns (não “alfabeto russo” à vista —
 * são os mesmos glifos de fonte que o utilizador associa ao inglês/português).
 * `t` minúsculo mantém-se latino: `т` cirílico parece “m” em muitas fontes.
 */
const ARCHIVE_CONFUSE: Record<string, string> = {
  A: "\u0410",
  B: "\u0412",
  C: "\u0421",
  E: "\u0415",
  H: "\u041D",
  I: "\u0406",
  J: "\u0408",
  K: "\u041A",
  M: "\u041C",
  N: "\u039D",
  O: "\u041E",
  P: "\u0420",
  S: "\u0405",
  T: "\u0422",
  X: "\u0425",
  a: "\u0430",
  b: "\u0432",
  c: "\u0441",
  e: "\u0435",
  h: "\u043D",
  i: "\u0456",
  j: "\u0458",
  k: "\u043A",
  m: "\u043C",
  o: "\u043E",
  p: "\u0440",
  s: "\u0455",
  x: "\u0445",
};

/** Estilo “​Т​е​ѕ​t​е​”: ZWSP antes do 1.º carácter e depois de cada um. */
function obfuscateArchiveStyle(text: string): string {
  let out = ZWSP;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    let emit = ch;
    if (Object.prototype.hasOwnProperty.call(ARCHIVE_CONFUSE, ch) && Math.random() < 0.88) {
      emit = ARCHIVE_CONFUSE[ch]!;
    }
    out += emit + ZWSP;
  }
  return out;
}

/**
 * @param intensity - leve/médio/pesado: só latin + invisíveis entre letras do bloco.
 *                    arquivo: confundíveis Unicode + ZWSP entre todos os caracteres (incl. espaços).
 */
export function obfuscateTextForSearch(text: string, intensity: ObfuscateIntensity): string {
  if (intensity === "arquivo") {
    return obfuscateArchiveStyle(text);
  }

  const insertProb =
    intensity === "leve" ? 0.38 : intensity === "medio" ? 0.82 : 1;

  return text
    .split(/([A-Za-z0-9\u00C0-\u024F]+)/g)
    .map((chunk) => {
      if (LATIN_ALNUM_BLOCK.test(chunk)) {
        return weaveInvisiblesInRun(chunk, insertProb);
      }
      return chunk;
    })
    .join("");
}
