#!/usr/bin/env node
/**
 * Generates 60 demo CSV files for Vyapar AI:
 * 5 business types × 4 city tiers × 3 file types (sales, expenses, inventory)
 * 50 rows each, realistic Indian shop data
 */

const fs = require('fs');
const path = require('path');

const BUSINESS_TYPES = ['kirana', 'salon', 'pharmacy', 'restaurant', 'other'];
const CITY_TIERS = ['tier1', 'tier2', 'tier3', 'rural'];

// ─── Business profiles ────────────────────────────────────────────────────────

const PROFILES = {
  kirana: {
    salesItems: [
      'Rice 1kg', 'Wheat Flour 1kg', 'Sugar 1kg', 'Cooking Oil 1L',
      'Tea Powder 250g', 'Biscuits Pack', 'Detergent 500g', 'Salt 1kg',
      'Pulses 500g', 'Soap Bar', 'Shampoo Sachet', 'Toothpaste 100g',
      'Bread Loaf', 'Butter 100g', 'Milk 500ml',
    ],
    customers: ['Walk-in Customer', 'Ramesh Stores', 'Suresh Traders', 'Mahesh Shop', 'Lakshmi Store'],
    expenseCategories: ['inventory_purchase', 'rent', 'electricity', 'wages', 'transport', 'packaging', 'maintenance'],
    inventoryItems: [
      { name: 'Rice 25kg', unit_price: 1250 },
      { name: 'Wheat Flour 25kg', unit_price: 875 },
      { name: 'Sugar 25kg', unit_price: 950 },
      { name: 'Cooking Oil 15L', unit_price: 1650 },
      { name: 'Tea Powder 5kg', unit_price: 700 },
      { name: 'Pulses 10kg', unit_price: 800 },
      { name: 'Detergent 5kg', unit_price: 600 },
      { name: 'Salt 10kg', unit_price: 200 },
      { name: 'Biscuits Carton', unit_price: 900 },
      { name: 'Soap Dozen', unit_price: 300 },
    ],
    salesRange: { min: 2500, max: 7000 },
    expenseRange: { min: 800, max: 4500 },
    category: 'Groceries',
  },
  salon: {
    salesItems: [
      'Haircut', 'Shave', 'Facial', 'Hair Color', 'Head Massage',
      'Waxing', 'Threading', 'Manicure', 'Pedicure', 'Hair Spa',
      'Beard Trim', 'Hair Wash', 'Blow Dry', 'Straightening', 'Keratin Treatment',
    ],
    customers: ['Walk-in Customer', 'Regular Client', 'Priya Sharma', 'Rahul Verma', 'Sunita Devi'],
    expenseCategories: ['products', 'rent', 'electricity', 'wages', 'equipment', 'maintenance', 'supplies'],
    inventoryItems: [
      { name: 'Shampoo 1L', unit_price: 350 },
      { name: 'Conditioner 1L', unit_price: 400 },
      { name: 'Hair Color Kit', unit_price: 250 },
      { name: 'Wax Strips Pack', unit_price: 180 },
      { name: 'Facial Kit', unit_price: 450 },
      { name: 'Razor Blades Box', unit_price: 120 },
      { name: 'Nail Polish Set', unit_price: 300 },
      { name: 'Hair Serum 200ml', unit_price: 280 },
      { name: 'Threading Thread Roll', unit_price: 80 },
      { name: 'Towels Pack', unit_price: 600 },
    ],
    salesRange: { min: 1500, max: 5000 },
    expenseRange: { min: 500, max: 3000 },
    category: 'Beauty Services',
  },
  pharmacy: {
    salesItems: [
      'Paracetamol Strip', 'Cough Syrup', 'Antacid Tablets', 'Vitamin C Tablets',
      'Bandage Roll', 'Antiseptic Cream', 'Eye Drops', 'Nasal Spray',
      'Diabetes Strips', 'BP Tablets', 'Antibiotic Course', 'Multivitamin Bottle',
      'Calcium Tablets', 'Iron Supplement', 'Protein Powder 500g',
    ],
    customers: ['Walk-in Customer', 'Regular Patient', 'Dr. Sharma Prescription', 'Elderly Customer', 'Monthly Subscriber'],
    expenseCategories: ['medicine_purchase', 'rent', 'electricity', 'wages', 'cold_storage', 'license_fee', 'packaging'],
    inventoryItems: [
      { name: 'Paracetamol 500mg Box', unit_price: 1200 },
      { name: 'Cough Syrup Carton', unit_price: 2400 },
      { name: 'Antacid Tablets Box', unit_price: 900 },
      { name: 'Vitamin C Box', unit_price: 1500 },
      { name: 'Bandage Rolls Box', unit_price: 800 },
      { name: 'Antiseptic Cream Box', unit_price: 1100 },
      { name: 'Eye Drops Box', unit_price: 1800 },
      { name: 'Multivitamin Bottles', unit_price: 3500 },
      { name: 'Diabetes Strips Box', unit_price: 4200 },
      { name: 'BP Tablets Box', unit_price: 2800 },
    ],
    salesRange: { min: 3000, max: 9000 },
    expenseRange: { min: 1500, max: 6000 },
    category: 'Medicines',
  },
  restaurant: {
    salesItems: [
      'Thali (Veg)', 'Thali (Non-Veg)', 'Chai', 'Samosa', 'Paratha',
      'Dal Makhani', 'Paneer Butter Masala', 'Biryani', 'Lassi', 'Juice',
      'Dosa', 'Idli Plate', 'Poha', 'Upma', 'Sandwich',
    ],
    customers: ['Walk-in Customer', 'Office Lunch Order', 'Regular Diner', 'Delivery Order', 'Party Booking'],
    expenseCategories: ['raw_materials', 'rent', 'electricity', 'wages', 'gas_cylinder', 'packaging', 'maintenance'],
    inventoryItems: [
      { name: 'Rice 25kg', unit_price: 1250 },
      { name: 'Wheat Flour 25kg', unit_price: 875 },
      { name: 'Cooking Oil 15L', unit_price: 1650 },
      { name: 'Vegetables Bulk', unit_price: 800 },
      { name: 'Spices Assorted', unit_price: 600 },
      { name: 'Pulses 10kg', unit_price: 800 },
      { name: 'Milk 10L', unit_price: 500 },
      { name: 'Gas Cylinder', unit_price: 900 },
      { name: 'Disposable Plates Box', unit_price: 350 },
      { name: 'Paneer 1kg', unit_price: 350 },
    ],
    salesRange: { min: 3500, max: 10000 },
    expenseRange: { min: 2000, max: 7000 },
    category: 'Food & Beverages',
  },
  other: {
    salesItems: [
      'Product A', 'Product B', 'Service Charge', 'Repair Work', 'Consultation',
      'Item Pack', 'Custom Order', 'Bulk Supply', 'Retail Sale', 'Wholesale',
      'Spare Part', 'Installation', 'Delivery Charge', 'Premium Service', 'Standard Service',
    ],
    customers: ['Walk-in Customer', 'Regular Client', 'Corporate Order', 'Wholesale Buyer', 'Online Order'],
    expenseCategories: ['supplies', 'rent', 'electricity', 'wages', 'transport', 'maintenance', 'miscellaneous'],
    inventoryItems: [
      { name: 'Raw Material A', unit_price: 500 },
      { name: 'Raw Material B', unit_price: 750 },
      { name: 'Component Pack', unit_price: 400 },
      { name: 'Spare Parts Box', unit_price: 1200 },
      { name: 'Packaging Material', unit_price: 300 },
      { name: 'Tool Set', unit_price: 1500 },
      { name: 'Consumables Pack', unit_price: 600 },
      { name: 'Cleaning Supplies', unit_price: 250 },
      { name: 'Safety Equipment', unit_price: 800 },
      { name: 'Office Supplies', unit_price: 350 },
    ],
    salesRange: { min: 2000, max: 8000 },
    expenseRange: { min: 800, max: 5000 },
    category: 'General',
  },
};

// City tier multipliers (tier1 = metro, tier2 = mid, tier3 = small town, rural = village/rural market)
const TIER_MULTIPLIERS = {
  tier1: 1.6,
  tier2: 1.0,
  tier3: 0.65,
  rural: 0.45,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function rand(min, max) {
  return Math.round(min + Math.random() * (max - min));
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function dateStr(baseDate, offsetDays) {
  const d = new Date(baseDate);
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
}

// ─── Generators ───────────────────────────────────────────────────────────────

function generateSales(businessType, cityTier) {
  const profile = PROFILES[businessType];
  const mult = TIER_MULTIPLIERS[cityTier];
  const base = new Date('2024-01-01');
  const rows = ['date,item_name,amount,customer_name,category'];

  for (let i = 0; i < 50; i++) {  // 50 data rows
    const date = dateStr(base, i);
    const item = pick(profile.salesItems);
    const customer = pick(profile.customers);
    const amount = Math.round(rand(profile.salesRange.min, profile.salesRange.max) * mult);
    rows.push(`${date},${item},${amount},${customer},${profile.category}`);
  }
  return rows.join('\n');
}

function generateExpenses(businessType, cityTier) {
  const profile = PROFILES[businessType];
  const mult = TIER_MULTIPLIERS[cityTier];
  const base = new Date('2024-01-01');
  const rows = ['date,category,amount,description'];

  // Fixed monthly expenses first (rent, electricity)
  const rentAmount = Math.round(rand(8000, 20000) * mult);
  const elecAmount = Math.round(rand(1000, 3000) * mult);
  rows.push(`2024-01-01,rent,${rentAmount},Monthly shop rent`);
  rows.push(`2024-01-01,electricity,${elecAmount},Electricity bill`);
  rows.push(`2024-02-01,rent,${rentAmount},Monthly shop rent`);
  rows.push(`2024-02-01,electricity,${elecAmount},Electricity bill`);

  // Fill remaining 46 rows with variable expenses
  for (let i = 0; i < 46; i++) {
    const date = dateStr(base, i + 1);
    const category = pick(profile.expenseCategories.filter(c => c !== 'rent' && c !== 'electricity'));
    const amount = Math.round(rand(profile.expenseRange.min, profile.expenseRange.max) * mult);
    const desc = `${category.replace(/_/g, ' ')} expense`;
    rows.push(`${date},${category},${amount},${desc}`);
  }
  return rows.join('\n');
}

function generateInventory(businessType, cityTier) {
  const profile = PROFILES[businessType];
  const mult = TIER_MULTIPLIERS[cityTier];
  const rows = ['item_name,quantity,unit_price,category'];

  // Use all inventory items, then cycle if needed to reach 50
  for (let i = 0; i < 50; i++) {
    const item = profile.inventoryItems[i % profile.inventoryItems.length];
    const qty = rand(10, 100);
    const price = Math.round(item.unit_price * mult);
    rows.push(`${item.name},${qty},${price},${profile.category}`);
  }
  return rows.join('\n');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const outDir = path.join(__dirname, '..', 'public', 'demo-data');
fs.mkdirSync(outDir, { recursive: true });

let count = 0;
for (const biz of BUSINESS_TYPES) {
  for (const tier of CITY_TIERS) {
    const salesCSV = generateSales(biz, tier);
    const expensesCSV = generateExpenses(biz, tier);
    const inventoryCSV = generateInventory(biz, tier);

    fs.writeFileSync(path.join(outDir, `${biz}-${tier}-sales.csv`), salesCSV);
    fs.writeFileSync(path.join(outDir, `${biz}-${tier}-expenses.csv`), expensesCSV);
    fs.writeFileSync(path.join(outDir, `${biz}-${tier}-inventory.csv`), inventoryCSV);
    count += 3;
    console.log(`✓ ${biz}-${tier} (3 files)`);
  }
}

console.log(`\nDone. Generated ${count} CSV files in public/demo-data/`);
