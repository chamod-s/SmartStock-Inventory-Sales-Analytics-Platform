#!/usr/bin/env python3
"""
SmartStock – Automated Batch Analytics Runner
Executes comprehensive offline data analytics across:
1. Sales Analytics (Daily/monthly sales, growth rates, category breakdown, trend curves)
2. Product Analytics (Best sellers, slow movers, gross profit contribution)
3. Customer Analytics (Top buyers, repeat purchase ratios, RFM segmentation)
4. Inventory Analytics (Valuation, movement flows, low stock alerts, inventory turnover)
5. Profit Analytics (Revenue, COGS, Gross Profit, Expenses, Net Profit waterfall)

Generates analytical figures in analytics/reports/figures/ and prints executive P&L metrics.
"""

import os
import sys

# UTF-8 stdout reconfiguration
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

from pathlib import Path
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

# Directories
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "datasets"
REPORTS_DIR = BASE_DIR / "reports"
FIGURES_DIR = REPORTS_DIR / "figures"
FIGURES_DIR.mkdir(parents=True, exist_ok=True)

# Plot settings
plt.style.use('seaborn-v0_8-whitegrid' if 'seaborn-v0_8-whitegrid' in plt.style.available else 'default')
plt.rcParams['figure.autolayout'] = True
plt.rcParams['font.size'] = 10

def run_sales_analysis():
    print("\n" + "="*70)
    print("📈 1. SALES ANALYTICS")
    print("="*70)
    
    df_sales = pd.read_csv(DATA_DIR / "sales.csv")
    df_items = pd.read_csv(DATA_DIR / "sale_items.csv")
    
    df_sales['sale_date'] = pd.to_datetime(df_sales['sale_date'])
    df_sales['date'] = df_sales['sale_date'].dt.date
    df_sales['month'] = df_sales['sale_date'].dt.to_period('M')
    
    total_rev = df_sales['total_amount'].sum()
    total_orders = len(df_sales)
    aov = df_sales['total_amount'].mean()
    total_units = df_items['quantity'].sum()
    
    print(f"  • Total Revenue:          ${total_rev:,.2f}")
    print(f"  • Total Orders:           {total_orders:,}")
    print(f"  • Average Order Value:    ${aov:,.2f}")
    print(f"  • Total Units Sold:       {total_units:,}")
    
    # Daily aggregation & moving average
    daily = df_sales.groupby('date')['total_amount'].sum().reset_index()
    daily['date'] = pd.to_datetime(daily['date'])
    daily['ma7'] = daily['total_amount'].rolling(7, min_periods=1).mean()
    daily['ma30'] = daily['total_amount'].rolling(30, min_periods=1).mean()
    
    # Monthly sales & MoM growth
    monthly = df_sales.groupby('month').agg(revenue=('total_amount', 'sum'), orders=('sale_id', 'count')).reset_index()
    monthly['mom_growth'] = monthly['revenue'].pct_change() * 100
    
    print("\n  Monthly Progression:")
    for _, r in monthly.iterrows():
        growth_str = f"{r['mom_growth']:+.1f}%" if pd.notnull(r['mom_growth']) else "Baseline"
        print(f"    - {r['month']}: ${r['revenue']:>10,.2f} ({r['orders']:>3} orders, Growth: {growth_str})")
        
    # Generate Figure: Sales Trend
    fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(12, 8))
    ax1.plot(daily['date'], daily['total_amount'], color='#93c5fd', alpha=0.6, label='Daily Sales ($)')
    ax1.plot(daily['date'], daily['ma7'], color='#2563eb', lw=2, label='7-Day Moving Avg')
    ax1.plot(daily['date'], daily['ma30'], color='#d97706', lw=2.5, ls='--', label='30-Day Moving Avg')
    ax1.set_title('SmartStock Daily Revenue & Moving Average Trend', fontweight='bold')
    ax1.set_ylabel('Revenue ($)')
    ax1.yaxis.set_major_formatter('${x:,.0f}')
    ax1.legend(loc='upper left')
    
    # Category Performance
    cat_perf = df_items.groupby('category_name')['subtotal'].sum().sort_values(ascending=True)
    ax2.barh(cat_perf.index, cat_perf.values, color='#4f46e5', alpha=0.85)
    ax2.set_title('Revenue Breakdown by Product Category', fontweight='bold')
    ax2.set_xlabel('Total Revenue ($)')
    ax2.xaxis.set_major_formatter('${x:,.0f}')
    
    fig_path = FIGURES_DIR / "sales_analytics_overview.png"
    plt.savefig(fig_path, dpi=200)
    plt.close()
    print(f"  ✓ Saved figure: {fig_path.name}")

def run_product_analysis():
    print("\n" + "="*70)
    print("📦 2. PRODUCT ANALYTICS")
    print("="*70)
    
    df_products = pd.read_csv(DATA_DIR / "products.csv")
    df_items = pd.read_csv(DATA_DIR / "sale_items.csv")
    
    prod_agg = df_items.groupby(['product_id', 'product_name', 'category_name']).agg(
        units_sold=('quantity', 'sum'),
        revenue=('subtotal', 'sum'),
        profit=('gross_profit', 'sum')
    ).reset_index()
    prod_agg['margin_pct'] = (prod_agg['profit'] / prod_agg['revenue']) * 100
    
    top_volume = prod_agg.sort_values(by='units_sold', ascending=False).head(5)
    top_rev = prod_agg.sort_values(by='revenue', ascending=False).head(5)
    top_profit = prod_agg.sort_values(by='profit', ascending=False).head(5)
    slow_movers = prod_agg.sort_values(by='units_sold', ascending=True).head(5)
    
    print("  🏆 Top 5 Best Sellers (By Units Sold):")
    for _, r in top_volume.iterrows():
        print(f"    - {r['product_name'][:32]:<32} | {r['units_sold']:>4} units | ${r['revenue']:>9,.2f} rev")
        
    print("\n  💰 Top 5 Revenue Drivers:")
    for _, r in top_rev.iterrows():
        print(f"    - {r['product_name'][:32]:<32} | ${r['revenue']:>9,.2f} | Profit: ${r['profit']:>8,.2f}")
        
    print("\n  🐌 Slow-Moving Catalog Items:")
    for _, r in slow_movers.iterrows():
        print(f"    - {r['product_name'][:32]:<32} | {r['units_sold']:>3} units | Margin: {r['margin_pct']:.1f}%")

    # Figure
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 6))
    top_10 = prod_agg.sort_values(by='revenue', ascending=False).head(10)
    ax1.barh(top_10['product_name'][::-1], top_10['revenue'][::-1], color='#059669')
    ax1.set_title('Top 10 Products by Revenue ($)', fontweight='bold')
    ax1.xaxis.set_major_formatter('${x:,.0f}')
    
    scatter = ax2.scatter(prod_agg['units_sold'], prod_agg['margin_pct'], 
                          s=prod_agg['revenue']/20, c=prod_agg['profit'], cmap='plasma', alpha=0.8, edgecolors='k')
    ax2.set_title('Units Sold vs Gross Margin % (Bubble Size = Revenue)', fontweight='bold')
    ax2.set_xlabel('Units Sold')
    ax2.set_ylabel('Gross Margin (%)')
    fig.colorbar(scatter, ax=ax2, label='Gross Profit ($)')
    
    fig_path = FIGURES_DIR / "product_profitability_matrix.png"
    plt.savefig(fig_path, dpi=200)
    plt.close()
    print(f"  ✓ Saved figure: {fig_path.name}")

def run_customer_analysis():
    print("\n" + "="*70)
    print("👥 3. CUSTOMER ANALYTICS")
    print("="*70)
    
    df_customers = pd.read_csv(DATA_DIR / "customers.csv")
    
    total_cust = len(df_customers)
    repeat_cust = len(df_customers[df_customers['order_count'] > 1])
    repeat_rate = (repeat_cust / total_cust) * 100
    avg_spend = df_customers['total_spent'].mean()
    
    print(f"  • Total Customer Accounts:    {total_cust}")
    print(f"  • Repeat Buyers (>1 Order):   {repeat_cust} ({repeat_rate:.1f}%)")
    print(f"  • Average Spend / Customer:   ${avg_spend:,.2f}")
    
    top_spenders = df_customers.sort_values(by='total_spent', ascending=False).head(5)
    print("\n  🌟 Top 5 Lifetime Spenders:")
    for _, r in top_spenders.iterrows():
        print(f"    - {r['name']:<22} | ${r['total_spent']:>8,.2f} spent | {r['order_count']:>2} orders | Segment: {r['customer_segment']}")
        
    seg_summary = df_customers.groupby('customer_segment').agg(
        count=('customer_id', 'count'),
        total_rev=('total_spent', 'sum')
    ).reset_index().sort_values(by='total_rev', ascending=False)
    
    print("\n  🏷️ Customer Segmentation Breakdown:")
    for _, r in seg_summary.iterrows():
        print(f"    - {r['customer_segment']:<24}: {r['count']:>2} customers | ${r['total_rev']:>9,.2f} revenue")

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 6))
    ax1.pie(seg_summary['total_rev'], labels=seg_summary['customer_segment'], autopct='%1.1f%%',
            colors=['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'], wedgeprops=dict(width=0.4, edgecolor='w'))
    ax1.set_title('Revenue Share by Customer Segment', fontweight='bold')
    
    top10_c = df_customers.sort_values(by='total_spent', ascending=False).head(10)
    ax2.barh(top10_c['name'][::-1], top10_c['total_spent'][::-1], color='#0284c7')
    ax2.set_title('Top 10 Customers by Total Spend ($)', fontweight='bold')
    ax2.xaxis.set_major_formatter('${x:,.0f}')
    
    fig_path = FIGURES_DIR / "customer_segmentation_breakdown.png"
    plt.savefig(fig_path, dpi=200)
    plt.close()
    print(f"  ✓ Saved figure: {fig_path.name}")

def run_inventory_analysis():
    print("\n" + "="*70)
    print("🏭 4. INVENTORY ANALYTICS")
    print("="*70)
    
    df_products = pd.read_csv(DATA_DIR / "products.csv")
    df_items = pd.read_csv(DATA_DIR / "sale_items.csv")
    df_inv = pd.read_csv(DATA_DIR / "inventory.csv")
    
    stock_value = (df_products['current_stock'] * df_products['purchase_price']).sum()
    units_on_hand = df_products['current_stock'].sum()
    cogs_total = df_items['cogs'].sum()
    turnover = (cogs_total / stock_value) if stock_value > 0 else 0
    dsi = (180 / turnover) if turnover > 0 else 0
    
    low_stock = df_products[df_products['current_stock'] <= df_products['reorder_level']]
    
    sold_ids = set(df_items['product_id'].unique())
    dead_stock = df_products[~df_products['product_id'].isin(sold_ids)]
    
    print(f"  • Catalog SKUs:               {len(df_products)}")
    print(f"  • Units on Hand:              {units_on_hand:,}")
    print(f"  • Inventory Valuation:        ${stock_value:,.2f}")
    print(f"  • Inventory Turnover Ratio:   {turnover:.2f}x (180 days)")
    print(f"  • Days Sales Inventory (DSI): {dsi:.1f} days")
    print(f"  • SKUs at/below Reorder:      {len(low_stock)}")
    print(f"  • Dead Stock SKUs (0 Sales):  {len(dead_stock)}")

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))
    cat_inv = df_products.groupby('category_name')['inventory_value'].sum().sort_values(ascending=True)
    ax1.barh(cat_inv.index, cat_inv.values, color='#0891b2')
    ax1.set_title('Inventory Valuation by Category ($ Cost)', fontweight='bold')
    ax1.xaxis.set_major_formatter('${x:,.0f}')
    
    types = df_inv['type'].value_counts()
    ax2.pie(types.values, labels=types.index, autopct='%1.1f%%', colors=['#10b981', '#3b82f6', '#f59e0b', '#ef4444'])
    ax2.set_title('Inventory Transaction Activity Breakdown', fontweight='bold')
    
    fig_path = FIGURES_DIR / "inventory_health_valuation.png"
    plt.savefig(fig_path, dpi=200)
    plt.close()
    print(f"  ✓ Saved figure: {fig_path.name}")

def run_profit_analysis():
    print("\n" + "="*70)
    print("💰 5. PROFIT & FINANCIAL P&L ANALYTICS")
    print("="*70)
    
    df_sales = pd.read_csv(DATA_DIR / "sales.csv")
    df_items = pd.read_csv(DATA_DIR / "sale_items.csv")
    df_expenses = pd.read_csv(DATA_DIR / "expenses.csv")
    
    revenue = df_sales['total_amount'].sum()
    cogs = df_items['cogs'].sum()
    gross_profit = revenue - cogs
    expenses = df_expenses['amount'].sum()
    net_profit = gross_profit - expenses
    
    gross_margin = (gross_profit / revenue * 100) if revenue > 0 else 0
    net_margin = (net_profit / revenue * 100) if revenue > 0 else 0
    
    print(f"  • Gross Revenue:              ${revenue:>12,.2f}  (100.0%)")
    print(f"  • Cost of Goods Sold (COGS): -${cogs:>12,.2f}  ({(cogs/revenue)*100:.1f}%)")
    print(f"  • GROSS PROFIT:               ${gross_profit:>12,.2f}  ({gross_margin:.1f}% Margin)")
    print(f"  • Operating Expenses:        -${expenses:>12,.2f}  ({(expenses/revenue)*100:.1f}%)")
    print(f"  • NET PROFIT:                 ${net_profit:>12,.2f}  ({net_margin:.1f}% Margin)")
    
    # Financial Waterfall Figure
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(15, 6))
    
    labels = ['Revenue', 'COGS', 'Gross Profit', 'Expenses', 'Net Profit']
    vals = [revenue, -cogs, gross_profit, -expenses, net_profit]
    colors = ['#0ea5e9', '#ef4444', '#10b981', '#f97316', '#8b5cf6']
    
    bars = ax1.bar(labels, [abs(v) for v in vals], color=colors, width=0.55)
    ax1.set_title('SmartStock Financial Waterfall (Revenue to Net Profit)', fontweight='bold')
    ax1.set_ylabel('Amount ($)')
    ax1.yaxis.set_major_formatter('${x:,.0f}')
    for bar, val in zip(bars, vals):
        prefix = "+" if val > 0 else "-"
        ax1.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 2500,
                 f"{prefix}${abs(val):,.0f}", ha='center', fontweight='bold', fontsize=9)
                 
    # Expense Breakdown
    exp_cat = df_expenses.groupby('category')['amount'].sum().sort_values(ascending=True)
    ax2.barh(exp_cat.index, exp_cat.values, color='#f43f5e', alpha=0.85)
    ax2.set_title('Operating Expenses by Category ($)', fontweight='bold')
    ax2.xaxis.set_major_formatter('${x:,.0f}')
    
    fig_path = FIGURES_DIR / "profit_loss_waterfall.png"
    plt.savefig(fig_path, dpi=200)
    plt.close()
    print(f"  ✓ Saved figure: {fig_path.name}")

def main():
    print("\n" + "#"*70)
    print("🚀 SMARTSTOCK ENTERPRISE PYTHON ANALYTICS ENGINE")
    print("#"*70)
    
    run_sales_analysis()
    run_product_analysis()
    run_customer_analysis()
    run_inventory_analysis()
    run_profit_analysis()
    
    print("\n" + "#"*70)
    print("✅ All 5 Analytics Modules Completed Successfully!")
    print(f"📁 Generated charts saved to: {FIGURES_DIR}")
    print("#"*70 + "\n")

if __name__ == "__main__":
    main()
