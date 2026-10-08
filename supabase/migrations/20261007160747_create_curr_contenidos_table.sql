create table public.curr_contenidos (
    id uuid default gen_random_uuid() primary key,
    grado text not null,
    asignatura text not null,
    contenido text not null,
    contenido_json jsonb not null,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    unique (grado, asignatura, contenido)
);

-- Trigger to automatically update updated_at
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create trigger curr_contenidos_updated_at
    before update on public.curr_contenidos
    for each row
    execute function public.handle_updated_at();