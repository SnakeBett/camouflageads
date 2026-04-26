/**
 * Camuflagem de vídeo no browser: canvas + MediaRecorder (WebM).
 * Sincroniza quadros com requestVideoFrameCallback (menos lag que rAF + play livre).
 * Mistura capa × vídeo como na camuflagem de imagem (peso da capa por modo).
 */

export type VideoCamoMode = "basic" | "normal" | "aggressive";

export interface CamouflagedVideoResult {
  url: string;
  fileName: string;
  mimeType: string;
}

function modeToCoverMix(mode: VideoCamoMode, hasCover: boolean): number {
  if (!hasCover) return 0;
  if (mode === "basic") return 0.38;
  if (mode === "normal") return 0.65;
  return 0.88;
}

/** VP8 costuma encodar mais rápido que VP9 (menos “lag” na gravação). */
function pickRecorderMime(): string {
  if (typeof MediaRecorder === "undefined") return "video/webm";
  if (MediaRecorder.isTypeSupported("video/webm;codecs=vp8")) {
    return "video/webm;codecs=vp8";
  }
  if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9")) {
    return "video/webm;codecs=vp9";
  }
  return "video/webm";
}

function loadCoverImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const u = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(u);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(u);
      reject(new Error("Erro ao carregar imagem de capa."));
    };
    img.src = u;
  });
}

type RVFCVideo = HTMLVideoElement & {
  requestVideoFrameCallback: (cb: (now: number, meta: { mediaTime: number }) => void) => number;
  cancelVideoFrameCallback: (id: number) => void;
};

function hasRVFC(v: HTMLVideoElement): v is RVFCVideo {
  return typeof (v as RVFCVideo).requestVideoFrameCallback === "function";
}

/**
 * Mistura: resultado ≈ vídeo × (1 − coverMix) + capa × coverMix (source-over).
 */
function drawBlendedFrame(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  video: HTMLVideoElement,
  coverImg: HTMLImageElement | null,
  coverMix: number,
): void {
  ctx.globalAlpha = 1;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (coverImg && coverMix > 0) {
    ctx.drawImage(coverImg, 0, 0, w, h);
    ctx.globalAlpha = Math.max(0, Math.min(1, 1 - coverMix));
    ctx.drawImage(video, 0, 0, w, h);
    ctx.globalAlpha = 1;
  } else {
    ctx.drawImage(video, 0, 0, w, h);
  }
}

export async function camouflageVideoFile(
  file: File,
  cover: File | null,
  mode: VideoCamoMode,
): Promise<CamouflagedVideoResult> {
  const hasCover = !!cover;
  const coverImg = cover ? await loadCoverImage(cover) : null;
  const coverMix = modeToCoverMix(mode, hasCover);

  const mime = pickRecorderMime();

  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.playsInline = true;
    video.preload = "auto";
    video.volume = 0;
    video.muted = false;

    const objUrl = URL.createObjectURL(file);
    video.src = objUrl;

    let cleaned = false;
    const cleanupInput = () => {
      if (cleaned) return;
      cleaned = true;
      URL.revokeObjectURL(objUrl);
    };

    video.onerror = () => {
      cleanupInput();
      reject(new Error("Erro ao carregar vídeo."));
    };

    video.onloadedmetadata = () => {
      const w = video.videoWidth;
      const h = video.videoHeight;
      if (!w || !h) {
        cleanupInput();
        reject(new Error("Dimensões de vídeo inválidas."));
        return;
      }

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d", { alpha: false });
      if (!ctx) {
        cleanupInput();
        reject(new Error("Canvas 2D indisponível."));
        return;
      }

      if (typeof canvas.captureStream !== "function") {
        cleanupInput();
        reject(new Error("Este navegador não suporta captureStream no canvas."));
        return;
      }

      const canvasStream = canvas.captureStream();
      const outStream = new MediaStream();
      canvasStream.getVideoTracks().forEach((t) => outStream.addTrack(t));

      const videoWithCap = video as HTMLVideoElement & {
        captureStream?: () => MediaStream;
      };
      try {
        if (typeof videoWithCap.captureStream === "function") {
          const vs = videoWithCap.captureStream();
          vs.getAudioTracks().forEach((t: MediaStreamTrack) => outStream.addTrack(t));
        }
      } catch {
        /* vídeo sem áudio ou captureStream não suportado */
      }

      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(outStream, {
          mimeType: mime,
          videoBitsPerSecond: 6_000_000,
        });
      } catch {
        try {
          recorder = new MediaRecorder(outStream, {
            mimeType: "video/webm",
            videoBitsPerSecond: 6_000_000,
          });
        } catch {
          cleanupInput();
          reject(new Error("Não foi possível iniciar a gravação (MediaRecorder)."));
          return;
        }
      }

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      recorder.onerror = () => {
        cleanupInput();
        reject(new Error("Erro ao gravar vídeo."));
      };

      let finished = false;
      let rvfcId: number | null = null;
      let fallbackTimer: ReturnType<typeof setInterval> | null = null;

      const stopAll = () => {
        if (rvfcId !== null && hasRVFC(video)) {
          try {
            video.cancelVideoFrameCallback(rvfcId);
          } catch {
            /* ignore */
          }
          rvfcId = null;
        }
        if (fallbackTimer !== null) {
          clearInterval(fallbackTimer);
          fallbackTimer = null;
        }
      };

      const finalize = () => {
        if (finished) return;
        finished = true;
        stopAll();
        try {
          video.pause();
        } catch {
          /* ignore */
        }
        try {
          recorder.stop();
        } catch {
          cleanupInput();
          reject(new Error("Erro ao finalizar gravação."));
        }
      };

      let rejected = false;

      recorder.onstop = () => {
        cleanupInput();
        if (rejected) return;
        const totalBytes = chunks.reduce((s, c) => s + c.size, 0);
        if (totalBytes === 0) {
          reject(new Error("Gravação vazia — tente outro vídeo ou formato."));
          return;
        }
        const outMime = recorder.mimeType || mime;
        const ext = outMime.includes("mp4") ? "mp4" : "webm";
        const blob = new Blob(chunks, { type: outMime });
        const base = file.name.replace(/\.[^.]+$/, "") || "video";
        const fileName = `${base}_camuflado.${ext}`;
        resolve({
          url: URL.createObjectURL(blob),
          fileName,
          mimeType: blob.type || outMime,
        });
      };

      const onEnded = () => {
        drawBlendedFrame(ctx, w, h, video, coverImg, coverMix);
        finalize();
      };

      video.addEventListener("ended", onEnded, { once: true });

      const runRvfc = () => {
        const v = video as RVFCVideo;
        const tick = () => {
          if (finished) return;
          if (v.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
            rvfcId = v.requestVideoFrameCallback(tick);
            return;
          }
          drawBlendedFrame(ctx, w, h, v, coverImg, coverMix);
          if (v.ended) {
            return;
          }
          rvfcId = v.requestVideoFrameCallback(tick);
        };
        rvfcId = v.requestVideoFrameCallback(tick);
      };

      const runFallback = () => {
        const fps = 30;
        const ms = Math.max(16, Math.round(1000 / fps));
        fallbackTimer = setInterval(() => {
          if (finished) return;
          if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
            drawBlendedFrame(ctx, w, h, video, coverImg, coverMix);
          }
          if (video.ended && fallbackTimer !== null) {
            clearInterval(fallbackTimer);
            fallbackTimer = null;
          }
        }, ms);
      };

      recorder.start(1000);

      if (hasRVFC(video)) {
        runRvfc();
      } else {
        runFallback();
      }

      video.play().catch(() => {
        rejected = true;
        stopAll();
        try {
          if (recorder.state === "recording") recorder.stop();
        } catch {
          /* ignore */
        }
        cleanupInput();
        reject(new Error("Não foi possível reproduzir o vídeo (codec ou autoplay)."));
      });
    };
  });
}
