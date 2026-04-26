import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/AuthProvider";
import { Play, Image, Video, MessageSquare, Music, Shield, FileText } from "lucide-react";

const tutoriais = [
  { titulo: "Como camuflar imagens", icon: Image, duracao: "5:30" },
  { titulo: "Como camuflar vídeos", icon: Video, duracao: "8:15" },
  { titulo: "Como usar o Chat Bot.IA", icon: MessageSquare, duracao: "6:45" },
  { titulo: "Como camuflar áudios", icon: Music, duracao: "4:20" },
  { titulo: "Como criar páginas", icon: FileText, duracao: "7:00" },
  { titulo: "Como configurar cloaking", icon: Shield, duracao: "9:10" },
];

export default function Tutoriais() {
  const { profile } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Tutoriais</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Aprenda a usar todas as funcionalidades da plataforma
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tutoriais.map((tutorial) => (
          <Card
            key={tutorial.titulo}
            className="group cursor-pointer border-border/40 hover:border-primary/40 transition-colors"
          >
            <CardContent className="p-0">
              <div className="relative aspect-video bg-muted/50 rounded-t-lg flex items-center justify-center">
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent rounded-t-lg" />
                <div className="h-14 w-14 rounded-full bg-primary/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform z-10">
                  <Play className="h-6 w-6 text-primary-foreground ml-0.5" />
                </div>
                <span className="absolute bottom-2 right-2 text-[11px] bg-black/70 text-white px-2 py-0.5 rounded z-10">
                  {tutorial.duracao}
                </span>
              </div>
              <div className="p-4 flex items-center gap-3">
                <tutorial.icon className="h-5 w-5 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium text-foreground">
                  {tutorial.titulo}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
