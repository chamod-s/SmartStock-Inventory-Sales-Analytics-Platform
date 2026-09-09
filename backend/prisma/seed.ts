import { PrismaClient, UserRole, PaymentMethod, TransactionType, PurchaseStatus, SaleStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting SmartStock Database Seeding...');

  // Clean existing data in reverse dependency order
  await prisma.auditLog.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.inventoryTransaction.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.saleItem.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.purchaseItem.deleteMany();
  await prisma.purchase.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.user.deleteMany();

  console.log('🧹 Cleaned existing database records.');

  // 1. Seed Users (1 Admin, 2 Managers, 3 Cashiers)
  const defaultPasswordHash = bcrypt.hashSync('SmartStock2026!', 10);

  const usersData = [
    { email: 'admin@smartstock.com', name: 'Eleanor Vance (Admin)', role: UserRole.ADMIN, phone: '+1-555-0100', passwordHash: defaultPasswordHash },
    { email: 'manager1@smartstock.com', name: 'Marcus Brody (Ops Manager)', role: UserRole.MANAGER, phone: '+1-555-0101', passwordHash: defaultPasswordHash },
    { email: 'manager2@smartstock.com', name: 'Sophia Chen (Store Manager)', role: UserRole.MANAGER, phone: '+1-555-0102', passwordHash: defaultPasswordHash },
    { email: 'cashier1@smartstock.com', name: 'James Wilson (Senior Cashier)', role: UserRole.CASHIER, phone: '+1-555-0103', passwordHash: defaultPasswordHash },
    { email: 'cashier2@smartstock.com', name: 'Amara Patel (Cashier)', role: UserRole.CASHIER, phone: '+1-555-0104', passwordHash: defaultPasswordHash },
    { email: 'cashier3@smartstock.com', name: 'Lucas Rodriguez (Cashier)', role: UserRole.CASHIER, phone: '+1-555-0105', passwordHash: defaultPasswordHash },
  ];

  const createdUsers = [];
  for (const u of usersData) {
    const user = await prisma.user.create({ data: u });
    createdUsers.push(user);
  }
  console.log(`✅ Seeded ${createdUsers.length} Users (1 Admin, 2 Managers, 3 Cashiers)`);

  const adminUser = createdUsers[0];
  const managerUser = createdUsers[1];
  const cashierUser = createdUsers[3];

  // 2. Seed Categories (8 Categories)
  const categoriesData = [
    { name: 'Electronics & Gadgets', slug: 'electronics-gadgets', description: 'Smartphones, audio gear, accessories, and computing peripherals.' },
    { name: 'Office Supplies', slug: 'office-supplies', description: 'Stationery, paper products, desk organizers, and writing instruments.' },
    { name: 'Beverages & Drinks', slug: 'beverages-drinks', description: 'Cold drinks, juices, coffee beans, tea, and energy beverages.' },
    { name: 'Packaged Groceries', slug: 'packaged-groceries', description: 'Pantry staples, canned foods, snacks, and condiments.' },
    { name: 'Apparel & Wearables', slug: 'apparel-wearables', description: 'Corporate merch, t-shirts, uniforms, and protective workwear.' },
    { name: 'Hardware & Tools', slug: 'hardware-tools', description: 'Hand tools, fasteners, electrical accessories, and safety equipment.' },
    { name: 'Personal Care', slug: 'personal-care', description: 'Hygiene items, soaps, sanitizers, and wellness products.' },
    { name: 'Home Appliances', slug: 'home-appliances', description: 'Small kitchen appliances, fans, purifiers, and lighting.' },
  ];

  const createdCategories = [];
  for (const c of categoriesData) {
    const cat = await prisma.category.create({ data: c });
    createdCategories.push(cat);
  }
  console.log(`✅ Seeded ${createdCategories.length} Categories`);

  // 3. Seed Suppliers (10 Suppliers)
  const suppliersData = [
    { code: 'SUP-001', name: 'Nexus Tech Global Ltd', contactPerson: 'David Miller', email: 'sales@nexustech.com', phone: '+1-800-555-0190', address: '100 Tech Parkway, San Jose, CA', taxId: 'TAX-998811' },
    { code: 'SUP-002', name: 'PaperCraft Supplies Co', contactPerson: 'Sarah Jenkins', email: 'orders@papercraft.com', phone: '+1-800-555-0191', address: '45 Industrial Ave, Chicago, IL', taxId: 'TAX-998812' },
    { code: 'SUP-003', name: 'Apex Beverage Distributors', contactPerson: 'Robert Garcia', email: 'supply@apexbev.com', phone: '+1-800-555-0192', address: '88 Refreshment Blvd, Atlanta, GA', taxId: 'TAX-998813' },
    { code: 'SUP-004', name: 'Prime Grocers Wholesale', contactPerson: 'Linda Thorne', email: 'wholesale@primegroceries.com', phone: '+1-800-555-0193', address: '12 Logistics Center, Dallas, TX', taxId: 'TAX-998814' },
    { code: 'SUP-005', name: 'Vanguard Textiles & Uniforms', contactPerson: 'Michael Chang', email: 'info@vanguardtextiles.com', phone: '+1-800-555-0194', address: '77 Garment District, New York, NY', taxId: 'TAX-998815' },
    { code: 'SUP-006', name: 'Titan Hardware Direct', contactPerson: 'Karen O\'Connor', email: 'orders@titanhardware.com', phone: '+1-800-555-0195', address: '300 Steel Works Rd, Pittsburgh, PA', taxId: 'TAX-998816' },
    { code: 'SUP-007', name: 'PureLife Hygiene Corp', contactPerson: 'Antoine Dubois', email: 'support@purelifehygiene.com', phone: '+1-800-555-0196', address: '55 Wellness Lane, Miami, FL', taxId: 'TAX-998817' },
    { code: 'SUP-008', name: 'ElectroHome Appliance Inc', contactPerson: 'Emily Watson', email: 'sales@electrohome.com', phone: '+1-800-555-0197', address: '22 Innovation Drive, Seattle, WA', taxId: 'TAX-998818' },
    { code: 'SUP-009', name: 'Global Logistics Trading', contactPerson: 'Victor Ross', email: 'contact@globallogistics.com', phone: '+1-800-555-0198', address: '99 Harbor View, Los Angeles, CA', taxId: 'TAX-998819' },
    { code: 'SUP-010', name: 'Omni Import & Wholesale', contactPerson: 'Hannah Abbott', email: 'orders@omniimport.com', phone: '+1-800-555-0199', address: '15 Trade Zone, Boston, MA', taxId: 'TAX-998820' },
  ];

  const createdSuppliers = [];
  for (const s of suppliersData) {
    const sup = await prisma.supplier.create({ data: s });
    createdSuppliers.push(sup);
  }
  console.log(`✅ Seeded ${createdSuppliers.length} Suppliers`);

  // 4. Seed Customers (50 Customers)
  const createdCustomers = [];
  for (let i = 1; i <= 50; i++) {
    const padId = i.toString().padStart(3, '0');
    const cust = await prisma.customer.create({
      data: {
        code: `CUST-${padId}`,
        name: `Customer Client ${i}`,
        email: `client${i}@example.com`,
        phone: `+1-555-${(2000 + i).toString()}`,
        address: `${i * 10} Business Park Suite ${i}, Cityville`,
        creditLimit: i % 5 === 0 ? 5000.00 : 1000.00,
        totalSpent: 0.00,
      }
    });
    createdCustomers.push(cust);
  }
  console.log(`✅ Seeded ${createdCustomers.length} Customers`);

  // 5. Seed Products (30 Products)
  const productsRaw = [
    // Electronics (0)
    { categoryId: createdCategories[0].id, name: 'Wireless Bluetooth Headset Pro', sku: 'SKU-ELE-001', purchasePrice: 45.00, sellingPrice: 89.99, currentStock: 45, reorderLevel: 10, unit: 'pcs' },
    { categoryId: createdCategories[0].id, name: 'Ergonomic Optical Wireless Mouse', sku: 'SKU-ELE-002', purchasePrice: 12.50, sellingPrice: 24.99, currentStock: 80, reorderLevel: 15, unit: 'pcs' },
    { categoryId: createdCategories[0].id, name: 'Mechanical RGB Gaming Keyboard', sku: 'SKU-ELE-003', purchasePrice: 38.00, sellingPrice: 74.99, currentStock: 30, reorderLevel: 10, unit: 'pcs' },
    { categoryId: createdCategories[0].id, name: '4K Ultra-HD Monitor 27-inch', sku: 'SKU-ELE-004', purchasePrice: 180.00, sellingPrice: 299.99, currentStock: 12, reorderLevel: 5, unit: 'pcs' },

    // Office Supplies (1)
    { categoryId: createdCategories[1].id, name: 'A4 Premium Copy Paper 500 Sheets', sku: 'SKU-OFF-001', purchasePrice: 3.20, sellingPrice: 6.99, currentStock: 250, reorderLevel: 50, unit: 'ream' },
    { categoryId: createdCategories[1].id, name: 'Gel Ink Rollerball Pens (Box of 12)', sku: 'SKU-OFF-002', purchasePrice: 4.50, sellingPrice: 9.99, currentStock: 120, reorderLevel: 20, unit: 'box' },
    { categoryId: createdCategories[1].id, name: 'Heavy-Duty Desktop Stapler', sku: 'SKU-OFF-003', purchasePrice: 7.00, sellingPrice: 14.49, currentStock: 40, reorderLevel: 10, unit: 'pcs' },
    { categoryId: createdCategories[1].id, name: 'Adjustable Mesh Executive Chair', sku: 'SKU-OFF-004', purchasePrice: 95.00, sellingPrice: 189.99, currentStock: 8, reorderLevel: 3, unit: 'pcs' },

    // Beverages & Drinks (2)
    { categoryId: createdCategories[2].id, name: 'Arabica Whole Bean Coffee 1kg', sku: 'SKU-BEV-001', purchasePrice: 11.00, sellingPrice: 21.99, currentStock: 60, reorderLevel: 15, unit: 'bag' },
    { categoryId: createdCategories[2].id, name: 'Organic Green Tea (Box of 50 Bags)', sku: 'SKU-BEV-002', purchasePrice: 3.80, sellingPrice: 7.99, currentStock: 90, reorderLevel: 20, unit: 'box' },
    { categoryId: createdCategories[2].id, name: 'Sparkling Mineral Water 500ml (Pack 12)', sku: 'SKU-BEV-003', purchasePrice: 6.00, sellingPrice: 12.99, currentStock: 75, reorderLevel: 15, unit: 'pack' },
    { categoryId: createdCategories[2].id, name: 'Natural Cold Pressed Citrus Juice 1L', sku: 'SKU-BEV-004', purchasePrice: 2.20, sellingPrice: 4.99, currentStock: 40, reorderLevel: 10, unit: 'bottle' },

    // Packaged Groceries (3)
    { categoryId: createdCategories[3].id, name: 'Organic Extra Virgin Olive Oil 750ml', sku: 'SKU-GRO-001', purchasePrice: 7.50, sellingPrice: 14.99, currentStock: 50, reorderLevel: 12, unit: 'bottle' },
    { categoryId: createdCategories[3].id, name: 'Wholegrain Oats 1kg', sku: 'SKU-GRO-002', purchasePrice: 2.10, sellingPrice: 4.49, currentStock: 110, reorderLevel: 25, unit: 'pack' },
    { categoryId: createdCategories[3].id, name: 'Raw Honey Jar 500g', sku: 'SKU-GRO-003', purchasePrice: 4.80, sellingPrice: 9.99, currentStock: 65, reorderLevel: 15, unit: 'jar' },
    { categoryId: createdCategories[3].id, name: 'Assorted Roasted Almonds 250g', sku: 'SKU-GRO-004', purchasePrice: 3.50, sellingPrice: 7.49, currentStock: 85, reorderLevel: 20, unit: 'pack' },

    // Apparel & Wearables (4)
    { categoryId: createdCategories[4].id, name: '100% Cotton Polo Shirt (Medium)', sku: 'SKU-APP-001', purchasePrice: 9.00, sellingPrice: 19.99, currentStock: 95, reorderLevel: 20, unit: 'pcs' },
    { categoryId: createdCategories[4].id, name: 'High-Visibility Safety Vest', sku: 'SKU-APP-002', purchasePrice: 5.20, sellingPrice: 11.99, currentStock: 140, reorderLevel: 30, unit: 'pcs' },
    { categoryId: createdCategories[4].id, name: 'Waterproof Work Gloves (Pair)', sku: 'SKU-APP-003', purchasePrice: 2.80, sellingPrice: 6.49, currentStock: 180, reorderLevel: 40, unit: 'pair' },
    { categoryId: createdCategories[4].id, name: 'Breathable Fleece Jacket (Large)', sku: 'SKU-APP-004', purchasePrice: 22.00, sellingPrice: 44.99, currentStock: 35, reorderLevel: 10, unit: 'pcs' },

    // Hardware & Tools (5)
    { categoryId: createdCategories[5].id, name: '20V Cordless Power Drill Set', sku: 'SKU-HAR-001', purchasePrice: 55.00, sellingPrice: 109.99, currentStock: 22, reorderLevel: 5, unit: 'set' },
    { categoryId: createdCategories[5].id, name: 'Professional Precision Screwdriver Kit', sku: 'SKU-HAR-002', purchasePrice: 8.50, sellingPrice: 17.99, currentStock: 55, reorderLevel: 12, unit: 'set' },
    { categoryId: createdCategories[5].id, name: 'Digital Laser Distance Meter 50m', sku: 'SKU-HAR-003', purchasePrice: 18.00, sellingPrice: 36.99, currentStock: 28, reorderLevel: 8, unit: 'pcs' },
    { categoryId: createdCategories[5].id, name: 'Heavy-Duty Steel Measuring Tape 8m', sku: 'SKU-HAR-004', purchasePrice: 3.50, sellingPrice: 7.99, currentStock: 90, reorderLevel: 20, unit: 'pcs' },

    // Personal Care (6)
    { categoryId: createdCategories[6].id, name: 'Antibacterial Hand Sanitizer 500ml', sku: 'SKU-PER-001', purchasePrice: 1.80, sellingPrice: 3.99, currentStock: 300, reorderLevel: 50, unit: 'bottle' },
    { categoryId: createdCategories[6].id, name: 'Gentle Moisturizing Hand Soap 1L', sku: 'SKU-PER-002', purchasePrice: 2.50, sellingPrice: 5.49, currentStock: 150, reorderLevel: 30, unit: 'bottle' },
    { categoryId: createdCategories[6].id, name: 'Microfiber Facial Towels (Pack of 4)', sku: 'SKU-PER-003', purchasePrice: 3.00, sellingPrice: 6.99, currentStock: 70, reorderLevel: 15, unit: 'pack' },

    // Home Appliances (7)
    { categoryId: createdCategories[7].id, name: 'Electric Stainless Steel Kettle 1.7L', sku: 'SKU-HOM-001', purchasePrice: 14.00, sellingPrice: 27.99, currentStock: 32, reorderLevel: 8, unit: 'pcs' },
    { categoryId: createdCategories[7].id, name: 'HEPA Air Purifier Desktop Size', sku: 'SKU-HOM-002', purchasePrice: 42.00, sellingPrice: 84.99, currentStock: 18, reorderLevel: 5, unit: 'pcs' },
    { categoryId: createdCategories[7].id, name: 'Compact Digital Microwave Oven 20L', sku: 'SKU-HOM-003', purchasePrice: 58.00, sellingPrice: 114.99, currentStock: 15, reorderLevel: 4, unit: 'pcs' },
  ];

  const createdProducts = [];
  for (const p of productsRaw) {
    const prod = await prisma.product.create({ data: p });
    createdProducts.push(prod);
  }
  console.log(`✅ Seeded ${createdProducts.length} Products`);

  // 6. Seed Purchases & PurchaseItems (3 Inventory Replenishment Orders)
  const purchase1 = await prisma.purchase.create({
    data: {
      purchaseOrderNumber: 'PO-2026-0001',
      supplierId: createdSuppliers[0].id,
      userId: managerUser.id,
      totalAmount: 2470.00,
      status: PurchaseStatus.RECEIVED,
      notes: 'Initial Q3 stock replenishment for Electronics',
      items: {
        create: [
          { productId: createdProducts[0].id, quantity: 30, unitCost: 45.00, subtotal: 1350.00 },
          { productId: createdProducts[1].id, quantity: 40, unitCost: 12.50, subtotal: 500.00 },
          { productId: createdProducts[2].id, quantity: 16, unitCost: 38.00, subtotal: 620.00 },
        ]
      }
    }
  });

  const purchase2 = await prisma.purchase.create({
    data: {
      purchaseOrderNumber: 'PO-2026-0002',
      supplierId: createdSuppliers[1].id,
      userId: managerUser.id,
      totalAmount: 1180.00,
      status: PurchaseStatus.RECEIVED,
      notes: 'Monthly bulk paper and office stationery',
      items: {
        create: [
          { productId: createdProducts[4].id, quantity: 200, unitCost: 3.20, subtotal: 640.00 },
          { productId: createdProducts[5].id, quantity: 120, unitCost: 4.50, subtotal: 540.00 },
        ]
      }
    }
  });

  console.log('✅ Seeded Purchases and PurchaseItems');

  // 7. Seed Sales, SaleItems, and Payments (5 POS Checkout Transactions)
  const sale1 = await prisma.sale.create({
    data: {
      invoiceNumber: 'INV-2026-00101',
      customerId: createdCustomers[0].id,
      userId: cashierUser.id,
      subtotal: 189.98,
      taxAmount: 15.20,
      discountAmount: 5.00,
      totalAmount: 200.18,
      status: SaleStatus.COMPLETED,
      notes: 'POS Sale - Counter 1',
      items: {
        create: [
          { productId: createdProducts[0].id, quantity: 2, unitPrice: 89.99, subtotal: 179.98 },
          { productId: createdProducts[5].id, quantity: 1, unitPrice: 9.99, subtotal: 9.99 },
        ]
      },
      payments: {
        create: [
          { amount: 200.18, paymentMethod: PaymentMethod.CARD, transactionRef: 'TXN-CARD-99120' }
        ]
      }
    }
  });

  const sale2 = await prisma.sale.create({
    data: {
      invoiceNumber: 'INV-2026-00102',
      customerId: createdCustomers[1].id,
      userId: cashierUser.id,
      subtotal: 299.99,
      taxAmount: 24.00,
      discountAmount: 0.00,
      totalAmount: 323.99,
      status: SaleStatus.COMPLETED,
      notes: 'POS Sale - Corporate order',
      items: {
        create: [
          { productId: createdProducts[3].id, quantity: 1, unitPrice: 299.99, subtotal: 299.99 }
        ]
      },
      payments: {
        create: [
          { amount: 323.99, paymentMethod: PaymentMethod.BANK_TRANSFER, transactionRef: 'TRF-BANK-55112' }
        ]
      }
    }
  });

  await prisma.sale.create({
    data: {
      invoiceNumber: 'INV-2026-00103',
      customerId: createdCustomers[2].id,
      userId: cashierUser.id,
      subtotal: 44.97,
      taxAmount: 3.60,
      discountAmount: 0.00,
      totalAmount: 48.57,
      status: SaleStatus.COMPLETED,
      notes: 'Cash transaction',
      items: {
        create: [
          { productId: createdProducts[8].id, quantity: 1, unitPrice: 21.99, subtotal: 21.99 },
          { productId: createdProducts[12].id, quantity: 1, unitPrice: 14.99, subtotal: 14.99 },
          { productId: createdProducts[24].id, quantity: 2, unitPrice: 3.99, subtotal: 7.98 },
        ]
      },
      payments: {
        create: [
          { amount: 48.57, paymentMethod: PaymentMethod.CASH, transactionRef: 'CASH-POS-103' }
        ]
      }
    }
  });

  console.log('✅ Seeded Sales, SaleItems, and Payments');

  // Update totalSpent for active test customers
  await prisma.customer.update({ where: { id: createdCustomers[0].id }, data: { totalSpent: 200.18 } });
  await prisma.customer.update({ where: { id: createdCustomers[1].id }, data: { totalSpent: 323.99 } });
  await prisma.customer.update({ where: { id: createdCustomers[2].id }, data: { totalSpent: 48.57 } });

  // 8. Seed InventoryTransactions (Stock movements)
  await prisma.inventoryTransaction.createMany({
    data: [
      { productId: createdProducts[0].id, userId: managerUser.id, type: TransactionType.PURCHASE, quantity: 30, stockBefore: 17, stockAfter: 47, referenceId: purchase1.id, notes: 'Initial PO receive' },
      { productId: createdProducts[0].id, userId: cashierUser.id, type: TransactionType.SALE, quantity: -2, stockBefore: 47, stockAfter: 45, referenceId: sale1.id, notes: 'Sale checkout INV-2026-00101' },
      { productId: createdProducts[3].id, userId: cashierUser.id, type: TransactionType.SALE, quantity: -1, stockBefore: 13, stockAfter: 12, referenceId: sale2.id, notes: 'Sale checkout INV-2026-00102' },
      { productId: createdProducts[4].id, userId: managerUser.id, type: TransactionType.PURCHASE, quantity: 200, stockBefore: 50, stockAfter: 250, referenceId: purchase2.id, notes: 'Stock replenishment' },
      { productId: createdProducts[20].id, userId: managerUser.id, type: TransactionType.ADJUSTMENT, quantity: -2, stockBefore: 24, stockAfter: 22, referenceId: 'ADJ-2026-01', notes: 'Damaged item removed during audit' },
    ]
  });
  console.log('✅ Seeded InventoryTransactions');

  // 9. Seed Expenses (Operational Business Expenses)
  await prisma.expense.createMany({
    data: [
      { userId: adminUser.id, category: 'Rent', amount: 3500.00, description: 'Main Store Warehouse Rent - September 2026', expenseDate: new Date('2026-09-01') },
      { userId: managerUser.id, category: 'Utilities', amount: 620.50, description: 'Electricity and Power Bill', expenseDate: new Date('2026-09-03') },
      { userId: managerUser.id, category: 'Internet', amount: 150.00, description: 'High-speed Fiber Business Connection', expenseDate: new Date('2026-09-05') },
      { userId: adminUser.id, category: 'Marketing', amount: 800.00, description: 'Local Digital & Social Media Ad Campaign', expenseDate: new Date('2026-09-07') },
    ]
  });
  console.log('✅ Seeded Operational Expenses');

  // 10. Seed Audit Logs
  await prisma.auditLog.createMany({
    data: [
      { userId: adminUser.id, action: 'SYSTEM_INIT', entity: 'System', entityId: 'sys-root', details: 'Database initialized and seeded successfully.', ipAddress: '127.0.0.1' },
      { userId: managerUser.id, action: 'PURCHASE_RECEIVE', entity: 'Purchase', entityId: purchase1.id, details: 'Received purchase order PO-2026-0001', ipAddress: '192.168.1.50' },
      { userId: cashierUser.id, action: 'SALE_COMPLETE', entity: 'Sale', entityId: sale1.id, details: 'Completed sale INV-2026-00101 for $200.18', ipAddress: '192.168.1.101' },
    ]
  });
  console.log('✅ Seeded System Audit Logs');

  console.log('\n🎉 SmartStock Database Seeding Completed Successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
