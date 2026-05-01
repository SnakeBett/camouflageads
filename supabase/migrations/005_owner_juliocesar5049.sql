-- Garante que a conta owner `juliocesar5049@icloud.com` (e a variante `julicesar5049@icloud.com`)
-- tenha plano `infinito` + role `admin`, independentemente do estado anterior.
-- Idempotente: pode ser executada quantas vezes quiser no SQL Editor do Supabase.
--
-- Observação: a edge function `validate-plan` já libera estes e-mails sem
-- depender desta migration (ver constante OWNER_EMAILS). Esta migration existe
-- apenas para garantir consistência no banco e cobrir páginas que ainda
-- consultem `profiles.plan` diretamente.

DO $$
DECLARE
  uid uuid;
BEGIN
  FOR uid IN
    SELECT u.id
    FROM auth.users u
    WHERE lower(trim(u.email)) IN (
      'juliocesar5049@icloud.com',
      'julicesar5049@icloud.com'
    )
  LOOP
    UPDATE public.profiles
    SET
      plan = 'infinito',
      plan_expiry = '2099-12-31T23:59:59+00:00'::timestamptz,
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
