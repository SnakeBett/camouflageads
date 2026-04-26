import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  loadImage,
  batchCamouflage,
  type CamouflageResult,
} from "@/utils/image-camouflage";
import { getRemainingCredits } from "@/utils/plan-utils";
import {
  Download,
  Upload,
  Eye,
  Loader2,
  Shield,
  Fingerprint,
  Cpu,
  Hash,
} from "lucide-react";

const MAX_CREATIVES = 50;

const FEATURE_BADGES = [
  { icon: Shield, label: "Ultra Aggressive Mode" },
  { icon: Fingerprint, label: "Pixel Randomization" },
  { icon: Cpu, label: "Anti-IA Facebook" },
  { icon: Hash, label: "Imagens Únicas" },
] as const;

export default function CamuflarImagem() {
  const { user, profile } = useAuth();

  const creativeInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [creativeFiles, setCreativeFiles] = useState<File[]>([]);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [noiseLevel, setNoiseLevel] = useState(6);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<CamouflageResult[]>([]);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    if (!profile) { setRemaining(null); return; }
    getRemainingCredits(user.id, profile.plan, "photo", profile).then(setRemaining);
  }, [user, profile]);

  function handleCreativeSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (files.length > MAX_CREATIVES) {
      toast.error(`Máximo de ${MAX_CREATIVES} imagens por vez.`);
      return;
    }
    setCreativeFiles(files);
    setResults([]);
  }

  function handleCoverSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    e.target.value = "";
    setCoverFile(file);
  }

  async function handleCamouflage() {
    if (!user) return;
    if (!coverFile) {
      toast.error("Selecione uma imagem de capa.");
      return;
    }
    if (creativeFiles.length === 0) {
      toast.error("Selecione pelo menos um criativo.");
      return;
    }

    setProcessing(true);
    setProgress(0);

    try {
      const coverImg = await loadImage(coverFile);

      const camouflaged = await batchCamouflage(
        coverImg,
        creativeFiles,
        (done, total) => setProgress(Math.round((done / total) * 100)),
        0.9,
        noiseLevel,
      );

      setResults((prev) => [...prev, ...camouflaged]);
      toast.success(`${camouflaged.length} imagem(ns) adicionada(s) aos resultados.`);

      if (profile) {
        const fresh = await getRemainingCredits(user.id, profile.plan, "photo", profile);
        setRemaining(fresh);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      toast.error(msg);
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-4xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            Camuflar Imagem
          </h1>
          <p className="text-muted-foreground">
            Torne suas imagens invisíveis para a IA do Facebook
          </p>
        </div>

        {/* Feature badges */}
        <div className="flex flex-wrap justify-center gap-3">
          {FEATURE_BADGES.map(({ icon: Icon, label }) => (
            <span
              key={label}
              className="inline-flex items-center gap-1.5 rounded-full border border-border/40 bg-card px-3 py-1 text-xs font-medium text-muted-foreground"
            >
              <Icon className="h-3.5 w-3.5 text-primary" />
              {label}
            </span>
          ))}
        </div>

        {/* Credits */}
        {remaining !== null && (
          <p className="text-center text-sm text-muted-foreground">
            Créditos restantes:{" "}
            <span className="font-semibold text-foreground">
              {remaining === Infinity ? "∞" : remaining}
            </span>
          </p>
        )}

        {/* Upload zones */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Criativos */}
          <Card className="border-border/40">
            <CardContent className="pt-6 space-y-3">
              <h3 className="text-sm font-medium">
                Criativos Principais{" "}
                <span className="text-muted-foreground font-normal">
                  (até {MAX_CREATIVES})
                </span>
              </h3>
              <input
                ref={creativeInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleCreativeSelect}
              />
              <button
                type="button"
                onClick={() => creativeInputRef.current?.click()}
                className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border/60 bg-muted/30 p-8 text-muted-foreground transition-colors hover:border-primary/50 hover:bg-muted/50"
              >
                <Upload className="h-8 w-8" />
                <span className="text-sm">
                  {creativeFiles.length > 0
                    ? `${creativeFiles.length} imagem(ns) selecionada(s)`
                    : "Clique para selecionar imagens"}
                </span>
              </button>
            </CardContent>
          </Card>

          {/* Capa */}
          <Card className="border-border/40">
            <CardContent className="pt-6 space-y-3">
              <h3 className="text-sm font-medium">Imagem de Capa</h3>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleCoverSelect}
              />
              <button
                type="button"
                onClick={() => coverInputRef.current?.click()}
                className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border/60 bg-muted/30 p-8 text-muted-foreground transition-colors hover:border-primary/50 hover:bg-muted/50"
              >
                <Upload className="h-8 w-8" />
                <span className="text-sm">
                  {coverFile ? coverFile.name : "Clique para selecionar a capa"}
                </span>
              </button>
            </CardContent>
          </Card>
        </div>

        {/* Noise slider */}
        <Card className="border-border/40">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-medium">Intensidade do ruído</h3>
              <span className="text-sm font-semibold tabular-nums text-primary">
                {noiseLevel}
                <span className="ml-1.5 font-normal text-muted-foreground">
                  {noiseLevel <= 4 ? "(suave)" : noiseLevel <= 9 ? "(moderado)" : "(agressivo)"}
                </span>
              </span>
            </div>
            <div className="flex justify-between text-[10px] uppercase tracking-wide text-muted-foreground px-0.5">
              <span>Suave</span>
              <span>Agressivo</span>
            </div>
            <Slider
              min={1}
              max={15}
              step={1}
              value={[noiseLevel]}
              onValueChange={([v]) => setNoiseLevel(v)}
            />
            <p className="text-xs text-muted-foreground">
              Afeta ruído por pixel, padrão anti-IA e contraste. A cada processamento usa o valor atual do
              slider. Recomendado: 5–8 para equilíbrio.
            </p>
          </CardContent>
        </Card>

        {/* Action button + progress */}
        <div className="space-y-4">
          <Button
            className="w-full h-12 text-base"
            disabled={processing || creativeFiles.length === 0 || !coverFile}
            onClick={handleCamouflage}
          >
            {processing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processando…
              </>
            ) : (
              <>
                <Shield className="mr-2 h-4 w-4" />
                Camuflar Imagens
              </>
            )}
          </Button>

          {processing && (
            <div className="space-y-1">
              <Progress value={progress} className="h-2" />
              <p className="text-center text-xs text-muted-foreground">
                {progress}% concluído
              </p>
            </div>
          )}
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Resultados ({results.length})</h2>
              <Button type="button" variant="outline" size="sm" onClick={() => setResults([])}>
                Limpar resultados
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((r) => (
                <Card key={r.fileName} className="border-border/40 overflow-hidden">
                  <div className="relative group">
                    <img
                      src={r.camouflaged}
                      alt={r.fileName}
                      className="w-full aspect-square object-cover"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setPreviewUrl(
                          previewUrl === r.camouflaged
                            ? null
                            : r.camouflaged,
                        )
                      }
                      className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <Eye className="h-6 w-6 text-white" />
                    </button>
                  </div>
                  <CardContent className="p-3">
                    <a
                      href={r.camouflaged}
                      download={r.fileName}
                      className="inline-flex w-full"
                    >
                      <Button variant="secondary" className="w-full" size="sm">
                        <Download className="mr-2 h-4 w-4" />
                        Baixar
                      </Button>
                    </a>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Preview modal */}
        {previewUrl && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
            onClick={() => setPreviewUrl(null)}
          >
            <img
              src={previewUrl}
              alt="Preview"
              className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
            />
          </div>
        )}
      </div>
    </div>
  );
}
