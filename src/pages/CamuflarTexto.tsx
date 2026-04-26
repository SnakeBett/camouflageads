import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { getRemainingCredits } from "@/utils/plan-utils";
import { MessageSquare, Send, Copy, Loader2 } from "lucide-react";

export default function CamuflarTexto() {
  const navigate = useNavigate();
  const { user, profile, isAdmin } = useAuth();
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [processing, setProcessing] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (user && profile) {
      if (isAdmin) setRemaining(Infinity);
      else getRemainingCredits(user.id, profile.plan, "text", profile).then(setRemaining);
    }
  }, [user, profile, isAdmin]);

  const handleProcess = async () => {
    if (!input.trim()) { toast.error("Digite um texto."); return; }
    setProcessing(true);
    try {
      try {
        const { data } = await supabase.functions.invoke("validate-plan", {
          body: { count: 1, type: "text" },
        });
        if (data && data.allowed === false) {
          toast.error(data.reason === "no_plan"
            ? "Você ainda não tem um plano ativo. Vá em Planos para assinar."
            : data.reason || "Limite de créditos atingido.");
          return;
        }
      } catch {
        // Edge Function não disponível — prossegue
      }

      const words = input.split(/\s+/);
      const synonymMap: Record<string, string[]> = {
        "o": ["este", "o"], "a": ["esta", "a"], "de": ["sobre", "de"],
        "para": ["pra", "para"], "com": ["junto a", "com"],
        "muito": ["bastante", "extremamente"], "bom": ["excelente", "ótimo"],
        "fazer": ["realizar", "executar"], "grande": ["enorme", "amplo"],
      };

      const camouflaged = words.map((w) => {
        const lower = w.toLowerCase();
        const options = synonymMap[lower];
        if (options && Math.random() > 0.5) {
          return options[Math.floor(Math.random() * options.length)];
        }
        if (w.length > 4 && Math.random() > 0.7) {
          const chars = w.split("");
          const idx = 1 + Math.floor(Math.random() * (chars.length - 2));
          chars[idx] = chars[idx] + "\u200B";
          return chars.join("");
        }
        return w;
      }).join(" ");

      setOutput(camouflaged);
      toast.success("Texto camuflado!");

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
          <p className="text-muted-foreground text-sm mt-1">Camufle textos para impedir detecção por algoritmos.</p>
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
          <label className="text-sm font-medium text-foreground">Texto Original</label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={6}
            placeholder="Cole aqui o texto que deseja camuflar..."
            className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
          <Button onClick={handleProcess} disabled={processing} size="lg" className="w-full">
            {processing ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Processando...</> : <><Send className="mr-2 h-5 w-5" />Camuflar Texto</>}
          </Button>
        </CardContent>
      </Card>

      {output && (
        <Card className="border-green-500/30">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-green-400">Texto Camuflado</label>
              <Button variant="ghost" size="sm" onClick={() => { navigator.clipboard.writeText(output); toast.success("Copiado!"); }}>
                <Copy className="h-4 w-4 mr-1" />Copiar
              </Button>
            </div>
            <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-4 text-sm text-foreground whitespace-pre-wrap">
              {output}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
