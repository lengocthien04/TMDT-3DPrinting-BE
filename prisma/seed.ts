import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Start seeding 3D Printing Store database...');

  const adminEmail = 'admin@hcmut.com';
  const admin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!admin) {
    const hash = await bcrypt.hash('Admin123!', 10);
    await prisma.user.create({
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

  type SeedProduct = {
    name: string;
    description: string;
    basePrice: number;
    quantity?: number;
  };

  const products: SeedProduct[] = [
    {
      name: 'PLA Filament (1kg)',
      description:
        'High-quality PLA filament, 1.75mm, compatible with most FDM printers.',
      basePrice: 19.99,
      quantity: 50,
    },
    {
      name: 'ABS Filament (1kg)',
      description: 'Durable ABS filament for industrial-grade printing.',
      basePrice: 24.99,
      quantity: 30,
    },
    {
      name: 'Resin (500ml)',
      description: 'Standard photopolymer resin suitable for SLA printers.',
      basePrice: 29.99,
      quantity: 20,
    },
    {
      name: 'Nozzle 0.4mm',
      description: 'Stainless steel nozzle compatible with common 3D printers.',
      basePrice: 4.99,
      quantity: 100,
    },
  ];

  for (const p of products) {
    const exists = await prisma.product.findFirst({ where: { name: p.name } });
    if (exists) {
      console.log(`🔁 Product ${p.name} exists, skipping…`);
      continue;
    }

    await prisma.product.create({
      data: {
        name: p.name,
        description: p.description,
        basePrice: p.basePrice,
        isActive: true,
        ...(p.quantity != null
          ? {
              inventory: {
                create: { quantity: p.quantity },
              },
            }
          : {}),
      },
    });

    console.log(`🧱 Created product: ${p.name}`);
  }

  // 3) Sample customer
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
