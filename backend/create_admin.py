import os
import sys
from dotenv import load_dotenv
from supabase import create_client

def create_admin_account(email, password, full_name):
    load_dotenv()
    
    url = os.getenv("SUPABASE_URL")
    # CRITICAL: Must use SERVICE_ROLE_KEY to create users directly without email confirmation
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not url or not key:
        print("[ERROR] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing in .env")
        return

    supabase = create_client(url, key)
    
    print(f"--- Creating Admin Account: {email} ---")
    
    try:
        # Create user via Admin API
        res = supabase.auth.admin.create_user({
            "email": email,
            "password": password,
            "user_metadata": {
                "full_name": full_name,
                "role": "admin"
            },
            "email_confirm": True # Auto-confirm email
        })
        
        if res.user:
            print(f"[SUCCESS] Admin user created with ID: {res.user.id}")
            print("The database triggers should have automatically added the record to public.Users and public.Admin.")
        else:
            print(f"[FAIL] Could not create user: {res}")
            
    except Exception as e:
        print(f"[ERROR] {e}")

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python create_admin.py <email> <password> <full_name>")
        print("Example: python create_admin.py admin@cogni.com password123 'Admin User'")
    else:
        create_admin_account(sys.argv[1], sys.argv[2], sys.argv[3])
