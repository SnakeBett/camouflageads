-- =============================================================
-- CAMOUFLAGE ADS - Schema Recuperado
-- Projeto Supabase: tthvqqjjjqifzskzioyb
-- URL: https://tthvqqjjjqifzskzioyb.supabase.co
-- Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0aHZxcWpqanFpZnpza3ppb3liIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MTc4MzEsImV4cCI6MjA4OTk5MzgzMX0.FALMPeDb9gYw6TJfBXXNdBZ_PgZzrQEUFx1a180JFJQ
-- =============================================================

-- =====================
-- TABELA: profiles
-- =====================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT,
    phone TEXT,
    plan TEXT DEFAULT NULL,              -- 'teste grátis', 'iniciante', 'intermediário', 'infinito'
    plan_expiry TIMESTAMPTZ DEFAULT NULL,
    bonus_credits INTEGER DEFAULT 0,
    free_trial_used_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Usuários podem ler seu próprio perfil
CREATE POLICY "Users can read own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = user_id);

-- Usuários podem atualizar nome e telefone apenas
CREATE POLICY "Users can update own basic info"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (
        auth.uid() = user_id
        AND plan IS NOT DISTINCT FROM (SELECT plan FROM public.profiles WHERE user_id = auth.uid())
        AND plan_expiry IS NOT DISTINCT FROM (SELECT plan_expiry FROM public.profiles WHERE user_id = auth.uid())
        AND bonus_credits IS NOT DISTINCT FROM (SELECT bonus_credits FROM public.profiles WHERE user_id = auth.uid())
    );

-- Admins podem ler todos os perfis
CREATE POLICY "Admins can read all profiles"
    ON public.profiles FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Admins podem atualizar qualquer perfil (incluindo plan, bonus_credits)
CREATE POLICY "Admins can update any profile"
    ON public.profiles FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Trigger para criar perfil automaticamente ao registrar
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, name, phone)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'name', ''),
        COALESCE(NEW.raw_user_meta_data->>'phone', '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();


-- =====================
-- TABELA: user_roles
-- =====================
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'user'  -- 'user' ou 'admin'
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Todos autenticados podem ler suas próprias roles
CREATE POLICY "Users can read own roles"
    ON public.user_roles FOR SELECT
    USING (auth.uid() = user_id);

-- Admins podem ler todas as roles
CREATE POLICY "Admins can read all roles"
    ON public.user_roles FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Admins podem inserir/atualizar/deletar roles
CREATE POLICY "Admins can manage roles"
    ON public.user_roles FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Trigger para criar role 'user' automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created_role
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user_role();


-- =====================
-- TABELA: camouflage_logs
-- =====================
CREATE TABLE IF NOT EXISTS public.camouflage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    count INTEGER NOT NULL DEFAULT 1,
    type TEXT NOT NULL DEFAULT 'photo',  -- 'photo', 'video', 'text', 'clone', 'audio', 'audio_pure'
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.camouflage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own logs"
    ON public.camouflage_logs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own logs"
    ON public.camouflage_logs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can read all logs"
    ON public.camouflage_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );


-- =====================
-- TABELA: camouflage_history
-- =====================
CREATE TABLE IF NOT EXISTS public.camouflage_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL DEFAULT 'photo',  -- 'photo', 'video'
    name TEXT,
    storage_path TEXT,
    blob_id TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.camouflage_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own history"
    ON public.camouflage_history FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own history"
    ON public.camouflage_history FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own history"
    ON public.camouflage_history FOR DELETE
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all history"
    ON public.camouflage_history FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );


-- =====================
-- TABELA: page_events (analytics)
-- =====================
CREATE TABLE IF NOT EXISTS public.page_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    session_id TEXT,
    page TEXT,
    event_type TEXT DEFAULT 'pageview',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.page_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert page events"
    ON public.page_events FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Admins can read all events"
    ON public.page_events FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );


-- =====================
-- STORAGE BUCKET
-- =====================
INSERT INTO storage.buckets (id, name, public)
VALUES ('camouflage-results', 'camouflage-results', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload to camouflage-results"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'camouflage-results'
        AND auth.role() = 'authenticated'
    );

CREATE POLICY "Users can read own files"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'camouflage-results'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Admins can delete files"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'camouflage-results'
        AND EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );
