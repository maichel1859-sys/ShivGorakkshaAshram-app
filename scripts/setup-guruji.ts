import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function setupShivgorakshaAshram() {
  try {
    console.log('Setting up Shivgoraksha Ashram with default Guruji...');

    // Check if Guruji already exists
    const existingGuruji = await prisma.user.findFirst({
      where: { role: 'GURUJI' },
    });

    if (existingGuruji) {
      console.log('Guruji already exists:', existingGuruji.name);
      console.log('Email:', existingGuruji.email);
      return;
    }

    // Create the default Guruji
    const hashedPassword = await bcrypt.hash('GurujiPassword@123', 12);
    
    const guruji = await prisma.user.create({
      data: {
        name: 'Shivgoraksha Guruji',
        email: 'guruji@shivgoraksha.ashram',
        phone: '+91-9999999999',
        password: hashedPassword,
        role: 'GURUJI',
        isActive: true,
        address: 'Shivgoraksha Ashram, Sacred Grounds',
        dateOfBirth: new Date('1970-01-01'),
      },
    });

    // Create system settings specific to Shivgoraksha Ashram
    const settings = [
      {
        key: 'ASHRAM_NAME',
        value: 'Shivgoraksha Ashram',
        type: 'string',
        description: 'Name of the Ashram',
        isPublic: true,
      },
      {
        key: 'GURUJI_NAME',
        value: 'Shivgoraksha Guruji',
        type: 'string',
        description: 'Name of the main Guruji',
        isPublic: true,
      },
      {
        key: 'DEFAULT_GURUJI_ID',
        value: guruji.id,
        type: 'string',
        description: 'ID of the default/only Guruji',
        isPublic: false,
      },
      {
        key: 'APPOINTMENT_DURATION',
        value: '30',
        type: 'number',
        description: 'Default appointment duration in minutes',
        isPublic: false,
      },
      {
        key: 'BUSINESS_HOURS_START',
        value: '09:00',
        type: 'string',
        description: 'Business hours start time',
        isPublic: true,
      },
      {
        key: 'BUSINESS_HOURS_END',
        value: '18:00',
        type: 'string',
        description: 'Business hours end time',
        isPublic: true,
      },
      {
        key: 'WORKING_DAYS',
        value: 'MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY,SATURDAY',
        type: 'string',
        description: 'Working days of the week',
        isPublic: true,
      },
      {
        key: 'MAX_APPOINTMENTS_PER_DAY',
        value: '20',
        type: 'number',
        description: 'Maximum appointments per day',
        isPublic: false,
      },
      {
        key: 'ADVANCE_BOOKING_DAYS',
        value: '30',
        type: 'number',
        description: 'Maximum days in advance for booking',
        isPublic: true,
      },
      {
        key: 'ASHRAM_CONTACT_EMAIL',
        value: 'contact@shivgoraksha.ashram',
        type: 'string',
        description: 'Contact email for the ashram',
        isPublic: true,
      },
      {
        key: 'ASHRAM_CONTACT_PHONE',
        value: '+91-9999999999',
        type: 'string',
        description: 'Contact phone for the ashram',
        isPublic: true,
      },
      {
        key: 'ASHRAM_ADDRESS',
        value: 'Shivgoraksha Ashram, Sacred Grounds, Spiritual City',
        type: 'string',
        description: 'Physical address of the ashram',
        isPublic: true,
      },
    ];

    // Create settings
    for (const setting of settings) {
      await prisma.systemSetting.upsert({
        where: { key: setting.key },
        update: setting,
        create: setting,
      });
    }

    // Create default admin user
    const adminExists = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
    });

    if (!adminExists) {
      const adminPassword = await bcrypt.hash('AdminPassword@123', 12);
      
      await prisma.user.create({
        data: {
          name: 'System Administrator',
          email: 'admin@shivgoraksha.ashram',
          phone: '+91-9999999998',
          password: adminPassword,
          role: 'ADMIN',
          isActive: true,
        },
      });
      
      console.log('✅ Default admin user created');
      console.log('   Email: admin@shivgoraksha.ashram');
      console.log('   Password: AdminPassword@123');
    }

    console.log('📋 Remedy templates will be created by Guruji as needed');

    // Create audit log for setup
    await prisma.auditLog.create({
      data: {
        userId: guruji.id,
        action: 'SYSTEM_SETUP',
        resource: 'SYSTEM',
        resourceId: 'setup',
        newData: {
          ashramName: 'Shivgoraksha Ashram',
          gurujiName: guruji.name,
          setupDate: new Date().toISOString(),
        },
      },
    });

    console.log('✅ Shivgoraksha Ashram setup completed successfully!');
    console.log('');
    console.log('🕉️  GURUJI LOGIN CREDENTIALS:');
    console.log('   Email: guruji@shivgoraksha.ashram');
    console.log('   Password: GurujiPassword@123');
    console.log('');
    console.log('👤 ADMIN LOGIN CREDENTIALS:');
    console.log('   Email: admin@shivgoraksha.ashram');
    console.log('   Password: AdminPassword@123');
    console.log('');
    console.log('🏛️  Ashram Details:');
    console.log('   Name: Shivgoraksha Ashram');
    console.log('   Guruji: Shivgoraksha Guruji');
    console.log('   Business Hours: 9:00 AM - 6:00 PM');
    console.log('   Working Days: Monday to Saturday');
    console.log('   Max Appointments/Day: 20');
    console.log('');
    console.log('📚 Remedy System:');
    console.log('   - Ready for Guruji to create remedy templates');
    console.log('   - System supports all remedy types (SPIRITUAL, AYURVEDIC, etc.)');
    console.log('');
    console.log('⚠️  IMPORTANT: Please change default passwords after first login!');

  } catch (error) {
    console.error('Error setting up Shivgoraksha Ashram:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the setup if this file is executed directly
if (require.main === module) {
  setupShivgorakshaAshram()
    .then(() => {
      console.log('Setup completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Setup failed:', error);
      process.exit(1);
    });
}

export default setupShivgorakshaAshram;