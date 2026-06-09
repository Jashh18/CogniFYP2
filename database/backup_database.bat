@echo off
REM CogniFYP2 Database Manual Backup Script
REM This script uses PostgreSQL's pg_dump to securely export your Supabase database schema and data.
REM Replace the DATABASE_URL with your Supabase Transaction pooling connection string found in Project Settings -> Database.

echo ----------------------------------------
echo Starting CogniFYP2 Database Backup...
echo ----------------------------------------

REM Get current date in YYYY-MM-DD format for the filename
for /f "tokens=2-4 delims=/ " %%a in ('date /t') do (set mydate=%%c-%%a-%%b)
set BACKUP_FILE=cogni_backup_%mydate%.sql

REM Note: You need to have PostgreSQL tools installed on your PC (pg_dump) to run this,
REM OR you can use the Supabase CLI: "npx supabase db dump -f %BACKUP_FILE%" if you have it linked.

REM Example pg_dump command (Uncomment and add your actual password/URL):
 pg_dump "postgresql://postgres:[Tejashree@1804]@db.nuizpzwmhlgczzhcsvmk.supabase.co:5432/postgres" -f %BACKUP_FILE%

echo Backup command executed (Note: Ensure your connection string is configured in this file).
echo Backup saved to: %BACKUP_FILE%
echo ----------------------------------------
pause
