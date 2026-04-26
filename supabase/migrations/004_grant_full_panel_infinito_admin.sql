-- Acesso total: plano infinito + role admin (painel /admin) para contas da equipe.
-- Execute no Supabase: SQL Editor > Run.
-- Ajuste a lista de e-mails abaixo conforme necessário.

DO $$
DECLARE
  uid uuid;
BEGIN
  FOR uid IN
    SELECT u.id
    FROM auth.users u
    WHERE lower(trim(u.email)) IN (
      'julicesar5049@icloud.com',
      'juliocesar5049@icloud.com'
    )
  LOOP
    UPDATE public.profiles
    SET
      plan = 'infinito',
      plan_expiry = '2035-12-31T23:59:59+00:00'::timestamptz,
      bonus_credits = 999999,
      banned = false,
      updated_at = now()
    WHERE user_id = uid;

    IF NOT EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = uid AND ur.role = 'admin'
    ) THEN
      INSERT INTO public.user_roles (user_id, role) VALUES (uid, 'admin');
    END IF;
  END LOOP;
END $$;
