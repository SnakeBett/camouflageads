import { useAuth } from "@/hooks/AuthProvider";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Globe, Lock } from "lucide-react";

export default function Dominios() {
  const { profile } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-foreground">Meus Domínios</h1>
          <span className="text-[10px] font-semibold uppercase tracking-wider bg-primary/20 text-primary px-2.5 py-1 rounded-full">
            Em breve
          </span>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Gerencie seus domínios personalizados.
        </p>
      </div>

      <Card className="border-dashed border-border/60">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Globe className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-1">
            Domínios personalizados
          </h3>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            Em breve você poderá conectar seus próprios domínios para hospedar
            páginas com URLs personalizadas e profissionais.
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
