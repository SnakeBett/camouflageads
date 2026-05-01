/**
 * Lista de e-mails que SEMPRE têm acesso total (créditos infinitos +
 * bypass de validate-plan), independentemente do plano armazenado em
 * `profiles.plan` ou da role em `user_roles`.
 *
 * Mantenha em sincronia com `supabase/functions/validate-plan/index.ts`
 * (constante OWNER_EMAILS) — o backend tem sua própria cópia porque
 * Edge Functions Deno não importam módulos do frontend.
 */
export const OWNER_EMAILS: ReadonlyArray<string> = [
  "juliocesar5049@icloud.com",
  "julicesar5049@icloud.com",
];

/** True quando o e-mail (case/whitespace-insensitive) faz parte de OWNER_EMAILS. */
export function isOwnerEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return OWNER_EMAILS.includes(normalized);
}
