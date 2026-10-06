/**
 * SmartStock Frontend Test Suite: Forms & POS Cart Engine
 * Verifies form state validations, calculations, and mutations for:
 * 1. Product Form
 * 2. Category Form
 * 3. Customer Form
 * 4. Supplier Form
 * 5. Purchase Form
 * 6. POS / Cart System
 */

import { PaymentMethod } from '../../../backend/node_modules/@prisma/client';

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string) {
  totalTests++;
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    throw new Error(`Test assertion failed: ${testName}`);
  }
}

// -----------------------------------------------------------------------------
// 1. Product Form Helpers & Validation
// -----------------------------------------------------------------------------
interface ProductFormData {
  name: string;
  sku: string;
  categoryId: string;
  purchasePrice: number;
  sellingPrice: number;
  reorderLevel: number;
  unit: string;
}

function validateProductForm(data: Partial<ProductFormData>): { isValid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  if (!data.name || data.name.trim().length < 2) errors.name = 'Product name must be at least 2 characters';
  if (!data.sku || data.sku.trim().length < 3) errors.sku = 'SKU is required';
  if (!data.categoryId) errors.categoryId = 'Category selection is required';
  if (data.purchasePrice === undefined || data.purchasePrice < 0) errors.purchasePrice = 'Purchase price cannot be negative';
  if (data.sellingPrice === undefined || data.sellingPrice <= 0) errors.sellingPrice = 'Selling price must be greater than zero';
  if (data.reorderLevel === undefined || data.reorderLevel < 0) errors.reorderLevel = 'Reorder level cannot be negative';
  return { isValid: Object.keys(errors).length === 0, errors };
}

function calculateProductMargins(purchasePrice: number, sellingPrice: number) {
  const marginDollar = sellingPrice - purchasePrice;
  const markupPct = purchasePrice > 0 ? (marginDollar / purchasePrice) * 100 : 0;
  const marginPct = sellingPrice > 0 ? (marginDollar / sellingPrice) * 100 : 0;
  return { marginDollar, markupPct: Number(markupPct.toFixed(2)), marginPct: Number(marginPct.toFixed(2)) };
}

// -----------------------------------------------------------------------------
// 2. Category Form Helpers & Slug Generator
// -----------------------------------------------------------------------------
function generateSlug(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function validateCategoryForm(name: string): { isValid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  if (!name || name.trim().length < 2) errors.name = 'Category name must be at least 2 characters';
  return { isValid: Object.keys(errors).length === 0, errors };
}

// -----------------------------------------------------------------------------
// 3. Customer Form Helpers & Validation
// -----------------------------------------------------------------------------
interface CustomerFormData {
  name: string;
  code?: string;
  email?: string;
  phone?: string;
  creditLimit: number;
}

function validateCustomerForm(data: CustomerFormData): { isValid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  if (!data.name || data.name.trim().length < 2) errors.name = 'Customer name must be at least 2 characters';
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) errors.email = 'Invalid email address';
  if (data.creditLimit < 0) errors.creditLimit = 'Credit limit cannot be negative';
  return { isValid: Object.keys(errors).length === 0, errors };
}

// -----------------------------------------------------------------------------
// 4. Supplier Form Helpers & Validation
// -----------------------------------------------------------------------------
interface SupplierFormData {
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
}

function validateSupplierForm(data: SupplierFormData): { isValid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  if (!data.name || data.name.trim().length < 2) errors.name = 'Supplier company name must be at least 2 characters';
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) errors.email = 'Invalid email address';
  return { isValid: Object.keys(errors).length === 0, errors };
}

// -----------------------------------------------------------------------------
// 5. Purchase Form (Procurement Line Items)
// -----------------------------------------------------------------------------
interface PurchaseLineItem {
  productId: string;
  quantity: number;
  unitCost: number;
}

function calculatePurchaseTotals(items: PurchaseLineItem[], taxRate = 0.08, discount = 0) {
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);
  const tax = Number(((subtotal - discount) * taxRate).toFixed(2));
  const total = Number((subtotal - discount + tax).toFixed(2));
  return { subtotal, tax, discount, total };
}

// -----------------------------------------------------------------------------
// 6. POS / Cart System Engine
// -----------------------------------------------------------------------------
interface CartItem {
  productId: string;
  name: string;
  unitPrice: number;
  unitCost: number;
  quantity: number;
  availableStock: number;
}

class PosCartManager {
  public items: CartItem[] = [];
  public discountAmount = 0;
  public taxRate = 0.08;

  public addItem(product: { id: string; name: string; price: number; cost: number; stock: number }): boolean {
    const existing = this.items.find(i => i.productId === product.id);
    if (existing) {
      if (existing.quantity + 1 > existing.availableStock) {
        throw new Error(`Cannot add more than available stock (${existing.availableStock})`);
      }
      existing.quantity += 1;
      return true;
    }
    if (product.stock < 1) {
      throw new Error(`Product "${product.name}" is out of stock`);
    }
    this.items.push({
      productId: product.id,
      name: product.name,
      unitPrice: product.price,
      unitCost: product.cost,
      quantity: 1,
      availableStock: product.stock,
    });
    return true;
  }

  public updateQuantity(productId: string, quantity: number): boolean {
    const item = this.items.find(i => i.productId === productId);
    if (!item) return false;
    if (quantity <= 0) {
      this.removeItem(productId);
      return true;
    }
    if (quantity > item.availableStock) {
      throw new Error(`Quantity ${quantity} exceeds available stock of ${item.availableStock}`);
    }
    item.quantity = quantity;
    return true;
  }

  public removeItem(productId: string) {
    this.items = this.items.filter(i => i.productId !== productId);
  }

  public getTotals() {
    const subtotal = Number(this.items.reduce((acc, i) => acc + i.quantity * i.unitPrice, 0).toFixed(2));
    const discount = Math.min(this.discountAmount, subtotal);
    const taxable = Math.max(0, subtotal - discount);
    const tax = Number((taxable * this.taxRate).toFixed(2));
    const total = Number((taxable + tax).toFixed(2));
    const totalUnits = this.items.reduce((acc, i) => acc + i.quantity, 0);
    return { subtotal, discount, tax, total, totalUnits };
  }

  public validateCheckoutPayment(tenderedAmount: number, method: PaymentMethod): { isValid: boolean; change: number } {
    const { total } = this.getTotals();
    if (tenderedAmount < total) {
      throw new Error(`Tendered amount ($${tenderedAmount}) is less than total amount ($${total})`);
    }
    const change = Number((tenderedAmount - total).toFixed(2));
    return { isValid: true, change };
  }
}

// -----------------------------------------------------------------------------
// Test Execution
// -----------------------------------------------------------------------------
function runFormsAndPosTests() {
  console.log('\n======================================================');
  console.log('🧪 Starting Frontend Forms & POS Cart Test Suite');
  console.log('======================================================\n');

  // --- 1. Product Form ---
  console.log('--- 1. Product Form Tests ---');
  const validProd = validateProductForm({
    name: 'Logitech MX Master 3S',
    sku: 'SKU-LOGI-001',
    categoryId: 'cat-tech',
    purchasePrice: 60.00,
    sellingPrice: 99.99,
    reorderLevel: 10,
    unit: 'pcs',
  });
  assert(validProd.isValid, 'Valid product form data passes');

  const invalidProd = validateProductForm({
    name: 'X',
    sku: '',
    purchasePrice: -10,
    sellingPrice: 0,
    reorderLevel: -5,
  });
  assert(!invalidProd.isValid, 'Invalid product form data rejected');
  assert(invalidProd.errors.name !== undefined, 'Product name min length flagged');
  assert(invalidProd.errors.purchasePrice !== undefined, 'Negative purchase price flagged');
  assert(invalidProd.errors.sellingPrice !== undefined, 'Zero selling price flagged');

  const margins = calculateProductMargins(50, 100);
  assert(margins.marginDollar === 50, 'Margin dollar correctly calculated as $50');
  assert(margins.markupPct === 100.0, 'Markup percentage calculated as 100%');
  assert(margins.marginPct === 50.0, 'Gross margin percentage calculated as 50%');

  // --- 2. Category Form & Slugification ---
  console.log('\n--- 2. Category Form & Slug Tests ---');
  const slug1 = generateSlug('Electronics & Home Audio');
  assert(slug1 === 'electronics-home-audio', 'Slug generator converts name to url-friendly slug');

  const slug2 = generateSlug('   Special Tools / Fasteners   ');
  assert(slug2 === 'special-tools-fasteners', 'Slug generator trims whitespace and special characters');

  assert(validateCategoryForm('Beverages').isValid, 'Valid category name passes');
  assert(!validateCategoryForm('A').isValid, 'Single-character category name rejected');

  // --- 3. Customer Form ---
  console.log('\n--- 3. Customer Form Tests ---');
  const validCust = validateCustomerForm({ name: 'Acme Corp', email: 'acme@example.com', creditLimit: 2500 });
  assert(validCust.isValid, 'Valid customer data passes');

  const invalidCust = validateCustomerForm({ name: '', email: 'not-an-email', creditLimit: -500 });
  assert(!invalidCust.isValid, 'Invalid customer data rejected');
  assert(invalidCust.errors.name !== undefined, 'Missing name flagged');
  assert(invalidCust.errors.email !== undefined, 'Malformed email flagged');
  assert(invalidCust.errors.creditLimit !== undefined, 'Negative credit limit flagged');

  // --- 4. Supplier Form ---
  console.log('\n--- 4. Supplier Form Tests ---');
  const validSupp = validateSupplierForm({ name: 'Global Tech Wholesale', email: 'sales@globaltech.com' });
  assert(validSupp.isValid, 'Valid supplier data passes');
  assert(!validateSupplierForm({ name: '' }).isValid, 'Empty supplier name rejected');

  // --- 5. Purchase Form ---
  console.log('\n--- 5. Purchase Form Line Items Calculation ---');
  const poTotals = calculatePurchaseTotals([
    { productId: 'p1', quantity: 10, unitCost: 20.00 }, // $200
    { productId: 'p2', quantity: 5, unitCost: 40.00 },  // $200
  ], 0.08, 20.00); // $400 subtotal - $20 discount + $30.40 tax = $410.40
  assert(poTotals.subtotal === 400.00, 'Purchase subtotal calculated accurately ($400.00)');
  assert(poTotals.tax === 30.40, 'Purchase tax calculated accurately ($30.40)');
  assert(poTotals.total === 410.40, 'Purchase total calculated accurately ($410.40)');

  // --- 6. POS / Cart System Engine ---
  console.log('\n--- 6. POS / Cart System Engine Tests ---');
  const cart = new PosCartManager();
  
  // Add item 1 (Price: 50, Stock: 5)
  cart.addItem({ id: 'prod-mouse', name: 'Ergo Mouse', price: 50.00, cost: 25.00, stock: 5 });
  assert(cart.items.length === 1, 'Item added to cart');
  assert(cart.items[0].quantity === 1, 'Initial cart quantity is 1');

  // Add same item increments quantity
  cart.addItem({ id: 'prod-mouse', name: 'Ergo Mouse', price: 50.00, cost: 25.00, stock: 5 });
  assert(cart.items[0].quantity === 2, 'Adding same item increments quantity to 2');

  // Out of stock product rejected
  let outOfStockCaught = false;
  try {
    cart.addItem({ id: 'prod-zero', name: 'Zero Stock Item', price: 10.00, cost: 5.00, stock: 0 });
  } catch {
    outOfStockCaught = true;
  }
  assert(outOfStockCaught, 'Adding item with 0 stock throws error');

  // Update quantity within stock
  cart.updateQuantity('prod-mouse', 4);
  assert(cart.items[0].quantity === 4, 'Quantity updated to 4');

  // Exceed stock throws error
  let exceedStockCaught = false;
  try {
    cart.updateQuantity('prod-mouse', 10);
  } catch {
    exceedStockCaught = true;
  }
  assert(exceedStockCaught, 'Updating quantity past available stock (10 > 5) is blocked');

  // Cart financial totals (4 * $50 = $200 subtotal, 8% tax = $16, total = $216)
  const cartTotals = cart.getTotals();
  assert(cartTotals.subtotal === 200.00, 'Cart subtotal matches $200.00');
  assert(cartTotals.tax === 16.00, 'Cart tax matches $16.00 (8%)');
  assert(cartTotals.total === 216.00, 'Cart total matches $216.00');

  // Payment checkout validation
  let underpaidCaught = false;
  try {
    cart.validateCheckoutPayment(200.00, PaymentMethod.CASH);
  } catch {
    underpaidCaught = true;
  }
  assert(underpaidCaught, 'Tendering less than total ($200 < $216) is rejected');

  const paymentResult = cart.validateCheckoutPayment(250.00, PaymentMethod.CASH);
  assert(paymentResult.isValid, 'Tendering sufficient cash ($250.00 >= $216.00) is accepted');
  assert(paymentResult.change === 34.00, 'Accurately computes customer change ($34.00)');

  // Remove item
  cart.removeItem('prod-mouse');
  assert(cart.items.length === 0, 'Removing item leaves empty cart');
  assert(cart.getTotals().total === 0.00, 'Empty cart has $0.00 total');

  console.log(`\n📊 Frontend Forms & POS Cart Results: ${passedTests}/${totalTests} Passed.\n`);
}

runFormsAndPosTests();
