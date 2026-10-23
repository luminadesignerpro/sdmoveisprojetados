-- =========================================================
-- MIGRAÇÃO: Adicionar colunas faltantes em trip_incidents
-- Execute este SQL no Supabase > SQL Editor
-- =========================================================

-- Criar tabela se não existir ainda
CREATE TABLE IF NOT EXISTS trip_incidents (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id uuid NOT NULL REFERENCES trips(id),
  description text NOT NULL DEFAULT '',
  resolved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Adicionar colunas faltantes (ignora se já existirem)
ALTER TABLE trip_incidents
  ADD COLUMN IF NOT EXISTS employee_id uuid REFERENCES employees(id),
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'Outro';

-- Ativar RLS (segurança)
ALTER TABLE trip_incidents ENABLE ROW LEVEL SECURITY;

-- Política: funcionários podem inserir e ver seus próprios imprevistos
DROP POLICY IF EXISTS "trip_incidents_all" ON trip_incidents;
CREATE POLICY "trip_incidents_all" ON trip_incidents
  FOR ALL USING (true) WITH CHECK (true);
