import { PrismaClient, Role } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function createTestUsers() {
  try {
    // Create admin user
    const adminPassword = await bcrypt.hash('password123', 10)
    const admin = await prisma.user.upsert({
      where: { email: 'admin@ashram.com' },
      update: {},
      create: {
        email: 'admin@ashram.com',
        name: 'Admin User',
        password: adminPassword,
        role: Role.ADMIN,
        phone: '+1234567890',
        isActive: true,
      },
    })

    // Create regular user
    const userPassword = await bcrypt.hash('password123', 10)
    const user = await prisma.user.upsert({
      where: { email: 'user@ashram.com' },
      update: {},
      create: {
        email: 'user@ashram.com',
        name: 'Regular User',
        password: userPassword,
        role: Role.USER,
        phone: '+1234567891',
        isActive: true,
      },
    })

    // Create coordinator user
    const coordinatorPassword = await bcrypt.hash('password123', 10)
    const coordinator = await prisma.user.upsert({
      where: { email: 'coordinator@ashram.com' },
      update: {},
      create: {
        email: 'coordinator@ashram.com',
        name: 'Coordinator User',
        password: coordinatorPassword,
        role: Role.COORDINATOR,
        phone: '+1234567892',
        isActive: true,
      },
    })

    // Create guruji user
    const gurujiPassword = await bcrypt.hash('password123', 10)
    const guruji = await prisma.user.upsert({
      where: { email: 'guruji@ashram.com' },
      update: {},
      create: {
        email: 'guruji@ashram.com',
        name: 'Guruji User',
        password: gurujiPassword,
        role: Role.GURUJI,
        phone: '+1234567893',
        isActive: true,
      },
    })

    console.log('Test users created successfully:')
    console.log('Admin:', admin.email)
    console.log('User:', user.email)
    console.log('Coordinator:', coordinator.email)
    console.log('Guruji:', guruji.email)
    console.log('\nAll users have password: password123')
  } catch (error) {
    console.error('Error creating test users:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createTestUsers() 