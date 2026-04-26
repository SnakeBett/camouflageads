import { useState } from "react";
import { useAuth } from "@/hooks/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { FileText, Plus } from "lucide-react";

export default function Paginas() {
  const { profile } = useAuth();
  const [paginas] = useState<unknown[]>([]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Minhas Páginas</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Crie e gerencie suas páginas de campanha
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4" />
          Criar Página
        </Button>
      </div>

      {paginas.length === 0 ? (
        <Card className="border-dashed border-border/60">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-1">
              Nenhuma página criada ainda
            </h3>
            <p className="text-sm text-muted-foreground mb-6 text-center max-w-sm">
              Crie sua primeira página para começar a compartilhar seus criativos camuflados.
            </p>
            <Button>
              <Plus className="h-4 w-4" />
              Criar Página
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Future page cards */}
        </div>
      )}
    </div>
  );
}
