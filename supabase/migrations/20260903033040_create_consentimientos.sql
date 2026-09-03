-- Crear tabla de consentimientos
create table if not exists public.consentimientos (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    terminos_version text not null,
    privacidad_version text not null,
    cookies_version text,
    accepted_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar RLS
alter table public.consentimientos enable row level security;

-- Políticas de RLS
create policy "Usuarios pueden ver sus propios consentimientos"
    on public.consentimientos for select
    using ( auth.uid() = user_id );

create policy "Usuarios pueden insertar sus propios consentimientos"
    on public.consentimientos for insert
    with check ( auth.uid() = user_id );

-- Índices útiles
create index if not exists consentimientos_user_id_idx on public.consentimientos(user_id);
