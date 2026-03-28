-- Database Schema for Cogni AI
-- This schema aligns with the system requirement and design report with 6 main tables.

-- 1. Users table (Public profile linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS public.Users (
    userId UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT,
    roles TEXT NOT NULL CHECK (roles IN ('student', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on Users
ALTER TABLE public.Users ENABLE ROW LEVEL SECURITY;

-- 2. Student table
CREATE TABLE IF NOT EXISTS public.Student (
    studentId UUID PRIMARY KEY REFERENCES public.Users(userId) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on Student
ALTER TABLE public.Student ENABLE ROW LEVEL SECURITY;

-- 3. Admin table
CREATE TABLE IF NOT EXISTS public.Admin (
    adminId UUID PRIMARY KEY REFERENCES public.Users(userId) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on Admin
ALTER TABLE public.Admin ENABLE ROW LEVEL SECURITY;

-- 4. PDFs table
CREATE TABLE IF NOT EXISTS public.PDFs (
    pdfId UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    studentId UUID NOT NULL REFERENCES public.Student(studentId) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    embedding_index TEXT, -- Reference to Pinecone namespace or index
    chunk_count INTEGER DEFAULT 0
);

-- Enable RLS on PDFs
ALTER TABLE public.PDFs ENABLE ROW LEVEL SECURITY;

-- 5. ChatHistory table
CREATE TABLE IF NOT EXISTS public.ChatHistory (
    chatId UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    studentId UUID NOT NULL REFERENCES public.Student(studentId) ON DELETE CASCADE,
    pdfId UUID REFERENCES public.PDFs(pdfId) ON DELETE CASCADE, -- Optional: link chat to a specific PDF
    chat_content JSONB NOT NULL, -- Store array of messages or current session content
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on ChatHistory
ALTER TABLE public.ChatHistory ENABLE ROW LEVEL SECURITY;

-- 6. SystemAnalytics table
CREATE TABLE IF NOT EXISTS public.SystemAnalytics (
    id INTEGER PRIMARY KEY DEFAULT 1,
    total_users INTEGER DEFAULT 0,
    total_students INTEGER DEFAULT 0,
    total_admins INTEGER DEFAULT 0,
    total_pdfs_uploaded INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT single_row CHECK (id = 1)
);

-- Initial row for SystemAnalytics
INSERT INTO public.SystemAnalytics (id, total_users, total_students, total_admins, total_pdfs_uploaded)
VALUES (1, 0, 0, 0, 0)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on SystemAnalytics
ALTER TABLE public.SystemAnalytics ENABLE ROW LEVEL SECURITY;

-- TRIGGERS & FUNCTIONS

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert into public.Users
    INSERT INTO public.Users (userId, email, full_name, roles)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name',
        COALESCE(NEW.raw_user_meta_data->>'role', 'student')
    );

    -- Insert into Student or Admin table based on role
    IF (COALESCE(NEW.raw_user_meta_data->>'role', 'student') = 'admin') THEN
        INSERT INTO public.Admin (adminId) VALUES (NEW.id);
    ELSE
        INSERT INTO public.Student (studentId) VALUES (NEW.id);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create public record on signup
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update SystemAnalytics
CREATE OR REPLACE FUNCTION public.update_system_analytics()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.SystemAnalytics
    SET 
        total_users = (SELECT count(*) FROM public.Users),
        total_students = (SELECT count(*) FROM public.Student),
        total_admins = (SELECT count(*) FROM public.Admin),
        total_pdfs_uploaded = (SELECT count(*) FROM public.PDFs),
        updated_at = now()
    WHERE id = 1;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers for SystemAnalytics updates
CREATE OR REPLACE TRIGGER update_analytics_on_user_change
    AFTER INSERT OR DELETE ON public.Users
    FOR EACH ROW EXECUTE FUNCTION public.update_system_analytics();

CREATE OR REPLACE TRIGGER update_analytics_on_pdf_change
    AFTER INSERT OR DELETE ON public.PDFs
    FOR EACH ROW EXECUTE FUNCTION public.update_system_analytics();

-- RLS POLICIES

-- Users: users can view their own profile
CREATE POLICY "Users can view own data" ON public.Users
    FOR SELECT USING (auth.uid() = userId);

-- Students: students can view their own record
CREATE POLICY "Students can view own data" ON public.Student
    FOR SELECT USING (auth.uid() = studentId);

-- Admins: admins can view their own record
CREATE POLICY "Admins can view own data" ON public.Admin
    FOR SELECT USING (auth.uid() = adminId);

-- Admins can view all Users/Students/Admins
CREATE POLICY "Admins can view all users" ON public.Users
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.Users WHERE userId = auth.uid() AND roles = 'admin')
    );

-- PDFs: students can view and insert their own PDFs
CREATE POLICY "Students can manage own PDFs" ON public.PDFs
    FOR ALL USING (auth.uid() = studentId);

-- ChatHistory: students can manage own chat history
CREATE POLICY "Students can manage own chat" ON public.ChatHistory
    FOR ALL USING (auth.uid() = studentId);

-- SystemAnalytics: only admins can view
CREATE POLICY "Admins can view analytics" ON public.SystemAnalytics
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.Users WHERE userId = auth.uid() AND roles = 'admin')
    );
