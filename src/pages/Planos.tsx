import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

interface Plan {
  name: string;
  price: string;
  popular?: boolean;
  features: string[];
  checkout: string;
}

const plans: Plan[] = [
  {
    name: "Iniciante",
    price: "R$ 97,90",
    features: [
      "Camuflar Imagem (10)",
      "Camuflar Vídeo (10)",
      "Chat Bot.ia (5)",
      "Páginas",
      "1 Domínio",
      "Garantia 14 dias",
    ],
    checkout:
      "https://pay.kirvano.com/0ee680b3-d62b-447d-856a-d558d3308bb0",
  },
  {
    name: "Intermediário",
    price: "R$ 147,90",
    popular: true,
    features: [
      "Camuflar Imagem (20)",
      "Camuflar Vídeo (20)",
      "Chat Bot.ia (20)",
      "Páginas",
      "3 Domínios",
      "Remover Metadados",
      "Garantia 14 dias",
    ],
    checkout:
      "https://pay.kirvano.com/8ab61487-8e84-4df0-9241-dd1a734cc480",
  },
  {
    name: "Infinito",
    price: "R$ 197,90",
    features: [
      "Camuflar Imagem (Ilimitado)",
      "Camuflar Vídeo (Ilimitado)",
      "Chat Bot.ia (Ilimitado)",
      "Páginas",
      "20 Domínios",
      "Remover Metadados",
      "Garantia 14 dias",
    ],
    checkout:
      "https://pay.kirvano.com/bcde6459-6c1e-4fb1-ac84-e1b8b8265e0a",
  },
];

export default function Planos() {
  return (
    <div className="min-h-screen bg-background text-foreground p-6 md:p-10">
      <div className="max-w-5xl mx-auto space-y-10">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Nossos Planos</h1>
          <p className="text-muted-foreground mt-2">
            Escolha o plano ideal para o seu negócio
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={`relative flex flex-col border-border/50 bg-card/50 backdrop-blur transition-all duration-200 ${
                plan.popular
                  ? "border-primary shadow-lg shadow-primary/10 scale-[1.02]"
                  : "hover:border-primary/50"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                    Mais Popular
                  </span>
                </div>
              )}

              <CardContent className="flex flex-1 flex-col p-6 pt-8">
                <h2 className="text-xl font-bold">{plan.name}</h2>

                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold tracking-tight">
                    {plan.price}
                  </span>
                  <span className="text-sm text-muted-foreground">/mês</span>
                </div>

                <ul className="mt-6 flex-1 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className="mt-8 w-full"
                  variant={plan.popular ? "default" : "outline"}
                  onClick={() => window.open(plan.checkout, "_blank")}
                >
                  Assinar
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
