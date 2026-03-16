require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create default channels
  const existingGeneral = await prisma.channel.findFirst({ where: { name: 'general' } });

  let adminUser;
  const existingAdmin = await prisma.user.findUnique({ where: { email: 'admin@likeslack.com' } });

  if (!existingAdmin) {
    adminUser = await prisma.user.create({
      data: {
        name: 'Admin',
        email: 'admin@likeslack.com',
        password: await bcrypt.hash('password123', 10),
        status: 'online',
      },
    });
    console.log('Created admin user: admin@likeslack.com / password123');
  } else {
    adminUser = existingAdmin;
    console.log('Admin user already exists');
  }

  if (!existingGeneral) {
    const general = await prisma.channel.create({
      data: {
        name: 'general',
        description: 'General discussions',
        isPrivate: false,
        ownerId: adminUser.id,
        members: { create: { userId: adminUser.id } },
      },
    });

    const random = await prisma.channel.create({
      data: {
        name: 'random',
        description: 'Random stuff',
        isPrivate: false,
        ownerId: adminUser.id,
        members: { create: { userId: adminUser.id } },
      },
    });

    // Welcome message
    await prisma.message.create({
      data: {
        content: '👋 Welcome to LikeSlack! This is the #general channel.',
        userId: adminUser.id,
        channelId: general.id,
      },
    });

    await prisma.message.create({
      data: {
        content: '🎉 Feel free to share anything in #random!',
        userId: adminUser.id,
        channelId: random.id,
      },
    });

    console.log('Created channels: #general, #random');
  } else {
    console.log('Channels already exist');
  }

  console.log('Done!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
