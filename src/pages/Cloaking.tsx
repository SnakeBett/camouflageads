import { useAuth } from "@/hooks/AuthProvider";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Lock } from "lucide-react";

export default function Cloaking() {
  const { profile } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-foreground">Cloaking</h1>
          <span className="text-[10px] font-semibold uppercase tracking-wider bg-primary/20 text-primary px-2.5 py-1 rounded-full">
            Em breve
          </span>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Configure redirecionamento inteligente.
        </p>
      </div>

      <Card className="border-dashed border-border/60">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Shield className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-1">
            Redirecionamento inteligente
          </h3>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            Em breve você poderá configurar regras de cloaking para redirecionar
            visitantes com base em critérios como localização, dispositivo e origem do tráfego.
          </p>
          <div className="flex items-center gap-2 mt-6 text-xs text-muted-foreground">
            <Lock className="h-3.5 w-3.5" />
            Funcionalidade em desenvolvimento
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
