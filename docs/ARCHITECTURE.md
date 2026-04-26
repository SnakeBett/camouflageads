# Arquitetura - CamouflageAds (camouflageia)

## Visão Geral
Aplicação SaaS para camuflagem de imagens, vídeos, áudio e texto para anúncios.

## Stack
| Camada | Tecnologia |
|--------|-----------|
| Frontend | React + Vite + TailwindCSS + shadcn/ui |
| Backend | Supabase (Postgres + Auth + Storage + Edge Functions) |
| Build | Lovable.dev (GPT Engineer) |
| Pagamentos | Kirvano (pay.kirvano.com) |
| Analytics | Facebook Pixel (776809212168962) + TikTok + Utmify |
| Domínio | camouflageads.com |

## Supabase Project
- **Ref**: `tthvqqjjjqifzskzioyb`
- **URL**: `https://tthvqqjjjqifzskzioyb.supabase.co`
- **Dashboard**: `https://supabase.com/dashboard/project/tthvqqjjjqifzskzioyb`

## Rotas do Frontend

| Rota | Componente | Descrição |
|------|-----------|-----------|
| `/` | Landing | Página inicial / marketing |
| `/login` | Login | Tela de login |
| `/cadastro` | Cadastro | Registro de novo usuário |
| `/reset-password` | ResetPassword | Recuperação de senha |
| `/dashboard` | Dashboard | Painel principal do usuário |
| `/camuflar-imagem` | CamuflarImagem | Camuflagem de imagens |
| `/camuflar-video` | CamuflarVideo | Camuflagem de vídeos |
| `/camuflar-texto` | CamuflarTexto | Chat Bot.IA para textos |
| `/camuflar-audio` | CamuflarAudio | Camuflagem de áudio |
| `/camuflar-audio-puro` | CamuflarAudioPuro | Camuflagem de áudio puro |
| `/cloaking` | Cloaking | Sistema de cloaking |
| `/paginas` | Paginas | Gerenciamento de páginas |
| `/clonar-site` | ClonarSite | Clonagem de sites |
| `/dominios` | Dominios | Gerenciamento de domínios |
| `/planos` | Planos | Página de planos/preços |
| `/cplanos` | CPlanos | Planos (variante) |
| `/direto` | Direto | Acesso direto |
| `/perfil` | Perfil | Perfil do usuário |
| `/tutoriais` | Tutoriais | Tutoriais em vídeo |
| `/admin` | AdminPanel | Painel administrativo |
| `/p/:code/*` | PublishedPage | Páginas publicadas |

## Banco de Dados

### Tabela: `profiles`
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | PK |
| user_id | UUID | FK → auth.users |
| name | TEXT | Nome do usuário |
| phone | TEXT | Telefone |
| plan | TEXT | Plano ativo: null, 'teste grátis', 'iniciante', 'intermediário', 'infinito' |
| plan_expiry | TIMESTAMPTZ | Data de expiração do plano |
| bonus_credits | INTEGER | Créditos bônus (quando sem plano) |
| free_trial_used_at | TIMESTAMPTZ | Quando usou trial gratuito |
| created_at | TIMESTAMPTZ | Data de criação |
| updated_at | TIMESTAMPTZ | Última atualização |

### Tabela: `user_roles`
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | PK |
| user_id | UUID | FK → auth.users |
| role | TEXT | 'user' ou 'admin' |

### Tabela: `camouflage_logs`
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | PK |
| user_id | UUID | FK → auth.users |
| count | INTEGER | Quantas camuflagens usadas |
| type | TEXT | 'photo', 'video', 'text', 'clone', 'audio', 'audio_pure' |
| created_at | TIMESTAMPTZ | Data |

### Tabela: `camouflage_history`
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | PK |
| user_id | UUID | FK → auth.users |
| type | TEXT | 'photo' ou 'video' |
| name | TEXT | Nome do arquivo |
| storage_path | TEXT | Caminho no Supabase Storage |
| blob_id | TEXT | ID do blob |
| metadata | JSONB | Metadados adicionais |
| created_at | TIMESTAMPTZ | Data |

### Tabela: `page_events`
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | PK |
| user_id | UUID | FK → auth.users (nullable) |
| session_id | TEXT | ID da sessão do browser |
| page | TEXT | Rota visitada |
| event_type | TEXT | Tipo de evento |
| metadata | JSONB | Dados adicionais |
| created_at | TIMESTAMPTZ | Data |

### Storage Bucket: `camouflage-results`
Bucket público para armazenar resultados de camuflagens.

## Edge Functions

### `validate-plan`
- **Método**: POST
- **Body**: `{ count: number, type: string }`
- **Retorno**: `{ allowed: boolean, reason: string, remaining?: number }`
- **Lógica**: Verifica se o plano permite a ação, decrementa créditos

### `check-ban`
- **Método**: POST
- **Retorno**: `{ banned: boolean }`
- **Lógica**: Verifica se a conta foi banida

### `admin-list-emails`
- **Método**: POST (admin only)
- **Retorno**: `{ emails: Record<string, string> }`
- **Lógica**: Lista emails de todos os usuários

### `admin-login-as`
- **Método**: POST (admin only)
- **Body**: `{ target_user_id: string }`
- **Retorno**: `{ token_hash: string }`
- **Lógica**: Gera magic link para admin logar como outro usuário

## Limites dos Planos

| Plano | Foto | Vídeo | Texto | Clone | Áudio |
|-------|------|-------|-------|-------|-------|
| teste grátis | 2 | 2 | 2 | 0 | 2 |
| iniciante | 10 | 10 | 5 | 0 | 10 |
| intermediário | 20 | 20 | 20 | 20 | 20 |
| infinito | ∞ | ∞ | ∞ | ∞ | ∞ |

## Integrações de Pagamento (Kirvano)

| Plano | URL de Checkout |
|-------|----------------|
| Iniciante | https://pay.kirvano.com/0ee680b3-d62b-447d-856a-d558d3308bb0 |
| Intermediário | https://pay.kirvano.com/8ab61487-8e84-4df0-9241-dd1a734cc480 |
| Infinito | https://pay.kirvano.com/bcde6459-6c1e-4fb1-ac84-e1b8b8265e0a |

## RLS (Row Level Security)

### profiles
- SELECT: próprio perfil (user_id = auth.uid()) + admins veem todos
- UPDATE: usuários podem editar name/phone; plan/plan_expiry/bonus_credits somente via service_role
- INSERT: apenas via trigger (auto-criação)

### user_roles
- SELECT: própria role + admins veem todas
- INSERT/UPDATE/DELETE: somente admins

### camouflage_logs
- SELECT: próprios logs + admins veem todos
- INSERT: próprios logs

### camouflage_history
- SELECT/INSERT/DELETE: próprios registros
- ALL: admins

### page_events
- INSERT: qualquer um (anônimo ou autenticado)
- SELECT: somente admins
