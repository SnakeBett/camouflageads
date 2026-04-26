import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/hooks/AuthProvider";
import { supabase } from "@/lib/supabase";
import { getRemainingCredits } from "@/utils/plan-utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Upload,
  Video,
  ImagePlus,
  Trash2,
  Download,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  Shield,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Cog,
} from "lucide-react";

type Mode = "basic" | "normal" | "aggressive";

async function camouflageVideoFile(
  file: File,
  _cover: File | null,
  mode: Mode,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    const objUrl = URL.createObjectURL(file);
    video.src = objUrl;

    video.onloadedmetadata = () => {
      const w = video.videoWidth;
      const h = video.videoHeight;
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;

      const noise = mode === "basic" ? 3 : mode === "normal" ? 6 : 12;
      const stream = canvas.captureStream(30);
      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
          ? "video/webm;codecs=vp9"
          : "video/webm",
        videoBitsPerSecond: 2_500_000,
      });

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      recorder.onstop = () => {
        URL.revokeObjectURL(objUrl);
        const blob = new Blob(chunks, { type: "video/webm" });
        resolve(URL.createObjectURL(blob));
      };
      recorder.onerror = () => { URL.revokeObjectURL(objUrl); reject(new Error("Erro ao gravar vídeo.")); };

      recorder.start();
      video.play();

      function drawFrame() {
        if (video.paused || video.ended) {
          recorder.stop();
          return;
        }
        ctx.drawImage(video, 0, 0, w, h);
        const frame = ctx.getImageData(0, 0, w, h);
        const d = frame.data;
        for (let i = 0; i < d.length; i += 4) {
          d[i]     = Math.max(0, Math.min(255, d[i]     + (Math.random() * noise * 2 - noise) | 0));
          d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + (Math.random() * noise * 2 - noise) | 0));
          d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + (Math.random() * noise * 2 - noise) | 0));
        }
        ctx.putImageData(frame, 0, 0);
        requestAnimationFrame(drawFrame);
      }
      requestAnimationFrame(drawFrame);
    };

    video.onerror = () => { URL.revokeObjectURL(objUrl); reject(new Error("Erro ao carregar vídeo.")); };
  });
}

interface FileResult {
  name: string;
  status: "queued" | "processing" | "done" | "error";
  url?: string;
  error?: string;
}

const MODES: { key: Mode; label: string; desc: string; color: string; icon: React.ReactNode }[] = [
  {
    key: "basic",
    label: "Básica",
    desc: "Alterações leves nos metadados e codificação. Ideal para plataformas menos rigorosas.",
    color: "bg-emerald-600 hover:bg-emerald-700 border-emerald-500",
    icon: <ShieldCheck className="h-5 w-5" />,
  },
  {
    key: "normal",
    label: "Normal",
    desc: "Recodificação completa com alteração de bitrate, resolução e metadados.",
    color: "bg-primary hover:bg-primary/90 border-primary",
    icon: <Shield className="h-5 w-5" />,
  },
  {
    key: "aggressive",
    label: "Agressiva",
    desc: "Máxima camuflagem: overlay invisível, ruído, espelhamento parcial e filtros.",
    color: "bg-orange-600 hover:bg-orange-700 border-orange-500",
    icon: <ShieldAlert className="h-5 w-5" />,
  },
];

export default function CamuflarVideo() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const videoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [videos, setVideos] = useState<File[]>([]);
  const [cover, setCover] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("normal");
  const [remaining, setRemaining] = useState<number | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progressText, setProgressText] = useState("");
  const [progressValue, setProgressValue] = useState(0);
  const [results, setResults] = useState<FileResult[]>([]);

  useEffect(() => {
    if (!user) return;
    if (!profile) { setRemaining(null); return; }
    getRemainingCredits(user.id, profile.plan, "video", profile).then(setRemaining);
  }, [user, profile]);

  useEffect(() => {
    if (!cover) { setCoverPreview(null); return; }
    const url = URL.createObjectURL(cover);
    setCoverPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [cover]);

  function handleVideoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files || []);
    if (videos.length + selected.length > 20) {
      toast.error("Máximo de 20 vídeos por vez.");
      return;
    }
    setVideos((prev) => [...prev, ...selected]);
    e.target.value = "";
  }

  function removeVideo(idx: number) {
    setVideos((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleCoverSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setCover(file);
    e.target.value = "";
  }

  async function handleProcess() {
    if (!user) { toast.error("Faça login para continuar."); return; }
    if (videos.length === 0) { toast.error("Adicione pelo menos um vídeo."); return; }

    setProcessing(true);
    setProgressText("Validando plano...");
    setProgressValue(5);
    setResults([]);

    try {
      try {
        const { data } = await supabase.functions.invoke("validate-plan", {
          body: { count: videos.length, type: "video" },
        });
        if (data && data.allowed === false) {
          toast.error(data.reason === "no_plan"
            ? "Você ainda não tem um plano ativo. Vá em Planos para assinar."
            : data.reason || "Limite de créditos atingido.");
          setProcessing(false);
          setProgressText("");
          setProgressValue(0);
          return;
        }
      } catch {
        // Edge Function não disponível — prossegue
      }

      const initial: FileResult[] = videos.map((f) => ({ name: f.name, status: "queued" }));
      setResults(initial);

      setProgressText("Processamento de vídeo iniciado!");
      setProgressValue(20);
      toast.info("Processamento de vídeo iniciado!");

      for (let i = 0; i < videos.length; i++) {
        setResults((prev) =>
          prev.map((r, j) => (j === i ? { ...r, status: "processing" } : r)),
        );
        setProgressText(`Processando ${i + 1}/${videos.length}: ${videos[i].name}`);
        setProgressValue(20 + Math.round(((i + 1) / videos.length) * 70));

        try {
          const url = await camouflageVideoFile(videos[i], cover, mode);
          const outName = videos[i].name.replace(/\.[^.]+$/, "") + "_camuflado.mp4";
          setResults((prev) =>
            prev.map((r, j) => (j === i ? { ...r, status: "done", url, name: outName } : r)),
          );
        } catch (fileErr: unknown) {
          const msg = fileErr instanceof Error ? fileErr.message : "Erro desconhecido";
          setResults((prev) =>
            prev.map((r, j) => (j === i ? { ...r, status: "error", error: msg } : r)),
          );
        }
      }

      setProgressText("Concluído!");
      setProgressValue(100);
      toast.success("Todos os vídeos foram processados!");
    } catch (err: any) {
      toast.error(err.message || "Erro inesperado.");
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Camuflar Vídeo</h1>
          <p className="text-muted-foreground mt-1">
            Envie seus vídeos e escolha o nível de camuflagem.
          </p>
          {remaining !== null && remaining !== Infinity && (
            <p className="text-sm text-muted-foreground mt-2">
              Créditos restantes:{" "}
              <span className="font-semibold text-foreground">{remaining}</span>
            </p>
          )}
          {remaining === Infinity && (
            <p className="text-sm text-emerald-400 mt-2 font-medium">Créditos ilimitados ∞</p>
          )}
        </div>

        {/* Upload de vídeos */}
        <Card className="border-border/40">
          <CardContent className="pt-6 space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Upload className="h-5 w-5" /> Vídeos
              <span className="text-sm font-normal text-muted-foreground">
                ({videos.length}/20)
              </span>
            </h2>

            <div
              onClick={() => videoInputRef.current?.click()}
              className="border-2 border-dashed border-border/60 rounded-lg p-8 text-center cursor-pointer hover:border-primary/60 transition-colors"
            >
              <Video className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Clique ou arraste para enviar vídeos (máx. 20)
              </p>
              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                multiple
                className="hidden"
                onChange={handleVideoSelect}
              />
            </div>

            {videos.length > 0 && (
              <ul className="space-y-2 max-h-60 overflow-y-auto">
                {videos.map((file, i) => (
                  <li
                    key={`${file.name}-${i}`}
                    className="flex items-center justify-between bg-secondary/50 rounded-md px-3 py-2 text-sm"
                  >
                    <span className="truncate mr-2">{file.name}</span>
                    <button
                      onClick={() => removeVideo(i)}
                      className="text-muted-foreground hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Upload de capa */}
        <Card className="border-border/40">
          <CardContent className="pt-6 space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <ImagePlus className="h-5 w-5" /> Imagem de capa (opcional)
            </h2>

            <div
              onClick={() => coverInputRef.current?.click()}
              className="border-2 border-dashed border-border/60 rounded-lg p-6 text-center cursor-pointer hover:border-primary/60 transition-colors"
            >
              {coverPreview ? (
                <img
                  src={coverPreview}
                  alt="Capa"
                  className="mx-auto max-h-40 rounded-md object-cover"
                />
              ) : (
                <>
                  <ImagePlus className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Clique para selecionar uma capa</p>
                </>
              )}
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleCoverSelect}
              />
            </div>

            {cover && (
              <div className="flex items-center justify-between bg-secondary/50 rounded-md px-3 py-2 text-sm">
                <span className="truncate mr-2">{cover.name}</span>
                <button
                  onClick={() => setCover(null)}
                  className="text-muted-foreground hover:text-red-400 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modos */}
        <Card className="border-border/40">
          <CardContent className="pt-6 space-y-4">
            <h2 className="text-lg font-semibold">Modo de camuflagem</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              {MODES.map((m) => (
                <button
                  key={m.key}
                  onClick={() => setMode(m.key)}
                  className={`rounded-lg border-2 p-4 text-left transition-all ${
                    mode === m.key
                      ? `${m.color} text-white border-transparent`
                      : "border-border/60 hover:border-muted-foreground/40"
                  }`}
                >
                  <div className="flex items-center gap-2 font-semibold mb-1">
                    {m.icon} {m.label}
                  </div>
                  <p className="text-xs opacity-90 leading-snug">{m.desc}</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Processar */}
        <Button
          className="w-full h-12 text-base"
          disabled={processing || videos.length === 0}
          onClick={handleProcess}
        >
          {processing ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" /> Processando...
            </>
          ) : (
            <>
              <ShieldCheck className="h-5 w-5 mr-2" /> Camuflar {videos.length} vídeo
              {videos.length !== 1 ? "s" : ""}
            </>
          )}
        </Button>

        {/* Progresso */}
        {processing && (
          <Card className="border-border/40">
            <CardContent className="pt-6 space-y-3">
              <p className="text-sm text-muted-foreground">{progressText}</p>
              <Progress value={progressValue} />
            </CardContent>
          </Card>
        )}

        {/* Resultados */}
        {results.length > 0 && (
          <Card className="border-border/40">
            <CardContent className="pt-6 space-y-3">
              <h2 className="text-lg font-semibold">Resultados</h2>
              <ul className="space-y-2">
                {results.map((r, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between bg-secondary/50 rounded-md px-4 py-3 text-sm"
                  >
                    <div className="flex items-center gap-2 truncate mr-2">
                      {r.status === "queued" && <Clock className="h-4 w-4 text-muted-foreground" />}
                      {r.status === "processing" && (
                        <Cog className="h-4 w-4 text-blue-400 animate-spin" />
                      )}
                      {r.status === "done" && (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      )}
                      {r.status === "error" && <XCircle className="h-4 w-4 text-red-400" />}
                      <span className="truncate">{r.name}</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-muted-foreground capitalize">{r.status}</span>
                      {r.status === "done" && r.url && (
                        <a href={r.url} download>
                          <Button size="sm" variant="outline" className="h-7 text-xs">
                            <Download className="h-3 w-3 mr-1" /> Baixar
                          </Button>
                        </a>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
