import { Link, useParams } from "react-router-dom";
import { FileQuestion } from "lucide-react";

export default function PublishedPage() {
  const { code } = useParams<{ code: string }>();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 text-center">
      <FileQuestion className="mb-4 h-12 w-12 text-muted-foreground" />
      <h1 className="text-2xl font-bold text-foreground">Página não encontrada</h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        A página publicada {code ? <span className="font-mono">{code}</span> : "solicitada"} ainda não existe
        ou não foi ativada.
      </p>
      <Link
        to="/"
        className="mt-6 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Voltar ao início
      </Link>
    </div>
  );
}
