/**
 * Ofuscação “texto normal”: mantém as mesmas letras latinas (A–Z, acentos comuns, números)
 * e só insere caracteres de largura zero *entre* elas. Visualmente igual; uma busca literal
 * pelo texto digitado no teclado em geral não encontra o trecho copiado.
 *
 * Não usa cirílico nem outros alfabetos — só Latin + separadores Unicode invisíveis.
 */

const ZWSP = "\u200B"; // zero-width space
const ZWNJ = "\u200C"; // zero-width non-joiner
const WJ = "\u2060"; // word joiner

/** Letras latinas (ASCII + extensões A/B) e dígitos — um “bloco” onde se tecem invisíveis. */
const LATIN_ALNUM_BLOCK = /^[A-Za-z0-9\u00C0-\u024F]+$/;

export type ObfuscateIntensity = "leve" | "medio" | "pesado";

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
 * @param text - texto original (letras latinas comuns + números nos blocos reconhecidos)
 * @param intensity - probabilidade de inserir um invisível entre cada par de caracteres dentro do mesmo bloco
 */
export function obfuscateTextForSearch(text: string, intensity: ObfuscateIntensity): string {
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
