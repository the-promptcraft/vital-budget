-- ============================================================================
-- VITALBUDGET (V1.0 PROD) - SUPABASE POSTGRESQL SCHEMA
-- ============================================================================

create extension if not exists "uuid-ossp";

-- 1. BUDGETS MENSUELS & ENVELOPPES
create table if not exists public.monthly_budgets (
  id uuid primary key default uuid_generate_v4(),
  month_key text not null unique, -- ex: '2026-10'
  monthly_income numeric(10, 2) not null default 2850.00,
  savings_target numeric(10, 2) not null default 550.00,
  envelopes jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

-- 2. CHARGES FIXES MENSUELLES
create table if not exists public.fixed_expenses (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  ticker text not null,
  amount numeric(10, 2) not null,
  day_of_month integer not null check (day_of_month between 1 and 31),
  category text not null,
  is_paid boolean not null default true,
  created_at timestamptz not null default now()
);

-- 3. TRANSACTIONS FINANCIÈRES
create table if not exists public.transactions (
  id uuid primary key default uuid_generate_v4(),
  label text not null,
  amount numeric(10, 2) not null,
  date date not null default current_date,
  envelope_id text not null,
  type text not null check (type in ('expense', 'income')),
  nutri_score_impact numeric(5, 2),
  notes text,
  created_at timestamptz not null default now()
);

-- 4. PRODUITS DE BASE (FAVORIS ÉCO 1-TAP)
create table if not exists public.staple_products (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  emoji text not null default '🥦',
  family text not null, -- Légumes & Vitamines, Fruits & Antioxydants, Protéines Brutes, Glucides Complexes, Bons Lipides, Extras/À réduire
  veg_subfamily text,   -- Verts/Crucifères, Oranges/Rouges, Alliacés/Racines, Légumineuses, null
  default_price numeric(10, 2) not null,
  default_quantity numeric(10, 3) not null,
  unit text not null check (unit in ('kg', 'L', 'unité')),
  reference_price_per_unit numeric(10, 2) not null,
  vitamins text[] not null default '{}',
  nutri_density integer not null default 85 check (nutri_density between 0 and 100),
  created_at timestamptz not null default now()
);

-- 5. PANIER DE COURSES & HISTORIQUE PRIX AU KG/L
create table if not exists public.grocery_items (
  id uuid primary key default uuid_generate_v4(),
  staple_id text,
  name text not null,
  emoji text not null default '🛒',
  family text not null,
  veg_subfamily text,
  price numeric(10, 2) not null,
  quantity numeric(10, 3) not null,
  unit text not null check (unit in ('kg', 'L', 'unité')),
  price_per_unit numeric(10, 2) not null,
  reference_price_per_unit numeric(10, 2) not null,
  vitamins text[] not null default '{}',
  checked boolean not null default false,
  purchased_at timestamptz not null default now()
);

-- 6. RECETTES DE BATCH COOKING (REPAS EN MASSE)
create table if not exists public.batch_meals (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  emoji text not null default '🍲',
  total_portions integer not null check (total_portions > 0),
  remaining_portions integer not null check (remaining_portions >= 0),
  total_cost numeric(10, 2) not null,
  cost_per_portion numeric(10, 2) not null,
  external_meal_price numeric(10, 2) not null default 14.50,
  prep_time_minutes integer not null default 35,
  nutri_score integer not null default 92 check (nutri_score between 0 and 100),
  vitamins text[] not null default '{}',
  veg_subfamilies text[] not null default '{}',
  ingredients jsonb not null default '[]'::jsonb,
  last_cooked_at timestamptz not null default now()
);

-- Activer Row Level Security (optionnel pour usage personnel avec anon key)
alter table public.monthly_budgets enable row level security;
alter table public.fixed_expenses enable row level security;
alter table public.transactions enable row level security;
alter table public.staple_products enable row level security;
alter table public.grocery_items enable row level security;
alter table public.batch_meals enable row level security;

create policy "Allow public access monthly_budgets" on public.monthly_budgets for all using (true) with check (true);
create policy "Allow public access fixed_expenses" on public.fixed_expenses for all using (true) with check (true);
create policy "Allow public access transactions" on public.transactions for all using (true) with check (true);
create policy "Allow public access staple_products" on public.staple_products for all using (true) with check (true);
create policy "Allow public access grocery_items" on public.grocery_items for all using (true) with check (true);
create policy "Allow public access batch_meals" on public.batch_meals for all using (true) with check (true);
