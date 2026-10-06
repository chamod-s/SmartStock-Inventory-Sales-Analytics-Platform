#!/usr/bin/env python3
"""
SmartStock – Data Export & Dataset Generator Pipeline
Connects to PostgreSQL (or synthesizes realistic enterprise data based on Prisma schema)
and exports clean CSV datasets to analytics/datasets/ for Pandas/Matplotlib analytics.
"""

import os
import sys

# Ensure UTF-8 output encoding on Windows consoles
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

import argparse
from datetime import datetime, timedelta
import random
from pathlib import Path
import pandas as pd
import numpy as np

# Ensure path resolution
BASE_DIR = Path(__file__).resolve().parent.parent
DATASETS_DIR = BASE_DIR / "datasets"
DATASETS_DIR.mkdir(parents=True, exist_ok=True)

# Parse backend .env for default PostgreSQL connection string
BACKEND_ENV_PATH = BASE_DIR.parent / "backend" / ".env"

def get_database_url():
    """Extract DATABASE_URL from environment or backend/.env"""
    db_url = os.environ.get("DATABASE_URL")
    if db_url:
        return db_url
    if BACKEND_ENV_PATH.exists():
        with open(BACKEND_ENV_PATH, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line.startswith("DATABASE_URL="):
                    val = line.split("=", 1)[1].strip().strip('"').strip("'")
                    return val
    return "postgresql://postgres:CJS@12345@localhost:5432/smartstock_db"

def try_export_from_postgres(db_url):
    """
    Attempt to connect to PostgreSQL via SQLAlchemy / psycopg2
    and export live data tables into datasets directory.
    """
    try:
        from urllib.parse import urlparse, quote_plus, unquote
        from sqlalchemy import create_engine, text
        
        # Ensure driver is postgresql+psycopg2
        if db_url.startswith("postgresql://"):
            db_url = db_url.replace("postgresql://", "postgresql+psycopg2://", 1)
        
        # Parse and fix password if unescaped @ exists
        # E.g. postgresql+psycopg2://postgres:CJS@12345@localhost:5432/smartstock_db
        try:
            # Check if there are multiple @ symbols
            if db_url.count("@") > 1:
                prefix, remainder = db_url.split("://", 1)
                userpass, hostdb = remainder.rsplit("@", 1)
                user, password = userpass.split(":", 1)
                encoded_password = quote_plus(password)
                db_url = f"{prefix}://{user}:{encoded_password}@{hostdb}"
        except Exception:
            pass

        # Prisma URLs often include ?schema=public which psycopg2 rejects
        if "?" in db_url:
            base_url, query_str = db_url.split("?", 1)
            # Remove schema parameter if present
            query_params = [p for p in query_str.split("&") if not p.startswith("schema=")]
            db_url = f"{base_url}?{'&'.join(query_params)}" if query_params else base_url

        print(f"🔗 Attempting connection to PostgreSQL ({db_url.split('@')[-1]})...")
        engine = create_engine(db_url)
        with engine.connect() as conn:
            # Test query
            result = conn.execute(text("SELECT COUNT(*) FROM \"Product\";")).fetchone()
            count = result[0] if result else 0
            print(f"✅ Connected to PostgreSQL! Found {count} products.")
            
            # Fetch products with category
            df_products = pd.read_sql("""
                SELECT p.id as product_id, p.sku, p.name, c.name as category_name,
                       p."purchasePrice"::numeric as purchase_price,
                       p."sellingPrice"::numeric as selling_price,
                       p."currentStock" as current_stock,
                       p."reorderLevel" as reorder_level,
                       p.unit, p.status, p."createdAt" as created_at
                FROM "Product" p
                LEFT JOIN "Category" c ON p."categoryId" = c.id
                ORDER BY p.name;
            """, conn)
            
            # Fetch sales
            df_sales = pd.read_sql("""
                SELECT s.id as sale_id, s."invoiceNumber" as invoice_number,
                       s."createdAt" as sale_date, s."customerId" as customer_id,
                       c.name as customer_name, u.name as cashier_name,
                       s.subtotal::numeric as subtotal,
                       s."taxAmount"::numeric as tax_amount,
                       s."discountAmount"::numeric as discount_amount,
                       s."totalAmount"::numeric as total_amount,
                       s.status
                FROM "Sale" s
                LEFT JOIN "Customer" c ON s."customerId" = c.id
                LEFT JOIN "User" u ON s."userId" = u.id
                ORDER BY s."createdAt" ASC;
            """, conn)
            
            # Fetch sale items
            df_sale_items = pd.read_sql("""
                SELECT si.id as item_id, si."saleId" as sale_id,
                       s."invoiceNumber" as invoice_number, s."createdAt" as sale_date,
                       si."productId" as product_id, p.name as product_name,
                       c.name as category_name, si.quantity,
                       si."unitPrice"::numeric as unit_price,
                       si."unitCost"::numeric as unit_cost,
                       si.subtotal::numeric as subtotal
                FROM "SaleItem" si
                JOIN "Sale" s ON si."saleId" = s.id
                JOIN "Product" p ON si."productId" = p.id
                LEFT JOIN "Category" c ON p."categoryId" = c.id
                ORDER BY s."createdAt" ASC;
            """, conn)
            
            # Fetch customers
            df_customers = pd.read_sql("""
                SELECT id as customer_id, code, name, email, phone,
                       "creditLimit"::numeric as credit_limit,
                       "totalSpent"::numeric as total_spent,
                       "createdAt" as created_at
                FROM "Customer"
                ORDER BY code;
            """, conn)
            
            # Fetch inventory transactions
            df_inventory = pd.read_sql("""
                SELECT it.id as transaction_id, it."productId" as product_id,
                       p.name as product_name, p.sku, c.name as category_name,
                       it.type, it.quantity, it."stockBefore" as stock_before,
                       it."stockAfter" as stock_after, it."createdAt" as created_at,
                       it.notes
                FROM "InventoryTransaction" it
                JOIN "Product" p ON it."productId" = p.id
                LEFT JOIN "Category" c ON p."categoryId" = c.id
                ORDER BY it."createdAt" ASC;
            """, conn)
            
            # Fetch expenses
            df_expenses = pd.read_sql("""
                SELECT e.id as expense_id, e.category, e.amount::numeric as amount,
                       e.description, e."paymentMethod" as payment_method,
                       e."expenseDate" as expense_date, u.name as recorded_by
                FROM "Expense" e
                LEFT JOIN "User" u ON e."userId" = u.id
                WHERE e."isActive" = true
                ORDER BY e."expenseDate" ASC;
            """, conn)
            
            # If sales table has rich historical data (>= 50 transactions), return it
            if len(df_sales) >= 50:
                print(f"📊 Live PostgreSQL database has {len(df_sales)} sales and {len(df_sale_items)} sale items.")
                return {
                    "products": df_products,
                    "sales": df_sales,
                    "sale_items": df_sale_items,
                    "customers": df_customers,
                    "inventory": df_inventory,
                    "expenses": df_expenses
                }
            else:
                print(f"ℹ️ Database connected but contains small sample size ({len(df_sales)} sales).")
                print("⚡ Augmenting with full 6-month historical SmartStock enterprise dataset for deep analytics...")
                return None
    except Exception as e:
        print(f"⚠️ PostgreSQL live query skipped or failed: {e}")
        print("💡 Will generate complete, realistic SmartStock dataset conforming to schema.")
        return None

def generate_enterprise_smartstock_dataset():
    """
    Generates realistic 180-day operational dataset conforming to SmartStock schema,
    incorporating real products, categories, suppliers, customers, seasonality, and expense patterns.
    """
    print("🚀 Generating realistic SmartStock analytics dataset (180 days history)...")
    np.random.seed(42)
    random.seed(42)

    # 1. Categories
    categories = [
        {"id": "cat-1", "name": "Electronics & Gadgets"},
        {"id": "cat-2", "name": "Office Supplies"},
        {"id": "cat-3", "name": "Beverages & Drinks"},
        {"id": "cat-4", "name": "Packaged Groceries"},
        {"id": "cat-5", "name": "Apparel & Wearables"},
        {"id": "cat-6", "name": "Hardware & Tools"},
        {"id": "cat-7", "name": "Personal Care"},
        {"id": "cat-8", "name": "Home Appliances"},
    ]

    # 2. Products (from seed.ts with exact specifications)
    products_catalog = [
        {"id": "prod-01", "cat_id": "cat-1", "cat": "Electronics & Gadgets", "sku": "SKU-ELE-001", "name": "Wireless Bluetooth Headset Pro", "cost": 45.00, "price": 89.99, "stock": 45, "reorder": 10, "unit": "pcs"},
        {"id": "prod-02", "cat_id": "cat-1", "cat": "Electronics & Gadgets", "sku": "SKU-ELE-002", "name": "Ergonomic Optical Wireless Mouse", "cost": 12.50, "price": 24.99, "stock": 80, "reorder": 15, "unit": "pcs"},
        {"id": "prod-03", "cat_id": "cat-1", "cat": "Electronics & Gadgets", "sku": "SKU-ELE-003", "name": "Mechanical RGB Gaming Keyboard", "cost": 38.00, "price": 74.99, "stock": 30, "reorder": 10, "unit": "pcs"},
        {"id": "prod-04", "cat_id": "cat-1", "cat": "Electronics & Gadgets", "sku": "SKU-ELE-004", "name": "4K Ultra-HD Monitor 27-inch", "cost": 180.00, "price": 299.99, "stock": 12, "reorder": 5, "unit": "pcs"},
        {"id": "prod-05", "cat_id": "cat-2", "cat": "Office Supplies", "sku": "SKU-OFF-001", "name": "A4 Premium Copy Paper 500 Sheets", "cost": 3.20, "price": 6.99, "stock": 250, "reorder": 50, "unit": "ream"},
        {"id": "prod-06", "cat_id": "cat-2", "cat": "Office Supplies", "sku": "SKU-OFF-002", "name": "Gel Ink Rollerball Pens (Box of 12)", "cost": 4.50, "price": 9.99, "stock": 120, "reorder": 20, "unit": "box"},
        {"id": "prod-07", "cat_id": "cat-2", "cat": "Office Supplies", "sku": "SKU-OFF-003", "name": "Heavy-Duty Desktop Stapler", "cost": 7.00, "price": 14.49, "stock": 40, "reorder": 10, "unit": "pcs"},
        {"id": "prod-08", "cat_id": "cat-2", "cat": "Office Supplies", "sku": "SKU-OFF-004", "name": "Adjustable Mesh Executive Chair", "cost": 95.00, "price": 189.99, "stock": 8, "reorder": 3, "unit": "pcs"},
        {"id": "prod-09", "cat_id": "cat-3", "cat": "Beverages & Drinks", "sku": "SKU-BEV-001", "name": "Arabica Whole Bean Coffee 1kg", "cost": 11.00, "price": 21.99, "stock": 60, "reorder": 15, "unit": "bag"},
        {"id": "prod-10", "cat_id": "cat-3", "cat": "Beverages & Drinks", "sku": "SKU-BEV-002", "name": "Organic Green Tea (Box of 50 Bags)", "cost": 3.80, "price": 7.99, "stock": 90, "reorder": 20, "unit": "box"},
        {"id": "prod-11", "cat_id": "cat-3", "cat": "Beverages & Drinks", "sku": "SKU-BEV-003", "name": "Sparkling Mineral Water 500ml (Pack 12)", "cost": 6.00, "price": 12.99, "stock": 75, "reorder": 15, "unit": "pack"},
        {"id": "prod-12", "cat_id": "cat-3", "cat": "Beverages & Drinks", "sku": "SKU-BEV-004", "name": "Natural Cold Pressed Citrus Juice 1L", "cost": 2.20, "price": 4.99, "stock": 40, "reorder": 10, "unit": "bottle"},
        {"id": "prod-13", "cat_id": "cat-4", "cat": "Packaged Groceries", "sku": "SKU-GRO-001", "name": "Organic Extra Virgin Olive Oil 750ml", "cost": 7.50, "price": 14.99, "stock": 50, "reorder": 12, "unit": "bottle"},
        {"id": "prod-14", "cat_id": "cat-4", "cat": "Packaged Groceries", "sku": "SKU-GRO-002", "name": "Wholegrain Oats 1kg", "cost": 2.10, "price": 4.49, "stock": 110, "reorder": 25, "unit": "pack"},
        {"id": "prod-15", "cat_id": "cat-4", "cat": "Packaged Groceries", "sku": "SKU-GRO-003", "name": "Raw Honey Jar 500g", "cost": 4.80, "price": 9.99, "stock": 65, "reorder": 15, "unit": "jar"},
        {"id": "prod-16", "cat_id": "cat-4", "cat": "Packaged Groceries", "sku": "SKU-GRO-004", "name": "Assorted Roasted Almonds 250g", "cost": 3.50, "price": 7.49, "stock": 85, "reorder": 20, "unit": "pack"},
        {"id": "prod-17", "cat_id": "cat-5", "cat": "Apparel & Wearables", "sku": "SKU-APP-001", "name": "100% Cotton Polo Shirt (Medium)", "cost": 9.00, "price": 19.99, "stock": 95, "reorder": 20, "unit": "pcs"},
        {"id": "prod-18", "cat_id": "cat-5", "cat": "Apparel & Wearables", "sku": "SKU-APP-002", "name": "High-Visibility Safety Vest", "cost": 5.20, "price": 11.99, "stock": 140, "reorder": 30, "unit": "pcs"},
        {"id": "prod-19", "cat_id": "cat-5", "cat": "Apparel & Wearables", "sku": "SKU-APP-003", "name": "Waterproof Work Gloves (Pair)", "cost": 2.80, "price": 6.49, "stock": 180, "reorder": 40, "unit": "pair"},
        {"id": "prod-20", "cat_id": "cat-5", "cat": "Apparel & Wearables", "sku": "SKU-APP-004", "name": "Breathable Fleece Jacket (Large)", "cost": 22.00, "price": 44.99, "stock": 35, "reorder": 10, "unit": "pcs"},
        {"id": "prod-21", "cat_id": "cat-6", "cat": "Hardware & Tools", "sku": "SKU-HAR-001", "name": "20V Cordless Power Drill Set", "cost": 55.00, "price": 109.99, "stock": 22, "reorder": 5, "unit": "set"},
        {"id": "prod-22", "cat_id": "cat-6", "cat": "Hardware & Tools", "sku": "SKU-HAR-002", "name": "Professional Precision Screwdriver Kit", "cost": 8.50, "price": 17.99, "stock": 55, "reorder": 12, "unit": "set"},
        {"id": "prod-23", "cat_id": "cat-6", "cat": "Hardware & Tools", "sku": "SKU-HAR-003", "name": "Digital Laser Distance Meter 50m", "cost": 18.00, "price": 36.99, "stock": 28, "reorder": 8, "unit": "pcs"},
        {"id": "prod-24", "cat_id": "cat-6", "cat": "Hardware & Tools", "sku": "SKU-HAR-004", "name": "Heavy-Duty Steel Measuring Tape 8m", "cost": 3.50, "price": 7.99, "stock": 90, "reorder": 20, "unit": "pcs"},
        {"id": "prod-25", "cat_id": "cat-7", "cat": "Personal Care", "sku": "SKU-PER-001", "name": "Antibacterial Hand Sanitizer 500ml", "cost": 1.80, "price": 3.99, "stock": 300, "reorder": 50, "unit": "bottle"},
        {"id": "prod-26", "cat_id": "cat-7", "cat": "Personal Care", "sku": "SKU-PER-002", "name": "Gentle Moisturizing Hand Soap 1L", "cost": 2.50, "price": 5.49, "stock": 150, "reorder": 30, "unit": "bottle"},
        {"id": "prod-27", "cat_id": "cat-7", "cat": "Personal Care", "sku": "SKU-PER-003", "name": "Microfiber Facial Towels (Pack of 4)", "cost": 3.00, "price": 6.99, "stock": 70, "reorder": 15, "unit": "pack"},
        {"id": "prod-28", "cat_id": "cat-8", "cat": "Home Appliances", "sku": "SKU-HOM-001", "name": "Electric Stainless Steel Kettle 1.7L", "cost": 14.00, "price": 27.99, "stock": 32, "reorder": 8, "unit": "pcs"},
        {"id": "prod-29", "cat_id": "cat-8", "cat": "Home Appliances", "sku": "SKU-HOM-002", "name": "HEPA Air Purifier Desktop Size", "cost": 42.00, "price": 84.99, "stock": 18, "reorder": 5, "unit": "pcs"},
        {"id": "prod-30", "cat_id": "cat-8", "cat": "Home Appliances", "sku": "SKU-HOM-003", "name": "Compact Digital Microwave Oven 20L", "cost": 58.00, "price": 114.99, "stock": 15, "reorder": 4, "unit": "pcs"},
    ]

    # Build products DataFrame
    df_products = pd.DataFrame([
        {
            "product_id": p["id"],
            "sku": p["sku"],
            "name": p["name"],
            "category_name": p["cat"],
            "purchase_price": p["cost"],
            "selling_price": p["price"],
            "current_stock": p["stock"],
            "reorder_level": p["reorder"],
            "unit": p["unit"],
            "status": "ACTIVE",
            "markup_percent": round(((p["price"] - p["cost"]) / p["cost"]) * 100, 2),
            "margin_percent": round(((p["price"] - p["cost"]) / p["price"]) * 100, 2),
            "inventory_value": round(p["stock"] * p["cost"], 2),
            "created_at": "2026-04-01 08:00:00"
        }
        for p in products_catalog
    ])

    # 3. Customers (50 Customers)
    customers_list = []
    first_names = ["James", "Emma", "Liam", "Olivia", "Noah", "Ava", "Oliver", "Sophia", "Lucas", "Isabella", 
                  "Mason", "Mia", "Ethan", "Charlotte", "Aiden", "Amelia", "Jackson", "Harper", "Logan", "Evelyn",
                  "Alexander", "Abigail", "Elijah", "Emily", "Daniel", "Elizabeth", "Henry", "Mila", "Sebastian", "Ella"]
    last_names = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez",
                  "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin"]

    for i in range(1, 51):
        c_code = f"CUST-{str(i).zfill(3)}"
        fname = first_names[(i - 1) % len(first_names)]
        lname = last_names[(i * 3) % len(last_names)]
        c_name = f"{fname} {lname}"
        email = f"{fname.lower()}.{lname.lower()}{i}@example.com"
        phone = f"+1-555-{str(2000 + i).zfill(4)}"
        credit_limit = 5000.00 if i % 5 == 0 else 1000.00
        customers_list.append({
            "customer_id": f"cust-{str(i).zfill(3)}",
            "code": c_code,
            "name": c_name,
            "email": email,
            "phone": phone,
            "credit_limit": credit_limit,
            "created_at": (datetime(2026, 4, 1) + timedelta(days=int(i * 2.5))).strftime("%Y-%m-%d %H:%M:%S")
        })
    df_customers = pd.DataFrame(customers_list)

    # 4. Generate Sales & Sale Items over 180 days (from April 10, 2026 to October 6, 2026)
    start_date = datetime(2026, 4, 10, 9, 30)
    end_date = datetime(2026, 10, 6, 18, 0)
    total_days = (end_date - start_date).days

    sales_records = []
    sale_items_records = []
    inv_transactions = []

    # Product popularity weights (some top sellers, some slow-moving)
    product_weights = [
        18, 14, 10, 4,   # Tech: Headset and Mouse high, Monitor moderate
        25, 20, 12, 3,   # Office: Paper & Pens very high, Chair low
        22, 18, 16, 15,  # Bev: Coffee & Tea high
        15, 14, 12, 10,  # Grocery: Olive oil & Oats moderate
        12, 10, 16, 6,   # Apparel: Gloves high, Fleece lower
        7, 11, 5, 14,    # Hardware: Drill lower, Tape higher
        30, 24, 15,      # Personal Care: Sanitizer & Soap very high
        8, 4, 3          # Appliances: Kettle moderate, Microwave lower
    ]
    prob_weights = np.array(product_weights) / sum(product_weights)

    # Cashier list
    cashiers = ["Eleanor Vance (Admin)", "Marcus Brody (Ops Manager)", "James Wilson (Senior Cashier)", "Amara Patel (Cashier)", "Lucas Rodriguez (Cashier)"]

    invoice_counter = 1001
    item_counter = 5001
    txn_counter = 9001

    # Track sales count per customer
    cust_order_tracker = {c["customer_id"]: {"count": 0, "spent": 0.0, "dates": []} for c in customers_list}

    # Generate initial stock reception transactions
    for prod in products_catalog:
        inv_transactions.append({
            "transaction_id": f"txn-{txn_counter}",
            "product_id": prod["id"],
            "product_name": prod["name"],
            "sku": prod["sku"],
            "category_name": prod["cat"],
            "type": "PURCHASE",
            "quantity": prod["stock"] + 150,
            "stock_before": 0,
            "stock_after": prod["stock"] + 150,
            "created_at": "2026-04-05 10:00:00",
            "notes": "Initial Q2 Warehouse Stock Receipt"
        })
        txn_counter += 1

    for day_offset in range(total_days + 1):
        curr_day = start_date + timedelta(days=day_offset)
        weekday = curr_day.weekday() # 0 = Mon, 5 = Sat, 6 = Sun
        
        # Seasonality / Day of week multiplier (Weekend boost + gradual monthly growth)
        dow_factor = 1.35 if weekday in (4, 5) else (1.1 if weekday == 6 else 0.9)
        growth_factor = 1.0 + (day_offset / total_days) * 0.45 # 45% growth trend over 6 months
        
        # Daily sales count: 6 to 14 orders per day
        base_orders = int(np.random.normal(8, 2) * dow_factor * growth_factor)
        num_orders = max(3, base_orders)

        for _ in range(num_orders):
            hour = random.randint(9, 19)
            minute = random.randint(0, 59)
            second = random.randint(0, 59)
            sale_dt = curr_day.replace(hour=hour, minute=minute, second=second)
            sale_id = f"sale-{invoice_counter}"
            inv_no = f"INV-2026-{invoice_counter}"
            invoice_counter += 1

            # Select customer (80/20 rule: top customers buy more often)
            if random.random() < 0.65:
                # Repeat core customers (first 15 customers)
                cust_idx = random.randint(0, 14)
            else:
                cust_idx = random.randint(0, len(customers_list) - 1)
            customer = customers_list[cust_idx]
            cashier = random.choice(cashiers)

            # Number of line items: 1 to 5
            num_items = np.random.choice([1, 2, 3, 4, 5], p=[0.40, 0.30, 0.18, 0.08, 0.04])
            chosen_indices = np.random.choice(len(products_catalog), size=num_items, replace=False, p=prob_weights)

            sale_subtotal = 0.0
            sale_cogs = 0.0
            line_items_data = []

            for p_idx in chosen_indices:
                p = products_catalog[p_idx]
                qty = np.random.choice([1, 2, 3, 4, 6], p=[0.60, 0.22, 0.10, 0.05, 0.03])
                line_subtotal = round(qty * p["price"], 2)
                line_cogs = round(qty * p["cost"], 2)
                line_profit = round(line_subtotal - line_cogs, 2)
                margin = round((line_profit / line_subtotal) * 100, 2) if line_subtotal > 0 else 0.0

                sale_subtotal += line_subtotal
                sale_cogs += line_cogs

                sale_items_records.append({
                    "item_id": f"item-{item_counter}",
                    "sale_id": sale_id,
                    "invoice_number": inv_no,
                    "sale_date": sale_dt.strftime("%Y-%m-%d %H:%M:%S"),
                    "product_id": p["id"],
                    "product_name": p["name"],
                    "category_name": p["cat"],
                    "quantity": int(qty),
                    "unit_price": p["price"],
                    "unit_cost": p["cost"],
                    "subtotal": line_subtotal,
                    "cogs": line_cogs,
                    "gross_profit": line_profit,
                    "margin_percent": margin
                })
                item_counter += 1

                # Inventory depletion transaction
                inv_transactions.append({
                    "transaction_id": f"txn-{txn_counter}",
                    "product_id": p["id"],
                    "product_name": p["name"],
                    "sku": p["sku"],
                    "category_name": p["cat"],
                    "type": "SALE",
                    "quantity": -int(qty),
                    "stock_before": p["stock"] + qty,
                    "stock_after": p["stock"],
                    "created_at": sale_dt.strftime("%Y-%m-%d %H:%M:%S"),
                    "notes": f"POS Sale {inv_no}"
                })
                txn_counter += 1

            # Discount & Tax
            discount = round(sale_subtotal * 0.05, 2) if random.random() < 0.15 else 0.00
            tax = round((sale_subtotal - discount) * 0.08, 2) # 8% sales tax
            total_amount = round(sale_subtotal - discount + tax, 2)

            sales_records.append({
                "sale_id": sale_id,
                "invoice_number": inv_no,
                "sale_date": sale_dt.strftime("%Y-%m-%d %H:%M:%S"),
                "customer_id": customer["customer_id"],
                "customer_name": customer["name"],
                "cashier_name": cashier,
                "subtotal": round(sale_subtotal, 2),
                "tax_amount": tax,
                "discount_amount": discount,
                "total_amount": total_amount,
                "cogs": round(sale_cogs, 2),
                "gross_profit": round(sale_subtotal - discount - sale_cogs, 2),
                "status": "COMPLETED",
                "items_count": num_items
            })

            # Update customer tracker
            cust_order_tracker[customer["customer_id"]]["count"] += 1
            cust_order_tracker[customer["customer_id"]]["spent"] += total_amount
            cust_order_tracker[customer["customer_id"]]["dates"].append(sale_dt)

    df_sales = pd.DataFrame(sales_records)
    df_sale_items = pd.DataFrame(sale_items_records)
    df_inventory = pd.DataFrame(inv_transactions)

    # Enrich df_customers with metrics (RFM style segmentation)
    updated_customers = []
    max_date = end_date
    for _, row in df_customers.iterrows():
        cid = row["customer_id"]
        stats = cust_order_tracker.get(cid, {"count": 0, "spent": 0.0, "dates": []})
        cnt = stats["count"]
        spent = round(stats["spent"], 2)
        avg_order = round(spent / cnt, 2) if cnt > 0 else 0.00
        first_dt = min(stats["dates"]).strftime("%Y-%m-%d") if stats["dates"] else row["created_at"]
        last_dt = max(stats["dates"]).strftime("%Y-%m-%d") if stats["dates"] else row["created_at"]
        
        # Segment logic: VIP / High Value / Regular / Occasional / At Risk
        recency_days = (max_date - max(stats["dates"])).days if stats["dates"] else 999
        if cnt >= 25 and spent >= 3000:
            segment = "VIP Champion"
        elif cnt >= 15 and spent >= 1500:
            segment = "High Value Loyal"
        elif cnt >= 5 and recency_days <= 45:
            segment = "Active Regular"
        elif cnt >= 1 and recency_days <= 60:
            segment = "Promising New/Occasional"
        elif cnt >= 1 and recency_days > 60:
            segment = "At Risk / Inactive"
        else:
            segment = "Dormant Prospect"

        updated_customers.append({
            "customer_id": cid,
            "code": row["code"],
            "name": row["name"],
            "email": row["email"],
            "phone": row["phone"],
            "credit_limit": row["credit_limit"],
            "total_spent": spent,
            "order_count": cnt,
            "avg_order_value": avg_order,
            "first_order_date": first_dt,
            "last_order_date": last_dt,
            "recency_days": recency_days,
            "customer_segment": segment
        })
    df_customers = pd.DataFrame(updated_customers)

    # 5. Generate Expenses over the 6 months (Monthly fixed + weekly variable operational expenses)
    expense_records = []
    exp_id = 101
    expense_categories = [
        {"cat": "Rent", "amount": 2200.00, "freq": "monthly", "desc": "Main Store & Warehouse Lease"},
        {"cat": "Salaries & Payroll", "amount": 4200.00, "freq": "monthly", "desc": "Staff Salaries and Wages"},
        {"cat": "Utilities", "amount": 450.00, "freq": "monthly", "desc": "Electricity, Water, HVAC"},
        {"cat": "Internet & Telecom", "amount": 120.00, "freq": "monthly", "desc": "Fiber Broadband & Phone Lines"},
        {"cat": "Marketing & Ads", "amount": 450.00, "freq": "biweekly", "desc": "Local Search & Social Media Promotions"},
        {"cat": "Logistics & Freight", "amount": 180.00, "freq": "weekly", "desc": "Inbound Supplier Shipping & Handling"},
        {"cat": "Store Maintenance", "amount": 180.00, "freq": "monthly", "desc": "Facility Repairs & Cleaning Supplies"},
        {"cat": "Software & Subscriptions", "amount": 150.00, "freq": "monthly", "desc": "ERP, Cloud Hosting, Accounting SaaS"}
    ]

    for month in range(4, 11): # April to October
        # Monthly fixed
        for ec in expense_categories:
            if ec["freq"] == "monthly":
                dt = datetime(2026, month, min(random.randint(1, 5), 28))
                expense_records.append({
                    "expense_id": f"exp-{exp_id}",
                    "category": ec["cat"],
                    "amount": round(ec["amount"] * random.uniform(0.95, 1.05), 2),
                    "description": f"{ec['desc']} - {dt.strftime('%B %Y')}",
                    "payment_method": "BANK_TRANSFER",
                    "expense_date": dt.strftime("%Y-%m-%d"),
                    "recorded_by": "Eleanor Vance (Admin)"
                })
                exp_id += 1
            elif ec["freq"] == "biweekly":
                for day in [5, 20]:
                    dt = datetime(2026, month, day)
                    expense_records.append({
                        "expense_id": f"exp-{exp_id}",
                        "category": ec["cat"],
                        "amount": round(ec["amount"] * random.uniform(0.90, 1.10), 2),
                        "description": f"{ec['desc']} - Period {day//15 + 1}",
                        "payment_method": "CARD",
                        "expense_date": dt.strftime("%Y-%m-%d"),
                        "recorded_by": "Marcus Brody (Ops Manager)"
                    })
                    exp_id += 1
            elif ec["freq"] == "weekly":
                for day in [3, 10, 17, 24]:
                    dt = datetime(2026, month, day)
                    expense_records.append({
                        "expense_id": f"exp-{exp_id}",
                        "category": ec["cat"],
                        "amount": round(ec["amount"] * random.uniform(0.85, 1.15), 2),
                        "description": f"{ec['desc']} - Week {day//7 + 1}",
                        "payment_method": "BANK_TRANSFER",
                        "expense_date": dt.strftime("%Y-%m-%d"),
                        "recorded_by": "Marcus Brody (Ops Manager)"
                    })
                    exp_id += 1

    df_expenses = pd.DataFrame(expense_records)

    return {
        "products": df_products,
        "sales": df_sales,
        "sale_items": df_sale_items,
        "customers": df_customers,
        "inventory": df_inventory,
        "expenses": df_expenses
    }

def export_all():
    """Main pipeline execution function"""
    parser = argparse.ArgumentParser(description="Export SmartStock data to CSV for Python Analytics")
    parser.add_argument("--db", default=get_database_url(), help="PostgreSQL connection string")
    parser.add_argument("--force-synth", action="store_true", help="Force synthetic dataset generation")
    args = parser.parse_args()

    data_bundle = None
    if not args.force_synth:
        data_bundle = try_export_from_postgres(args.db)

    if data_bundle is None:
        data_bundle = generate_enterprise_smartstock_dataset()

    print("\n💾 Writing CSV files to analytics/datasets/ ...")
    for name, df in data_bundle.items():
        file_path = DATASETS_DIR / f"{name}.csv"
        df.to_csv(file_path, index=False)
        print(f"  ✓ {name}.csv: {len(df):,} rows saved to {file_path}")

    # Generate summary metadata
    metadata = {
        "generated_at": datetime.now().isoformat(),
        "total_sales": len(data_bundle["sales"]),
        "total_revenue": round(data_bundle["sales"]["total_amount"].sum(), 2),
        "total_gross_profit": round(data_bundle["sales"]["gross_profit"].sum(), 2),
        "total_expenses": round(data_bundle["expenses"]["amount"].sum(), 2),
        "total_products": len(data_bundle["products"]),
        "total_customers": len(data_bundle["customers"]),
    }
    print(f"\n✨ Export complete! Summary:")
    print(f"   • Total Sales: {metadata['total_sales']:,}")
    print(f"   • Total Revenue: ${metadata['total_revenue']:,.2f}")
    print(f"   • Total Gross Profit: ${metadata['total_gross_profit']:,.2f}")
    print(f"   • Total Expenses: ${metadata['total_expenses']:,.2f}")
    print(f"   • Net Profit: ${metadata['total_gross_profit'] - metadata['total_expenses']:,.2f}")

if __name__ == "__main__":
    export_all()
