import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Start seeding 3D Printing Store database...');

  // 1) Create Admin
  const adminEmail = 'admin@hcmut.com';
  let admin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });
  if (!admin) {
    const hash = await bcrypt.hash('Admin123!', 10);
    admin = await prisma.user.create({
      data: {
        username: 'admin',
        email: adminEmail,
        passwordHash: hash,
        role: UserRole.ADMIN,
        isActive: true,
      },
    });
    console.log(`👑 Admin created: ${adminEmail}`);
  } else {
    console.log('👑 Admin exists, skipping…');
  }

  // 2) Create Products
  type SeedProduct = {
    name: string;
    description: string;
    basePrice: number;
    quantity?: number;
  };

  const products: SeedProduct[] = [
    {
      name: 'Custom 3D Printed Phone Case',
      description:
        'Personalized phone case with custom design, protective and stylish.',
      basePrice: 15.99,
    },
    {
      name: '3D Printed Desk Organizer',
      description:
        'Multi-compartment desk organizer for pens, clips, and office supplies.',
      basePrice: 12.99,
    },
    {
      name: 'Miniature Figurine',
      description:
        'Detailed miniature figurine for collectors and tabletop gaming.',
      basePrice: 8.99,
    },
    {
      name: 'Plant Pot',
      description:
        'Modern geometric plant pot for succulents and small plants.',
      basePrice: 9.99,
    },
  ];

  const createdProducts: any[] = [];
  for (const p of products) {
    let product = await prisma.product.findFirst({ where: { name: p.name } });
    if (!product) {
      product = await prisma.product.create({
        data: {
          name: p.name,
          userId: admin?.id,
          description: p.description,
          basePrice: p.basePrice,
          isActive: true,
        },
      });
      console.log(`🧱 Created product: ${p.name}`);
    } else {
      console.log(`🔁 Product ${p.name} exists, skipping…`);
    }
    createdProducts.push(product);
  }

  // 3) Create Materials
  type SeedMaterial = {
    name: string;
    color?: string;
    density?: number;
    priceFactor?: number;
    pricePerMm3?: number;
  };

  const materials: SeedMaterial[] = [
    {
      name: 'PLA',
      color: 'White',
      density: 1.25,
      priceFactor: 1.0,
      pricePerMm3: 110,
    },
    {
      name: 'PLA',
      color: 'Black',
      density: 1.25,
      priceFactor: 1.0,
      pricePerMm3: 100,
    },
    {
      name: 'PLA',
      color: 'Red',
      density: 1.25,
      priceFactor: 1.1,
      pricePerMm3: 120,
    },
    {
      name: 'ABS',
      color: 'White',
      density: 1.04,
      priceFactor: 1.2,
      pricePerMm3: 100,
    },
    {
      name: 'ABS',
      color: 'Black',
      density: 1.04,
      priceFactor: 1.2,
      pricePerMm3: 110,
    },
    {
      name: 'PETG',
      color: 'Transparent',
      density: 1.27,
      priceFactor: 1.3,
      pricePerMm3: 140,
    },
  ];

  const createdMaterials: any[] = [];
  for (const m of materials) {
    let material = await prisma.material.findFirst({
      where: { name: m.name, color: m.color },
    });

    if (!material) {
      material = await prisma.material.create({
        data: {
          name: m.name,
          color: m.color,
          density: m.density,
          priceFactor: m.priceFactor,
        },
      });
      console.log(`🎨 Created material: ${m.name} - ${m.color}`);
    } else {
      console.log(`🔁 Material ${m.name} - ${m.color} exists, skipping…`);
    }
    createdMaterials.push(material);
  }

  // 4) Create Variants (Product + Material combinations)
  type SeedVariant = {
    productIndex: number;
    materialIndex: number;
    name: string;
    stock: number;
  };

  const variants: SeedVariant[] = [
    { productIndex: 0, materialIndex: 0, name: 'White PLA', stock: 30 },
    { productIndex: 0, materialIndex: 1, name: 'Black PLA', stock: 40 },
    { productIndex: 0, materialIndex: 2, name: 'Red PLA', stock: 20 },
    { productIndex: 1, materialIndex: 0, name: 'White PLA', stock: 25 },
    { productIndex: 1, materialIndex: 3, name: 'White ABS', stock: 20 },
    { productIndex: 1, materialIndex: 4, name: 'Black ABS', stock: 30 },
    { productIndex: 2, materialIndex: 1, name: 'Black PLA', stock: 15 },
    { productIndex: 2, materialIndex: 2, name: 'Red PLA', stock: 10 },
    { productIndex: 2, materialIndex: 3, name: 'White ABS', stock: 25 },
    { productIndex: 3, materialIndex: 0, name: 'White PLA', stock: 30 },
    { productIndex: 3, materialIndex: 2, name: 'Red PLA', stock: 20 },
    { productIndex: 3, materialIndex: 5, name: 'Transparent PETG', stock: 30 },
  ];

  for (const v of variants) {
    const product = createdProducts[v.productIndex];
    const material = createdMaterials[v.materialIndex];

    if (!product || !material) {
      console.log(`⚠️ Skipping variant - product or material not found`);
      continue;
    }

    const existing = await prisma.variant.findFirst({
      where: {
        productId: product.id,
        materialId: material.id,
      },
    });

    if (!existing) {
      await prisma.variant.create({
        data: {
          productId: product.id,
          materialId: material.id,
          name: v.name,
          stock: v.stock,
        },
      });
      console.log(
        `🔗 Created variant: ${product.name} - ${v.name} (${material.name} ${material.color})`,
      );
    } else {
      console.log(`🔁 Variant ${product.name} - ${v.name} exists, skipping…`);
    }
  }

  // 5) Sample customer
  const customerEmail = 'customer@example.com';
  const customer = await prisma.user.findUnique({
    where: { email: customerEmail },
  });
  if (!customer) {
    const hash = await bcrypt.hash('Customer123!', 10);
    await prisma.user.create({
      data: {
        username: 'customer01',
        email: customerEmail,
        passwordHash: hash,
        role: UserRole.CUSTOMER,
        isActive: true,
      },
    });
    console.log(`👤 Customer created: ${customerEmail}`);
  } else {
    console.log('👤 Customer exists, skipping…');
  }

  console.log('✅ Seeding complete.');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
