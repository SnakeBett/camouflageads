-- Libera plano "infinito" (créditos ilimitados no validate-plan + UI) para o e-mail indicado.
-- O usuário precisa já ter conta (linha em auth.users e profiles).
-- Execute no Supabase: SQL Editor > New query > colar > Run.

UPDATE public.profiles AS p
SET
  plan = 'infinito',
  plan_expiry = '2035-12-31T23:59:59+00:00'::timestamptz,
  bonus_credits = 999999,
  updated_at = now()
FROM auth.users AS u
WHERE p.user_id = u.id
  AND lower(trim(u.email)) = lower(trim('julicesar5049@icloud.com'));

-- Opcional: acesso ao painel admin (gerir outros usuários). Descomente se quiser.
-- INSERT INTO public.user_roles (user_id, role)
-- SELECT u.id, 'admin'
-- FROM auth.users u
-- WHERE lower(trim(u.email)) = lower(trim('julicesar5049@icloud.com'))
--   AND NOT EXISTS (
--     SELECT 1 FROM public.user_roles ur
--     WHERE ur.user_id = u.id AND ur.role = 'admin'
--   );
