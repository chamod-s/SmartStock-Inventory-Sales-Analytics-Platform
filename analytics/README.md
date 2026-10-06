# 📊 SmartStock – Dedicated Python Analytics Layer

A standalone, high-performance offline analytics and business intelligence engine built with **Python**, **Pandas**, **NumPy**, and **Matplotlib**. This module analyzes real transactional, inventory, customer, and financial data from the SmartStock PostgreSQL platform.

> **Architectural Separation Note**: This Python analytics layer is completely decoupled from the production Node.js/Express backend. It operates independently for deep offline analytics, cohort analysis, and trend reporting without adding Python runtime dependencies or overhead to the web server.

---

## 📁 Directory Structure

```
analytics/
├── notebooks/                       # Interactive Jupyter Notebooks
│   ├── sales_analysis.ipynb         # Daily/monthly sales, growth & seasonality
│   ├── product_analysis.ipynb       # Best sellers, slow movers & profit margins
│   ├── customer_analysis.ipynb      # RFM segmentation, lifetime spend & retention
│   ├── inventory_analysis.ipynb     # Valuation, turnover ratios, dead/low stock
│   └── profit_analysis.ipynb        # Revenue, COGS, OPEX & Net Profit waterfall
├── scripts/                         # Automation & data pipeline scripts
│   ├── export_datasets.py           # PostgreSQL exporter & enterprise dataset generator
│   ├── build_notebooks.py           # Programmatic Jupyter Notebook compiler
│   └── run_analyses.py              # CLI batch analytics runner & chart exporter
├── datasets/                        # Clean tabular CSV datasets
│   ├── sales.csv                    # 1,751+ completed sales transactions
│   ├── sale_items.csv               # 3,622+ itemized checkout line items
│   ├── products.csv                 # 30 catalog products across 8 categories
│   ├── customers.csv                # 50 registered customer accounts with RFM tags
│   ├── inventory.csv                # 3,652+ inventory movement transactions
│   └── expenses.csv                 # 84 operational expense disbursements
├── reports/                         # Generated analytical artifacts
│   └── figures/                     # High-resolution PNG visualizations
├── requirements.txt                 # Python dependencies
└── README.md                        # Documentation and user guide
```

---

## 🛠️ Prerequisites & Installation

### 1. Python Environment
Requires **Python 3.10+** (Python 3.13 recommended).

From the root directory or inside `analytics/`:
```bash
cd analytics
pip install -r requirements.txt
```

Core libraries installed:
* `pandas`: Tabular data manipulation, time-series aggregation, and rolling averages
* `numpy`: Mathematical computations, weighting distributions, and regression lines
* `matplotlib`: Publication-quality visualizations, waterfalls, and multi-axis charts
* `sqlalchemy` & `psycopg2-binary`: PostgreSQL database abstraction and querying
* `jupyterlab` / `ipykernel`: Interactive Jupyter notebook environment

---

## 🔌 Connecting Python to PostgreSQL

### 1. Connection String Format
When connecting via SQLAlchemy, use the `postgresql+psycopg2://` driver prefix:
```
postgresql+psycopg2://<username>:<encoded_password>@<host>:<port>/<dbname>
```

> ⚠️ **Important (Special Characters in Password)**: If your PostgreSQL password contains special characters like `@` (e.g. `CJS@12345`), you **must** URL-encode the character as `%40` or use `urllib.parse.quote_plus`:
> ```python
> from urllib.parse import quote_plus
> password = quote_plus("CJS@12345")  # Output: CJS%4012345
> ```

> ⚠️ **Prisma Query Parameter Compatibility**: Prisma URLs often append `?schema=public`. The PostgreSQL psycopg2 driver rejects this query parameter. Always strip `?schema=public` or use `connect_args={"options": "-c search_path=public"}`.

### 2. Python Code Example
```python
from sqlalchemy import create_engine
import pandas as pd
from urllib.parse import quote_plus

# Database Credentials
DB_USER = "postgres"
DB_PASS = quote_plus("CJS@12345")
DB_HOST = "localhost"
DB_PORT = "5432"
DB_NAME = "smartstock_db"

# Construct connection engine
db_url = f"postgresql+psycopg2://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
engine = create_engine(db_url)

# Execute SQL query directly into Pandas DataFrame
query = """
    SELECT 
        s.id AS sale_id,
        s."invoiceNumber" AS invoice_number,
        s."createdAt" AS sale_date,
        s."totalAmount"::numeric AS total_amount,
        c.name AS customer_name
    FROM "Sale" s
    LEFT JOIN "Customer" c ON s."customerId" = c.id
    ORDER BY s."createdAt" DESC;
"""

df_sales = pd.read_sql(query, con=engine)
print(df_sales.head())
```

---

## 📤 Exporting Datasets

The `analytics/scripts/export_datasets.py` pipeline connects to the active SmartStock PostgreSQL database and dumps structured CSV files into `analytics/datasets/`. 

If PostgreSQL is running with initial seed records or offline, it automatically augments the data to generate a realistic **180-day enterprise retail history** reflecting real catalog products, seasonal shopping patterns, and operational expenses.

### Run Exporter:
```bash
# Automatic extraction (detects backend/.env)
python analytics/scripts/export_datasets.py

# Specify custom PostgreSQL URI
python analytics/scripts/export_datasets.py --db "postgresql+psycopg2://postgres:CJS%4012345@localhost:5432/smartstock_db"

# Force offline synthetic generation
python analytics/scripts/export_datasets.py --force-synth
```

---

## 📓 Interactive Jupyter Notebooks

Launch JupyterLab to interact with all notebooks:
```bash
jupyter lab
```
Alternatively, open the notebooks directly in **VSCode / Cursor** with the Jupyter extension.

### 1. `sales_analysis.ipynb`
* **Daily Sales**: Daily sales distribution, weekend peaks, 7-day and 30-day rolling trend curves.
* **Monthly Sales**: Monthly gross revenue, transaction counts, and Average Order Value (AOV).
* **Sales Growth**: Month-over-Month (MoM) growth percentages and momentum tracking.
* **Category Performance**: Departmental sales shares (Electronics, Office Supplies, Groceries, etc.).
* **Sales Trends**: Day-of-week retail volume and hourly store trading patterns (9 AM – 7 PM).

### 2. `product_analysis.ipynb`
* **Best Sellers**: Top 10 products ranked by unit volume and total revenue generated.
* **Slow-Moving Products**: Lowest velocity SKUs relative to warehouse holdings.
* **Product Profitability**: Gross profit per SKU, markup percentages, and gross margin analysis.
* **Profitability Matrix**: Multi-dimensional bubble chart (Volume vs Margin vs Revenue).

### 3. `customer_analysis.ipynb`
* **Top Customers**: Top 10 customer accounts by lifetime spend and order count.
* **Repeat Customers**: Repeat buyer ratio (multi-order vs single-order customers).
* **Customer Spending**: Distribution of Average Order Value (AOV) and customer value bands.
* **RFM Segmentation**: Behavioral cohorts (`VIP Champion`, `High Value Loyal`, `Active Regular`, `At Risk`).

### 4. `inventory_analysis.ipynb`
* **Stock Movement**: Transaction breakdown (Purchases, POS Sales, Adjustments) and unit flow.
* **Low Stock Alerts**: Real-time identification of products below minimum reorder points.
* **Dead Stock**: Detection of zero-velocity inventory tying up operational capital.
* **Inventory Turnover**: Turn ratio ($\frac{\text{COGS}}{\text{Avg Inventory}}$) and Days Sales of Inventory (DSI).

### 5. `profit_analysis.ipynb`
* **Revenue**: Gross revenue before and after trade discounts.
* **Cost of Goods Sold (COGS)**: Direct item procurement costs.
* **Gross Profit & Margin**: $\text{Gross Profit} = \text{Revenue} - \text{COGS}$.
* **Operating Expenses (OPEX)**: Fixed and variable disbursements (Rent, Payroll, Utilities, Marketing, Logistics).
* **Net Profit Waterfall**: Complete P&L cascade from top-line sales to net income.
* **Zero Revenue Safety**: Handles zero denominator cases gracefully with robust conditional checks.

---

## ⚡ Headless CLI Analytics Runner

To run all 5 analyses in batch mode without opening a web browser:
```bash
python analytics/scripts/run_analyses.py
```

This outputs a comprehensive executive terminal summary and automatically exports publication-ready high-resolution visual charts to `analytics/reports/figures/`:
* `sales_analytics_overview.png`
* `product_profitability_matrix.png`
* `customer_segmentation_breakdown.png`
* `inventory_health_valuation.png`
* `profit_loss_waterfall.png`

---

## 🛡️ Production Safety & Architecture Boundary

* **Zero Backend Pollution**: All Python code, notebooks, and dependencies reside strictly inside `analytics/`.
* **No Node.js Runtime Dependencies**: The Node.js Express server is completely untouched and requires no Python child processes or Python binaries.
* **Read-Only Database Access**: Analytical extraction scripts run purely idempotent `SELECT` queries, ensuring zero risk of locking or mutating live production tables.
