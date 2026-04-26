import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 text-center">
      <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-6">
        <FileQuestion className="h-10 w-10 text-muted-foreground" />
      </div>
      <h1 className="text-4xl font-bold text-foreground mb-2">404</h1>
      <p className="text-lg text-muted-foreground mb-8">
        Página não encontrada
      </p>
      <Button asChild>
        <Link to="/dashboard">Voltar ao Dashboard</Link>
      </Button>
    </div>
  );
}
