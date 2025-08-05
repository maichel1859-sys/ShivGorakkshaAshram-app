import { PrismaClient, Priority, AppointmentStatus, RemedyType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Clear existing data (in reverse order due to foreign key constraints)
  console.log('🧹 Cleaning existing data...');
  try {
    // First check if we have any data
    const userCount = await prisma.user.count();
    if (userCount > 0) {
      console.log(`Found ${userCount} existing users, clearing...`);
      await prisma.auditLog.deleteMany();
      await prisma.notification.deleteMany();
      await prisma.queueEntry.deleteMany();
      await prisma.remedyDocument.deleteMany();
      await prisma.remedyTemplate.deleteMany();
      await prisma.consultationSession.deleteMany();
      await prisma.appointment.deleteMany();
      await prisma.account.deleteMany(); // Clear OAuth accounts
      await prisma.session.deleteMany(); // Clear sessions
      await prisma.user.deleteMany();
      console.log('✅ Existing data cleared');
    } else {
      console.log('✅ Database is clean, ready for seeding');
    }
  } catch (error) {
    console.log('⚠️ Could not clear existing data:', error);
  }

  console.log('✨ Creating users...');
  
  // Hash password for all users
  const hashedPassword = await bcrypt.hash('password123', 12);

  // Create Admin User
  const admin = await prisma.user.create({
    data: {
      name: 'System Administrator',
      email: 'admin@ashram.com',
      password: hashedPassword,
      role: 'ADMIN',
      isActive: true,
      phone: '+91-9876543210',
      dateOfBirth: new Date('1980-01-15'),
      address: 'Ashram Administrative Office, Main Block',
      emergencyContact: JSON.stringify({
        name: 'Emergency Admin',
        phone: '+91-9876543211',
        relationship: 'Office'
      })
    }
  });

  // Create 1 Guruji User
  const guruji = await prisma.user.create({
    data: {
      name: 'Guruji Ravi Kumar',
      email: 'ravi.kumar@ashram.com',
      password: hashedPassword,
      role: 'GURUJI',
      isActive: true,
      phone: '+91-9876543220',
      dateOfBirth: new Date('1965-03-20'),
      address: 'Ashram Spiritual Wing, Block A',
      preferences: {
        specialization: 'Meditation & Spiritual Guidance'
      },
      emergencyContact: JSON.stringify({
        name: 'Sita Kumar',
        phone: '+91-9876543221',
        relationship: 'Spouse'
      })
    }
  });

  // Create 1 Coordinator User
  const coordinator = await prisma.user.create({
    data: {
      name: 'Sunita Coordination Manager',
      email: 'coordinator@ashram.com',
      password: hashedPassword,
      role: 'COORDINATOR',
      isActive: true,
      phone: '+91-9876543260',
      dateOfBirth: new Date('1985-05-12'),
      address: 'Ashram Coordination Office, Ground Floor',
      emergencyContact: JSON.stringify({
        name: 'Ramesh Manager',
        phone: '+91-9876543261',
        relationship: 'Spouse'
      })
    }
  });

  // Create 50+ Regular Users
  console.log('👥 Creating 50+ regular users...');
  const users = [];
  const userNames = [
    'Amit Patel', 'Swati Sharma', 'Rajesh Kumar', 'Deepika Singh', 'Arjun Reddy',
    'Priya Verma', 'Vikram Malhotra', 'Anjali Gupta', 'Rahul Sharma', 'Neha Kapoor',
    'Suresh Iyer', 'Meera Nair', 'Karan Johar', 'Pooja Desai', 'Aditya Singh',
    'Riya Patel', 'Vivek Kumar', 'Zara Khan', 'Rohan Mehta', 'Ananya Reddy',
    'Dhruv Sharma', 'Ishita Gupta', 'Aryan Singh', 'Kavya Patel', 'Rishabh Kumar',
    'Tanvi Sharma', 'Arnav Reddy', 'Diya Patel', 'Shaurya Singh', 'Aisha Khan',
    'Vedant Kumar', 'Kiara Sharma', 'Advait Singh', 'Myra Patel', 'Rudra Kumar',
    'Zara Singh', 'Aarav Sharma', 'Anika Patel', 'Vihaan Kumar', 'Aaradhya Singh',
    'Krishna Sharma', 'Avni Patel', 'Aarush Kumar', 'Anvi Singh', 'Dhruv Patel',
    'Ira Sharma', 'Aarav Kumar', 'Anaya Singh', 'Vivaan Patel', 'Aisha Sharma',
    'Arjun Kumar', 'Zara Singh', 'Aarav Patel', 'Anika Kumar', 'Vihaan Singh',
    'Myra Sharma', 'Rudra Patel', 'Kiara Kumar', 'Advait Singh', 'Diya Sharma',
    'Shaurya Patel', 'Aisha Kumar', 'Vedant Singh', 'Tanvi Patel', 'Arnav Sharma',
    'Kavya Kumar', 'Rishabh Singh', 'Ishita Patel', 'Aryan Sharma', 'Riya Kumar',
    'Aditya Singh', 'Pooja Patel', 'Karan Sharma', 'Meera Kumar', 'Suresh Singh',
    'Neha Patel', 'Rahul Kumar', 'Anjali Singh', 'Vikram Patel', 'Priya Sharma',
    'Arjun Kumar', 'Deepika Patel', 'Rajesh Singh', 'Swati Kumar', 'Amit Sharma'
  ];

  const cities = [
    'Mumbai, Maharashtra', 'Delhi, India', 'Bangalore, Karnataka', 'Pune, Maharashtra', 'Hyderabad, Telangana',
    'Chennai, Tamil Nadu', 'Kolkata, West Bengal', 'Ahmedabad, Gujarat', 'Jaipur, Rajasthan', 'Lucknow, Uttar Pradesh',
    'Kanpur, Uttar Pradesh', 'Nagpur, Maharashtra', 'Indore, Madhya Pradesh', 'Thane, Maharashtra', 'Bhopal, Madhya Pradesh',
    'Visakhapatnam, Andhra Pradesh', 'Pimpri-Chinchwad, Maharashtra', 'Patna, Bihar', 'Vadodara, Gujarat', 'Ghaziabad, Uttar Pradesh',
    'Ludhiana, Punjab', 'Agra, Uttar Pradesh', 'Nashik, Maharashtra', 'Faridabad, Haryana', 'Meerut, Uttar Pradesh',
    'Rajkot, Gujarat', 'Kalyan-Dombivali, Maharashtra', 'Vasai-Virar, Maharashtra', 'Varanasi, Uttar Pradesh', 'Srinagar, Jammu and Kashmir',
    'Aurangabad, Maharashtra', 'Dhanbad, Jharkhand', 'Amritsar, Punjab', 'Allahabad, Uttar Pradesh', 'Ranchi, Jharkhand',
    'Howrah, West Bengal', 'Coimbatore, Tamil Nadu', 'Jabalpur, Madhya Pradesh', 'Gwalior, Madhya Pradesh', 'Vijayawada, Andhra Pradesh',
    'Jodhpur, Rajasthan', 'Madurai, Tamil Nadu', 'Raipur, Chhattisgarh', 'Kota, Rajasthan', 'Guwahati, Assam',
    'Chandigarh, Chandigarh', 'Solapur, Maharashtra', 'Hubli-Dharwad, Karnataka', 'Mysore, Karnataka', 'Tiruchirappalli, Tamil Nadu',
    'Bareilly, Uttar Pradesh', 'Aligarh, Uttar Pradesh', 'Tiruppur, Tamil Nadu', 'Gurgaon, Haryana', 'Moradabad, Uttar Pradesh',
    'Jalandhar, Punjab', 'Bhubaneswar, Odisha', 'Warangal, Telangana', 'Mira-Bhayandar, Maharashtra', 'Thiruvananthapuram, Kerala',
    'Bhiwandi, Maharashtra', 'Saharanpur, Uttar Pradesh', 'Guntur, Andhra Pradesh', 'Amravati, Maharashtra', 'Bikaner, Rajasthan',
    'Noida, Uttar Pradesh', 'Jamshedpur, Jharkhand', 'Bhilai, Chhattisgarh', 'Cuttack, Odisha', 'Firozabad, Uttar Pradesh',
    'Kochi, Kerala', 'Nellore, Andhra Pradesh', 'Bhavnagar, Gujarat', 'Dehradun, Uttarakhand', 'Durgapur, West Bengal',
    'Asansol, West Bengal', 'Rourkela, Odisha', 'Nanded, Maharashtra', 'Kolhapur, Maharashtra', 'Ajmer, Rajasthan',
    'Akola, Maharashtra', 'Gulbarga, Karnataka', 'Jamnagar, Gujarat', 'Ujjain, Madhya Pradesh', 'Loni, Uttar Pradesh',
    'Siliguri, West Bengal', 'Jhansi, Uttar Pradesh', 'Ulhasnagar, Maharashtra', 'Jammu, Jammu and Kashmir', 'Mangalore, Karnataka',
    'Erode, Tamil Nadu', 'Belgaum, Karnataka', 'Ambattur, Tamil Nadu', 'Tirunelveli, Tamil Nadu', 'Malegaon, Maharashtra'
  ];

  for (let i = 0; i < userNames.length; i++) {
    const userDetail = {
      name: userNames[i],
      email: `${userNames[i].toLowerCase().replace(' ', '.')}@example.com`,
      phone: `+91-987654${String(3301 + i).padStart(4, '0')}`,
      dateOfBirth: new Date(1980 + (i % 30), (i % 12), (i % 28) + 1), // Random dates between 1980-2010
      address: cities[i % cities.length],
      emergencyContact: JSON.stringify({
        name: `Emergency Contact ${i + 1}`,
        phone: `+91-987654${String(4001 + i).padStart(4, '0')}`,
        relationship: i % 3 === 0 ? 'Spouse' : i % 3 === 1 ? 'Parent' : 'Sibling'
      })
    };

    const user = await prisma.user.create({
      data: {
        ...userDetail,
        password: hashedPassword,
        role: 'USER',
        isActive: true,
      }
    });
    users.push(user);
  }

  console.log('📅 Creating sample appointments...');
  
  // Create sample appointments for the next few days
  const appointments = [];

  // Create appointments for today and next 7 days
  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const appointmentDate = new Date();
    appointmentDate.setDate(appointmentDate.getDate() + dayOffset);
    
    // Create 5-8 appointments per day
    const appointmentsPerDay = Math.floor(Math.random() * 4) + 5; // 5-8 appointments
    
    for (let i = 0; i < appointmentsPerDay; i++) {
      const selectedUser = users[Math.floor(Math.random() * users.length)];
      
      // Random time between 9 AM and 5 PM
      const hour = Math.floor(Math.random() * 8) + 9; // 9-16 (9 AM to 4 PM)
      const minute = Math.random() > 0.5 ? 0 : 30; // Either :00 or :30
      
      const startTime = new Date(appointmentDate);
      startTime.setHours(hour, minute, 0, 0);
      
      const endTime = new Date(startTime);
      endTime.setMinutes(endTime.getMinutes() + 30); // 30-minute appointments
      
      const priorities: Priority[] = ['LOW', 'NORMAL', 'HIGH'];
      const statuses: AppointmentStatus[] = dayOffset === 0 ? ['BOOKED', 'CONFIRMED'] : ['BOOKED'];
      
      const appointment = await prisma.appointment.create({
        data: {
          userId: selectedUser.id,
          gurujiId: guruji.id,
          date: appointmentDate,
          startTime: startTime,
          endTime: endTime,
          reason: `Spiritual consultation and guidance session with ${guruji.name}`,
          priority: priorities[Math.floor(Math.random() * priorities.length)],
          status: statuses[Math.floor(Math.random() * statuses.length)],
          qrCode: `data:image/png;base64,${Buffer.from(`qr-${selectedUser.id}-${guruji.id}-${Date.now()}-${Math.random()}`).toString('base64')}`, // Unique QR code
        }
      });
      appointments.push(appointment);
    }
  }

  console.log('🏥 Creating consultation records...');
  
  // Create some completed consultations for historical data
  const completedAppointments = appointments.slice(0, Math.floor(appointments.length / 3));
  
  for (const appointment of completedAppointments) {
    await prisma.consultationSession.create({
      data: {
        appointmentId: appointment.id,
        gurujiId: appointment.gurujiId!,
        patientId: appointment.userId,
        diagnosis: 'Spiritual consultation completed successfully',
        notes: 'Patient showed good progress in spiritual journey. Continue with daily meditation. Treatment: Meditation practices and spiritual guidance provided.',
        endTime: new Date(),
        duration: 30, // 30 minutes session
      }
    });

    // Update appointment status
    await prisma.appointment.update({
      where: { id: appointment.id },
      data: { status: 'COMPLETED' }
    });
  }

  console.log('💊 Creating remedy templates...');
  
  // Create remedy templates for the Guruji
  const remedyTemplates = [
    {
      name: 'Daily Meditation Practice',
      description: 'Comprehensive meditation routine for spiritual growth',
      instructions: `
1. Wake up at 5:00 AM daily
2. Sit in lotus position facing east
3. Chant "Om" 108 times
4. Practice deep breathing for 15 minutes
5. Meditate in silence for 30 minutes
6. End with gratitude prayer

Duration: 45 minutes daily
Best time: Early morning (5:00-6:00 AM)
      `.trim(),
      type: RemedyType.SPIRITUAL,
      category: 'Meditation',
      duration: '45 minutes daily for 21 days'
    },
    {
      name: 'Ayurvedic Detox Treatment',
      description: 'Natural herbal treatment for body purification',
      instructions: `
1. Drink warm water with lemon and honey (empty stomach)
2. Take Triphala powder (1 tsp) before bed
3. Apply sesame oil massage before bath
4. Consume turmeric milk before sleep
5. Avoid processed foods and sugar
6. Eat fresh fruits and vegetables only

Herbs included: Triphala, Turmeric, Sesame Oil
Duration: 14 days continuous
      `.trim(),
      type: RemedyType.AYURVEDIC,
      category: 'Detox',
      duration: '14 days detox program'
    },
    {
      name: 'Therapeutic Yoga Sequence',
      description: 'Healing yoga practice for physical and mental wellness',
      instructions: `
Morning Sequence (30 minutes):
1. Surya Namaskara (5 rounds)
2. Trikonasana (Triangle Pose) - 1 minute each side
3. Bhujangasana (Cobra Pose) - 2 minutes
4. Balasana (Child's Pose) - 3 minutes
5. Pranayama (Breathing exercises) - 10 minutes
6. Shavasana (Final relaxation) - 5 minutes

Practice daily, preferably at sunrise
      `.trim(),
      type: RemedyType.LIFESTYLE,
      category: 'Yoga',
      duration: '30 minutes daily for 30 days'
    },
    {
      name: 'Chakra Balancing Therapy',
      description: 'Energy healing and chakra alignment treatment',
      instructions: `
7-Day Chakra Healing Program:

Day 1 - Root Chakra: Red visualization, grounding exercises
Day 2 - Sacral Chakra: Orange light meditation, hip movements
Day 3 - Solar Plexus: Yellow energy focus, core strengthening
Day 4 - Heart Chakra: Green healing light, loving-kindness meditation
Day 5 - Throat Chakra: Blue light, chanting and singing
Day 6 - Third Eye: Indigo visualization, intuition exercises
Day 7 - Crown Chakra: Purple/white light, unity meditation

Each session: 20 minutes, twice daily
      `.trim(),
      type: RemedyType.SPIRITUAL,
      category: 'Energy Healing',
      duration: '7 days intensive program'
    }
  ];

  for (const template of remedyTemplates) {
    await prisma.remedyTemplate.create({
      data: template
    });
  }

  console.log('🔔 Creating sample notifications...');
  
  // Create notifications for users about their appointments
  const todayAppointments = appointments.filter(apt => {
    const today = new Date();
    const aptDate = new Date(apt.date);
    return aptDate.toDateString() === today.toDateString();
  });

  for (const appointment of todayAppointments) {
    await prisma.notification.create({
      data: {
        userId: appointment.userId,
        title: 'Appointment Reminder',
        message: `Your appointment with ${guruji.name} is today at ${appointment.startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`,
        type: 'appointment',
        data: {
          appointmentId: appointment.id,
          gurujiName: guruji.name,
          time: appointment.startTime.toISOString()
        }
      }
    });
  }

  console.log('📊 Creating audit logs...');
  
  // Create initial audit logs
  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: 'SYSTEM_SEED',
      resource: 'DATABASE',
      resourceId: 'seed-operation',
      newData: {
        message: 'Database seeded successfully',
        timestamp: new Date().toISOString(),
        usersCreated: users.length + 3, // +3 for admin, coordinator, and guruji
        appointmentsCreated: appointments.length,
        remedyTemplatesCreated: remedyTemplates.length
      }
    }
  });

  console.log('✅ Database seeding completed successfully!');
  console.log('\n📈 Summary:');
  console.log(`👤 Users created: ${users.length + 3}`);
  console.log(`   - Admin: 1`);
  console.log(`   - Coordinator: 1`);
  console.log(`   - Guruji: 1`);
  console.log(`   - Regular Users: ${users.length}`);
  console.log(`📅 Appointments created: ${appointments.length}`);
  console.log(`💊 Remedy templates created: ${remedyTemplates.length}`);
  console.log(`🔔 Notifications created: ${todayAppointments.length}`);
  
  console.log('\n🔑 Default Login Credentials:');
  console.log('Admin: admin@ashram.com / password123');
  console.log('Coordinator: coordinator@ashram.com / password123');
  console.log('Guruji: ravi.kumar@ashram.com / password123');
  console.log('User (Amit): amit.patel@example.com / password123');
  console.log('User (Swati): swati.sharma@example.com / password123');
  console.log('... and 48+ more users with pattern: firstname.lastname@example.com / password123');
  console.log('\n🚀 You can now run: npm run dev');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });