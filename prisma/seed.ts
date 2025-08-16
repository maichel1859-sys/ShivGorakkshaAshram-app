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
      
      // Delete in the correct order to avoid foreign key constraint violations
      await prisma.auditLog.deleteMany();
      await prisma.notification.deleteMany();
      await prisma.queueEntry.deleteMany();
      await prisma.remedyDocument.deleteMany();
      await prisma.remedyTemplate.deleteMany();
      await prisma.consultationSession.deleteMany();
      await prisma.appointment.deleteMany();
      await prisma.familyContact.deleteMany(); // Clear family contacts first
      await prisma.account.deleteMany(); // Clear OAuth accounts
      await prisma.session.deleteMany(); // Clear sessions
      await prisma.verificationToken.deleteMany(); // Clear verification tokens
      await prisma.systemSetting.deleteMany(); // Clear system settings
      await prisma.user.deleteMany();
      console.log('✅ Existing data cleared');
    } else {
      console.log('✅ Database is clean, ready for seeding');
    }
  } catch (error) {
    console.log('⚠️ Could not clear existing data:', error);
    console.log('Attempting to proceed with seeding...');
  }

  console.log('✨ Creating users...');
  
  // Hash password for all users
  const hashedPassword = await bcrypt.hash('password123', 12);

  // Create Admin User
  const admin = await prisma.user.upsert({
    where: { email: 'admin@ashram.com' },
    update: {
      name: 'System Administrator',
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
    },
    create: {
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

  // Create 3 Guruji Users
  const gurujis = [];
  const gurujiNames = [
    'Guruji Ravi Kumar',
    'Guruji Priya Sharma', 
    'Guruji Amit Patel'
  ];
  
  for (let i = 0; i < gurujiNames.length; i++) {
    const email = gurujiNames[i].toLowerCase().replace(/\s+/g, '.') + '@ashram.com';
    const guruji = await prisma.user.upsert({
      where: { email },
      update: {
        name: gurujiNames[i],
        password: hashedPassword,
        role: 'GURUJI',
        isActive: true,
        phone: `+91-98765432${20 + i}`,
        dateOfBirth: new Date(1965 + i, 3 + i, 20 + i),
        address: `Ashram Spiritual Wing, Block ${String.fromCharCode(65 + i)}`,
        preferences: {
          specialization: ['Meditation & Spiritual Guidance', 'Ayurvedic Healing', 'Yoga Therapy'][i]
        },
        emergencyContact: JSON.stringify({
          name: `Emergency Contact ${i + 1}`,
          phone: `+91-98765432${21 + i}`,
          relationship: 'Spouse'
        })
      },
      create: {
        name: gurujiNames[i],
        email,
        password: hashedPassword,
        role: 'GURUJI',
        isActive: true,
        phone: `+91-98765432${20 + i}`,
        dateOfBirth: new Date(1965 + i, 3 + i, 20 + i),
        address: `Ashram Spiritual Wing, Block ${String.fromCharCode(65 + i)}`,
        preferences: {
          specialization: ['Meditation & Spiritual Guidance', 'Ayurvedic Healing', 'Yoga Therapy'][i]
        },
        emergencyContact: JSON.stringify({
          name: `Emergency Contact ${i + 1}`,
          phone: `+91-98765432${21 + i}`,
          relationship: 'Spouse'
        })
      }
    });
    gurujis.push(guruji);
  }

  // Create 1 Coordinator User
  const coordinator = await prisma.user.upsert({
    where: { email: 'coordinator@ashram.com' },
    update: {
      name: 'Sunita Coordination Manager',
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
    },
    create: {
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

  // Create 100+ Regular Users
  console.log('👥 Creating 100+ regular users...');
  const users = [];
  const userNames = [
    'Amit Patel', 'Swati Sharma', 'Rajesh Kumar', 'Deepika Singh', 'Arjun Reddy',
    'Priya Verma', 'Vikram Malhotra', 'Anjali Gupta', 'Rahul Sharma', 'Neha Kapoor',
    'Suresh Iyer', 'Meera Nair', 'Karan Johar', 'Pooja Desai', 'Aditya Singh',
    'Riya Patel', 'Vivek Kumar', 'Zara Khan', 'Rohan Mehta', 'Ananya Reddy',
    'Dhruv Sharma', 'Ishita Gupta', 'Aryan Singh', 'Kavya Patel', 'Rishabh Kumar',
    'Tanvi Sharma', 'Arnav Reddy', 'Diya Patel', 'Shaurya Singh', 'Aisha Khan',
    'Vedant Kumar', 'Kiara Sharma', 'Advait Singh', 'Myra Patel', 'Rudra Kumar',
    'Aarav Sharma', 'Anika Patel', 'Vihaan Kumar', 'Aaradhya Singh', 'Krishna Sharma',
    'Avni Patel', 'Aarush Kumar', 'Anvi Singh', 'Dhruv Patel', 'Ira Sharma',
    'Aarav Kumar', 'Anaya Singh', 'Vivaan Patel', 'Aisha Sharma', 'Arjun Kumar',
    'Aarav Patel', 'Anika Kumar', 'Vihaan Singh', 'Myra Sharma', 'Rudra Patel',
    'Kiara Kumar', 'Advait Singh', 'Diya Sharma', 'Shaurya Patel', 'Aisha Kumar',
    'Vedant Singh', 'Tanvi Patel', 'Arnav Sharma', 'Kavya Kumar', 'Rishabh Singh',
    'Ishita Patel', 'Aryan Sharma', 'Riya Kumar', 'Aditya Singh', 'Pooja Patel',
    'Karan Sharma', 'Meera Kumar', 'Suresh Singh', 'Neha Patel', 'Rahul Kumar',
    'Anjali Singh', 'Vikram Patel', 'Priya Sharma', 'Arjun Kumar', 'Deepika Patel',
    'Rajesh Singh', 'Swati Kumar', 'Amit Sharma', 'Lakshmi Devi', 'Ganesh Prasad',
    'Radha Rani', 'Hanuman Das', 'Sita Devi', 'Ram Chandra', 'Krishna Das',
    'Durga Devi', 'Shiva Prasad', 'Parvati Devi', 'Vishnu Das', 'Lakshmi Prasad',
    'Brahma Das', 'Saraswati Devi', 'Ganga Devi', 'Yamuna Devi', 'Kaveri Devi',
    'Narmada Devi', 'Godavari Devi', 'Krishna Devi', 'Radha Prasad', 'Hanuman Prasad',
    'Sita Prasad', 'Ram Das', 'Lakshmi Das', 'Ganesh Das', 'Durga Prasad',
    'Shiva Das', 'Parvati Prasad', 'Vishnu Prasad', 'Brahma Prasad', 'Saraswati Prasad',
    'Lakshmi Devi', 'Ganesh Prasad', 'Radha Rani', 'Hanuman Das', 'Sita Devi',
    'Ram Chandra', 'Krishna Das', 'Durga Devi', 'Shiva Prasad', 'Parvati Devi',
    'Vishnu Das', 'Lakshmi Prasad', 'Brahma Das', 'Saraswati Devi', 'Ganga Devi',
    'Yamuna Devi', 'Kaveri Devi', 'Narmada Devi', 'Godavari Devi', 'Krishna Devi',
    'Radha Prasad', 'Hanuman Prasad', 'Sita Prasad', 'Ram Das', 'Lakshmi Das',
    'Ganesh Das', 'Durga Prasad', 'Shiva Das', 'Parvati Prasad', 'Vishnu Prasad',
    'Brahma Prasad', 'Saraswati Prasad', 'Lakshmi Devi', 'Ganesh Prasad', 'Radha Rani'
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
    const email = `${userNames[i].toLowerCase().replace(/\s+/g, '.')}${i + 1}@example.com`;
    const userDetail = {
      name: userNames[i],
      email,
      phone: `+91-987654${String(3301 + i).padStart(4, '0')}`,
      dateOfBirth: new Date(1980 + (i % 30), (i % 12), (i % 28) + 1), // Random dates between 1980-2010
      address: cities[i % cities.length],
      emergencyContact: JSON.stringify({
        name: `Emergency Contact ${i + 1}`,
        phone: `+91-987654${String(4001 + i).padStart(4, '0')}`,
        relationship: i % 3 === 0 ? 'Spouse' : i % 3 === 1 ? 'Parent' : 'Sibling'
      })
    };

    try {
      const user = await prisma.user.upsert({
        where: { email },
        update: {
          ...userDetail,
          password: hashedPassword,
          role: 'USER',
          isActive: true,
        },
        create: {
          ...userDetail,
          password: hashedPassword,
          role: 'USER',
          isActive: true,
        }
      });
      users.push(user);
    } catch (error) {
      console.log(`⚠️ Skipped user ${userNames[i]} due to constraint error`);
      // Continue with next user
    }
  }

  console.log('📅 Creating sample appointments...');
  
  // Create sample appointments for the next few days
  const appointments = [];

  // Create appointments for today and next 14 days
  for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
    const appointmentDate = new Date();
    appointmentDate.setDate(appointmentDate.getDate() + dayOffset);
    
    // Create 8-15 appointments per day
    const appointmentsPerDay = Math.floor(Math.random() * 8) + 8; // 8-15 appointments
    
    for (let i = 0; i < appointmentsPerDay; i++) {
      const selectedUser = users[Math.floor(Math.random() * users.length)];
      const selectedGuruji = gurujis[Math.floor(Math.random() * gurujis.length)];
      
      // Random time between 9 AM and 6 PM
      const hour = Math.floor(Math.random() * 9) + 9; // 9-17 (9 AM to 5 PM)
      const minute = Math.random() > 0.5 ? 0 : 30; // Either :00 or :30
      
      const startTime = new Date(appointmentDate);
      startTime.setHours(hour, minute, 0, 0);
      
      const endTime = new Date(startTime);
      endTime.setMinutes(endTime.getMinutes() + 45); // 45-minute appointments
      
      const priorities: Priority[] = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];
      const statuses: AppointmentStatus[] = dayOffset === 0 ? ['BOOKED', 'CONFIRMED', 'IN_PROGRESS'] : ['BOOKED', 'CONFIRMED'];
      
      const appointment = await prisma.appointment.create({
        data: {
          userId: selectedUser.id,
          gurujiId: selectedGuruji.id,
          date: appointmentDate,
          startTime: startTime,
          endTime: endTime,
          reason: `Spiritual consultation and guidance session with ${selectedGuruji.name}`,
          priority: priorities[Math.floor(Math.random() * priorities.length)],
          status: statuses[Math.floor(Math.random() * statuses.length)],
          qrCode: `data:image/png;base64,${Buffer.from(`qr-${selectedUser.id}-${selectedGuruji.id}-${Date.now()}-${Math.random()}`).toString('base64')}`, // Unique QR code
        }
      });
      appointments.push(appointment);
    }
  }

  console.log('🏥 Creating consultation records...');
  
  // Create some completed consultations for historical data
  const completedAppointments = appointments.slice(0, Math.floor(appointments.length / 2));
  
  for (const appointment of completedAppointments) {
    await prisma.consultationSession.create({
      data: {
        appointmentId: appointment.id,
        gurujiId: appointment.gurujiId!,
        patientId: appointment.userId,
        diagnosis: 'Spiritual consultation completed successfully',
        notes: 'Patient showed good progress in spiritual journey. Continue with daily meditation. Treatment: Meditation practices and spiritual guidance provided.',
        endTime: new Date(),
        duration: 45, // 45 minutes session
      }
    });

    // Update appointment status
    await prisma.appointment.update({
      where: { id: appointment.id },
      data: { status: 'COMPLETED' }
    });
  }

  console.log('📋 Creating queue entries...');
  
  // Create queue entries for today's appointments
  const todayAppointments = appointments.filter(apt => {
    const today = new Date();
    const aptDate = new Date(apt.date);
    return aptDate.toDateString() === today.toDateString();
  });

  // Note: Queue entries creation is temporarily disabled until database migration is complete
  // for (let i = 0; i < todayAppointments.length; i++) {
  //   const appointment = todayAppointments[i];
  //   await prisma.queueEntry.create({
  //     data: {
  //       appointmentId: appointment.id,
  //       userId: appointment.userId,
  //       gurujiId: appointment.gurujiId!,
  //       position: i + 1,
  //       status: i === 0 ? 'IN_PROGRESS' : 'WAITING',
  //       estimatedWait: (i + 1) * 15, // 15 minutes per position
  //       checkedInAt: new Date(),
  //       notes: `Queue entry for ${appointment.reason}`,
  //       priority: appointment.priority,
  //     }
  //   });
  // }

  console.log('💊 Creating remedy templates...');
  
  // Create remedy templates for the Gurujis
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
    },
    {
      name: 'Stress Relief Breathing',
      description: 'Simple breathing technique for immediate stress relief',
      instructions: `
4-7-8 Breathing Technique:
1. Sit comfortably with back straight
2. Place tongue on roof of mouth
3. Inhale through nose for 4 counts
4. Hold breath for 7 counts
5. Exhale through mouth for 8 counts
6. Repeat 4 times

Practice 3 times daily
      `.trim(),
      type: RemedyType.LIFESTYLE,
      category: 'Breathing',
      duration: '5 minutes, 3 times daily'
    }
  ];

  for (const template of remedyTemplates) {
    await prisma.remedyTemplate.create({
      data: template
    });
  }

  console.log('🔔 Creating sample notifications...');
  
  // Create notifications for users about their appointments
  const notificationTypes = [
    {
      title: 'Appointment Reminder',
      message: (gurujiName: string, time: string) => `Your appointment with ${gurujiName} is today at ${time}`,
      type: 'appointment'
    },
    {
      title: 'Queue Update',
      message: (position: number) => `Your queue position is now ${position}. Estimated wait: ${position * 15} minutes`,
      type: 'queue'
    },
    {
      title: 'Remedy Ready',
      message: (remedyName: string) => `Your ${remedyName} remedy is ready for download`,
      type: 'remedy'
    },
    {
      title: 'Consultation Complete',
      message: (gurujiName: string) => `Your consultation with ${gurujiName} has been completed. Check your remedies section.`,
      type: 'consultation'
    }
  ];

  // Create notifications for today's appointments
  for (const appointment of todayAppointments) {
    const guruji = gurujis.find(g => g.id === appointment.gurujiId);
    const time = appointment.startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    
    await prisma.notification.create({
      data: {
        userId: appointment.userId,
        title: 'Appointment Reminder',
        message: `Your appointment with ${guruji?.name} is today at ${time}`,
        type: 'appointment',
        data: {
          appointmentId: appointment.id,
          gurujiName: guruji?.name,
          time: appointment.startTime.toISOString()
        }
      }
    });
  }

  // Create queue notifications
  for (let i = 0; i < Math.min(10, todayAppointments.length); i++) {
    const appointment = todayAppointments[i];
    await prisma.notification.create({
      data: {
        userId: appointment.userId,
        title: 'Queue Update',
        message: `Your queue position is now ${i + 1}. Estimated wait: ${(i + 1) * 15} minutes`,
        type: 'queue',
        data: {
          queueEntryId: `queue-${i + 1}`,
          position: i + 1,
          estimatedWait: (i + 1) * 15
        }
      }
    });
  }

  // Create remedy notifications
  for (let i = 0; i < Math.min(5, users.length); i++) {
    const user = users[i];
    const remedyTemplate = remedyTemplates[i % remedyTemplates.length];
    
    await prisma.notification.create({
      data: {
        userId: user.id,
        title: 'Remedy Ready',
        message: `Your ${remedyTemplate.name} remedy is ready for download`,
        type: 'remedy',
        data: {
          remedyId: `remedy-${i + 1}`,
          remedyName: remedyTemplate.name,
          templateId: `template-${i + 1}`
        }
      }
    });
  }

  console.log('⚙️ Creating system settings...');
  
  // Create system settings
  const systemSettings = [
    {
      key: 'appointment_duration',
      value: '45',
      type: 'number',
      category: 'appointments',
      description: 'Default appointment duration in minutes'
    },
    {
      key: 'queue_timeout',
      value: '30',
      type: 'number',
      category: 'queue',
      description: 'Queue entry timeout in minutes'
    },
    {
      key: 'max_appointments_per_day',
      value: '20',
      type: 'number',
      category: 'appointments',
      description: 'Maximum appointments per day per guruji'
    },
    {
      key: 'notification_retention_days',
      value: '30',
      type: 'number',
      category: 'notifications',
      description: 'Number of days to retain notifications'
    },
    {
      key: 'maintenance_mode',
      value: 'false',
      type: 'boolean',
      category: 'system',
      description: 'System maintenance mode'
    },
    {
      key: 'ashram_name',
      value: 'Shivgoraksha Ashram',
      type: 'string',
      category: 'general',
      description: 'Ashram name for display'
    },
    {
      key: 'contact_email',
      value: 'contact@ashram.com',
      type: 'string',
      category: 'general',
      description: 'Primary contact email'
    },
    {
      key: 'contact_phone',
      value: '+91-9876543210',
      type: 'string',
      category: 'general',
      description: 'Primary contact phone'
    }
  ];

  for (const setting of systemSettings) {
    await prisma.systemSetting.create({
      data: setting
    });
  }

  console.log('👨‍👩‍👧‍👦 Creating family contacts...');
  
  // Create family contacts for elderly users (users over 60)
  const elderlyUsers = users.filter(user => {
    if (!user.dateOfBirth) return false;
    const age = new Date().getFullYear() - user.dateOfBirth.getFullYear();
    return age >= 60;
  });

  for (const elderlyUser of elderlyUsers.slice(0, 20)) { // Limit to 20 elderly users
    // Create a family contact user first
    const familyContactUser = await prisma.user.create({
      data: {
        name: `Family Contact for ${elderlyUser.name || 'Elderly User'}`,
        email: `family.${elderlyUser.name?.toLowerCase().replace(/\s+/g, '.') || 'contact'}@example.com`,
        password: hashedPassword,
        role: 'USER',
        isActive: true,
        phone: `+91-987654${String(5001 + Math.floor(Math.random() * 1000)).padStart(4, '0')}`,
        dateOfBirth: new Date(1980 + Math.floor(Math.random() * 20), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
        address: elderlyUser.address || 'Same as elderly user',
      }
    });

    // Create the family contact relationship
    await prisma.familyContact.create({
      data: {
        elderlyUserId: elderlyUser.id,
        familyContactId: familyContactUser.id,
        relationship: ['son', 'daughter', 'spouse', 'caregiver'][Math.floor(Math.random() * 4)],
        canBookAppointments: true,
        canViewRemedies: true,
        canReceiveUpdates: true,
        isActive: true,
        notes: `Primary family contact for ${elderlyUser.name || 'Elderly User'}`
      }
    });
  }

  console.log('💊 Creating remedy documents...');
  
  // Get the actual remedy templates from database
  const actualRemedyTemplates = await prisma.remedyTemplate.findMany();
  
  // Create remedy documents for completed consultations
  for (let i = 0; i < Math.min(20, completedAppointments.length); i++) {
    const appointment = completedAppointments[i];
    const remedyTemplate = actualRemedyTemplates[i % actualRemedyTemplates.length];
    const guruji = gurujis.find(g => g.id === appointment.gurujiId);
    
    // Get the consultation session for this appointment
    const consultationSession = await prisma.consultationSession.findFirst({
      where: { appointmentId: appointment.id }
    });

    if (consultationSession && remedyTemplate) {
      await prisma.remedyDocument.create({
        data: {
          consultationSessionId: consultationSession.id,
          templateId: remedyTemplate.id,
          userId: appointment.userId,
          customInstructions: remedyTemplate.instructions,
          customDosage: 'As prescribed by Guruji',
          customDuration: remedyTemplate.duration,
          pdfUrl: `https://ashram.com/remedies/${appointment.id}.pdf`,
          emailSent: Math.random() > 0.5,
          smsSent: Math.random() > 0.5,
          deliveredAt: Math.random() > 0.7 ? new Date() : null,
        }
      });
    }
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
        usersCreated: users.length + 4, // +4 for admin, coordinator, and 3 gurujis
        appointmentsCreated: appointments.length,
        remedyTemplatesCreated: remedyTemplates.length,
        queueEntriesCreated: todayAppointments.length,
        notificationsCreated: todayAppointments.length + Math.min(10, todayAppointments.length) + Math.min(5, users.length),
        familyContactsCreated: Math.min(20, elderlyUsers.length),
        remedyDocumentsCreated: Math.min(20, completedAppointments.length)
      }
    }
  });

  console.log('✅ Database seeding completed successfully!');
  console.log('\n📈 Summary:');
  console.log(`👤 Users created: ${users.length + 4 + Math.min(20, elderlyUsers.length)}`);
  console.log(`   - Admin: 1`);
  console.log(`   - Coordinator: 1`);
  console.log(`   - Gurujis: ${gurujis.length}`);
  console.log(`   - Regular Users: ${users.length}`);
  console.log(`   - Family Contacts: ${Math.min(20, elderlyUsers.length)}`);
  console.log(`📅 Appointments created: ${appointments.length}`);
  console.log(`📋 Queue entries created: ${todayAppointments.length}`);
  console.log(`🏥 Consultation sessions created: ${completedAppointments.length}`);
  console.log(`💊 Remedy templates created: ${remedyTemplates.length}`);
  console.log(`💊 Remedy documents created: ${Math.min(20, completedAppointments.length)}`);
  console.log(`👨‍👩‍👧‍👦 Family contacts created: ${Math.min(20, elderlyUsers.length)}`);
  console.log(`🔔 Notifications created: ${todayAppointments.length + Math.min(10, todayAppointments.length) + Math.min(5, users.length)}`);
  console.log(`⚙️ System settings created: ${systemSettings.length}`);
  
  console.log('\n🔑 Default Login Credentials:');
  console.log('Admin: admin@ashram.com / password123');
  console.log('Coordinator: coordinator@ashram.com / password123');
  console.log('Guruji 1: guruji.ravi.kumar@ashram.com / password123');
  console.log('Guruji 2: guruji.priya.sharma@ashram.com / password123');
  console.log('Guruji 3: guruji.amit.patel@ashram.com / password123');
  console.log('User (Amit): amit.patel1@example.com / password123');
  console.log('User (Swati): swati.sharma1@example.com / password123');
  console.log('... and 98+ more users with pattern: firstname.lastname@example.com / password123');
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