/**
 * Ofuscação de texto alinhada ao script inline de central-nrv.com na captura Wayback
 * `web/20220909061601` (Elementor + widget HTML). Determinístico; sem níveis.
 *
 * Modos: E-mail (RLO + reverso), SMS e Marcas (homoglifos, espaços removidos),
 * Anúncios e Sites (ZWSP antes de cada carácter + mesma tabela que SMS).
 */

const RLO = "\u202E";
const ZWSP = "\u200B";

/** Tabela `switch` do snapshot (MI/TX/BI) — só estas letras são substituídas. */
const CENTRAL_NRV_MAP: Record<string, string> = {
  a: "\u0430",
  c: "\u0441",
  e: "\u0435",
  i: "\u0456",
  j: "\u0458",
  o: "\u043E",
  p: "\u0440",
  s: "\u0455",
  x: "\u0445",
  y: "\u0443",
  A: "\u0410",
  B: "\u0412",
  C: "\u0421",
  E: "\u0415",
  H: "\u041D",
  I: "I",
  K: "\u039A",
  M: "\u041C",
  N: "\u039D",
  O: "\u041E",
  P: "\u0420",
  S: "\u0405",
  T: "\u0422",
  X: "\u0425",
  Y: "\u03A5",
  Z: "\u0396",
};

function mapCentralNrvChar(ch: string): string {
  if (ch === " ") return "";
  if (Object.prototype.hasOwnProperty.call(CENTRAL_NRV_MAP, ch)) {
    return CENTRAL_NRV_MAP[ch]!;
  }
  return ch;
}

export type CentralNrvTextMode = "email" | "sms" | "anuncios";

export function obfuscateCentralNrvText(text: string, mode: CentralNrvTextMode): string {
  if (mode === "email") {
    return RLO + [...text].reverse().join("");
  }

  if (mode === "sms") {
    let out = "";
    for (const ch of text) {
      out += mapCentralNrvChar(ch);
    }
    return out;
  }

  // anuncios: antes de cada carácter, ZWSP; depois mesma substituição que SMS (incl. espaço → vazio após o ZWSP)
  let out = "";
  for (const ch of text) {
    out += ZWSP;
    out += mapCentralNrvChar(ch);
  }
  return out;
}
