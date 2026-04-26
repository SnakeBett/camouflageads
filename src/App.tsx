import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "@/hooks/AuthProvider";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminRoute from "@/components/AdminRoute";
import { Loader2 } from "lucide-react";

const Landing = lazy(() => import("@/pages/Landing"));
const Login = lazy(() => import("@/pages/Login"));
const Cadastro = lazy(() => import("@/pages/Cadastro"));
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const CamuflarImagem = lazy(() => import("@/pages/CamuflarImagem"));
const CamuflarVideo = lazy(() => import("@/pages/CamuflarVideo"));
const CamuflarTexto = lazy(() => import("@/pages/CamuflarTexto"));
const CamuflarAudioPuro = lazy(() => import("@/pages/CamuflarAudioPuro"));
const Paginas = lazy(() => import("@/pages/Paginas"));
const Dominios = lazy(() => import("@/pages/Dominios"));
const Cloaking = lazy(() => import("@/pages/Cloaking"));
const Planos = lazy(() => import("@/pages/Planos"));
const Perfil = lazy(() => import("@/pages/Perfil"));
const Tutoriais = lazy(() => import("@/pages/Tutoriais"));
const AdminPanel = lazy(() => import("@/pages/AdminPanel"));
const PublishedPage = lazy(() => import("@/pages/PublishedPage"));
const Direto = lazy(() => import("@/pages/Direto"));
const NotFound = lazy(() => import("@/pages/NotFound"));

function Loading() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Toaster theme="dark" position="top-right" richColors />
      <Suspense fallback={<Loading />}>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/cadastro" element={<Cadastro />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/planos" element={<Planos />} />
          <Route path="/cplanos" element={<Planos />} />
          <Route path="/p/:code/*" element={<PublishedPage />} />
          <Route path="/direto" element={<Direto />} />

          {/* Protected */}
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/camuflar-imagem" element={<ProtectedRoute><CamuflarImagem /></ProtectedRoute>} />
          <Route path="/camuflar-video" element={<ProtectedRoute><CamuflarVideo /></ProtectedRoute>} />
          <Route path="/camuflar-texto" element={<ProtectedRoute><CamuflarTexto /></ProtectedRoute>} />
          <Route path="/camuflar-audio" element={<ProtectedRoute><CamuflarAudioPuro /></ProtectedRoute>} />
          <Route path="/camuflar-audio-puro" element={<ProtectedRoute><CamuflarAudioPuro /></ProtectedRoute>} />
          <Route path="/paginas" element={<ProtectedRoute><Paginas /></ProtectedRoute>} />
          <Route path="/dominios" element={<ProtectedRoute><Dominios /></ProtectedRoute>} />
          <Route path="/cloaking" element={<ProtectedRoute><Cloaking /></ProtectedRoute>} />
          <Route path="/perfil" element={<ProtectedRoute><Perfil /></ProtectedRoute>} />
          <Route path="/tutoriais" element={<ProtectedRoute><Tutoriais /></ProtectedRoute>} />

          {/* Admin */}
          <Route path="/admin" element={<AdminRoute><AdminPanel /></AdminRoute>} />

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </AuthProvider>
  );
}
