/**
 * ALGORITMO DE CAMUFLAGEM DE ÁUDIO - CamouflageAds
 * Recuperado do site em produção (camouflageads.com)
 *
 * Usa FFmpeg compilado pra WebAssembly (@ffmpeg/ffmpeg).
 * Funciona 100% no browser sem servidor.
 *
 * 2 modos:
 *   - basico: ajuste sutil de sample rate (1%) + resampling + ajuste de tempo
 *   - agressivo: ajuste mais forte (2%) + resampling + ajuste de tempo maior
 *
 * Para VÍDEOS: re-codifica apenas o áudio (video stream é copiado intacto)
 * Para ÁUDIOS puros: re-codifica pra MP3 96kbps
 */

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL, fetchFile } from "@ffmpeg/util";

// ============================================================
// Singleton FFmpeg instance
// ============================================================

let ffmpegInstance: FFmpeg | null = null;
let loadingPromise: Promise<FFmpeg> | null = null;
let lastLog = "";
let logHistory: string[] = [];

function onLog(message: string) {
  lastLog = message;
  logHistory.push(message);
  if (logHistory.length > 200) {
    logHistory = logHistory.slice(-200);
  }
}

function clearLogs() {
  lastLog = "";
  logHistory = [];
}

function getFullLog(): string {
  return logHistory.join("\n");
}

/**
 * Analisa mensagens de erro do FFmpeg e retorna mensagem amigável
 */
function parseFFmpegError(rawMessage: string): string {
  const msg = rawMessage.trim();
  const lower = msg.toLowerCase();

  if (!msg) return "O FFmpeg falhou ao processar este arquivo.";

  if (lower.includes("output file #0 does not contain any stream") ||
      (lower.includes("stream map") && lower.includes("matches no streams"))) {
    return "Esse vídeo não tem uma trilha de áudio compatível para camuflagem.";
  }
  if (lower.includes("could not find codec parameters") ||
      lower.includes("invalid data found") ||
      lower.includes("moov atom not found")) {
    return "Esse vídeo não é compatível com processamento no navegador.";
  }
  if (lower.includes("memory access out of bounds") ||
      lower.includes("cannot enlarge memory")) {
    return "Esse arquivo excede a memória disponível no navegador.";
  }
  if (lower.includes("conversion failed")) {
    return "A conversão do áudio falhou para este arquivo.";
  }

  return msg;
}

/**
 * Carrega o FFmpeg WASM (singleton). Chama apenas uma vez.
 * Os arquivos ffmpeg-core.js e ffmpeg-core.wasm devem estar em /ffmpeg/
 */
export async function loadFFmpeg(
  onProgress?: (msg: string) => void,
): Promise<FFmpeg> {
  if (ffmpegInstance) return ffmpegInstance;
  if (loadingPromise) {
    onProgress?.("Carregando FFmpeg...");
    return loadingPromise;
  }

  const ffmpeg = new FFmpeg();
  ffmpeg.on("log", ({ message }) => onLog(message));

  onProgress?.("Carregando FFmpeg...");

  const baseURL = window.location.origin + "/ffmpeg";

  loadingPromise = ffmpeg
    .load({
      coreURL: `${baseURL}/ffmpeg-core.js`,
      wasmURL: `${baseURL}/ffmpeg-core.wasm`,
    })
    .then(() => {
      ffmpegInstance = ffmpeg;
      return ffmpeg;
    })
    .catch((err) => {
      ffmpegInstance = null;
      loadingPromise = null;
      throw err;
    });

  return loadingPromise;
}

/**
 * Pré-carrega FFmpeg em background (chame no mount do componente)
 */
export function preloadFFmpeg(): void {
  loadFFmpeg().catch(() => {});
}

// ============================================================
// Detecção de tipo
// ============================================================

function getExtension(filename: string): string {
  const match = filename.match(/\.[^.]+$/);
  return match ? match[0].toLowerCase() : ".mp4";
}

function isVideoFile(file: File): boolean {
  return (
    file.type.startsWith("video/") ||
    /\.(mp4|mov|m4v|webm|avi)$/i.test(file.name)
  );
}

// ============================================================
// FILTROS DE ÁUDIO (o coração da camuflagem)
// ============================================================

/**
 * Filtros FFmpeg por modo de camuflagem:
 *
 * BÁSICO:
 *   asetrate=48000*1.01  → altera a taxa de sample em 1% (pitch sutil)
 *   aresample=48000      → normaliza de volta pra 48kHz
 *   atempo=0.990099      → compensa a mudança de velocidade (1/1.01)
 *
 * AGRESSIVO:
 *   asetrate=48000*1.02  → altera a taxa de sample em 2% (pitch mais forte)
 *   aresample=48000      → normaliza de volta pra 48kHz
 *   atempo=0.980392      → compensa a mudança de velocidade (1/1.02)
 */
const AUDIO_FILTERS = {
  basico: "asetrate=48000*1.01,aresample=48000,atempo=0.990099",
  agressivo: "asetrate=48000*1.02,aresample=48000,atempo=0.980392",
} as const;

// ============================================================
// FUNÇÃO PRINCIPAL: Camuflar áudio
// ============================================================

export interface AudioCamouflageResult {
  url: string;         // Object URL do blob processado
  outputName: string;  // Nome sugerido pro arquivo
}

/**
 * Processa um arquivo de áudio/vídeo aplicando camuflagem na trilha de áudio.
 *
 * @param file - Arquivo de áudio (MP3, WAV) ou vídeo (MP4, MOV, etc)
 * @param mode - 'basico' ou 'agressivo'
 * @param onProgress - Callback de progresso
 * @returns Object URL do arquivo processado + nome sugerido
 */
export async function processAudioCamouflage(
  file: File,
  mode: "basico" | "agressivo" = "basico",
  onProgress?: (msg: string) => void,
): Promise<AudioCamouflageResult> {
  if (file.size > 80 * 1024 * 1024) {
    throw new Error("Arquivo muito grande para processamento no navegador (máx 80MB)");
  }

  const ffmpeg = await loadFFmpeg(onProgress);

  const inputExt = getExtension(file.name);
  const inputName = "input" + inputExt;
  const isVideo = isVideoFile(file);
  const outputExt = isVideo ? inputExt : ".mp3";
  const outputName = file.name.replace(/\.[^.]+$/, "") + "_camuflado" + outputExt;
  const outputFile = "output" + outputExt;

  const audioFilter = AUDIO_FILTERS[mode];

  try {
    clearLogs();
    onProgress?.("Lendo arquivo...");
    await ffmpeg.writeFile(inputName, await fetchFile(file));

    clearLogs();
    onProgress?.("Aplicando camuflagem no áudio...");

    let exitCode: number;

    if (isVideo) {
      // Para VÍDEOS: copia stream de vídeo, re-codifica apenas áudio
      exitCode = await ffmpeg.exec([
        "-i", inputName,
        "-af", audioFilter,
        "-c:v", "copy",         // video stream intacto
        "-c:a", "aac",          // re-codifica áudio como AAC
        "-b:a", "96k",          // bitrate de áudio
        "-movflags", "+faststart", // otimização pra streaming
        "-y", outputFile,
      ]);
    } else {
      // Para ÁUDIOS puros: re-codifica pra MP3
      exitCode = await ffmpeg.exec([
        "-i", inputName,
        "-af", audioFilter,
        "-c:a", "libmp3lame",   // codec MP3
        "-b:a", "96k",          // bitrate
        "-y", outputFile,
      ]);
    }

    if (exitCode !== 0) {
      throw new Error(parseFFmpegError(getFullLog() || lastLog));
    }

    onProgress?.("Finalizando...");
    const outputData = await ffmpeg.readFile(outputFile);

    if (!(outputData instanceof Uint8Array) || outputData.length === 0) {
      throw new Error("O arquivo processado não foi gerado corretamente.");
    }

    const mimeType = isVideo ? (file.type || "video/mp4") : "audio/mpeg";
    const blob = new Blob([new Uint8Array(outputData.buffer)], { type: mimeType });

    return {
      url: URL.createObjectURL(blob),
      outputName,
    };
  } catch (err) {
    if (typeof err === "string") throw new Error(err);
    if (err instanceof Error) throw err;
    throw new Error(parseFFmpegError(getFullLog() || lastLog));
  } finally {
    await Promise.allSettled([
      ffmpeg.deleteFile(inputName),
      ffmpeg.deleteFile(outputFile),
    ]);
  }
}

// ============================================================
// Processamento em batch
// ============================================================

export interface BatchAudioResult {
  name: string;
  status: "done" | "error";
  url: string;
  errorMsg?: string;
}

/**
 * Processa múltiplos arquivos de áudio/vídeo em sequência.
 *
 * @param files - Array de arquivos
 * @param mode - 'basico' ou 'agressivo'
 * @param onProgress - Callback de progresso geral
 * @param onFileComplete - Callback quando cada arquivo termina
 * @param shouldCancel - Função que retorna true pra cancelar
 */
export async function batchAudioCamouflage(
  files: File[],
  mode: "basico" | "agressivo" = "basico",
  onProgress?: (msg: string, pct: number) => void,
  onFileComplete?: (index: number, result: BatchAudioResult) => void,
  shouldCancel?: () => boolean,
): Promise<BatchAudioResult[]> {
  const results: BatchAudioResult[] = [];

  for (let i = 0; i < files.length; i++) {
    if (shouldCancel?.()) {
      for (let j = i; j < files.length; j++) {
        results.push({ name: files[j].name, status: "error", url: "", errorMsg: "Cancelado" });
      }
      break;
    }

    const file = files[i];
    onProgress?.(`[${i + 1}/${files.length}] Processando ${file.name}...`, Math.round((i / files.length) * 100));

    try {
      const { url, outputName } = await processAudioCamouflage(file, mode, (msg) => {
        onProgress?.(`[${i + 1}/${files.length}] ${msg}`, Math.round((i / files.length) * 100));
      });

      const result: BatchAudioResult = { name: outputName, status: "done", url };
      results.push(result);
      onFileComplete?.(i, result);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Erro ao processar.";
      const result: BatchAudioResult = { name: file.name, status: "error", url: "", errorMsg };
      results.push(result);
      onFileComplete?.(i, result);
    }
  }

  return results;
}
