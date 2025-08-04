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
        description: 'Name of the Ashram',
        isPublic: true,
      },
      {
        key: 'GURUJI_NAME',
        value: 'Shivgoraksha Guruji',
        description: 'Name of the main Guruji',
        isPublic: true,
      },
      {
        key: 'DEFAULT_GURUJI_ID',
        value: guruji.id,
        description: 'ID of the default/only Guruji',
        isPublic: false,
      },
      {
        key: 'APPOINTMENT_DURATION',
        value: '30',
        description: 'Default appointment duration in minutes',
        isPublic: false,
      },
      {
        key: 'BUSINESS_HOURS_START',
        value: '09:00',
        description: 'Business hours start time',
        isPublic: true,
      },
      {
        key: 'BUSINESS_HOURS_END',
        value: '18:00',
        description: 'Business hours end time',
        isPublic: true,
      },
      {
        key: 'WORKING_DAYS',
        value: 'MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY,SATURDAY',
        description: 'Working days of the week',
        isPublic: true,
      },
      {
        key: 'MAX_APPOINTMENTS_PER_DAY',
        value: '20',
        description: 'Maximum appointments per day',
        isPublic: false,
      },
      {
        key: 'ADVANCE_BOOKING_DAYS',
        value: '30',
        description: 'Maximum days in advance for booking',
        isPublic: true,
      },
      {
        key: 'ASHRAM_CONTACT_EMAIL',
        value: 'contact@shivgoraksha.ashram',
        description: 'Contact email for the ashram',
        isPublic: true,
      },
      {
        key: 'ASHRAM_CONTACT_PHONE',
        value: '+91-9999999999',
        description: 'Contact phone for the ashram',
        isPublic: true,
      },
      {
        key: 'ASHRAM_ADDRESS',
        value: 'Shivgoraksha Ashram, Sacred Grounds, Spiritual City',
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

    // Create sample remedy templates
    const sampleRemedies = [
      {
        name: 'Morning Meditation Practice',
        type: 'SPIRITUAL',
        category: 'Meditation',
        description: 'Daily morning meditation practice for inner peace',
        instructions: '1. Sit in a quiet place facing east\n2. Focus on your breathing for 20 minutes\n3. Chant "Om Namah Shivaya" 108 times\n4. End with gratitude prayer',
        dosage: 'Once daily in the morning',
        duration: '21 days minimum',
        language: 'en',
        tags: ['meditation', 'morning', 'peace', 'spiritual'],
        isActive: true,
      },
      {
        name: 'Tulsi Water Remedy',
        type: 'AYURVEDIC',
        category: 'Herbal Medicine',
        description: 'Sacred Tulsi water for purification and health',
        instructions: '1. Boil 1 liter of water with 10-15 fresh Tulsi leaves\n2. Let it cool to room temperature\n3. Drink 1 glass early morning on empty stomach\n4. Offer prayers to Tulsi before consuming',
        dosage: '1 glass daily on empty stomach',
        duration: '40 days',
        language: 'en',
        tags: ['tulsi', 'purification', 'health', 'ayurvedic'],
        isActive: true,
      },
      {
        name: 'Shiva Mantra Healing',
        type: 'SPIRITUAL',
        category: 'Mantra Therapy',
        description: 'Powerful Shiva mantras for healing and protection',
        instructions: '1. Sit facing a Shiva lingam or picture\n2. Light a diya with ghee\n3. Chant "Om Namah Shivaya" 1008 times\n4. Follow with "Mahamrityunjaya Mantra" 108 times\n5. Offer flowers and prasad',
        dosage: 'Twice daily - morning and evening',
        duration: 'As guided by Guruji',
        language: 'en',
        tags: ['shiva', 'mantra', 'healing', 'protection'],
        isActive: true,
      },
    ];

    for (const remedy of sampleRemedies) {
      await prisma.remedyTemplate.upsert({
        where: { name: remedy.name },
        update: remedy,
        create: remedy,
      });
    }

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
    console.log('📚 Sample Remedies Created:');
    console.log('   - Morning Meditation Practice');
    console.log('   - Tulsi Water Remedy');
    console.log('   - Shiva Mantra Healing');
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