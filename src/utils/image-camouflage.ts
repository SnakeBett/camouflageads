/**
 * ALGORITMO DE CAMUFLAGEM DE IMAGEM - CamouflageAds
 * Restaurado a partir do bundle de produção (camouflageads.com)
 * Chunk: assets/CamuflarImagem-CjFo04vv.js  (funções xt/pt/mt/ut/ft/dt/H).
 *
 * Pipeline em 4 etapas com PRNG xorshift e seed única por imagem:
 *   1. Blend cover × creative com mistura FIXA (10% capa / 90% criativo).
 *   2. Pixel randomization (offset por canal RGB com sinais alternados).
 *   3. Adversarial noise checkerboard 2x2 anti-IA — ÚNICO passo controlado
 *      pelo slider de intensidade (0..20 na UI original).
 *   4. Contrast/brightness shift global pequeno (também fixo).
 *
 * IMPORTANTE: o canvas de saída usa as DIMENSÕES DA CAPA. Todos os
 * criativos são redimensionados para esse tamanho antes do blend — é o que
 * garante que o "Facebook ver a capa" do tamanho esperado.
 */

// ============================================================
// PRNG - Xorshift pseudo-random number generator
// ============================================================

interface PRNGState {
  s: number;
}

function randomSeed(): number {
  return Math.floor(Math.random() * 2147483647);
}

function xorshift(state: PRNGState): number {
  let s = state.s;
  s ^= s << 13;
  s ^= s >> 17;
  s ^= s << 5;
  state.s = s >>> 0;
  return state.s % 256;
}

// ============================================================
// Mistura cover/criativo — controlada por slider na UI.
// O slider vai de 0 a 20 (igual ao site original) e mapeia
// para a fração da capa no blend usando uma curva gamma para
// dar mais resolução nos valores baixos ("ofuscação leve").
// ============================================================

export const COVER_LEVEL_MIN = 0;
export const COVER_LEVEL_MAX = 20;
const COVER_MIX_MIN = 0;     // slider em 0 = puro criativo
const COVER_MIX_MAX = 0.95;  // slider em 20 = quase só capa
const COVER_GAMMA = 1.6;     // gamma > 1 → mais sensibilidade na faixa baixa

/**
 * Converte o valor do slider de Camuflagem (0..20) na fração da capa
 * usada no blend (0..0.95). Curva gamma 1.6: pequenos passos na esquerda
 * mudam pouco a mistura — útil para ajustes finos com baixa ofuscação.
 */
export function coverLevelToCoverMix(coverLevel: number): number {
  const clamped = Math.max(COVER_LEVEL_MIN, Math.min(COVER_LEVEL_MAX, coverLevel));
  const u = clamped / COVER_LEVEL_MAX;
  return COVER_MIX_MIN + (COVER_MIX_MAX - COVER_MIX_MIN) * Math.pow(u, COVER_GAMMA);
}

/** Alias retrocompatível com o código antigo da UI. */
export function getCoverMixPreview(coverLevel: number): number {
  return coverLevelToCoverMix(coverLevel);
}

// ============================================================
// ETAPA 2: Pixel Randomization
// Offset por canal RGB com sinal alternado. Faixa de offset FIXA em [0,4].
// ============================================================

function applyPixelRandomization(data: Uint8ClampedArray, seed: number): void {
  const state: PRNGState = { s: seed + 12345 };

  for (let i = 0; i < data.length; i += 4) {
    const offset = xorshift(state) % 5;
    const sign = xorshift(state) % 2 === 0 ? 1 : -1;

    data[i]     = Math.max(0, Math.min(255, data[i]     + offset * sign));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + (offset + 1) * -sign));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + offset * sign));
  }
}

// ============================================================
// ETAPA 3: Adversarial Noise (anti-IA Facebook)
// Checkerboard 2x2 com sinais ± + ruído pequeno.
// É o ÚNICO passo controlado pelo slider de intensidade.
// ============================================================

function applyAdversarialNoise(
  data: Uint8ClampedArray,
  seed: number,
  intensity: number,
  width: number,
): void {
  const state: PRNGState = { s: seed };
  const blockSize = 2;

  for (let i = 0; i < data.length; i += 4) {
    const pixelIndex = i / 4;
    const x = pixelIndex % width;
    const y = Math.floor(pixelIndex / width);

    const blockX = Math.floor(x / blockSize);
    const blockY = Math.floor(y / blockSize);
    const checkerSign = (blockX + blockY) % 2 === 0 ? 1 : -1;

    const randomOffset = xorshift(state) % 3 - 1; // -1, 0, +1
    const noise = (intensity + randomOffset) * checkerSign;

    data[i]     = Math.max(0, Math.min(255, data[i]     + noise));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
  }
}

// ============================================================
// ETAPA 4: Contrast / Brightness Shift
// Brightness ±3, contrast multiplicador entre 0.98 e ~1.019. Tudo FIXO.
// ============================================================

function applyContrastShift(data: Uint8ClampedArray, seed: number): void {
  const state: PRNGState = { s: seed + 99999 };
  const brightnessShift = (xorshift(state) % 7) - 3;
  const contrastFactor = 0.98 + (xorshift(state) % 40) / 1000;

  for (let i = 0; i < data.length; i += 4) {
    for (let ch = 0; ch < 3; ch++) {
      let value = data[i + ch];
      value = Math.round((value - 128) * contrastFactor + 128 + brightnessShift);
      data[i + ch] = Math.max(0, Math.min(255, value));
    }
  }
}

// ============================================================
// Helpers
// ============================================================

function imageToImageData(
  img: HTMLImageElement,
  width: number,
  height: number,
): ImageData {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  canvas.width = width;
  canvas.height = height;
  ctx.drawImage(img, 0, 0, width, height);
  return ctx.getImageData(0, 0, width, height);
}

export function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error("Arquivo ausente"));
      return;
    }
    if (!file.type.startsWith("image/")) {
      reject(new Error(`Arquivo inválido: ${file.name}`));
      return;
    }

    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Erro ao carregar imagem: ${file.name}`));
    };
    img.src = url;
  });
}

// ============================================================
// FUNÇÃO PRINCIPAL: Camuflar uma imagem
// ============================================================

export interface CamouflageResult {
  camouflaged: string;     // Data URL da imagem camuflada
  algorithmView: string;   // Visualização do que o algoritmo vê (igual à camuflada)
  creativePreview: string; // Preview do criativo original (para hover)
  fileName: string;        // Nome sugerido pro arquivo
}

/**
 * Camufla uma imagem criativa usando uma imagem de capa.
 *
 * @param coverImage    Imagem de capa (define DIMENSÕES da saída)
 * @param creativeImage Imagem criativa real (que o lead vê)
 * @param index         Índice da imagem no batch (pra nomear o arquivo)
 * @param coverMix      Fração da capa no blend (0..1). Default 0.10 (igual produção).
 * @param noiseLevel    Intensidade do ruído anti-IA (slider 0..20). Default 6.
 */
export function camouflageImage(
  coverImage: HTMLImageElement,
  creativeImage: HTMLImageElement,
  index: number = 0,
  coverMix: number = 0.1,
  noiseLevel: number = 6,
): CamouflageResult {
  const width = coverImage.naturalWidth || coverImage.width;
  const height = coverImage.naturalHeight || coverImage.height;

  const coverData = imageToImageData(coverImage, width, height);
  const creativeData = imageToImageData(creativeImage, width, height);

  const outputCanvas = document.createElement("canvas");
  const ctx = outputCanvas.getContext("2d")!;
  outputCanvas.width = width;
  outputCanvas.height = height;

  const outputData = ctx.createImageData(width, height);

  const safeCoverMix = Math.max(0, Math.min(1, coverMix));
  const creativeMix = 1 - safeCoverMix;

  for (let i = 0; i < coverData.data.length; i += 4) {
    outputData.data[i]     = Math.round(coverData.data[i]     * safeCoverMix + creativeData.data[i]     * creativeMix);
    outputData.data[i + 1] = Math.round(coverData.data[i + 1] * safeCoverMix + creativeData.data[i + 1] * creativeMix);
    outputData.data[i + 2] = Math.round(coverData.data[i + 2] * safeCoverMix + creativeData.data[i + 2] * creativeMix);
    outputData.data[i + 3] = 255;
  }

  const seed = randomSeed();
  applyPixelRandomization(outputData.data, seed);
  applyAdversarialNoise(outputData.data, seed, Math.max(0, noiseLevel), width);
  applyContrastShift(outputData.data, seed);

  ctx.putImageData(outputData, 0, 0);
  const camouflaged = outputCanvas.toDataURL("image/png");

  const previewCanvas = document.createElement("canvas");
  const previewCtx = previewCanvas.getContext("2d")!;
  previewCanvas.width = width;
  previewCanvas.height = height;
  previewCtx.drawImage(creativeImage, 0, 0, width, height);
  const creativePreview = previewCanvas.toDataURL("image/png");

  const coverPct = Math.round(safeCoverMix * 100);
  const fileName = `camouflage_${index + 1}_c${coverPct}_n${Math.round(noiseLevel)}_${Date.now()}.png`;

  return {
    camouflaged,
    algorithmView: camouflaged,
    creativePreview,
    fileName,
  };
}

// ============================================================
// Processamento em batch
// ============================================================

/**
 * Processa múltiplos criativos usando a mesma imagem de capa.
 *
 * @param coverImage     Imagem de capa carregada
 * @param creativeFiles  Files dos criativos
 * @param onProgress     Callback (processados, total)
 * @param coverMix       Fração da capa no blend (0..1). Default 0.10.
 * @param noiseLevel     Intensidade do ruído anti-IA (slider 0..20). Default 6.
 */
export async function batchCamouflage(
  coverImage: HTMLImageElement,
  creativeFiles: File[],
  onProgress?: (done: number, total: number) => void,
  coverMix: number = 0.1,
  noiseLevel: number = 6,
): Promise<CamouflageResult[]> {
  const results: CamouflageResult[] = [];

  for (let i = 0; i < creativeFiles.length; i++) {
    const img = await loadImage(creativeFiles[i]);
    const result = camouflageImage(coverImage, img, i, coverMix, noiseLevel);
    results.push(result);
    onProgress?.(i + 1, creativeFiles.length);
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });
  }

  return results;
}
