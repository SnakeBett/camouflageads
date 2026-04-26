import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/AuthProvider";
import {
  Video,
  Image,
  MessageSquare,
  Music,
  FileText,
  Globe,
  Diamond,
  ArrowUpRight,
  MessageCircle,
} from "lucide-react";

const features = [
  {
    title: "Camuflagem de Vídeo",
    description: "Camufle seus vídeos para evitar detecção de direitos autorais.",
    icon: Video,
    to: "/camuflar-video",
  },
  {
    title: "Camuflagem de Imagem",
    description: "Modifique imagens para torná-las únicas e indetectáveis.",
    icon: Image,
    to: "/camuflar-imagem",
  },
  {
    title: "Chat Bot.ia",
    description: "Gere textos persuasivos com inteligência artificial.",
    icon: MessageSquare,
    to: "/camuflar-texto",
  },
  {
    title: "Camuflagem TikTok",
    description: "Adapte vídeos especificamente para o TikTok.",
    icon: Music,
    to: "/camuflar-video",
  },
  {
    title: "Páginas",
    description: "Crie e gerencie suas páginas de destino.",
    icon: FileText,
    to: "/paginas",
  },
  {
    title: "Domínios",
    description: "Gerencie seus domínios personalizados.",
    icon: Globe,
    to: "/dominios",
  },
  {
    title: "Planos",
    description: "Veja os planos disponíveis e faça upgrade.",
    icon: Diamond,
    to: "/planos",
  },
];

export default function Dashboard() {
  const { profile } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {profile?.name ? `Olá, ${profile.name}` : "Dashboard"}
          </h1>
          <p className="text-muted-foreground mt-1">Comece por aqui:</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feature) => (
            <Link key={feature.title} to={feature.to} className="group">
              <Card className="h-full border-border/50 bg-card/50 backdrop-blur transition-all duration-200 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5">
                <CardContent className="p-5 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
                      <feature.icon className="h-5 w-5" />
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {feature.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      <a
        href="https://wa.me/5573998196240"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-green-500 text-white shadow-lg transition-transform hover:scale-110 hover:shadow-green-500/25"
        aria-label="WhatsApp"
      >
        <MessageCircle className="h-6 w-6" />
      </a>
    </div>
  );
}
