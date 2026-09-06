alter table public.actividades
  add column if not exists plan_ficha_id uuid;

alter table public.actividades
  add constraint actividades_plan_ficha_id_fkey
    foreign key (plan_ficha_id) references public.pc_notas(id) on delete set null;