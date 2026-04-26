import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Zap, Eye, Lock, Image, Video, MessageSquare } from "lucide-react";

const features = [
  {
    icon: Image,
    titulo: "Camuflar Imagens",
    descricao: "Altere metadados e pixels para tornar suas imagens indetectáveis por sistemas de revisão.",
  },
  {
    icon: Video,
    titulo: "Camuflar Vídeos",
    descricao: "Processe vídeos para evitar detecção automática e bloqueios de plataformas.",
  },
  {
    icon: MessageSquare,
    titulo: "Chat Bot.IA",
    descricao: "Gere textos camuflados com inteligência artificial para suas campanhas.",
  },
  {
    icon: Shield,
    titulo: "Cloaking Inteligente",
    descricao: "Redirecione visitantes com base em critérios avançados de segmentação.",
  },
  {
    icon: Eye,
    titulo: "Anti-detecção",
    descricao: "Tecnologia avançada que protege seus criativos contra análise automatizada.",
  },
  {
    icon: Lock,
    titulo: "Segurança Total",
    descricao: "Seus arquivos são processados com criptografia e nunca são armazenados.",
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border/40">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
          <span className="text-xl font-bold tracking-tight">
            <span className="text-primary">C</span>ADS
          </span>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link to="/login">Entrar</Link>
            </Button>
            <Button asChild>
              <Link to="/cadastro">Criar conta</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="max-w-4xl mx-auto text-center px-6 py-24 sm:py-32 relative z-10">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-xs font-medium px-3 py-1.5 rounded-full mb-6">
            <Zap className="h-3.5 w-3.5" />
            Plataforma líder em camuflagem de criativos
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
            Camufle seus criativos
            <br />
            <span className="text-primary">com inteligência</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Proteja suas campanhas contra detecção automática. Camufle imagens,
            vídeos, textos e áudios com tecnologia avançada de anti-detecção.
          </p>
          <div className="flex items-center justify-center gap-4 mt-10">
            <Button size="lg" asChild>
              <Link to="/cadastro">Criar conta</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/login">Entrar</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-foreground">
            Tudo que você precisa
          </h2>
          <p className="text-muted-foreground mt-3 max-w-lg mx-auto">
            Ferramentas completas para camuflar, proteger e distribuir seus criativos.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <Card
              key={feature.titulo}
              className="border-border/40 hover:border-primary/30 transition-colors"
            >
              <CardContent className="p-6">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">
                  {feature.titulo}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.descricao}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border/40">
        <div className="max-w-4xl mx-auto text-center px-6 py-20">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Comece agora mesmo
          </h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            Crie sua conta gratuita e comece a camuflar seus criativos em segundos.
          </p>
          <Button size="lg" asChild>
            <Link to="/cadastro">Criar conta grátis</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-8">
        <div className="max-w-6xl mx-auto px-6 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} CamouflageAds. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
}
