-- ==============================================================================
-- SmartStock – Analytical SQL Views for Power BI Star Schema
-- Designed for high-performance DirectQuery and Import Mode in Power BI Desktop
-- ==============================================================================

-- 1. Dimension: Products with Category and Stock Health Status
CREATE OR REPLACE VIEW view_dim_products AS
SELECT 
    p.id AS product_id,
    p.sku,
    p.name AS product_name,
    p."categoryId" AS category_id,
    c.name AS category_name,
    p.unit,
    p.status AS product_status,
    p."purchasePrice"::numeric(12,2) AS purchase_price,
    p."sellingPrice"::numeric(12,2) AS selling_price,
    (p."sellingPrice" - p."purchasePrice")::numeric(12,2) AS unit_margin,
    CASE 
        WHEN p."sellingPrice" > 0 
        THEN ROUND(((p."sellingPrice" - p."purchasePrice") / p."sellingPrice" * 100)::numeric, 2)
        ELSE 0 
    END AS target_margin_percent,
    p."currentStock" AS current_stock,
    p."reorderLevel" AS reorder_level,
    (p."currentStock" * p."purchasePrice")::numeric(12,2) AS stock_value_at_cost,
    (p."currentStock" * p."sellingPrice")::numeric(12,2) AS stock_value_at_retail,
    CASE 
        WHEN p."currentStock" <= 0 THEN 'OUT_OF_STOCK'
        WHEN p."currentStock" <= p."reorderLevel" THEN 'LOW_STOCK'
        WHEN p."currentStock" >= (p."reorderLevel" * 4) THEN 'OVERSTOCK'
        ELSE 'HEALTHY'
    END AS stock_health_status,
    p."createdAt" AS created_at
FROM "Product" p
LEFT JOIN "Category" c ON p."categoryId" = c.id;

-- 2. Dimension: Customers with Lifetime Purchase Metrics
CREATE OR REPLACE VIEW view_dim_customers AS
SELECT 
    c.id AS customer_id,
    c.code AS customer_code,
    c.name AS customer_name,
    c.email,
    c.phone,
    c.address,
    c."creditLimit"::numeric(12,2) AS credit_limit,
    c."totalSpent"::numeric(12,2) AS total_spent,
    COUNT(s.id) AS total_orders,
    COALESCE(SUM(s."totalAmount"), 0)::numeric(12,2) AS calculated_lifetime_spend,
    CASE 
        WHEN COUNT(s.id) > 0 THEN ROUND((COALESCE(SUM(s."totalAmount"), 0) / COUNT(s.id))::numeric, 2)
        ELSE 0.00
    END AS avg_order_value,
    MAX(s."createdAt") AS last_order_date,
    CASE
        WHEN COUNT(s.id) >= 10 AND COALESCE(SUM(s."totalAmount"), 0) >= 2000 THEN 'VIP Champion'
        WHEN COUNT(s.id) >= 5 THEN 'High Value Loyal'
        WHEN COUNT(s.id) >= 2 THEN 'Repeat Regular'
        WHEN COUNT(s.id) = 1 THEN 'New / Single Order'
        ELSE 'Inactive'
    END AS customer_segment,
    c."createdAt" AS registration_date
FROM "Customer" c
LEFT JOIN "Sale" s ON c.id = s."customerId" AND s.status = 'COMPLETED'
GROUP BY c.id, c.code, c.name, c.email, c.phone, c.address, c."creditLimit", c."totalSpent", c."createdAt";

-- 3. Fact: Sales Transactions Header
CREATE OR REPLACE VIEW view_fact_sales AS
SELECT 
    s.id AS sale_id,
    s."invoiceNumber" AS invoice_number,
    s."customerId" AS customer_id,
    s."userId" AS user_id,
    s.status AS sale_status,
    s.subtotal::numeric(12,2) AS subtotal,
    s."taxAmount"::numeric(12,2) AS tax_amount,
    s."discountAmount"::numeric(12,2) AS discount_amount,
    s."totalAmount"::numeric(12,2) AS total_revenue,
    s."createdAt" AS sale_timestamp,
    s."createdAt"::date AS sale_date,
    TO_CHAR(s."createdAt", 'YYYYMMDD')::integer AS date_key,
    COUNT(si.id) AS item_count,
    COALESCE(SUM(si.quantity), 0) AS total_units_sold,
    COALESCE(SUM(si.quantity * si."unitCost"), 0)::numeric(12,2) AS total_cogs,
    (s.subtotal - s."discountAmount" - COALESCE(SUM(si.quantity * si."unitCost"), 0))::numeric(12,2) AS gross_profit
FROM "Sale" s
LEFT JOIN "SaleItem" si ON s.id = si."saleId"
WHERE s.status = 'COMPLETED'
GROUP BY s.id, s."invoiceNumber", s."customerId", s."userId", s.status, s.subtotal, s."taxAmount", s."discountAmount", s."totalAmount", s."createdAt";

-- 4. Fact: Sale Line Items Grain (Deep Product/Category Analytics)
CREATE OR REPLACE VIEW view_fact_sale_items AS
SELECT 
    si.id AS item_id,
    si."saleId" AS sale_id,
    s."invoiceNumber" AS invoice_number,
    s."customerId" AS customer_id,
    si."productId" AS product_id,
    p.name AS product_name,
    p."categoryId" AS category_id,
    c.name AS category_name,
    s."createdAt"::date AS sale_date,
    TO_CHAR(s."createdAt", 'YYYYMMDD')::integer AS date_key,
    si.quantity,
    si."unitPrice"::numeric(12,2) AS unit_price,
    si."unitCost"::numeric(12,2) AS unit_cost,
    si.subtotal::numeric(12,2) AS line_revenue,
    (si.quantity * si."unitCost")::numeric(12,2) AS line_cogs,
    (si.subtotal - (si.quantity * si."unitCost"))::numeric(12,2) AS line_gross_profit,
    CASE 
        WHEN si.subtotal > 0 
        THEN ROUND(((si.subtotal - (si.quantity * si."unitCost")) / si.subtotal * 100)::numeric, 2)
        ELSE 0.00
    END AS gross_margin_percent
FROM "SaleItem" si
JOIN "Sale" s ON si."saleId" = s.id
JOIN "Product" p ON si."productId" = p.id
LEFT JOIN "Category" c ON p."categoryId" = c.id
WHERE s.status = 'COMPLETED';

-- 5. Fact: Inventory Transactions / Movements
CREATE OR REPLACE VIEW view_fact_inventory_movements AS
SELECT 
    it.id AS transaction_id,
    it."productId" AS product_id,
    p.sku,
    p.name AS product_name,
    p."categoryId" AS category_id,
    it."userId" AS user_id,
    it.type AS transaction_type,
    it.quantity AS unit_delta,
    ABS(it.quantity) AS absolute_quantity,
    CASE WHEN it.quantity > 0 THEN it.quantity ELSE 0 END AS units_inbound,
    CASE WHEN it.quantity < 0 THEN ABS(it.quantity) ELSE 0 END AS units_outbound,
    it."stockBefore" AS stock_before,
    it."stockAfter" AS stock_after,
    (it.quantity * p."purchasePrice")::numeric(12,2) AS inventory_value_delta,
    it."referenceId" AS reference_id,
    it.notes,
    it."createdAt" AS transaction_timestamp,
    it."createdAt"::date AS transaction_date,
    TO_CHAR(it."createdAt", 'YYYYMMDD')::integer AS date_key
FROM "InventoryTransaction" it
JOIN "Product" p ON it."productId" = p.id;

-- 6. Fact: Operating Expenses
CREATE OR REPLACE VIEW view_fact_expenses AS
SELECT 
    e.id AS expense_id,
    e."userId" AS user_id,
    e.category AS expense_category,
    e.amount::numeric(12,2) AS expense_amount,
    e.description,
    e."paymentMethod" AS payment_method,
    e."expenseDate"::date AS expense_date,
    TO_CHAR(e."expenseDate", 'YYYYMMDD')::integer AS date_key,
    e."createdAt" AS recorded_at
FROM "Expense" e
WHERE e."isActive" = true;

-- 7. Fact: Purchases & Procurement
CREATE OR REPLACE VIEW view_fact_purchases AS
SELECT 
    p.id AS purchase_id,
    p."purchaseOrderNumber" AS po_number,
    p."supplierId" AS supplier_id,
    p."userId" AS user_id,
    p.status AS purchase_status,
    p.subtotal::numeric(12,2) AS subtotal,
    p."taxAmount"::numeric(12,2) AS tax_amount,
    p."discountAmount"::numeric(12,2) AS discount_amount,
    p."totalAmount"::numeric(12,2) AS total_amount,
    p."purchaseDate"::date AS purchase_date,
    TO_CHAR(p."purchaseDate", 'YYYYMMDD')::integer AS date_key,
    COUNT(pi.id) AS line_item_count,
    COALESCE(SUM(pi.quantity), 0) AS total_units_received
FROM "Purchase" p
LEFT JOIN "PurchaseItem" pi ON p.id = pi."purchaseId"
GROUP BY p.id, p."purchaseOrderNumber", p."supplierId", p."userId", p.status, p.subtotal, p."taxAmount", p."discountAmount", p."totalAmount", p."purchaseDate";

-- 8. Analytical View: Executive Monthly P&L Summary
CREATE OR REPLACE VIEW view_monthly_pnl_summary AS
WITH monthly_sales AS (
    SELECT 
        DATE_TRUNC('month', s."createdAt"::date)::date AS month_date,
        SUM(s."totalAmount")::numeric(12,2) AS revenue,
        SUM(si.quantity * si."unitCost")::numeric(12,2) AS cogs,
        (SUM(s."totalAmount") - SUM(si.quantity * si."unitCost"))::numeric(12,2) AS gross_profit,
        COUNT(DISTINCT s.id) AS order_count
    FROM "Sale" s
    JOIN "SaleItem" si ON s.id = si."saleId"
    WHERE s.status = 'COMPLETED'
    GROUP BY DATE_TRUNC('month', s."createdAt"::date)
),
monthly_expenses AS (
    SELECT 
        DATE_TRUNC('month', e."expenseDate"::date)::date AS month_date,
        SUM(e.amount)::numeric(12,2) AS expenses
    FROM "Expense" e
    WHERE e."isActive" = true
    GROUP BY DATE_TRUNC('month', e."expenseDate"::date)
)
SELECT 
    COALESCE(s.month_date, e.month_date) AS month_date,
    TO_CHAR(COALESCE(s.month_date, e.month_date), 'YYYY-MM') AS month_label,
    COALESCE(s.revenue, 0.00) AS total_revenue,
    COALESCE(s.cogs, 0.00) AS total_cogs,
    COALESCE(s.gross_profit, 0.00) AS gross_profit,
    COALESCE(e.expenses, 0.00) AS total_expenses,
    (COALESCE(s.gross_profit, 0.00) - COALESCE(e.expenses, 0.00))::numeric(12,2) AS net_profit,
    CASE 
        WHEN COALESCE(s.revenue, 0.00) > 0 
        THEN ROUND((COALESCE(s.gross_profit, 0.00) / s.revenue * 100)::numeric, 2)
        ELSE 0.00 
    END AS gross_profit_margin_pct,
    CASE 
        WHEN COALESCE(s.revenue, 0.00) > 0 
        THEN ROUND(((COALESCE(s.gross_profit, 0.00) - COALESCE(e.expenses, 0.00)) / s.revenue * 100)::numeric, 2)
        ELSE 0.00 
    END AS net_profit_margin_pct,
    COALESCE(s.order_count, 0) AS total_orders
FROM monthly_sales s
FULL OUTER JOIN monthly_expenses e ON s.month_date = e.month_date
ORDER BY month_date ASC;
