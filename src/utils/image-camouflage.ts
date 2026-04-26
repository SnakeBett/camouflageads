/**
 * ALGORITMO DE CAMUFLAGEM DE IMAGEM - CamouflageAds
 * Recuperado do site em produção (camouflageads.com)
 *
 * O algoritmo funciona em 4 etapas:
 * 1. Blend: mistura imagem de capa (cover) com criativo (creative) usando intensidade
 * 2. Pixel Randomization: adiciona ruído aleatório por pixel (G2)
 * 3. Adversarial Noise: adiciona padrão checkerboard anti-IA (Z2)
 * 4. Contrast/Brightness Shift: pequena perturbação global de contraste (W2)
 *
 * Cada imagem gera um hash visual ÚNICO (seed aleatória diferente).
 * O Facebook vê a imagem de capa; o usuário vê o criativo principal.
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
// ETAPA 2: Pixel Randomization (G2)
// Adiciona variação aleatória por pixel, cada canal RGB recebe
// um offset diferente pra gerar um padrão único.
// ============================================================

function applyPixelRandomization(data: Uint8ClampedArray, seed: number): void {
  const state: PRNGState = { s: seed + 12345 };

  for (let i = 0; i < data.length; i += 4) {
    const offset = xorshift(state) % 5;
    const sign = xorshift(state) % 2 === 0 ? 1 : -1;

    data[i]     = Math.max(0, Math.min(255, data[i]     + offset * sign));        // R
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + (offset + 1) * -sign)); // G
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + offset * sign));        // B
  }
}

// ============================================================
// ETAPA 3: Adversarial Noise (Z2)
// Padrão checkerboard que engana redes neurais do Facebook.
// Usa blocos 2x2 com sinal alternado (+/-) combinado com
// ruído adversarial de intensidade configurável.
// ============================================================

function applyAdversarialNoise(
  data: Uint8ClampedArray,
  seed: number,
  intensity: number = 8,
  width: number = 0,
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

    const randomOffset = xorshift(state) % 3 - 1; // -1, 0, or 1
    const noise = (intensity + randomOffset) * checkerSign;

    data[i]     = Math.max(0, Math.min(255, data[i]     + noise)); // R
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise)); // G
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise)); // B
  }
}

// ============================================================
// ETAPA 4: Contrast/Brightness Shift (W2)
// Pequena perturbação global de contraste e brilho.
// Torna cada output visualmente único mantendo a aparência.
// ============================================================

function applyContrastShift(data: Uint8ClampedArray, seed: number): void {
  const state: PRNGState = { s: seed + 99999 };
  const brightnessShift = xorshift(state) % 7 - 3;           // -3 a +3
  const contrastFactor = 0.98 + (xorshift(state) % 40) / 1000; // 0.98 a ~1.02

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

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Erro ao carregar imagem: ${file.name}`));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error(`Erro ao ler arquivo: ${file.name}`));
    reader.readAsDataURL(file);
  });
}

// ============================================================
// FUNÇÃO PRINCIPAL: Camuflar uma imagem
// ============================================================

export interface CamouflageResult {
  camouflaged: string;      // Data URL da imagem camuflada
  algorithmView: string;    // Visualização do que o algoritmo vê
  creativePreview: string;  // Preview do criativo original
  fileName: string;         // Nome sugerido pro arquivo
}

/**
 * Camufla uma imagem criativa usando uma imagem de capa.
 *
 * @param coverImage - Imagem de capa (o que o Facebook/IA vai "ver")
 * @param creativeImage - Imagem criativa real (o que o lead/usuário vê)
 * @param index - Índice da imagem no batch (pra nomear o arquivo)
 * @param blendIntensity - Intensidade do blend (0.0 a 1.0, padrão 0.9 = 90% criativo)
 * @param noiseLevel - Nível do ruído adversarial (padrão 6)
 */
export function camouflageImage(
  coverImage: HTMLImageElement,
  creativeImage: HTMLImageElement,
  index: number = 0,
  blendIntensity: number = 0.9,
  noiseLevel: number = 6,
): CamouflageResult {
  const width = creativeImage.naturalWidth || creativeImage.width;
  const height = creativeImage.naturalHeight || creativeImage.height;

  // Obtém pixel data das duas imagens (redimensionadas pro mesmo tamanho)
  const coverData = imageToImageData(coverImage, width, height);
  const creativeData = imageToImageData(creativeImage, width, height);

  // Canvas de saída
  const outputCanvas = document.createElement("canvas");
  const ctx = outputCanvas.getContext("2d")!;
  outputCanvas.width = width;
  outputCanvas.height = height;

  const outputData = ctx.createImageData(width, height);

  // ---- ETAPA 1: Blend (mistura cover + creative) ----
  const creativeWeight = blendIntensity;
  const coverWeight = 1 - blendIntensity;

  for (let i = 0; i < coverData.data.length; i += 4) {
    outputData.data[i]     = Math.round(coverData.data[i]     * creativeWeight + creativeData.data[i]     * coverWeight);
    outputData.data[i + 1] = Math.round(coverData.data[i + 1] * creativeWeight + creativeData.data[i + 1] * coverWeight);
    outputData.data[i + 2] = Math.round(coverData.data[i + 2] * creativeWeight + creativeData.data[i + 2] * coverWeight);
    outputData.data[i + 3] = 255; // Alpha always opaque
  }

  // ---- ETAPA 2-4: Aplicar perturbações com seed única ----
  const seed = randomSeed();
  applyPixelRandomization(outputData.data, seed);
  applyAdversarialNoise(outputData.data, seed, noiseLevel, width);
  applyContrastShift(outputData.data, seed);

  // Renderiza resultado
  ctx.putImageData(outputData, 0, 0);
  const camouflaged = outputCanvas.toDataURL("image/png");

  // Preview do criativo original
  const previewCanvas = document.createElement("canvas");
  const previewCtx = previewCanvas.getContext("2d")!;
  previewCanvas.width = width;
  previewCanvas.height = height;
  previewCtx.drawImage(creativeImage, 0, 0, width, height);
  const creativePreview = previewCanvas.toDataURL("image/png");

  const fileName = `camouflage_${index + 1}_${Date.now()}.png`;

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
 * Processa múltiplas imagens criativas usando a mesma imagem de capa.
 *
 * @param coverImage - Imagem de capa carregada
 * @param creativeFiles - Array de Files dos criativos
 * @param onProgress - Callback (processados, total)
 * @param blendIntensity - Intensidade do blend (0.0-1.0)
 * @param noiseLevel - Nível do ruído adversarial
 */
export async function batchCamouflage(
  coverImage: HTMLImageElement,
  creativeFiles: File[],
  onProgress?: (done: number, total: number) => void,
  blendIntensity: number = 0.9,
  noiseLevel: number = 6,
): Promise<CamouflageResult[]> {
  const results: CamouflageResult[] = [];

  for (let i = 0; i < creativeFiles.length; i++) {
    const img = await loadImage(creativeFiles[i]);
    const result = camouflageImage(coverImage, img, i, blendIntensity, noiseLevel);
    results.push(result);
    onProgress?.(i + 1, creativeFiles.length);
  }

  return results;
}
