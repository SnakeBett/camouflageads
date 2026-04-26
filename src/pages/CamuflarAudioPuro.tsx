import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/hooks/AuthProvider";
import { supabase } from "@/lib/supabase";
import { getRemainingCredits } from "@/utils/plan-utils";
import { processAudioCamouflage } from "@/utils/audio-camouflage";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Upload,
  Music,
  Trash2,
  Download,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Cog,
} from "lucide-react";

type Mode = "basic" | "aggressive";

interface FileResult {
  name: string;
  status: "queued" | "processing" | "done" | "error";
  url?: string;
  error?: string;
}

const MODES: { key: Mode; label: string; desc: string; color: string; icon: React.ReactNode }[] = [
  {
    key: "basic",
    label: "Básico",
    desc: "Recodificação leve do áudio com alteração de bitrate e metadados. Rápido e eficaz para a maioria dos casos.",
    color: "bg-emerald-600 hover:bg-emerald-700 border-emerald-500",
    icon: <ShieldCheck className="h-5 w-5" />,
  },
  {
    key: "aggressive",
    label: "Agressivo",
    desc: "Máxima camuflagem: alteração de pitch, ruído de fundo, inversão de fase parcial e recodificação completa.",
    color: "bg-orange-600 hover:bg-orange-700 border-orange-500",
    icon: <ShieldAlert className="h-5 w-5" />,
  },
];

export default function CamuflarAudioPuro() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<File[]>([]);
  const [mode, setMode] = useState<Mode>("basic");
  const [remaining, setRemaining] = useState<number | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progressText, setProgressText] = useState("");
  const [progressValue, setProgressValue] = useState(0);
  const [results, setResults] = useState<FileResult[]>([]);

  useEffect(() => {
    if (!user) return;
    if (!profile) { setRemaining(null); return; }
    getRemainingCredits(user.id, profile.plan, "audio_pure", profile).then(setRemaining);
  }, [user, profile]);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files || []);
    if (files.length + selected.length > 20) {
      toast.error("Máximo de 20 arquivos por vez.");
      return;
    }
    setFiles((prev) => [...prev, ...selected]);
    e.target.value = "";
  }

  function removeFile(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleProcess() {
    if (!user) { toast.error("Faça login para continuar."); return; }
    if (files.length === 0) { toast.error("Adicione pelo menos um arquivo."); return; }

    setProcessing(true);
    setProgressText("Validando plano...");
    setProgressValue(5);
    setResults([]);

    try {
      try {
        const { data } = await supabase.functions.invoke("validate-plan", {
          body: { count: files.length, type: "audio_pure" },
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

      const initial: FileResult[] = files.map((f) => ({ name: f.name, status: "queued" }));
      setResults(initial);

      setProgressText("Processamento de áudio iniciado!");
      setProgressValue(20);
      toast.info("Processamento de áudio iniciado!");

      const ffmpegMode = mode === "basic" ? "basico" : "agressivo";

      for (let i = 0; i < files.length; i++) {
        setResults((prev) =>
          prev.map((r, j) => (j === i ? { ...r, status: "processing" } : r)),
        );
        setProgressText(`Processando ${i + 1}/${files.length}: ${files[i].name}`);
        setProgressValue(20 + Math.round(((i + 1) / files.length) * 70));

        try {
          const { url, outputName } = await processAudioCamouflage(
            files[i],
            ffmpegMode,
            (msg) => setProgressText(`[${i + 1}/${files.length}] ${msg}`),
          );
          setResults((prev) =>
            prev.map((r, j) => (j === i ? { ...r, status: "done", url, name: outputName } : r)),
          );
        } catch (fileErr: unknown) {
          const msg = fileErr instanceof Error ? fileErr.message : "Erro ao processar áudio.";
          setResults((prev) =>
            prev.map((r, j) => (j === i ? { ...r, status: "error", error: msg } : r)),
          );
        }
      }

      setProgressText("Concluído!");
      setProgressValue(100);
      toast.success("Todos os arquivos foram processados!");
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
          <h1 className="text-3xl font-bold tracking-tight">Camuflar Áudio Puro</h1>
          <p className="text-muted-foreground mt-1">
            Envie arquivos de áudio ou vídeo para camuflar apenas a faixa de áudio.
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

        {/* Upload */}
        <Card className="border-border/40">
          <CardContent className="pt-6 space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Upload className="h-5 w-5" /> Arquivos
              <span className="text-sm font-normal text-muted-foreground">
                ({files.length}/20)
              </span>
            </h2>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border/60 rounded-lg p-8 text-center cursor-pointer hover:border-primary/60 transition-colors"
            >
              <Music className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Clique ou arraste para enviar áudios ou vídeos (máx. 20)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*,video/*"
                multiple
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>

            {files.length > 0 && (
              <ul className="space-y-2 max-h-60 overflow-y-auto">
                {files.map((file, i) => (
                  <li
                    key={`${file.name}-${i}`}
                    className="flex items-center justify-between bg-secondary/50 rounded-md px-3 py-2 text-sm"
                  >
                    <span className="truncate mr-2">{file.name}</span>
                    <button
                      onClick={() => removeFile(i)}
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

        {/* Modos */}
        <Card className="border-border/40">
          <CardContent className="pt-6 space-y-4">
            <h2 className="text-lg font-semibold">Modo de camuflagem</h2>
            <div className="grid gap-3 sm:grid-cols-2">
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
          disabled={processing || files.length === 0}
          onClick={handleProcess}
        >
          {processing ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" /> Processando...
            </>
          ) : (
            <>
              <ShieldCheck className="h-5 w-5 mr-2" /> Camuflar {files.length} arquivo
              {files.length !== 1 ? "s" : ""}
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
