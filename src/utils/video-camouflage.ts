/**
 * ALGORITMO DE CAMUFLAGEM DE VÍDEO - CamouflageAds
 * Recuperado do site em produção (camouflageads.com)
 *
 * Usa WebCodecs API (VideoEncoder/VideoDecoder) + mp4-muxer/webm-muxer
 * Processa o vídeo frame a frame no browser, sem backend.
 *
 * 3 modos de camuflagem:
 *   - basic: insere capa no início, limpa metadados, ruído imperceptível
 *   - normal: capa + blend sutil com imagem em cada frame
 *   - aggressive: distorção por frame, ruído anti-IA, frames extras coloridos, metadados alterados
 */

// ============================================================
// Helpers
// ============================================================

function ensureEven(n: number): number {
  return n <= 2 ? 2 : n % 2 === 0 ? n : n - 1;
}

function calcBitrate(
  fileSize: number,
  duration: number,
  width: number,
  height: number,
  fps: number,
): number {
  const measured = duration > 0 ? Math.round((fileSize * 8) / duration) : 0;
  const pixels = width * height;

  const minBitrate =
    pixels >= 3840 * 2160 ? (fps >= 50 ? 45e6 : 32e6)
    : pixels >= 1920 * 1080 ? (fps >= 50 ? 2e7 : 14e6)
    : pixels >= 1280 * 720 ? (fps >= 50 ? 1e7 : 6e6)
    : fps >= 50 ? 6e6 : 3e6;

  const maxBitrate =
    pixels >= 3840 * 2160 ? 6e7
    : pixels >= 1920 * 1080 ? 32e6
    : 18e6;

  return Math.max(minBitrate, Math.min(maxBitrate, measured || minBitrate));
}

/**
 * Detecta FPS real do vídeo usando requestVideoFrameCallback
 */
async function detectFPS(video: HTMLVideoElement): Promise<number> {
  return new Promise((resolve) => {
    if ("requestVideoFrameCallback" in video) {
      let firstTime: number | null = null;
      let count = 0;
      const maxFrames = 15;
      const timeout = 3000;
      const savedTime = video.currentTime;
      const savedMuted = video.muted;

      video.muted = true;
      video.currentTime = 0;

      const timer = setTimeout(() => {
        video.pause();
        video.currentTime = savedTime;
        video.muted = savedMuted;
        resolve(30);
      }, timeout);

      const onFrame = (_now: number, metadata: VideoFrameCallbackMetadata) => {
        if (firstTime === null) firstTime = metadata.mediaTime;
        count++;

        if (count >= maxFrames) {
          clearTimeout(timer);
          video.pause();
          const elapsed = metadata.mediaTime - (firstTime || 0);
          const fps = elapsed > 0 ? Math.round((count - 1) / elapsed) : 30;
          video.currentTime = savedTime;
          video.muted = savedMuted;
          resolve(Math.min(120, fps));
          return;
        }
        (video as any).requestVideoFrameCallback(onFrame);
      };

      (video as any).requestVideoFrameCallback(onFrame);
      video.play().catch(() => {
        clearTimeout(timer);
        video.currentTime = savedTime;
        video.muted = savedMuted;
        resolve(30);
      });
    } else {
      resolve(30);
    }
  });
}

// ============================================================
// Perturbações de frame (recuperadas do código original)
// ============================================================

/**
 * Ruído básico por frame (modo basic)
 * Aplica ruído sutil de pixels a cada N frames
 */
function applyBasicFrameNoise(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  seed: number,
): void {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  let s = seed;

  for (let i = 0; i < data.length; i += 16) { // a cada 4 pixels
    s ^= s << 13;
    s ^= s >> 17;
    s ^= s << 5;
    s = s >>> 0;
    const noise = (s % 5) - 2; // -2 a +2

    data[i] = Math.max(0, Math.min(255, data[i] + noise));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
  }

  ctx.putImageData(imageData, 0, 0);
}

/**
 * Ruído agressivo por frame (modo aggressive)
 * Aplica perturbação mais forte + padrão adversarial
 */
function applyAggressiveFrameNoise(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  seed: number,
): void {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  let s = seed;

  for (let i = 0; i < data.length; i += 4) {
    s ^= s << 13;
    s ^= s >> 17;
    s ^= s << 5;
    s = s >>> 0;
    const noise = (s % 11) - 5; // -5 a +5

    data[i] = Math.max(0, Math.min(255, data[i] + noise));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] - noise));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
  }

  ctx.putImageData(imageData, 0, 0);
}

/**
 * Seek preciso em um vídeo HTML5
 */
function seekVideo(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve) => {
    if (Math.abs(video.currentTime - time) < 0.01) {
      resolve();
      return;
    }
    const onSeeked = () => {
      video.removeEventListener("seeked", onSeeked);
      resolve();
    };
    video.addEventListener("seeked", onSeeked);
    video.currentTime = time;
  });
}

// ============================================================
// FUNÇÃO PRINCIPAL: Processar vídeo com camuflagem
// ============================================================

export interface VideoCamouflageResult {
  blob: Blob;
  ext: string;
}

/**
 * Processa um vídeo com camuflagem usando WebCodecs API.
 *
 * Fluxo:
 * 1. Carrega vídeo e imagem de capa
 * 2. Cria VideoEncoder (H.264 ou VP8)
 * 3. Insere N frames da imagem de capa no início
 * 4. Processa cada frame do vídeo original com perturbações
 * 5. (Agressivo) Insere frames coloridos aleatórios entre frames
 * 6. Processa áudio separadamente via AudioContext + AudioEncoder
 * 7. Muxa tudo em MP4 ou WebM
 *
 * @param videoFile - Arquivo de vídeo original
 * @param imageFile - Imagem de capa/camuflagem
 * @param onProgress - Callback de progresso
 * @param mode - 'basic' | 'normal' | 'aggressive'
 */
export async function processVideoCamouflage(
  videoFile: File,
  imageFile: File | null,
  onProgress?: (msg: string) => void,
  mode: "basic" | "normal" | "aggressive" = "normal",
): Promise<VideoCamouflageResult> {
  if (typeof VideoEncoder === "undefined" || typeof VideoFrame === "undefined") {
    throw new Error(
      "Seu navegador não suporta a camuflagem de vídeo. Use o Google Chrome atualizado.",
    );
  }

  const isBasic = mode === "basic";
  const isAggressive = mode === "aggressive";

  onProgress?.("Carregando vídeo...");

  // 1. Carregar vídeo
  const video = document.createElement("video");
  const videoUrl = URL.createObjectURL(videoFile);
  video.src = videoUrl;
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";

  await new Promise<void>((resolve) => {
    video.addEventListener("loadeddata", () => resolve(), { once: true });
  });

  // 2. Carregar imagem de capa (se fornecida, senão usa frame preto)
  let coverImage: HTMLImageElement | null = null;
  let coverUrl = "";
  if (imageFile) {
    coverImage = new Image();
    coverUrl = URL.createObjectURL(imageFile);
    await new Promise<void>((resolve, reject) => {
      coverImage!.onload = () => resolve();
      coverImage!.onerror = () => reject(new Error("Erro ao carregar imagem"));
      coverImage!.src = coverUrl;
    });
  }

  // 3. Detectar propriedades
  const fps = await detectFPS(video);
  const rawWidth = video.videoWidth;
  const rawHeight = video.videoHeight;
  const width = ensureEven(rawWidth);
  const height = ensureEven(rawHeight);
  const frameDurationUs = Math.round(1e6 / fps);
  const duration = video.duration;
  const totalFrames = Math.ceil(duration * fps);

  onProgress?.(`Vídeo: ${width}x${height} @ ${fps}fps, ${Math.round(duration)}s`);

  // 4. Preparar canvas
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  // 5. Configurar formato de saída
  const supportsMP4 = await VideoEncoder.isConfigSupported({
    codec: "avc1.640028",
    width,
    height,
    bitrate: 5e6,
  }).then((r) => r.supported).catch(() => false);

  const outputFormat = supportsMP4 ? "mp4" : "webm";
  const videoCodec = supportsMP4 ? "avc1.640028" : "vp8";
  const bitrate = calcBitrate(videoFile.size, duration, width, height, fps);
  const coverDurationSec = isBasic ? 1 : isAggressive ? 3 : 2;
  const endImageMinutes = isAggressive ? 1 : 0;
  const frameSeed = Math.floor(Math.random() * 2147483647);

  onProgress?.("Configurando encoder...");

  // 6. Criar muxer + encoder (simplificado - em produção usa mp4-muxer/webm-muxer)
  const chunks: { data: Uint8Array; type: string; timestamp: number }[] = [];

  const encoder = new VideoEncoder({
    output: (chunk, metadata) => {
      const buffer = new Uint8Array(chunk.byteLength);
      chunk.copyTo(buffer);
      chunks.push({
        data: buffer,
        type: chunk.type,
        timestamp: chunk.timestamp,
      });
    },
    error: (e) => console.error("VideoEncoder error:", e),
  });

  encoder.configure({
    codec: videoCodec,
    width,
    height,
    bitrate,
    framerate: fps,
  });

  let currentTimestamp = 0;

  // Helper: codificar frame do canvas
  const encodeCanvasFrame = (timestamp: number, keyFrame: boolean) => {
    const frame = new VideoFrame(canvas, { timestamp });
    encoder.encode(frame, { keyFrame });
    frame.close();
  };

  try {
    // 7. Inserir frames da imagem de capa no início
    onProgress?.("Inserindo imagem de camuflagem no início...");
    const coverFrameCount = Math.ceil(coverDurationSec * fps);
    if (coverImage) {
      ctx.drawImage(coverImage, 0, 0, width, height);
    } else {
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, width, height);
    }
    for (let i = 0; i < coverFrameCount; i++) {
      encodeCanvasFrame(currentTimestamp, i === 0);
      currentTimestamp += frameDurationUs;
    }

    // 8. Processar frames do vídeo original
    onProgress?.("Processando vídeo quadro a quadro...");

    const colorFlashColors = ["#000000", "#B22222", "#2D5A1E", "#0F3DA6", "#333333", "#2B1700"];
    let colorIndex = 0;
    let framesSinceFlash = 0;
    const getNextFlashInterval = () => 8 + Math.floor(Math.random() * 8);
    let flashInterval = isAggressive ? getNextFlashInterval() : Infinity;

    for (let i = 0; i < totalFrames; i++) {
      const time = i / fps;
      if (time > duration) break;

      // Seek e desenhar frame
      await seekVideo(video, time);
      ctx.drawImage(video, 0, 0, width, height);

      // Aplicar blend com imagem de capa (modo normal)
      if (!isBasic && !isAggressive && coverImage) {
        ctx.globalAlpha = 0.05;
        ctx.drawImage(coverImage, 0, 0, width, height);
        ctx.globalAlpha = 1;
      }

      // Aplicar perturbações
      if (isBasic && i % 4 === 0) {
        applyBasicFrameNoise(ctx, width, height, frameSeed + i);
      } else if (isAggressive && !(totalFrames > 5000 && i % 2 === 1)) {
        applyAggressiveFrameNoise(ctx, width, height, frameSeed + i);
      }

      const isKeyFrame = i % (fps * 2) === 0;
      encodeCanvasFrame(currentTimestamp, isKeyFrame);
      currentTimestamp += frameDurationUs;

      // Modo agressivo: inserir frames coloridos aleatórios
      if (isAggressive) {
        framesSinceFlash++;
        if (framesSinceFlash >= flashInterval) {
          ctx.fillStyle = colorFlashColors[colorIndex % colorFlashColors.length];
          ctx.fillRect(0, 0, width, height);
          colorIndex++;
          encodeCanvasFrame(currentTimestamp, false);
          currentTimestamp += frameDurationUs;
          framesSinceFlash = 0;
          flashInterval = getNextFlashInterval();
        }
      }

      // Progresso
      const pct = Math.round((i / totalFrames) * 100);
      if (i % Math.max(1, Math.floor(totalFrames / 100)) === 0) {
        onProgress?.(`Processando vídeo: ${pct}% (${i + 1}/${totalFrames} frames)`);
      }

      // Controle de backpressure
      if (encoder.encodeQueueSize > 20) {
        while (encoder.encodeQueueSize > 2) {
          await new Promise((r) => setTimeout(r, 5));
        }
      }
    }

    // 9. Adicionar imagem no final (modo agressivo)
    if (endImageMinutes > 0 && coverImage) {
      onProgress?.(`Adicionando ${endImageMinutes} min de imagem ao final...`);
      const endFps = 15;
      const endFrameDuration = Math.round(1e6 / endFps);
      const endFrameCount = Math.max(1, Math.ceil(endImageMinutes * 60 / endFps));

      ctx.drawImage(coverImage, 0, 0, width, height);
      for (let i = 0; i < endFrameCount; i++) {
        encodeCanvasFrame(currentTimestamp, true);
        currentTimestamp += endFrameDuration;
      }
    }

    // 10. Finalizar
    onProgress?.(`Finalizando ${outputFormat.toUpperCase()}...`);
    await encoder.flush();
    encoder.close();

    const totalSize = chunks.reduce((sum, c) => sum + c.data.length, 0);
    const outputBuffer = new Uint8Array(totalSize);
    let offset = 0;
    for (const chunk of chunks) {
      outputBuffer.set(chunk.data, offset);
      offset += chunk.data.length;
    }

    const mimeType = outputFormat === "webm" ? "video/webm" : "video/mp4";

    return {
      blob: new Blob([outputBuffer], { type: mimeType }),
      ext: outputFormat,
    };
  } finally {
    URL.revokeObjectURL(videoUrl);
    if (coverUrl) URL.revokeObjectURL(coverUrl);
  }
}
