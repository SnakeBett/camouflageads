import { useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";

export default function PublishedPage() {
  const { code } = useParams<{ code: string }>();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
      <p className="text-muted-foreground text-sm">Carregando página...</p>
    </div>
  );
}
