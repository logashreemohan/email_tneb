-- ============================================================
-- EmailShield – Supabase Database Setup
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Create profiles table (extends auth.users with role)
CREATE TABLE IF NOT EXISTS public.profiles (
  id        UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email     TEXT,
  role      TEXT CHECK (role IN ('admin', 'manager')) NOT NULL DEFAULT 'manager',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- 2. Create email_reports table
CREATE TABLE IF NOT EXISTS public.email_reports (
  id          BIGSERIAL PRIMARY KEY,
  email       TEXT NOT NULL,
  status      TEXT CHECK (status IN ('valid', 'invalid')) NOT NULL,
  reason      TEXT,
  checked_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.email_reports ENABLE ROW LEVEL SECURITY;

-- Admins can see all records
CREATE POLICY "Admins can view all reports"
  ON public.email_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Managers can see only their own records
CREATE POLICY "Managers can view own reports"
  ON public.email_reports FOR SELECT
  USING (checked_by = auth.uid());

-- Authenticated users can insert
CREATE POLICY "Authenticated users can insert reports"
  ON public.email_reports FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Allow delete by admin
CREATE POLICY "Admins can delete reports"
  ON public.email_reports FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 3. Create ai_chat_logs table
CREATE TABLE IF NOT EXISTS public.ai_chat_logs (
  id          BIGSERIAL PRIMARY KEY,
  prompt      TEXT NOT NULL,
  response    TEXT,
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.ai_chat_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all ai chat logs"
  ON public.ai_chat_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Managers can view own ai chat logs"
  ON public.ai_chat_logs FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Authenticated users can insert ai chat logs"
  ON public.ai_chat_logs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can delete ai chat logs"
  ON public.ai_chat_logs FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 4. Auto-create profile on signup trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'manager')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_reports_status     ON public.email_reports(status);
CREATE INDEX IF NOT EXISTS idx_email_reports_checked_by ON public.email_reports(checked_by);
CREATE INDEX IF NOT EXISTS idx_email_reports_created_at ON public.email_reports(created_at DESC);

-- ============================================================
-- AFTER RUNNING THIS SQL:
-- 1. Create users in Supabase Auth Dashboard → Authentication → Users
-- 2. Then manually update their role in profiles table:
--    UPDATE public.profiles SET role = 'admin' WHERE email = 'admin@emailshield.com';
-- ============================================================
