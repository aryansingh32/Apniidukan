import { PrismaClient, RetailerStatus, OrderStatus, PaymentStatus, AdminRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const CATEGORY_IMG = (seed: string) => `https://picsum.photos/seed/cat-${seed}/400/400`;
const PRODUCT_IMG = (seed: string) => `https://picsum.photos/seed/prod-${seed}/500/500`;
const BANNER_IMG = (seed: string) => `https://picsum.photos/seed/banner-${seed}/900/400`;

async function main() {
  console.log('Clearing existing data...');
  await prisma.auditLog.deleteMany();
  await prisma.orderStatusHistory.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.scheme.deleteMany();
  await prisma.bulkPriceSlab.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.banner.deleteMany();
  await prisma.deliverySlot.deleteMany();
  await prisma.otpRequest.deleteMany();
  await prisma.retailer.deleteMany();
  await prisma.adminUser.deleteMany();

  console.log('Creating admin users...');
  const passwordHash = await bcrypt.hash('Admin@123', 10);
  const superAdmin = await prisma.adminUser.create({
    data: { email: 'admin@apniidukan.com', passwordHash, name: 'Aryan Singh', role: AdminRole.SUPER_ADMIN },
  });
  await prisma.adminUser.create({
    data: { email: 'ops@apniidukan.com', passwordHash, name: 'Operations Team', role: AdminRole.OPERATIONS },
  });
  await prisma.adminUser.create({
    data: { email: 'finance@apniidukan.com', passwordHash, name: 'Finance Team', role: AdminRole.FINANCE },
  });

  console.log('Creating categories...');
  const categoryDefs = [
    { name: 'Biscuits', seed: 'biscuits' },
    { name: 'Namkeen & Snacks', seed: 'namkeen' },
    { name: 'Beverages', seed: 'beverages' },
    { name: 'Personal Care', seed: 'personal-care' },
    { name: 'Home Care', seed: 'home-care' },
    { name: 'Soaps & Bath', seed: 'soaps' },
    { name: 'Detergents', seed: 'detergents' },
    { name: 'Grocery & Staples', seed: 'grocery' },
    { name: 'Dairy & Beverages Mix', seed: 'dairy' },
    { name: 'Stationery', seed: 'stationery' },
    { name: 'Chocolates & Confectionery', seed: 'chocolates' },
  ];
  const categories: Record<string, string> = {};
  for (let i = 0; i < categoryDefs.length; i++) {
    const c = categoryDefs[i];
    const created = await prisma.category.create({
      data: { name: c.name, imageUrl: CATEGORY_IMG(c.seed), sortOrder: i },
    });
    categories[c.name] = created.id;
  }

  console.log('Creating products...');
  type ProductSeed = {
    name: string;
    brand: string;
    category: string;
    packSize: string;
    unitsPerCase: number;
    mrpPerUnit: number;
    buyingPricePerCase: number;
    gstRate: number;
    hsnCode: string;
    sku: string;
    barcode: string;
    stockCases: number;
    imgSeed: string;
    slabs?: { minCases: number; maxCases: number | null; pricePerCase: number }[];
  };

  const products: ProductSeed[] = [
    { name: 'Parle-G Original Glucose Biscuits', brand: 'Parle', category: 'Biscuits', packSize: '100g', unitsPerCase: 96, mrpPerUnit: 10, buyingPricePerCase: 780, gstRate: 18, hsnCode: '19053100', sku: 'BIS-PARLEG-100', barcode: '8901012101015', stockCases: 240, imgSeed: 'parleg' },
    { name: 'Britannia Good Day Cashew Cookies', brand: 'Britannia', category: 'Biscuits', packSize: '150g', unitsPerCase: 48, mrpPerUnit: 30, buyingPricePerCase: 1080, gstRate: 18, hsnCode: '19053100', sku: 'BIS-GOODDAY-150', barcode: '8901063010013', stockCases: 150, imgSeed: 'goodday' },
    { name: 'Britannia Marie Gold', brand: 'Britannia', category: 'Biscuits', packSize: '200g', unitsPerCase: 48, mrpPerUnit: 35, buyingPricePerCase: 1260, gstRate: 18, hsnCode: '19053100', sku: 'BIS-MARIE-200', barcode: '8901063010037', stockCases: 90, imgSeed: 'marie' },
    { name: 'Oreo Original Chocolate Cream Biscuits', brand: 'Cadbury', category: 'Biscuits', packSize: '120g', unitsPerCase: 60, mrpPerUnit: 30, buyingPricePerCase: 1350, gstRate: 18, hsnCode: '19053100', sku: 'BIS-OREO-120', barcode: '7622210410018', stockCases: 60, imgSeed: 'oreo' },

    { name: 'Haldiram Aloo Bhujia', brand: "Haldiram's", category: 'Namkeen & Snacks', packSize: '200g', unitsPerCase: 40, mrpPerUnit: 45, buyingPricePerCase: 1440, gstRate: 12, hsnCode: '21069099', sku: 'NAM-BHUJIA-200', barcode: '8901725111019', stockCases: 120, imgSeed: 'bhujia' },
    { name: "Lay's India's Magic Masala", brand: 'PepsiCo', category: 'Namkeen & Snacks', packSize: '52g', unitsPerCase: 48, mrpPerUnit: 20, buyingPricePerCase: 768, gstRate: 12, hsnCode: '20059000', sku: 'NAM-LAYS-52', barcode: '8901063020013', stockCases: 8, imgSeed: 'lays' },
    { name: 'Kurkure Masala Munch', brand: 'PepsiCo', category: 'Namkeen & Snacks', packSize: '90g', unitsPerCase: 36, mrpPerUnit: 20, buyingPricePerCase: 576, gstRate: 12, hsnCode: '20059000', sku: 'NAM-KURKURE-90', barcode: '8901063030012', stockCases: 100, imgSeed: 'kurkure' },

    { name: 'Tata Tea Gold', brand: 'Tata Consumer', category: 'Beverages', packSize: '1kg', unitsPerCase: 10, mrpPerUnit: 560, buyingPricePerCase: 4900, gstRate: 5, hsnCode: '09024010', sku: 'BEV-TATAGOLD-1000', barcode: '8901063040011', stockCases: 45, imgSeed: 'tatagold' },
    { name: 'Nescafe Classic Instant Coffee', brand: 'Nestlé', category: 'Beverages', packSize: '50g', unitsPerCase: 48, mrpPerUnit: 180, buyingPricePerCase: 7776, gstRate: 18, hsnCode: '21011110', sku: 'BEV-NESCAFE-50', barcode: '8901058851226', stockCases: 30, imgSeed: 'nescafe' },
    { name: 'Bournvita Health Drink', brand: 'Cadbury', category: 'Beverages', packSize: '500g', unitsPerCase: 24, mrpPerUnit: 220, buyingPricePerCase: 4752, gstRate: 18, hsnCode: '19011010', sku: 'BEV-BOURNVITA-500', barcode: '8901058851233', stockCases: 25, imgSeed: 'bournvita' },
    { name: 'Real Fruit Power Mixed Fruit Juice', brand: 'Dabur', category: 'Beverages', packSize: '1L', unitsPerCase: 12, mrpPerUnit: 120, buyingPricePerCase: 1224, gstRate: 12, hsnCode: '20098990', sku: 'BEV-REAL-1000', barcode: '8901063050010', stockCases: 55, imgSeed: 'real' },

    { name: 'Colgate Strong Teeth Toothpaste', brand: 'Colgate-Palmolive', category: 'Personal Care', packSize: '200g', unitsPerCase: 48, mrpPerUnit: 105, buyingPricePerCase: 4320, gstRate: 18, hsnCode: '33061020', sku: 'PC-COLGATE-200', barcode: '8901063060019', stockCases: 70, imgSeed: 'colgate' },
    { name: 'Head & Shoulders Anti-Dandruff Shampoo', brand: 'P&G', category: 'Personal Care', packSize: '340ml', unitsPerCase: 24, mrpPerUnit: 320, buyingPricePerCase: 6912, gstRate: 18, hsnCode: '33051010', sku: 'PC-HNS-340', barcode: '8901063070018', stockCases: 20, imgSeed: 'hns' },
    { name: 'Dove Cream Beauty Bathing Bar', brand: 'HUL', category: 'Personal Care', packSize: '100g', unitsPerCase: 72, mrpPerUnit: 65, buyingPricePerCase: 4212, gstRate: 18, hsnCode: '34011190', sku: 'PC-DOVE-100', barcode: '8901063080017', stockCases: 40, imgSeed: 'dove' },
    { name: 'Gillette Guard Razor', brand: 'P&G', category: 'Personal Care', packSize: '1 unit', unitsPerCase: 100, mrpPerUnit: 35, buyingPricePerCase: 2800, gstRate: 18, hsnCode: '82121010', sku: 'PC-GILLETTE-1', barcode: '8901063090016', stockCases: 35, imgSeed: 'gillette' },

    { name: 'Harpic Power Plus Toilet Cleaner', brand: 'Reckitt', category: 'Home Care', packSize: '1L', unitsPerCase: 12, mrpPerUnit: 199, buyingPricePerCase: 1911, gstRate: 18, hsnCode: '34022090', sku: 'HC-HARPIC-1000', barcode: '8901063100012', stockCases: 60, imgSeed: 'harpic' },
    { name: 'Lizol Disinfectant Surface Cleaner', brand: 'Reckitt', category: 'Home Care', packSize: '975ml', unitsPerCase: 12, mrpPerUnit: 210, buyingPricePerCase: 2016, gstRate: 18, hsnCode: '34022090', sku: 'HC-LIZOL-975', barcode: '8901063110011', stockCases: 45, imgSeed: 'lizol' },
    { name: 'Good Knight Mosquito Repellent Refill', brand: 'Godrej Consumer', category: 'Home Care', packSize: '45ml', unitsPerCase: 36, mrpPerUnit: 95, buyingPricePerCase: 2808, gstRate: 18, hsnCode: '38089191', sku: 'HC-GOODKNIGHT-45', barcode: '8901063120010', stockCases: 50, imgSeed: 'goodknight' },

    { name: 'Lux Soap Soft Rose', brand: 'HUL', category: 'Soaps & Bath', packSize: '100g', unitsPerCase: 48, mrpPerUnit: 50, buyingPricePerCase: 2040, gstRate: 18, hsnCode: '34011190', sku: 'SO-LUX-100', barcode: '8901063130019', stockCases: 100, imgSeed: 'lux' },
    { name: 'Lifebuoy Total Germ Protection Soap', brand: 'HUL', category: 'Soaps & Bath', packSize: '125g', unitsPerCase: 48, mrpPerUnit: 42, buyingPricePerCase: 1680, gstRate: 18, hsnCode: '34011190', sku: 'SO-LIFEBUOY-125', barcode: '8901063140018', stockCases: 120, imgSeed: 'lifebuoy' },
    { name: 'Santoor Sandal & Turmeric Soap', brand: 'Wipro', category: 'Soaps & Bath', packSize: '100g', unitsPerCase: 48, mrpPerUnit: 38, buyingPricePerCase: 1536, gstRate: 18, hsnCode: '34011190', sku: 'SO-SANTOOR-100', barcode: '8901063150017', stockCases: 85, imgSeed: 'santoor' },

    { name: 'Surf Excel Easy Wash Detergent Powder', brand: 'HUL', category: 'Detergents', packSize: '1kg', unitsPerCase: 12, mrpPerUnit: 130, buyingPricePerCase: 1310, gstRate: 18, hsnCode: '34022090', sku: 'DT-SURFEXCEL-1000', barcode: '8901063160016', stockCases: 3, imgSeed: 'surfexcel' },
    { name: 'Ariel Matic Front Load Detergent', brand: 'P&G', category: 'Detergents', packSize: '2kg', unitsPerCase: 8, mrpPerUnit: 480, buyingPricePerCase: 3264, gstRate: 18, hsnCode: '34022090', sku: 'DT-ARIEL-2000', barcode: '8901063170015', stockCases: 25, imgSeed: 'ariel' },
    { name: 'Rin Detergent Bar', brand: 'HUL', category: 'Detergents', packSize: '250g', unitsPerCase: 60, mrpPerUnit: 18, buyingPricePerCase: 972, gstRate: 18, hsnCode: '34011190', sku: 'DT-RIN-250', barcode: '8901063180014', stockCases: 65, imgSeed: 'rin' },
    { name: 'Vim Dishwash Bar', brand: 'HUL', category: 'Detergents', packSize: '200g', unitsPerCase: 72, mrpPerUnit: 20, buyingPricePerCase: 1296, gstRate: 18, hsnCode: '34022090', sku: 'DT-VIM-200', barcode: '8901063190013', stockCases: 55, imgSeed: 'vim' },

    { name: 'Tata Salt Iodized', brand: 'Tata Consumer', category: 'Grocery & Staples', packSize: '1kg', unitsPerCase: 20, mrpPerUnit: 28, buyingPricePerCase: 504, gstRate: 5, hsnCode: '25010020', sku: 'GR-TATASALT-1000', barcode: '8901063200016', stockCases: 200, imgSeed: 'tatasalt' },
    { name: 'Fortune Sunlite Refined Sunflower Oil', brand: 'Adani Wilmar', category: 'Grocery & Staples', packSize: '1L', unitsPerCase: 12, mrpPerUnit: 165, buyingPricePerCase: 1836, gstRate: 5, hsnCode: '15121910', sku: 'GR-FORTUNE-1000', barcode: '8901063210015', stockCases: 70, imgSeed: 'fortune' },
    { name: 'Aashirvaad Shudh Chakki Atta', brand: 'ITC', category: 'Grocery & Staples', packSize: '5kg', unitsPerCase: 6, mrpPerUnit: 260, buyingPricePerCase: 1428, gstRate: 5, hsnCode: '11010000', sku: 'GR-AASHIRVAAD-5000', barcode: '8901063220014', stockCases: 40, imgSeed: 'aashirvaad' },
    { name: 'MDH Deggi Mirch Masala', brand: 'MDH', category: 'Grocery & Staples', packSize: '100g', unitsPerCase: 48, mrpPerUnit: 85, buyingPricePerCase: 3672, gstRate: 5, hsnCode: '09042110', sku: 'GR-MDH-100', barcode: '8901063230013', stockCases: 30, imgSeed: 'mdh' },

    { name: 'Amul Taaza Toned Milk (UHT)', brand: 'Amul', category: 'Dairy & Beverages Mix', packSize: '1L', unitsPerCase: 12, mrpPerUnit: 66, buyingPricePerCase: 712, gstRate: 5, hsnCode: '04012000', sku: 'DR-AMULTAAZA-1000', barcode: '8901063240012', stockCases: 60, imgSeed: 'amul' },
    { name: 'Amul Butter', brand: 'Amul', category: 'Dairy & Beverages Mix', packSize: '500g', unitsPerCase: 20, mrpPerUnit: 275, buyingPricePerCase: 5170, gstRate: 12, hsnCode: '04051000', sku: 'DR-AMULBUTTER-500', barcode: '8901063250011', stockCases: 24, imgSeed: 'amulbutter' },

    { name: 'Classmate Notebook 172 Pages Single Line', brand: 'ITC', category: 'Stationery', packSize: '1 unit', unitsPerCase: 120, mrpPerUnit: 45, buyingPricePerCase: 4680, gstRate: 12, hsnCode: '48201010', sku: 'ST-CLASSMATE-172', barcode: '8901063260010', stockCases: 20, imgSeed: 'classmate' },
    { name: 'Cello Butterflow Ball Pen (Pack of 5)', brand: 'Cello', category: 'Stationery', packSize: '5 units', unitsPerCase: 60, mrpPerUnit: 25, buyingPricePerCase: 1260, gstRate: 12, hsnCode: '96081019', sku: 'ST-CELLO-5PK', barcode: '8901063270019', stockCases: 45, imgSeed: 'cello' },

    { name: 'Cadbury Dairy Milk Chocolate', brand: 'Cadbury', category: 'Chocolates & Confectionery', packSize: '13.2g', unitsPerCase: 240, mrpPerUnit: 10, buyingPricePerCase: 1920, gstRate: 18, hsnCode: '18063100', sku: 'CH-DAIRYMILK-13', barcode: '8901063280018', stockCases: 90, imgSeed: 'dairymilk' },
    { name: "Perfetti Alpenliebe Candy Jar", brand: 'Perfetti Van Melle', category: 'Chocolates & Confectionery', packSize: '100 units', unitsPerCase: 24, mrpPerUnit: 45, buyingPricePerCase: 972, gstRate: 18, hsnCode: '17049090', sku: 'CH-ALPENLIEBE-100', barcode: '8901063290017', stockCases: 65, imgSeed: 'alpenliebe' },
  ];

  const slabConfig: Record<string, { minCases: number; maxCases: number | null; pricePercentOfBase: number }[]> = {
    'BIS-PARLEG-100': [
      { minCases: 1, maxCases: 9, pricePercentOfBase: 100 },
      { minCases: 10, maxCases: 29, pricePercentOfBase: 96 },
      { minCases: 30, maxCases: null, pricePercentOfBase: 92 },
    ],
    'SO-LUX-100': [
      { minCases: 1, maxCases: 5, pricePercentOfBase: 100 },
      { minCases: 6, maxCases: 20, pricePercentOfBase: 95 },
      { minCases: 21, maxCases: 50, pricePercentOfBase: 90 },
      { minCases: 51, maxCases: null, pricePercentOfBase: 85 },
    ],
    'DT-SURFEXCEL-1000': [
      { minCases: 1, maxCases: 9, pricePercentOfBase: 100 },
      { minCases: 10, maxCases: 24, pricePercentOfBase: 97 },
      { minCases: 25, maxCases: null, pricePercentOfBase: 94 },
    ],
    'GR-TATASALT-1000': [
      { minCases: 1, maxCases: 19, pricePercentOfBase: 100 },
      { minCases: 20, maxCases: null, pricePercentOfBase: 96 },
    ],
    'BEV-NESCAFE-50': [
      { minCases: 1, maxCases: 4, pricePercentOfBase: 100 },
      { minCases: 5, maxCases: 14, pricePercentOfBase: 97 },
      { minCases: 15, maxCases: null, pricePercentOfBase: 93 },
    ],
    'PC-COLGATE-200': [
      { minCases: 1, maxCases: 9, pricePercentOfBase: 100 },
      { minCases: 10, maxCases: null, pricePercentOfBase: 95 },
    ],
  };

  const productIdBySku: Record<string, string> = {};
  const productIdByName: Record<string, string> = {};

  for (const p of products) {
    const created = await prisma.product.create({
      data: {
        name: p.name,
        brand: p.brand,
        categoryId: categories[p.category],
        imageUrl: PRODUCT_IMG(p.imgSeed),
        packSize: p.packSize,
        unitsPerCase: p.unitsPerCase,
        mrpPerUnit: p.mrpPerUnit,
        buyingPricePerCase: p.buyingPricePerCase,
        gstRate: p.gstRate,
        hsnCode: p.hsnCode,
        sku: p.sku,
        barcode: p.barcode,
        stockCases: p.stockCases,
        status: p.stockCases > 0 ? 'ACTIVE' : 'OUT_OF_STOCK',
      },
    });
    productIdBySku[p.sku] = created.id;
    productIdByName[p.name] = created.id;

    const slabs = slabConfig[p.sku];
    if (slabs) {
      for (const s of slabs) {
        await prisma.bulkPriceSlab.create({
          data: {
            productId: created.id,
            minCases: s.minCases,
            maxCases: s.maxCases,
            pricePerCase: Math.round((p.buyingPricePerCase * s.pricePercentOfBase) / 100),
          },
        });
      }
    }
  }

  console.log('Creating schemes...');
  const now = new Date();
  const oneYearLater = new Date();
  oneYearLater.setFullYear(now.getFullYear() + 1);
  const monthAgo = new Date();
  monthAgo.setMonth(now.getMonth() - 1);

  await prisma.scheme.createMany({
    data: [
      {
        title: 'Trade Discount — Order 10,000+',
        description: 'Order ₹10,000 or more in a single order and get an extra 5% off automatically.',
        type: 'ORDER_VALUE_DISCOUNT',
        minOrderValue: 10000,
        discountPercent: 5,
        startDate: monthAgo,
        endDate: oneYearLater,
        active: true,
        imageUrl: BANNER_IMG('trade-10k'),
      },
      {
        title: 'Big Order Bonus — Order 25,000+',
        description: 'Order ₹25,000 or more and unlock an extra 8% trade discount.',
        type: 'ORDER_VALUE_DISCOUNT',
        minOrderValue: 25000,
        discountPercent: 8,
        startDate: monthAgo,
        endDate: oneYearLater,
        active: true,
        imageUrl: BANNER_IMG('trade-25k'),
      },
      {
        title: 'Flat ₹300 Off — Order 5,000+',
        description: 'Get a flat ₹300 off on orders above ₹5,000.',
        type: 'ORDER_VALUE_DISCOUNT',
        minOrderValue: 5000,
        flatDiscount: 300,
        startDate: monthAgo,
        endDate: oneYearLater,
        active: true,
        imageUrl: BANNER_IMG('flat-5k'),
      },
      {
        title: 'Lux Soap — Buy 10 Get 1 Free',
        description: 'Buy 10 cases of Lux Soap Soft Rose and get 1 case absolutely free.',
        type: 'BUY_X_GET_Y_FREE',
        productId: productIdByName['Lux Soap Soft Rose'],
        buyQty: 10,
        freeQty: 1,
        startDate: monthAgo,
        endDate: oneYearLater,
        active: true,
        imageUrl: BANNER_IMG('lux-scheme'),
      },
      {
        title: 'Parle-G — Buy 20 Get 2 Free',
        description: 'Buy 20 cases of Parle-G Glucose Biscuits and get 2 cases free.',
        type: 'BUY_X_GET_Y_FREE',
        productId: productIdByName['Parle-G Original Glucose Biscuits'],
        buyQty: 20,
        freeQty: 2,
        startDate: monthAgo,
        endDate: oneYearLater,
        active: true,
        imageUrl: BANNER_IMG('parleg-scheme'),
      },
      {
        title: 'Surf Excel — Buy 5 Get 1 Free',
        description: 'Buy 5 cases of Surf Excel Easy Wash and get 1 case free. Limited stock.',
        type: 'BUY_X_GET_Y_FREE',
        productId: productIdByName['Surf Excel Easy Wash Detergent Powder'],
        buyQty: 5,
        freeQty: 1,
        startDate: monthAgo,
        endDate: oneYearLater,
        active: true,
        imageUrl: BANNER_IMG('surfexcel-scheme'),
      },
      {
        title: 'Tata Salt — Buy 15 Get 1 Free',
        description: 'Buy 15 cases of Tata Salt Iodized and get 1 case free.',
        type: 'BUY_X_GET_Y_FREE',
        productId: productIdByName['Tata Salt Iodized'],
        buyQty: 15,
        freeQty: 1,
        startDate: monthAgo,
        endDate: oneYearLater,
        active: true,
        imageUrl: BANNER_IMG('tatasalt-scheme'),
      },
      {
        title: 'Lifebuoy Soap — Buy 12 Get 1 Free',
        description: 'Buy 12 cases of Lifebuoy Total Germ Protection Soap and get 1 case free.',
        type: 'BUY_X_GET_Y_FREE',
        productId: productIdByName['Lifebuoy Total Germ Protection Soap'],
        buyQty: 12,
        freeQty: 1,
        startDate: monthAgo,
        endDate: oneYearLater,
        active: true,
        imageUrl: BANNER_IMG('lifebuoy-scheme'),
      },
      {
        title: 'Dairy Milk — Buy 8 Get 1 Free',
        description: 'Buy 8 cases of Cadbury Dairy Milk and get 1 case free.',
        type: 'BUY_X_GET_Y_FREE',
        productId: productIdByName['Cadbury Dairy Milk Chocolate'],
        buyQty: 8,
        freeQty: 1,
        startDate: monthAgo,
        endDate: oneYearLater,
        active: true,
        imageUrl: BANNER_IMG('dairymilk-scheme'),
      },
      {
        title: 'Diwali Mega Trade Offer (Expired)',
        description: 'Order ₹15,000+ during Diwali week and get 10% extra off.',
        type: 'ORDER_VALUE_DISCOUNT',
        minOrderValue: 15000,
        discountPercent: 10,
        startDate: new Date('2025-10-15'),
        endDate: new Date('2025-11-05'),
        active: false,
        imageUrl: BANNER_IMG('diwali-scheme'),
      },
    ],
  });

  console.log('Creating banners...');
  await prisma.banner.createMany({
    data: [
      {
        title: 'Extra 5% Trade Discount',
        subtitle: 'On all orders above ₹10,000 — applied automatically at checkout',
        imageUrl: BANNER_IMG('hero-trade'),
        ctaLabel: 'Shop Now',
        ctaTarget: 'schemes',
        priority: 100,
        active: true,
      },
      {
        title: 'Lux Soap — Buy 10 Get 1 Free',
        subtitle: 'Stock up now, limited period scheme',
        imageUrl: BANNER_IMG('hero-lux'),
        ctaLabel: 'View Scheme',
        ctaTarget: `scheme:lux`,
        priority: 90,
        active: true,
      },
      {
        title: 'New Stock: Ariel Matic Arrived',
        subtitle: 'Fresh batch of Ariel Matic Front Load now in stock',
        imageUrl: BANNER_IMG('hero-ariel'),
        ctaLabel: 'View Product',
        ctaTarget: 'category:Detergents',
        priority: 80,
        active: true,
      },
      {
        title: 'Grocery & Staples — Best B2B Rates',
        subtitle: 'Salt, atta, oil and masala at your best margin yet',
        imageUrl: BANNER_IMG('hero-grocery'),
        ctaLabel: 'Explore',
        ctaTarget: 'category:Grocery & Staples',
        priority: 70,
        active: true,
      },
      {
        title: 'Flat ₹300 Off Above ₹5,000',
        subtitle: 'Every order counts — small orders get rewarded too',
        imageUrl: BANNER_IMG('hero-flat300'),
        ctaLabel: 'Order Now',
        ctaTarget: 'schemes',
        priority: 60,
        active: true,
      },
      {
        title: 'Monsoon Sale (Ended)',
        subtitle: 'This offer has concluded',
        imageUrl: BANNER_IMG('hero-monsoon'),
        ctaLabel: 'Shop Now',
        priority: 10,
        active: false,
      },
    ],
  });

  console.log('Creating delivery slots...');
  const morningSlot = await prisma.deliverySlot.create({
    data: { label: 'Morning', windowStart: '08:00', windowEnd: '11:00', cutoffTime: '20:00', active: true },
  });
  const afternoonSlot = await prisma.deliverySlot.create({
    data: { label: 'Afternoon', windowStart: '12:00', windowEnd: '15:00', cutoffTime: '09:00', active: true },
  });
  const eveningSlot = await prisma.deliverySlot.create({
    data: { label: 'Evening', windowStart: '16:00', windowEnd: '19:00', cutoffTime: '13:00', active: true },
  });

  console.log('Creating retailers...');
  const approvedRetailers = await Promise.all([
    prisma.retailer.create({
      data: {
        mobileNumber: '9876543210',
        ownerName: 'Rajesh Sharma',
        shopName: 'Sharma General Store',
        address: '12, Gandhi Market Road',
        city: 'Lucknow',
        pincode: '226001',
        gstin: '09ABCDE1234F1Z5',
        status: RetailerStatus.APPROVED,
      },
    }),
    prisma.retailer.create({
      data: {
        mobileNumber: '9876543211',
        ownerName: 'Suresh Patel',
        shopName: 'Patel Kirana Bhandar',
        address: 'Shop 4, Station Road',
        city: 'Ahmedabad',
        pincode: '380001',
        gstin: '24ABCDE5678G1Z2',
        status: RetailerStatus.APPROVED,
      },
    }),
    prisma.retailer.create({
      data: {
        mobileNumber: '9876543212',
        ownerName: 'Meena Devi',
        shopName: 'Meena Provision Store',
        address: '45 Main Bazaar',
        city: 'Patna',
        pincode: '800001',
        status: RetailerStatus.APPROVED,
      },
    }),
  ]);

  await prisma.retailer.create({
    data: {
      mobileNumber: '9876543213',
      ownerName: 'Anil Kumar',
      shopName: 'Kumar Traders',
      address: '8 New Market',
      city: 'Kanpur',
      pincode: '208001',
      status: RetailerStatus.PENDING,
    },
  });
  await prisma.retailer.create({
    data: { mobileNumber: '9876543214', status: RetailerStatus.PENDING },
  });
  await prisma.retailer.create({
    data: {
      mobileNumber: '9876543215',
      ownerName: 'Vikram Singh',
      shopName: 'Singh Retail Point',
      address: '22 Civil Lines',
      city: 'Jaipur',
      pincode: '302001',
      status: RetailerStatus.REJECTED,
      rejectionReason: 'Shop address could not be verified. Please resubmit with a valid shop photo.',
    },
  });
  await prisma.retailer.create({
    data: {
      mobileNumber: '9876543216',
      ownerName: 'Farhan Ansari',
      shopName: 'Ansari General Stores',
      address: '3 Chowk Bazaar',
      city: 'Bhopal',
      pincode: '462001',
      gstin: '23ABCDE9012H1Z8',
      status: RetailerStatus.SUSPENDED,
    },
  });

  console.log('Creating sample orders...');
  const [retailer1, retailer2, retailer3] = approvedRetailers;

  const HAS_DELIVERY_OTP_STATUSES: OrderStatus[] = [
    OrderStatus.CONFIRMED,
    OrderStatus.PICKING,
    OrderStatus.PACKED,
    OrderStatus.DISPATCHED,
    OrderStatus.OUT_FOR_DELIVERY,
    OrderStatus.DELIVERED,
  ];

  async function createOrder(opts: {
    retailerId: string;
    orderNumberSuffix: number;
    items: { sku: string; caseQty: number; freeCaseQty?: number }[];
    slotId: string;
    status: OrderStatus;
    paymentStatus: PaymentStatus;
    daysAgo: number;
    requiresDeliveryOtp?: boolean;
  }) {
    const lineData = opts.items.map((it) => {
      const product = products.find((p) => p.sku === it.sku)!;
      const pricePerCase = product.buyingPricePerCase;
      const caseQty = it.caseQty;
      const freeCaseQty = it.freeCaseQty ?? 0;
      const lineSubtotal = pricePerCase * caseQty;
      const gstAmount = Math.round((lineSubtotal * product.gstRate) / 100);
      return {
        productId: productIdBySku[it.sku],
        productNameSnapshot: product.name,
        brandSnapshot: product.brand,
        packSizeSnapshot: product.packSize,
        caseQty,
        freeCaseQty,
        pricePerCase,
        mrpPerUnit: product.mrpPerUnit,
        unitsPerCase: product.unitsPerCase,
        gstRate: product.gstRate,
        lineSubtotal,
        lineDiscount: 0,
        lineTotal: lineSubtotal + gstAmount,
      };
    });

    const subtotal = lineData.reduce((s, l) => s + l.lineSubtotal, 0);
    const gstAmount = lineData.reduce((s, l) => s + (l.lineTotal - l.lineSubtotal), 0);
    const tradeDiscount = subtotal >= 10000 ? Math.round(subtotal * 0.05) : 0;
    const totalAmount = subtotal - tradeDiscount + gstAmount;

    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - opts.daysAgo);

    const order = await prisma.order.create({
      data: {
        orderNumber: `B2B${10001 + opts.orderNumberSuffix}`,
        retailerId: opts.retailerId,
        subtotal,
        tradeDiscount,
        schemeDiscount: 0,
        gstAmount,
        totalAmount,
        deliverySlotId: opts.slotId,
        deliveryDate: createdAt,
        status: opts.status,
        requiresDeliveryOtp: opts.requiresDeliveryOtp ?? true,
        deliveryOtp: HAS_DELIVERY_OTP_STATUSES.includes(opts.status)
          ? Math.floor(1000 + Math.random() * 9000).toString()
          : null,
        deliveryOtpVerifiedAt: opts.status === OrderStatus.DELIVERED ? createdAt : null,
        createdAt,
        updatedAt: createdAt,
        items: { create: lineData },
        statusHistory: { create: { status: OrderStatus.PAYMENT_PENDING, note: 'Order placed', createdAt } },
        payment: {
          create: {
            amount: totalAmount,
            upiId: 'apniidukan.distributors@okicici',
            status: opts.paymentStatus,
            utr: opts.paymentStatus !== 'UNPAID' ? `UTR${Math.floor(100000000000 + Math.random() * 899999999999)}` : null,
            submittedAt: opts.paymentStatus !== 'UNPAID' ? createdAt : null,
            verifiedAt: ['PAYMENT_APPROVED', 'PAYMENT_REJECTED'].includes(opts.paymentStatus) ? createdAt : null,
            verifiedByAdminId: ['PAYMENT_APPROVED', 'PAYMENT_REJECTED'].includes(opts.paymentStatus) ? superAdmin.id : null,
            rejectionReason: opts.paymentStatus === 'PAYMENT_REJECTED' ? 'UTR does not match any received payment. Please check and resubmit.' : null,
          },
        },
      },
    });
    return order;
  }

  const order0 = await createOrder({
    retailerId: retailer1.id,
    orderNumberSuffix: 0,
    items: [
      { sku: 'DT-SURFEXCEL-1000', caseQty: 10 },
      { sku: 'BIS-PARLEG-100', caseQty: 15 },
      { sku: 'SO-LUX-100', caseQty: 8 },
      { sku: 'GR-TATASALT-1000', caseQty: 10 },
    ],
    slotId: morningSlot.id,
    status: OrderStatus.DELIVERED,
    paymentStatus: PaymentStatus.PAYMENT_APPROVED,
    daysAgo: 7,
  });

  await createOrder({
    retailerId: retailer1.id,
    orderNumberSuffix: 1,
    items: [
      { sku: 'SO-LUX-100', caseQty: 5 },
      { sku: 'DT-VIM-200', caseQty: 6 },
    ],
    slotId: eveningSlot.id,
    status: OrderStatus.DELIVERED,
    paymentStatus: PaymentStatus.PAYMENT_APPROVED,
    daysAgo: 14,
  });

  await createOrder({
    retailerId: retailer1.id,
    orderNumberSuffix: 2,
    items: [
      { sku: 'BIS-GOODDAY-150', caseQty: 4 },
      { sku: 'BEV-TATAGOLD-1000', caseQty: 3 },
    ],
    slotId: morningSlot.id,
    status: OrderStatus.PAYMENT_VERIFICATION,
    paymentStatus: PaymentStatus.UNDER_REVIEW,
    daysAgo: 0,
  });

  await createOrder({
    retailerId: retailer2.id,
    orderNumberSuffix: 3,
    items: [
      { sku: 'GR-FORTUNE-1000', caseQty: 12 },
      { sku: 'GR-AASHIRVAAD-5000', caseQty: 6 },
      { sku: 'PC-COLGATE-200', caseQty: 10 },
    ],
    slotId: afternoonSlot.id,
    status: OrderStatus.DISPATCHED,
    paymentStatus: PaymentStatus.PAYMENT_APPROVED,
    daysAgo: 2,
    requiresDeliveryOtp: false,
  });

  await createOrder({
    retailerId: retailer2.id,
    orderNumberSuffix: 4,
    items: [{ sku: 'CH-DAIRYMILK-13', caseQty: 8, freeCaseQty: 1 }],
    slotId: morningSlot.id,
    status: OrderStatus.PACKED,
    paymentStatus: PaymentStatus.PAYMENT_APPROVED,
    daysAgo: 1,
  });

  await createOrder({
    retailerId: retailer2.id,
    orderNumberSuffix: 5,
    items: [{ sku: 'PC-HNS-340', caseQty: 3 }],
    slotId: eveningSlot.id,
    status: OrderStatus.PAYMENT_PENDING,
    paymentStatus: PaymentStatus.UNPAID,
    daysAgo: 0,
  });

  await createOrder({
    retailerId: retailer3.id,
    orderNumberSuffix: 6,
    items: [
      { sku: 'HC-HARPIC-1000', caseQty: 6 },
      { sku: 'HC-LIZOL-975', caseQty: 4 },
    ],
    slotId: morningSlot.id,
    status: OrderStatus.PAYMENT_VERIFICATION,
    paymentStatus: PaymentStatus.PAYMENT_REJECTED,
    daysAgo: 1,
  });

  await createOrder({
    retailerId: retailer3.id,
    orderNumberSuffix: 7,
    items: [
      { sku: 'ST-CLASSMATE-172', caseQty: 5 },
      { sku: 'ST-CELLO-5PK', caseQty: 8 },
    ],
    slotId: afternoonSlot.id,
    status: OrderStatus.DELIVERED,
    paymentStatus: PaymentStatus.PAYMENT_APPROVED,
    daysAgo: 20,
  });

  await createOrder({
    retailerId: retailer3.id,
    orderNumberSuffix: 8,
    items: [{ sku: 'BEV-REAL-1000', caseQty: 10 }],
    slotId: eveningSlot.id,
    status: OrderStatus.CANCELLED,
    paymentStatus: PaymentStatus.UNPAID,
    daysAgo: 5,
  });

  const order9 = await createOrder({
    retailerId: retailer1.id,
    orderNumberSuffix: 9,
    items: [
      { sku: 'DR-AMULTAAZA-1000', caseQty: 8 },
      { sku: 'DR-AMULBUTTER-500', caseQty: 4 },
    ],
    slotId: morningSlot.id,
    status: OrderStatus.CONFIRMED,
    paymentStatus: PaymentStatus.PAYMENT_APPROVED,
    daysAgo: 0,
  });

  console.log('Creating sample notifications...');
  const dayMs = 24 * 60 * 60 * 1000;
  await prisma.notification.createMany({
    data: [
      {
        retailerId: retailer1.id,
        type: 'PAYMENT_VERIFIED',
        title: 'Payment Verified',
        body: `Your payment for order ${order9.orderNumber} has been verified. Your order is now confirmed.`,
        orderId: order9.id,
        read: false,
        createdAt: new Date(),
      },
      {
        retailerId: retailer1.id,
        type: 'ORDER_DELIVERED',
        title: 'Order Delivered',
        body: `Your order ${order0.orderNumber} has been delivered. Thank you for ordering with us!`,
        orderId: order0.id,
        read: true,
        createdAt: new Date(Date.now() - 7 * dayMs),
      },
      {
        retailerId: retailer1.id,
        type: 'NEW_SCHEME',
        title: 'New Scheme Available',
        body: 'Lux Soap — Buy 10 Get 1 Free — Stock up now, limited period scheme.',
        read: true,
        createdAt: new Date(Date.now() - 3 * dayMs),
      },
      {
        retailerId: retailer2.id,
        type: 'ORDER_DISPATCHED',
        title: 'Order Dispatched',
        body: 'Your order B2B10004 has been dispatched and is on its way.',
        read: false,
        createdAt: new Date(Date.now() - 2 * dayMs),
      },
      {
        retailerId: retailer3.id,
        type: 'PAYMENT_REJECTED',
        title: 'Payment Rejected',
        body: 'Your payment for order B2B10007 could not be verified: UTR does not match any received payment. Please check and resubmit.',
        read: false,
        createdAt: new Date(Date.now() - 1 * dayMs),
      },
    ],
  });

  console.log('Seed complete.');
  console.log('---');
  console.log('Admin login: admin@apniidukan.com / Admin@123');
  console.log('Retailer OTP login: any 9876543xxx number above, OTP = 123456');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
