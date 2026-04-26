import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { getRemainingCredits } from "@/utils/plan-utils";
import { obfuscateTextForSearch, type ObfuscateIntensity } from "@/utils/text-obfuscate";
import { MessageSquare, Send, Copy, Loader2, Sparkles } from "lucide-react";

const INTENSITIES: { key: ObfuscateIntensity; label: string; desc: string }[] = [
  {
    key: "leve",
    label: "Leve",
    desc: "Parte das letras vira homóglifo — ainda parece o texto, mas já foge de busca literal.",
  },
  {
    key: "medio",
    label: "Médio",
    desc: "Quase todas as letras e números trocados; forte contra copiar/colar em busca exata.",
  },
  {
    key: "pesado",
    label: "Pesado",
    desc: "Tudo homóglifo + separadores invisíveis entre letras — máximo para não bater com o texto “normal”.",
  },
];

export default function CamuflarTexto() {
  const { user, profile, isAdmin } = useAuth();
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [processing, setProcessing] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [intensity, setIntensity] = useState<ObfuscateIntensity>("medio");

  useEffect(() => {
    if (user && profile) {
      if (isAdmin) setRemaining(Infinity);
      else getRemainingCredits(user.id, profile.plan, "text", profile).then(setRemaining);
    }
  }, [user, profile, isAdmin]);

  const handleProcess = async () => {
    if (!input.trim()) {
      toast.error("Digite um texto.");
      return;
    }
    setProcessing(true);
    try {
      await new Promise((r) => setTimeout(r, 80));
      const camouflaged = obfuscateTextForSearch(input, intensity);
      setOutput(camouflaged);
      toast.success("Texto ofuscado — visualmente parecido, Unicode diferente.");

      if (user && profile) {
        const r = await getRemainingCredits(user.id, profile.plan, "text", profile);
        setRemaining(isAdmin ? Infinity : r);
      }
    } catch {
      toast.error("Erro ao processar texto.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 rounded-xl bg-foreground/10 border border-border">
          <MessageSquare className="h-7 w-7 text-foreground" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground">Chat Bot.IA</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Troca letras por homóglifos Unicode (cirílico, grego, largura total) — parece igual, mas uma busca
            exata pelo texto original em geral não encontra o trecho ofuscado.
          </p>
        </div>
        {remaining !== null && remaining !== Infinity && (
          <div className="text-right">
            <p className="text-xs text-muted-foreground uppercase">Restantes</p>
            <p className={`text-2xl font-bold ${remaining <= 3 ? "text-destructive" : "text-foreground"}`}>{remaining}</p>
          </div>
        )}
      </div>

      <Card className="border-border mb-6">
        <CardContent className="p-6 space-y-4">
          <label className="text-sm font-medium text-foreground">Intensidade</label>
          <div className="grid gap-2 sm:grid-cols-3">
            {INTENSITIES.map(({ key, label, desc }) => (
              <button
                key={key}
                type="button"
                onClick={() => setIntensity(key)}
                className={`rounded-lg border-2 p-3 text-left text-sm transition-colors ${
                  intensity === key
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border/60 text-muted-foreground hover:border-muted-foreground/40"
                }`}
              >
                <span className="font-semibold flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 shrink-0" />
                  {label}
                </span>
                <span className="mt-1 block text-xs leading-snug opacity-90">{desc}</span>
              </button>
            ))}
          </div>

          <label className="text-sm font-medium text-foreground">Texto original</label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={6}
            placeholder='Ex.: "JULIO" ou um parágrafo de anúncio…'
            className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
          <Button onClick={handleProcess} disabled={processing} size="lg" className="w-full">
            {processing ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Processando…
              </>
            ) : (
              <>
                <Send className="mr-2 h-5 w-5" />
                Ofuscar texto
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {output && (
        <Card className="border-green-500/30">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <label className="text-sm font-medium text-green-400">Texto ofuscado (Unicode)</label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  void navigator.clipboard.writeText(output);
                  toast.success("Copiado para a área de transferência.");
                }}
              >
                <Copy className="h-4 w-4 mr-1" />
                Copiar
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Cole onde precisar (bio, criativo, legenda). Em buscas, o motor indexa estes caracteres — não o
              mesmo que digitar &quot;JULIO&quot; no teclado latino comum.
            </p>
            <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-4 text-sm text-foreground whitespace-pre-wrap break-all font-sans">
              {output}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
