#!/usr/bin/env python3
"""
SmartStock Notebook Generator
Constructs standard Jupyter Notebook v4 JSON files for all 5 analytics modules:
1. sales_analysis.ipynb
2. product_analysis.ipynb
3. customer_analysis.ipynb
4. inventory_analysis.ipynb
5. profit_analysis.ipynb
"""

import os
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

import json
from pathlib import Path

NOTEBOOKS_DIR = Path(__file__).resolve().parent.parent / "notebooks"
NOTEBOOKS_DIR.mkdir(parents=True, exist_ok=True)

def create_notebook(cells):
    return {
        "cells": cells,
        "metadata": {
            "kernelspec": {
                "display_name": "Python 3 (ipykernel)",
                "language": "python",
                "name": "python3"
            },
            "language_info": {
                "codemirror_mode": {"name": "ipython", "version": 3},
                "file_extension": ".py",
                "mimetype": "text/x-python",
                "name": "python",
                "nbconvert_exporter": "python",
                "pygments_lexer": "ipython3",
                "version": "3.13.0"
            }
        },
        "nbformat": 4,
        "nbformat_minor": 5
    }

def md_cell(source_lines):
    if isinstance(source_lines, str):
        source_lines = [line + "\n" for line in source_lines.strip().split("\n")]
    elif isinstance(source_lines, list):
        source_lines = [l if l.endswith("\n") else l + "\n" for l in source_lines]
    return {
        "cell_type": "markdown",
        "metadata": {},
        "source": source_lines
    }

def code_cell(source_lines):
    if isinstance(source_lines, str):
        source_lines = [line + "\n" for line in source_lines.strip().split("\n")]
    elif isinstance(source_lines, list):
        source_lines = [l if l.endswith("\n") else l + "\n" for l in source_lines]
    return {
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": source_lines
    }

# ==============================================================================
# 1. SALES ANALYSIS NOTEBOOK
# ==============================================================================
def build_sales_notebook():
    cells = [
        md_cell("""# 📊 SmartStock – Sales Analytics & Trend Forecasting
### Automated Python / Pandas / Matplotlib Data Pipeline
**Objective**: Analyze daily/monthly sales volume, growth rates, category revenue contribution, and sales seasonality trends using real SmartStock transactional datasets."""),
        
        md_cell("""## 1. Environment Setup & Data Ingestion
Import analytical libraries and load exported sales records."""),
        
        code_cell("""import os
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.dates as mdates

# Set plotting aesthetics
plt.style.use('seaborn-v0_8-whitegrid' if 'seaborn-v0_8-whitegrid' in plt.style.available else 'default')
plt.rcParams['figure.figsize'] = (12, 6)
plt.rcParams['font.size'] = 11

# Define dataset paths
DATA_DIR = os.path.join('..', 'datasets')
sales_path = os.path.join(DATA_DIR, 'sales.csv')
items_path = os.path.join(DATA_DIR, 'sale_items.csv')

df_sales = pd.read_csv(sales_path)
df_items = pd.read_csv(items_path)

# Convert timestamps
df_sales['sale_date'] = pd.to_datetime(df_sales['sale_date'])
df_sales['date'] = df_sales['sale_date'].dt.date
df_sales['month'] = df_sales['sale_date'].dt.to_period('M')
df_sales['day_of_week'] = df_sales['sale_date'].dt.day_name()
df_sales['hour'] = df_sales['sale_date'].dt.hour

df_items['sale_date'] = pd.to_datetime(df_items['sale_date'])

print(f"✅ Loaded {len(df_sales):,} sales transactions and {len(df_items):,} item line records.")
df_sales.head(3)"""),

        md_cell("""## 2. Key Sales Summary Metrics
Compute foundational top-line metrics: total revenue, order count, and Average Order Value (AOV)."""),

        code_cell("""total_revenue = df_sales['total_amount'].sum()
total_orders = len(df_sales)
aov = df_sales['total_amount'].mean()
total_items_sold = df_items['quantity'].sum()

print("=" * 50)
print(f"💰 Total Sales Revenue:     ${total_revenue:,.2f}")
print(f"📦 Total Orders Placed:     {total_orders:,}")
print(f"🏷️  Average Order Value:    ${aov:,.2f}")
print(f"🛒 Total Units Sold:        {total_items_sold:,}")
print("=" * 50)"""),

        md_cell("""## 3. Daily Sales & Trend Moving Averages
Examine daily transactional patterns with 7-day and 30-day moving averages to smooth fluctuations."""),

        code_cell("""daily_sales = df_sales.groupby('date').agg(
    daily_revenue=('total_amount', 'sum'),
    order_count=('sale_id', 'count')
).reset_index()
daily_sales['date'] = pd.to_datetime(daily_sales['date'])
daily_sales['ma_7d'] = daily_sales['daily_revenue'].rolling(window=7, min_periods=1).mean()
daily_sales['ma_30d'] = daily_sales['daily_revenue'].rolling(window=30, min_periods=1).mean()

plt.figure(figsize=(14, 6))
plt.plot(daily_sales['date'], daily_sales['daily_revenue'], label='Daily Revenue', color='#3b82f6', alpha=0.45, lw=1.2)
plt.plot(daily_sales['date'], daily_sales['ma_7d'], label='7-Day Moving Avg', color='#2563eb', lw=2.2)
plt.plot(daily_sales['date'], daily_sales['ma_30d'], label='30-Day Moving Avg', color='#d97706', lw=2.5, linestyle='--')
plt.title('SmartStock Daily Revenue & Moving Averages (Trend Analysis)', fontsize=14, fontweight='bold', pad=12)
plt.xlabel('Date', fontweight='semibold')
plt.ylabel('Revenue ($)', fontweight='semibold')
plt.gca().yaxis.set_major_formatter('${x:,.0f}')
plt.legend(frameon=True, facecolor='white', framealpha=0.9)
plt.tight_layout()
plt.show()"""),

        md_cell("""## 4. Monthly Sales & Sales Growth Rates (MoM)
Calculate Month-over-Month (MoM) percentage sales growth and order velocity."""),

        code_cell("""monthly_sales = df_sales.groupby('month').agg(
    revenue=('total_amount', 'sum'),
    orders=('sale_id', 'count'),
    aov=('total_amount', 'mean')
).reset_index()

monthly_sales['mom_growth_pct'] = monthly_sales['revenue'].pct_change() * 100
monthly_sales['revenue_formatted'] = monthly_sales['revenue'].apply(lambda x: f"${x:,.2f}")
monthly_sales['growth_formatted'] = monthly_sales['mom_growth_pct'].apply(lambda x: f"{x:+.2f}%" if pd.notnull(x) else "Baseline")

display(monthly_sales[['month', 'revenue_formatted', 'orders', 'growth_formatted']])

# Plot Monthly Revenue and Growth Rate
fig, ax1 = plt.subplots(figsize=(12, 6))

x_labels = [str(m) for m in monthly_sales['month']]
bars = ax1.bar(x_labels, monthly_sales['revenue'], color='#0ea5e9', width=0.55, label='Monthly Revenue ($)', alpha=0.85)
ax1.set_ylabel('Monthly Revenue ($)', color='#0284c7', fontweight='semibold')
ax1.yaxis.set_major_formatter('${x:,.0f}')

# Overlay Growth Rate on Secondary Axis
ax2 = ax1.twinx()
ax2.plot(x_labels, monthly_sales['mom_growth_pct'], color='#ef4444', marker='o', linewidth=2.5, label='MoM Growth (%)')
ax2.set_ylabel('MoM Growth Rate (%)', color='#ef4444', fontweight='semibold')
ax2.axhline(0, color='gray', linestyle=':', alpha=0.7)

plt.title('Monthly Sales Revenue & Month-over-Month (MoM) Growth', fontsize=14, fontweight='bold', pad=12)
fig.tight_layout()
plt.show()"""),

        md_cell("""## 5. Category Performance Analysis
Break down gross sales and total item volume across product categories."""),

        code_cell("""cat_perf = df_items.groupby('category_name').agg(
    total_sales=('subtotal', 'sum'),
    units_sold=('quantity', 'sum'),
    unique_items=('product_id', 'nunique')
).reset_index().sort_values(by='total_sales', ascending=False)

cat_perf['sales_share_pct'] = (cat_perf['total_sales'] / cat_perf['total_sales'].sum()) * 100

plt.figure(figsize=(12, 6))
bars = plt.barh(cat_perf['category_name'][::-1], cat_perf['total_sales'][::-1], color='#6366f1', alpha=0.85)
plt.title('Revenue Contribution by Product Category', fontsize=14, fontweight='bold', pad=12)
plt.xlabel('Total Revenue ($)', fontweight='semibold')
plt.gca().xaxis.set_major_formatter('${x:,.0f}')

# Add value tags
for bar in bars:
    w = bar.get_width()
    plt.text(w + 500, bar.get_y() + bar.get_height()/2, f"${w:,.0f}", va='center', fontsize=9, fontweight='bold')

plt.tight_layout()
plt.show()

display(cat_perf[['category_name', 'total_sales', 'units_sold', 'sales_share_pct']])"""),

        md_cell("""## 6. Sales Trends: Day-of-Week & Hourly Heat Patterns
Determine peak store shopping hours and highest performing days of the week."""),

        code_cell("""dow_order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
dow_sales = df_sales.groupby('day_of_week')['total_amount'].agg(['sum', 'mean', 'count']).reindex(dow_order)

fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(15, 5))

# Day of week revenue
ax1.bar(dow_sales.index, dow_sales['sum'], color='#10b981', alpha=0.85)
ax1.set_title('Revenue by Day of Week', fontweight='bold')
ax1.set_ylabel('Total Revenue ($)')
ax1.yaxis.set_major_formatter('${x:,.0f}')
ax1.tick_params(axis='x', rotation=30)

# Hourly sales distribution
hourly_sales = df_sales.groupby('hour')['total_amount'].sum()
ax2.plot(hourly_sales.index, hourly_sales.values, marker='s', color='#8b5cf6', lw=2)
ax2.set_title('Hourly Sales Distribution (Store Trading Hours)', fontweight='bold')
ax2.set_xlabel('Hour of Day (24h format)')
ax2.set_ylabel('Total Revenue ($)')
ax2.yaxis.set_major_formatter('${x:,.0f}')
ax2.grid(True, linestyle='--', alpha=0.6)

plt.tight_layout()
plt.show()""")
    ]
    return create_notebook(cells)

# ==============================================================================
# 2. PRODUCT ANALYSIS NOTEBOOK
# ==============================================================================
def build_product_notebook():
    cells = [
        md_cell("""# 📦 SmartStock – Product Performance & Profitability Analysis
### Best Sellers, Slow-Moving Inventory & Product Profit Margins
**Objective**: Identify catalog champions, slow-moving SKUs, gross margin leaders, and pricing markup efficiency."""),

        md_cell("""## 1. Load Product and Sale Line Item Data"""),

        code_cell("""import os
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

plt.style.use('seaborn-v0_8-whitegrid' if 'seaborn-v0_8-whitegrid' in plt.style.available else 'default')
plt.rcParams['figure.figsize'] = (12, 6)

DATA_DIR = os.path.join('..', 'datasets')
df_products = pd.read_csv(os.path.join(DATA_DIR, 'products.csv'))
df_items = pd.read_csv(os.path.join(DATA_DIR, 'sale_items.csv'))

print(f"Loaded {len(df_products)} catalog products and {len(df_items)} line items.")
df_products.head(3)"""),

        md_cell("""## 2. Best-Selling Products (By Volume and Revenue)
Rank top 10 products driving top-line revenue and total checkout volume."""),

        code_cell("""prod_agg = df_items.groupby(['product_id', 'product_name', 'category_name']).agg(
    units_sold=('quantity', 'sum'),
    revenue_generated=('subtotal', 'sum'),
    total_cogs=('cogs', 'sum'),
    total_profit=('gross_profit', 'sum')
).reset_index()

prod_agg['gross_margin_pct'] = (prod_agg['total_profit'] / prod_agg['revenue_generated']) * 100

# Top 10 by Units Sold
top_units = prod_agg.sort_values(by='units_sold', ascending=False).head(10)

# Top 10 by Revenue
top_rev = prod_agg.sort_values(by='revenue_generated', ascending=False).head(10)

fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(16, 6))

ax1.barh(top_units['product_name'][::-1], top_units['units_sold'][::-1], color='#3b82f6')
ax1.set_title('Top 10 Best Sellers by Unit Volume', fontweight='bold', fontsize=12)
ax1.set_xlabel('Units Sold')

ax2.barh(top_rev['product_name'][::-1], top_rev['revenue_generated'][::-1], color='#10b981')
ax2.set_title('Top 10 Products by Total Revenue', fontweight='bold', fontsize=12)
ax2.set_xlabel('Revenue ($)')
ax2.xaxis.set_major_formatter('${x:,.0f}')

plt.tight_layout()
plt.show()"""),

        md_cell("""## 3. Slow-Moving Products & Velocity Analysis
Identify catalog items with the lowest sales frequency or sluggish movement relative to on-hand inventory."""),

        code_cell("""# Merge with product catalog stock levels
prod_velocity = pd.merge(df_products, prod_agg, on='product_id', how='left')
prod_velocity['units_sold'] = prod_velocity['units_sold'].fillna(0)
prod_velocity['revenue_generated'] = prod_velocity['revenue_generated'].fillna(0)

# Sort bottom products by volume
slow_movers = prod_velocity.sort_values(by='units_sold', ascending=True).head(8)

display(slow_movers[['sku', 'name', 'category_name', 'current_stock', 'units_sold', 'revenue_generated']])

plt.figure(figsize=(12, 5))
plt.barh(slow_movers['name'][::-1], slow_movers['units_sold'][::-1], color='#f97316')
plt.title('Bottom Slow-Moving SKUs (Lowest Sales Velocity)', fontweight='bold', fontsize=13)
plt.xlabel('Total Units Sold in 180 Days')
plt.tight_layout()
plt.show()"""),

        md_cell("""## 4. Product Profitability & Margin Matrix
Analyze gross profit generation vs. sales volume across categories to determine high-margin superstars vs. low-margin drivers."""),

        code_cell("""plt.figure(figsize=(12, 7))

scatter = plt.scatter(
    prod_agg['units_sold'], 
    prod_agg['gross_margin_pct'],
    s=prod_agg['revenue_generated'] / 18, 
    c=prod_agg['total_profit'], 
    cmap='viridis', 
    alpha=0.75, 
    edgecolors='black', 
    linewidth=1
)

plt.title('Product Profitability Matrix (Bubble Size = Total Revenue)', fontsize=14, fontweight='bold', pad=12)
plt.xlabel('Units Sold (Volume)', fontweight='semibold')
plt.ylabel('Gross Margin (%)', fontweight='semibold')
cbar = plt.colorbar(scatter)
cbar.set_label('Total Gross Profit ($)', fontweight='semibold')

# Annotate key products
for _, r in prod_agg.nlargest(5, 'total_profit').iterrows():
    plt.annotate(r['product_name'][:18] + '...', (r['units_sold'] + 2, r['gross_margin_pct'] + 0.3), fontsize=8.5, fontweight='bold')

plt.tight_layout()
plt.show()"""),

        md_cell("""## 5. Most vs. Least Profitable Products Table"""),

        code_cell("""top_profitable = prod_agg.sort_values(by='total_profit', ascending=False).head(5)
least_profitable = prod_agg.sort_values(by='total_profit', ascending=True).head(5)

print("🏆 Top 5 Most Profitable Products:")
display(top_profitable[['product_name', 'category_name', 'units_sold', 'revenue_generated', 'total_profit', 'gross_margin_pct']])

print("\\n⚠️ Bottom 5 Least Profitable Products:")
display(least_profitable[['product_name', 'category_name', 'units_sold', 'revenue_generated', 'total_profit', 'gross_margin_pct']])""")
    ]
    return create_notebook(cells)

# ==============================================================================
# 3. CUSTOMER ANALYSIS NOTEBOOK
# ==============================================================================
def build_customer_notebook():
    cells = [
        md_cell("""# 👥 SmartStock – Customer Analytics & Segmentation
### RFM Behavior, Spending Patterns & Repeat Customer Insights
**Objective**: Analyze customer lifetime spend, repeat purchase frequency, Average Customer Value, and RFM behavioral segmentation."""),

        md_cell("""## 1. Load Customer and Order Records"""),

        code_cell("""import os
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

plt.style.use('seaborn-v0_8-whitegrid' if 'seaborn-v0_8-whitegrid' in plt.style.available else 'default')
plt.rcParams['figure.figsize'] = (12, 6)

DATA_DIR = os.path.join('..', 'datasets')
df_customers = pd.read_csv(os.path.join(DATA_DIR, 'customers.csv'))
df_sales = pd.read_csv(os.path.join(DATA_DIR, 'sales.csv'))

print(f"Loaded {len(df_customers)} registered customers and {len(df_sales)} sales orders.")
df_customers.head(3)"""),

        md_cell("""## 2. Customer Cohort & Repeat Purchase Metrics
Calculate repeat purchase rate and distribution of single vs. multi-time buyers."""),

        code_cell("""total_customers = len(df_customers)
repeat_customers = len(df_customers[df_customers['order_count'] > 1])
single_order_customers = len(df_customers[df_customers['order_count'] == 1])
zero_order_customers = len(df_customers[df_customers['order_count'] == 0])

repeat_rate = (repeat_customers / total_customers) * 100
avg_spend_per_customer = df_customers['total_spent'].mean()

print("=" * 55)
print(f"👥 Total Registered Customers:    {total_customers}")
print(f"🔄 Repeat Buyers (>1 Order):       {repeat_customers} ({repeat_rate:.1f}%)")
print(f"1️⃣  One-Time Buyers:              {single_order_customers}")
print(f"💤 Inactive / Zero Orders:         {zero_order_customers}")
print(f"💵 Avg Spending per Customer:     ${avg_spend_per_customer:,.2f}")
print("=" * 55)"""),

        md_cell("""## 3. Top Spending Customers
Rank top customers by total historical spend and order count."""),

        code_cell("""top_spenders = df_customers.sort_values(by='total_spent', ascending=False).head(10)

plt.figure(figsize=(12, 6))
bars = plt.barh(top_spenders['name'][::-1], top_spenders['total_spent'][::-1], color='#0284c7')
plt.title('Top 10 Customers by Total Lifetime Spend', fontweight='bold', fontsize=13)
plt.xlabel('Total Spent ($)', fontweight='semibold')
plt.gca().xaxis.set_major_formatter('${x:,.0f}')

for bar in bars:
    w = bar.get_width()
    plt.text(w + 50, bar.get_y() + bar.get_height()/2, f"${w:,.2f}", va='center', fontsize=9, fontweight='bold')

plt.tight_layout()
plt.show()

display(top_spenders[['code', 'name', 'total_spent', 'order_count', 'avg_order_value', 'customer_segment']])"""),

        md_cell("""## 4. Customer Segmentation (RFM Analysis)
Break down customers into behavioral segments based on frequency, monetary value, and recency."""),

        code_cell("""segment_stats = df_customers.groupby('customer_segment').agg(
    customer_count=('customer_id', 'count'),
    total_revenue=('total_spent', 'sum'),
    avg_orders=('order_count', 'mean'),
    avg_spend=('total_spent', 'mean')
).reset_index().sort_values(by='total_revenue', ascending=False)

segment_stats['rev_share_pct'] = (segment_stats['total_revenue'] / segment_stats['total_revenue'].sum()) * 100

fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(16, 6))

# Donut chart of customer count
colors = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#64748b']
ax1.pie(segment_stats['customer_count'], labels=segment_stats['customer_segment'], autopct='%1.1f%%',
        colors=colors, startangle=140, pctdistance=0.8, wedgeprops=dict(width=0.4, edgecolor='w'))
ax1.set_title('Customer Count by Segment', fontweight='bold', fontsize=12)

# Bar chart of revenue contribution
ax2.bar(segment_stats['customer_segment'], segment_stats['total_revenue'], color=colors[:len(segment_stats)], alpha=0.85)
ax2.set_title('Revenue Contribution by Segment ($)', fontweight='bold', fontsize=12)
ax2.set_ylabel('Total Revenue ($)')
ax2.yaxis.set_major_formatter('${x:,.0f}')
ax2.tick_params(axis='x', rotation=35)

plt.tight_layout()
plt.show()

display(segment_stats)"""),

        md_cell("""## 5. Spending vs. Order Frequency Scatter Analysis"""),

        code_cell("""plt.figure(figsize=(10, 6))
plt.scatter(df_customers['order_count'], df_customers['total_spent'], color='#6366f1', s=80, alpha=0.7, edgecolors='black')
plt.title('Customer Order Frequency vs. Total Spend', fontsize=13, fontweight='bold')
plt.xlabel('Total Orders Placed', fontweight='semibold')
plt.ylabel('Total Spend ($)', fontweight='semibold')
plt.gca().yaxis.set_major_formatter('${x:,.0f}')

# Trendline
m, b = np.polyfit(df_customers['order_count'], df_customers['total_spent'], 1)
x_vals = np.array([df_customers['order_count'].min(), df_customers['order_count'].max()])
plt.plot(x_vals, m*x_vals + b, color='#ef4444', linestyle='--', label=f'Trend (Slope: ${m:.2f}/order)')
plt.legend()
plt.tight_layout()
plt.show()""")
    ]
    return create_notebook(cells)

# ==============================================================================
# 4. INVENTORY ANALYSIS NOTEBOOK
# ==============================================================================
def build_inventory_notebook():
    cells = [
        md_cell("""# 🏭 SmartStock – Inventory Health & Turnover Analytics
### Stock Movement, Low Stock Deficits, Dead Stock & Turnover Ratios
**Objective**: Monitor warehouse stock levels, stockout risks, dormant inventory, and calculate inventory turnover ratios."""),

        md_cell("""## 1. Load Inventory & Catalog Data"""),

        code_cell("""import os
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

plt.style.use('seaborn-v0_8-whitegrid' if 'seaborn-v0_8-whitegrid' in plt.style.available else 'default')
plt.rcParams['figure.figsize'] = (12, 6)

DATA_DIR = os.path.join('..', 'datasets')
df_products = pd.read_csv(os.path.join(DATA_DIR, 'products.csv'))
df_inv = pd.read_csv(os.path.join(DATA_DIR, 'inventory.csv'))
df_items = pd.read_csv(os.path.join(DATA_DIR, 'sale_items.csv'))

df_inv['created_at'] = pd.to_datetime(df_inv['created_at'])

print(f"Loaded {len(df_products)} products and {len(df_inv)} inventory movement logs.")
df_products.head(3)"""),

        md_cell("""## 2. Stock Valuation & Category Inventory Breakdown
Compute total capital tied up in inventory across categories."""),

        code_cell("""total_stock_value = (df_products['current_stock'] * df_products['purchase_price']).sum()
total_units_on_hand = df_products['current_stock'].sum()

print("=" * 55)
print(f"🏷️  Total Products in Catalog:    {len(df_products)}")
print(f"📦 Total Units in Stock:          {total_units_on_hand:,}")
print(f"💵 Total Inventory Value (Cost):  ${total_stock_value:,.2f}")
print("=" * 55)

cat_inv = df_products.groupby('category_name').agg(
    product_count=('product_id', 'count'),
    units_in_stock=('current_stock', 'sum'),
    stock_value=('inventory_value', 'sum')
).reset_index().sort_values(by='stock_value', ascending=False)

plt.figure(figsize=(12, 5))
plt.barh(cat_inv['category_name'][::-1], cat_inv['stock_value'][::-1], color='#3b82f6')
plt.title('Capital Tied Up by Product Category (Valuation at Cost)', fontweight='bold', fontsize=13)
plt.xlabel('Inventory Value ($)')
plt.gca().xaxis.set_major_formatter('${x:,.0f}')
plt.tight_layout()
plt.show()

display(cat_inv)"""),

        md_cell("""## 3. Stock Movement & Velocity Analysis
Classify transaction types: Inbound Replenishments vs. Outbound POS Sales."""),

        code_cell("""txn_counts = df_inv['type'].value_counts()

fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(15, 5))

# Transaction distribution
ax1.pie(txn_counts, labels=txn_counts.index, autopct='%1.1f%%', colors=['#10b981', '#3b82f6', '#f59e0b', '#ef4444'])
ax1.set_title('Inventory Transaction Distribution by Type', fontweight='bold')

# Net unit flow by category
inbound = df_inv[df_inv['quantity'] > 0].groupby('category_name')['quantity'].sum()
outbound = df_inv[df_inv['quantity'] < 0].groupby('category_name')['quantity'].sum().abs()
flow_df = pd.DataFrame({'Replenished (In)': inbound, 'Sold / Depleted (Out)': outbound}).fillna(0)

flow_df.plot(kind='bar', ax=ax2, colormap='tab10', alpha=0.85)
ax2.set_title('Stock Inflow vs Outflow by Category', fontweight='bold')
ax2.set_ylabel('Total Units')
ax2.tick_params(axis='x', rotation=45)

plt.tight_layout()
plt.show()"""),

        md_cell("""## 4. Low Stock Deficit & Safety Buffer Alerts
Flag SKUs whose current stock level is below or dangerously close to their defined reorder point."""),

        code_cell("""df_products['deficit'] = df_products['reorder_level'] - df_products['current_stock']
low_stock_items = df_products[df_products['current_stock'] <= df_products['reorder_level']].sort_values(by='current_stock')

print(f"⚠️ {len(low_stock_items)} items are currently AT OR BELOW their reorder threshold!")

if len(low_stock_items) > 0:
    display(low_stock_items[['sku', 'name', 'category_name', 'current_stock', 'reorder_level', 'unit']])
else:
    print("All items currently satisfy minimum safety buffers.")"""),

        md_cell("""## 5. Dead Stock Identification & Inventory Turnover Ratio
Identify SKUs with stagnant velocity (zero sales in the period) and calculate annual inventory turnover ratio:
$$\\text{Turnover Ratio} = \\frac{\\text{Total COGS}}{\\text{Average Inventory Value}}$$
$$\\text{Days Sales of Inventory (DSI)} = \\frac{180}{\\text{Turnover Ratio}}$$"""),

        code_cell("""sold_prod_ids = set(df_items['product_id'].unique())
dead_stock = df_products[~df_products['product_id'].isin(sold_prod_ids)]
print(f"🛑 Dead Stock Products (0 Units Sold): {len(dead_stock)}")

# Compute Inventory Turnover Ratio
total_cogs = df_items['cogs'].sum()
avg_inv_value = total_stock_value
turnover_ratio = (total_cogs / avg_inv_value) if avg_inv_value > 0 else 0.0
dsi = (180 / turnover_ratio) if turnover_ratio > 0 else 0.0

print("=" * 55)
print(f"📦 Total COGS (180 Days):         ${total_cogs:,.2f}")
print(f"🏷️  Avg Inventory Value:          ${avg_inv_value:,.2f}")
print(f"⚡ Inventory Turnover Ratio:       {turnover_ratio:.2f}x (per 180 days)")
print(f"📅 Days Sales of Inventory (DSI): {dsi:.1f} days")
print("=" * 55)""")
    ]
    return create_notebook(cells)

# ==============================================================================
# 5. PROFIT ANALYSIS NOTEBOOK
# ==============================================================================
def build_profit_notebook():
    cells = [
        md_cell("""# 💰 SmartStock – Profit & Financial Health Analytics
### Revenue, COGS, Gross Profit, Expenses, and Net Profit Waterfall
**Objective**: Deliver dynamic P&L financial reporting, gross margin tracking, operating expense breakdown, and bottom-line Net Profit analytics."""),

        md_cell("""## 1. Environment Setup & Financial Ingestion"""),

        code_cell("""import os
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

plt.style.use('seaborn-v0_8-whitegrid' if 'seaborn-v0_8-whitegrid' in plt.style.available else 'default')
plt.rcParams['figure.figsize'] = (12, 6)

DATA_DIR = os.path.join('..', 'datasets')
df_sales = pd.read_csv(os.path.join(DATA_DIR, 'sales.csv'))
df_items = pd.read_csv(os.path.join(DATA_DIR, 'sale_items.csv'))
df_expenses = pd.read_csv(os.path.join(DATA_DIR, 'expenses.csv'))

df_sales['sale_date'] = pd.to_datetime(df_sales['sale_date'])
df_sales['month'] = df_sales['sale_date'].dt.to_period('M')

df_expenses['expense_date'] = pd.to_datetime(df_expenses['expense_date'])
df_expenses['month'] = df_expenses['expense_date'].dt.to_period('M')

print("Loaded sales and expense records successfully.")"""),

        md_cell("""## 2. Executive Profit & Loss (P&L) Statement
Dynamic formulation based on enterprise formulas:
* **Revenue**: Total Gross Sales (`total_amount.sum()`)
* **COGS**: Cost of Goods Sold (`sum(quantity * unit_cost)`)
* **Gross Profit**: `Revenue - COGS`
* **Operating Expenses**: `sum(expenses.amount)`
* **Net Profit**: `Gross Profit - Expenses`
* **Net Profit Margin**: `(Net Profit / Revenue) * 100`"""),

        code_cell("""total_revenue = df_sales['total_amount'].sum()
total_cogs = df_items['cogs'].sum()
gross_profit = total_revenue - total_cogs
total_expenses = df_expenses['amount'].sum()
net_profit = gross_profit - total_expenses

gross_margin_pct = (gross_profit / total_revenue * 100) if total_revenue > 0 else 0.0
net_margin_pct = (net_profit / total_revenue * 100) if total_revenue > 0 else 0.0

pnl_summary = pd.DataFrame([
    {"Financial Line Item": "1. Gross Revenue", "Amount ($)": total_revenue, "% of Revenue": "100.0%"},
    {"Financial Line Item": "2. Cost of Goods Sold (COGS)", "Amount ($)": -total_cogs, "% of Revenue": f"{(total_cogs/total_revenue)*100:.1f}%"},
    {"Financial Line Item": "3. GROSS PROFIT", "Amount ($)": gross_profit, "% of Revenue": f"{gross_margin_pct:.1f}%"},
    {"Financial Line Item": "4. Operating Expenses (OPEX)", "Amount ($)": -total_expenses, "% of Revenue": f"{(total_expenses/total_revenue)*100:.1f}%"},
    {"Financial Line Item": "5. NET PROFIT", "Amount ($)": net_profit, "% of Revenue": f"{net_margin_pct:.1f}%"}
])

display(pnl_summary)

print("=" * 60)
print(f"💵 Total Revenue:        ${total_revenue:>12,.2f}")
print(f"📦 Total COGS:           ${total_cogs:>12,.2f}")
print(f"📈 Gross Profit:         ${gross_profit:>12,.2f}  (Margin: {gross_margin_pct:.1f}%)")
print(f"📉 Operating Expenses:   ${total_expenses:>12,.2f}")
print(f"🏆 Net Profit:           ${net_profit:>12,.2f}  (Margin: {net_margin_pct:.1f}%)")
print("=" * 60)"""),

        md_cell("""## 3. Profit Waterfall Breakdown
Visualize the financial flow from top-line revenue through COGS and operating expenses to final net income."""),

        code_cell("""waterfall_labels = ['Revenue', 'COGS', 'Gross Profit', 'Expenses', 'Net Profit']
waterfall_values = [total_revenue, -total_cogs, gross_profit, -total_expenses, net_profit]
bar_colors = ['#0ea5e9', '#ef4444', '#10b981', '#f97316', '#8b5cf6']

plt.figure(figsize=(10, 6))
bars = plt.bar(waterfall_labels, [abs(v) for v in waterfall_values], color=bar_colors, width=0.55, alpha=0.9)
plt.title('SmartStock Financial Waterfall (Revenue to Net Profit)', fontsize=14, fontweight='bold', pad=12)
plt.ylabel('Amount ($)', fontweight='semibold')
plt.gca().yaxis.set_major_formatter('${x:,.0f}')

for bar, val in zip(bars, waterfall_values):
    prefix = "+" if val > 0 else "-"
    h = bar.get_height()
    plt.text(bar.get_x() + bar.get_width()/2, h + 2000, f"{prefix}${abs(val):,.0f}", ha='center', fontweight='bold', fontsize=9.5)

plt.tight_layout()
plt.show()"""),

        md_cell("""## 4. Operating Expenses Breakdown by Category
Analyze where operational capital is disbursed."""),

        code_cell("""exp_cat = df_expenses.groupby('category')['amount'].sum().sort_values(ascending=False).reset_index()
exp_cat['share_pct'] = (exp_cat['amount'] / exp_cat['amount'].sum()) * 100

fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(15, 5))

# Donut chart
ax1.pie(exp_cat['amount'], labels=exp_cat['category'], autopct='%1.1f%%',
        colors=['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#8b5cf6', '#64748b', '#e11d48'],
        startangle=140, pctdistance=0.8, wedgeprops=dict(width=0.4, edgecolor='w'))
ax1.set_title('Expense Distribution by Category', fontweight='bold')

# Horizontal bar
ax2.barh(exp_cat['category'][::-1], exp_cat['amount'][::-1], color='#f43f5e', alpha=0.85)
ax2.set_title('Expense Amount by Category ($)', fontweight='bold')
ax2.xaxis.set_major_formatter('${x:,.0f}')

plt.tight_layout()
plt.show()

display(exp_cat)"""),

        md_cell("""## 5. Monthly Net Profit Progression & Margin Sustainability
Track month-by-month Gross vs. Net margins over time."""),

        code_cell("""m_sales = df_sales.groupby('month').agg(revenue=('total_amount', 'sum')).reset_index()
m_items = df_items.groupby(df_items['sale_date'].dt.to_period('M')).agg(cogs=('cogs', 'sum')).reset_index()
m_items.rename(columns={'sale_date': 'month'}, inplace=True)
m_exp = df_expenses.groupby('month').agg(expenses=('amount', 'sum')).reset_index()

m_pnl = pd.merge(m_sales, m_items, on='month', how='left')
m_pnl = pd.merge(m_pnl, m_exp, on='month', how='left').fillna(0)

m_pnl['gross_profit'] = m_pnl['revenue'] - m_pnl['cogs']
m_pnl['net_profit'] = m_pnl['gross_profit'] - m_pnl['expenses']
m_pnl['net_margin_pct'] = (m_pnl['net_profit'] / m_pnl['revenue']) * 100

display(m_pnl)

plt.figure(figsize=(12, 6))
x_axis = [str(m) for m in m_pnl['month']]
plt.plot(x_axis, m_pnl['revenue'], marker='o', label='Gross Revenue', color='#0ea5e9', lw=2.5)
plt.plot(x_axis, m_pnl['gross_profit'], marker='s', label='Gross Profit', color='#10b981', lw=2.5)
plt.plot(x_axis, m_pnl['expenses'], marker='^', label='Operating Expenses', color='#f97316', lw=2)
plt.plot(x_axis, m_pnl['net_profit'], marker='D', label='Net Profit', color='#8b5cf6', lw=3)

plt.title('Monthly Financial Performance Trend (Revenue, OPEX, Net Profit)', fontsize=14, fontweight='bold', pad=12)
plt.xlabel('Month', fontweight='semibold')
plt.ylabel('Amount ($)', fontweight='semibold')
plt.gca().yaxis.set_major_formatter('${x:,.0f}')
plt.legend(frameon=True, facecolor='white', framealpha=0.9)
plt.tight_layout()
plt.show()""")
    ]
    return create_notebook(cells)

def main():
    builders = {
        "sales_analysis.ipynb": build_sales_notebook,
        "product_analysis.ipynb": build_product_notebook,
        "customer_analysis.ipynb": build_customer_notebook,
        "inventory_analysis.ipynb": build_inventory_notebook,
        "profit_analysis.ipynb": build_profit_notebook,
    }

    print("Building Jupyter Notebooks in analytics/notebooks/...")
    for filename, builder in builders.items():
        nb = builder()
        out_path = NOTEBOOKS_DIR / filename
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(nb, f, indent=2)
        print(f"  ✓ {filename} built successfully ({len(nb['cells'])} cells).")

if __name__ == "__main__":
    main()
