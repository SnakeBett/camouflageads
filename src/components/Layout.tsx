import { memo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/AuthProvider";
import {
  LayoutDashboard, Image, Video, MessageSquare, Music, FileText, Globe,
  Shield, GraduationCap, LogOut, Menu, X, Diamond, Gauge,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/camuflar-texto", label: "Chat Bot.IA", icon: MessageSquare },
  { path: "/camuflar-video", label: "Camuflar Vídeo", icon: Video },
  { path: "/camuflar-imagem", label: "Camuflar Imagem", icon: Image },
  { path: "/camuflar-audio-puro", label: "Camuflar Áudio", icon: Music },
  { path: "/paginas", label: "Páginas", icon: FileText },
  { path: "/dominios", label: "Domínios", icon: Globe, badge: "Em breve" },
  { path: "/cloaking", label: "Cloaking", icon: Shield, badge: "Em breve" },
  { path: "/tutoriais", label: "Tutoriais", icon: GraduationCap },
] as const;

const bottomNav = [
  { path: "/dashboard", label: "Início", icon: Gauge },
  { path: "/camuflar-video", label: "Vídeo", icon: Video },
  { path: "/camuflar-texto", label: "Chat Bot", icon: MessageSquare },
  { path: "/camuflar-imagem", label: "Imagem", icon: Image },
  { path: "/planos", label: "Planos", icon: Diamond },
] as const;

const SidebarContent = memo(function SidebarContent({
  pathname,
  profile,
  isAdmin,
  userEmail,
  onNavClick,
  onSignOut,
}: {
  pathname: string;
  profile: { name?: string; plan?: string | null } | null;
  isAdmin: boolean;
  userEmail: string;
  onNavClick: () => void;
  onSignOut: () => void;
}) {
  const initial = profile?.name?.[0]?.toUpperCase() || "?";
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <Link to="/dashboard" className="text-xl font-bold text-foreground tracking-tight" onClick={onNavClick}>
          <span className="text-primary">C</span>ADS
        </Link>
        <button onClick={onNavClick} className="lg:hidden text-muted-foreground hover:text-foreground">
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const active = pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onNavClick}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${active ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground hover:bg-accent hover:text-foreground"}`}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
              {"badge" in item && item.badge && (
                <span className="ml-auto text-[10px] bg-muted px-2 py-0.5 rounded-full uppercase">{item.badge}</span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-border space-y-2">
        <Link to="/planos" onClick={onNavClick} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-accent">
          <Diamond className="h-4 w-4" />
          <div className="min-w-0">
            <p className="truncate font-medium">{profile?.plan ? `Plano: ${profile.plan}` : "Sem plano ativo"}</p>
            <p className="text-xs text-muted-foreground">Clique para ver planos</p>
          </div>
        </Link>
        <Link to="/perfil" onClick={onNavClick} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-accent">
          <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm shrink-0">
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground truncate">{profile?.name || "Visitante"}</p>
            <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
          </div>
        </Link>
        {isAdmin && (
          <Link to="/admin" onClick={onNavClick} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-orange-400 hover:bg-orange-500/10">
            <Shield className="h-4 w-4" />Admin
          </Link>
        )}
        <button onClick={onSignOut} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-destructive hover:bg-destructive/10 w-full">
          <LogOut className="h-4 w-4" />Sair
        </button>
      </div>
    </div>
  );
});

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, profile, isAdmin, signOut } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="flex min-h-screen bg-background">
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform transition-transform duration-200 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}>
        <SidebarContent
          pathname={location.pathname}
          profile={profile}
          isAdmin={isAdmin}
          userEmail={user?.email ?? ""}
          onNavClick={closeSidebar}
          onSignOut={signOut}
        />
      </aside>

      {sidebarOpen && <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={closeSidebar} />}

      <main className="flex-1 lg:ml-64 pb-20 lg:pb-0">
        <header className="sticky top-0 z-30 flex items-center justify-between p-4 bg-background/80 backdrop-blur-sm border-b border-border lg:hidden">
          <Link to="/perfil" className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
              {profile?.name?.[0]?.toUpperCase() || "?"}
            </div>
            <span className="text-sm font-medium text-foreground">{profile?.name || "Visitante"}</span>
          </Link>
          <button onClick={() => setSidebarOpen(true)} className="text-foreground">
            <Menu className="h-6 w-6" />
          </button>
        </header>
        <div className="p-4 sm:p-6 lg:p-8">{children}</div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-card border-t border-border flex lg:hidden">
        {bottomNav.map((item) => {
          const active = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] transition-colors ${active ? "text-primary font-medium" : "text-muted-foreground"}`}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
