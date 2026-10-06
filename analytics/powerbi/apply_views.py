#!/usr/bin/env python3
"""
Executes analytics/powerbi/powerbi_views.sql against local PostgreSQL database
"""

import sys
import os

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

from pathlib import Path
import psycopg2

BASE_DIR = Path(__file__).resolve().parent.parent.parent
SQL_PATH = BASE_DIR / "analytics" / "powerbi" / "powerbi_views.sql"

def main():
    print(f"Executing SQL views from {SQL_PATH.name}...")
    try:
        conn = psycopg2.connect(
            dbname="smartstock_db",
            user="postgres",
            password="CJS@12345",
            host="localhost",
            port=5432
        )
        conn.autocommit = True
        with conn.cursor() as cursor:
            sql_content = SQL_PATH.read_text(encoding="utf-8")
            cursor.execute(sql_content)
            print("✓ Successfully created 8 analytical views in PostgreSQL!")
            
            # Verify views exist
            cursor.execute("""
                SELECT table_name 
                FROM information_schema.views 
                WHERE table_schema = 'public' AND table_name LIKE 'view_%'
                ORDER BY table_name;
            """)
            views = cursor.fetchall()
            print("Discovered views in PostgreSQL:")
            for v in views:
                print(f"  • {v[0]}")
        conn.close()
    except Exception as e:
        print(f"Error executing views: {e}")

if __name__ == "__main__":
    main()
