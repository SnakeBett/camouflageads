import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { getRemainingCredits } from "@/utils/plan-utils";
import { obfuscateCentralNrvText, type CentralNrvTextMode } from "@/utils/text-obfuscate";
import { MessageSquare, Mail, Smartphone, LayoutTemplate, Copy, Loader2 } from "lucide-react";

const MODES: {
  mode: CentralNrvTextMode;
  label: string;
  short: string;
  desc: string;
  icon: typeof Mail;
}[] = [
  {
    mode: "email",
    label: "E-mail",
    short: "E-mail",
    desc: "Carácter RLO (U+202E) + texto invertido — como no site original para leitores de e-mail.",
    icon: Mail,
  },
  {
    mode: "sms",
    label: "SMS e Marcas",
    short: "SMS e Marcas",
    desc: "Letras substituídas por homoglifos cirílico/grego onde o snapshot mapeava; espaços removidos.",
    icon: Smartphone,
  },
  {
    mode: "anuncios",
    label: "Anúncios e Sites",
    short: "Anúncios e Sites",
    desc: "Mesma tabela que SMS, com ZWSP (U+200B) antes de cada carácter; espaços viram só o ZWSP.",
    icon: LayoutTemplate,
  },
];

function modeToastLabel(mode: CentralNrvTextMode): string {
  if (mode === "email") return "Modo E-mail aplicado.";
  if (mode === "sms") return "Modo SMS e Marcas aplicado.";
  return "Modo Anúncios e Sites aplicado.";
}

export default function CamuflarTexto() {
  const { user, profile, isAdmin } = useAuth();
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [processing, setProcessing] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [lastMode, setLastMode] = useState<CentralNrvTextMode | null>(null);

  useEffect(() => {
    if (user && profile) {
      if (isAdmin) setRemaining(Infinity);
      else getRemainingCredits(user.id, profile.plan, "text", profile).then(setRemaining);
    }
  }, [user, profile, isAdmin]);

  const runObfuscate = async (mode: CentralNrvTextMode) => {
    if (!input.trim()) {
      toast.error("Digite um texto.");
      return;
    }
    setProcessing(true);
    try {
      await new Promise((r) => setTimeout(r, 80));
      const camouflaged = obfuscateCentralNrvText(input, mode);
      setOutput(camouflaged);
      setLastMode(mode);
      toast.success(modeToastLabel(mode));

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

  const lastModeLabel = lastMode ? MODES.find((m) => m.mode === lastMode)?.short : null;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 rounded-xl bg-foreground/10 border border-border">
          <MessageSquare className="h-7 w-7 text-foreground" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground">Chat Bot.IA</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Três modos fixos, iguais ao script da captura Wayback de{" "}
            <span className="text-foreground font-medium">central-nrv.com</span> (2022): escolhe o objetivo e gera o
            texto para copiar.
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
          <label className="text-sm font-medium text-foreground">Texto original</label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={6}
            placeholder='Ex.: "JULIO" ou um parágrafo de anúncio…'
            className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />

          <label className="text-sm font-medium text-foreground">Objetivo (como no site original)</label>
          <div className="grid gap-2 sm:grid-cols-1">
            {MODES.map(({ mode, label, desc, icon: Icon }) => (
              <div
                key={mode}
                className="rounded-lg border border-border/60 p-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex gap-3 min-w-0">
                  <div className="shrink-0 p-2 rounded-md bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground text-sm">{label}</p>
                    <p className="text-xs text-muted-foreground leading-snug mt-0.5">{desc}</p>
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  disabled={processing}
                  className="shrink-0 w-full sm:w-auto bg-[#61CE70] hover:bg-[#52b85f] text-white border-0"
                  onClick={() => void runObfuscate(mode)}
                >
                  {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : `Gerar — ${label}`}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {output && (
        <Card className="border-green-500/30">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <label className="text-sm font-medium text-green-400">
                Texto ofuscado
                {lastModeLabel ? ` (${lastModeLabel})` : ""}
              </label>
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
              {lastMode === "email" && (
                <>Começa com U+202E (override RTL) e o restante é o teu texto invertido por carácter.</>
              )}
              {lastMode === "sms" && (
                <>Homoglifos só nas letras que o site mapeava; espaços foram removidos como no original.</>
              )}
              {lastMode === "anuncios" && (
                <>Um ZWSP (U+200B) antes de cada carácter processado, mais a mesma substituição que em SMS.</>
              )}
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
