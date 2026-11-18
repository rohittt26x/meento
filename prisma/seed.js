const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding MEENTO database with MIT ADT Campus demonstration data...");

  // Clean existing records in correct foreign-key order
  await prisma.notification.deleteMany();
  await prisma.serviceRecord.deleteMany();
  await prisma.queueEvent.deleteMany();
  await prisma.queueEntry.deleteMany();
  await prisma.serviceCounter.deleteMany();
  await prisma.queue.deleteMany();
  await prisma.staffMembership.deleteMany();
  await prisma.venue.deleteMany();
  await prisma.business.deleteMany();
  await prisma.user.deleteMany();

  // 1. Create Users
  const adminUser = await prisma.user.create({
    data: {
      name: "Prof. Rajesh Deshmukh",
      email: "admin@mitadt.edu.in",
      phone: "+91 98220 11223",
      role: "ADMIN",
      passwordHash: "demo_admin_hashed_pw",
    },
  });

  const staff1 = await prisma.user.create({
    data: {
      name: "Priya Sharma (Counter 1)",
      email: "priya.sharma@mitadt.edu.in",
      phone: "+91 98220 22334",
      role: "STAFF",
      passwordHash: "demo_staff1_hashed_pw",
    },
  });

  const staff2 = await prisma.user.create({
    data: {
      name: "Amit Verma (Counter 2)",
      email: "amit.verma@mitadt.edu.in",
      phone: "+91 98220 33445",
      role: "STAFF",
      passwordHash: "demo_staff2_hashed_pw",
    },
  });

  const studentUser1 = await prisma.user.create({
    data: {
      name: "Rohit Shinde",
      email: "rohit.shinde@student.mitadt.edu.in",
      phone: "+91 98220 44556",
      role: "CUSTOMER",
    },
  });

  const studentUser2 = await prisma.user.create({
    data: {
      name: "Ananya Patil",
      email: "ananya.patil@student.mitadt.edu.in",
      phone: "+91 98220 55667",
      role: "CUSTOMER",
    },
  });

  // 2. Create Business
  const business = await prisma.business.create({
    data: {
      name: "MIT ADT University",
      slug: "mit-adt",
      description: "Center for Academic Excellence & Student Services, Pune",
      contactEmail: "registrar@mitadt.edu.in",
      contactPhone: "+91 20 3027 3400",
    },
  });

  // 3. Create Venue
  const venue = await prisma.venue.create({
    data: {
      businessId: business.id,
      name: "MIT ADT Campus Service Centre",
      code: "MIT-CSC-01",
      address: "Ground Floor, Chhatrapati Shivaji Maharaj Bhavan, Rajbaug Campus, Loni Kalbhor, Pune",
      phone: "+91 20 3027 3450",
      isOpen: true,
    },
  });

  // 4. Staff Memberships
  await prisma.staffMembership.create({
    data: {
      userId: staff1.id,
      venueId: venue.id,
      roleTitle: "Senior Admissions Officer",
      isActive: true,
    },
  });

  await prisma.staffMembership.create({
    data: {
      userId: staff2.id,
      venueId: venue.id,
      roleTitle: "Examination & Transcripts Officer",
      isActive: true,
    },
  });

  // 5. Create Service Counters
  const counter1 = await prisma.serviceCounter.create({
    data: {
      venueId: venue.id,
      counterNumber: 1,
      name: "Counter 1: Admissions & Fees",
      description: "Admission queries, fee clearance, bonafide verification",
      status: "BUSY",
      currentStaffId: staff1.id,
    },
  });

  const counter2 = await prisma.serviceCounter.create({
    data: {
      venueId: venue.id,
      counterNumber: 2,
      name: "Counter 2: Transcripts & Records",
      description: "Marksheets, degree certificates, migration records",
      status: "BUSY",
      currentStaffId: staff2.id,
    },
  });

  const counter3 = await prisma.serviceCounter.create({
    data: {
      venueId: venue.id,
      counterNumber: 3,
      name: "Counter 3: Identity Cards & Verification",
      description: "Smart RFID card issuance, bus passes, general desk",
      status: "OPEN",
    },
  });

  // 6. Create Primary Queues
  const adminQueue = await prisma.queue.create({
    data: {
      venueId: venue.id,
      name: "Student Administration Queue",
      code: "MIT-ADMIN-Q",
      description: "Verification of documents, fee receipts, bonafide certificates and transcripts.",
      prefix: "A",
      maxCapacity: 150,
      status: "OPEN",
      estimatedServiceTimeMinutes: 4,
    },
  });

  const xeroxQueue = await prisma.queue.create({
    data: {
      venueId: venue.id,
      name: "Central Campus Xerox & Document Center",
      code: "MIT-XEROX-Q",
      description: "Fast-track thesis binding, printouts, blueprint scanning.",
      prefix: "X",
      maxCapacity: 80,
      status: "OPEN",
      estimatedServiceTimeMinutes: 3,
    },
  });

  const canteenQueue = await prisma.queue.create({
    data: {
      venueId: venue.id,
      name: "Main Campus Canteen Meal Pickup",
      code: "MIT-CANTEEN-Q",
      description: "Pre-ordered lunch thalis, snack tokens, fresh juice counter.",
      prefix: "C",
      maxCapacity: 120,
      status: "OPEN",
      estimatedServiceTimeMinutes: 2,
    },
  });

  // 7. Seed Tokens in Student Administration Queue
  const now = new Date();

  // Completed Token A-101
  const t101 = await prisma.queueEntry.create({
    data: {
      queueId: adminQueue.id,
      tokenNumber: 101,
      formattedCode: "A-101",
      customerName: "Kunal Deshpande",
      customerPhone: "+91 98111 10101",
      status: "COMPLETED",
      counterId: counter1.id,
      joinedAt: new Date(now.getTime() - 45 * 60 * 1000),
      calledAt: new Date(now.getTime() - 38 * 60 * 1000),
      servedAt: new Date(now.getTime() - 37 * 60 * 1000),
      completedAt: new Date(now.getTime() - 33 * 60 * 1000),
    },
  });

  await prisma.serviceRecord.create({
    data: {
      queueEntryId: t101.id,
      counterId: counter1.id,
      staffId: staff1.id,
      durationSeconds: 240,
      startedAt: new Date(now.getTime() - 37 * 60 * 1000),
      completedAt: new Date(now.getTime() - 33 * 60 * 1000),
      notes: "Fee clearance verified. Issued receipt stamp.",
    },
  });

  // Completed Token A-102
  const t102 = await prisma.queueEntry.create({
    data: {
      queueId: adminQueue.id,
      tokenNumber: 102,
      formattedCode: "A-102",
      customerName: "Siddharth Kulkarni",
      customerPhone: "+91 98111 10202",
      status: "COMPLETED",
      counterId: counter2.id,
      joinedAt: new Date(now.getTime() - 40 * 60 * 1000),
      calledAt: new Date(now.getTime() - 32 * 60 * 1000),
      servedAt: new Date(now.getTime() - 31 * 60 * 1000),
      completedAt: new Date(now.getTime() - 26 * 60 * 1000),
    },
  });

  await prisma.serviceRecord.create({
    data: {
      queueEntryId: t102.id,
      counterId: counter2.id,
      staffId: staff2.id,
      durationSeconds: 300,
      startedAt: new Date(now.getTime() - 31 * 60 * 1000),
      completedAt: new Date(now.getTime() - 26 * 60 * 1000),
      notes: "Degree transcript issued and sealed.",
    },
  });

  // SERVING Token A-103 at Counter 1
  const t103 = await prisma.queueEntry.create({
    data: {
      queueId: adminQueue.id,
      tokenNumber: 103,
      formattedCode: "A-103",
      customerName: "Tanvi Joshi",
      customerPhone: "+91 98111 10303",
      status: "SERVING",
      counterId: counter1.id,
      joinedAt: new Date(now.getTime() - 25 * 60 * 1000),
      calledAt: new Date(now.getTime() - 8 * 60 * 1000),
      servedAt: new Date(now.getTime() - 6 * 60 * 1000),
    },
  });

  // CALLED Token A-104 at Counter 2
  const t104 = await prisma.queueEntry.create({
    data: {
      queueId: adminQueue.id,
      tokenNumber: 104,
      formattedCode: "A-104",
      customerName: "Aditya Shinde",
      customerPhone: "+91 98111 10404",
      status: "CALLED",
      counterId: counter2.id,
      joinedAt: new Date(now.getTime() - 20 * 60 * 1000),
      calledAt: new Date(now.getTime() - 2 * 60 * 1000),
    },
  });

  // WAITING Tokens: A-105, A-106, A-107
  const t105 = await prisma.queueEntry.create({
    data: {
      queueId: adminQueue.id,
      userId: studentUser1.id,
      tokenNumber: 105,
      formattedCode: "A-105",
      customerName: "Rohit Shinde (Demo User)",
      customerPhone: "+91 98220 44556",
      status: "WAITING",
      joinedAt: new Date(now.getTime() - 15 * 60 * 1000),
      priority: 0,
    },
  });

  const t106 = await prisma.queueEntry.create({
    data: {
      queueId: adminQueue.id,
      userId: studentUser2.id,
      tokenNumber: 106,
      formattedCode: "A-106",
      customerName: "Ananya Patil",
      customerPhone: "+91 98220 55667",
      status: "WAITING",
      joinedAt: new Date(now.getTime() - 10 * 60 * 1000),
      priority: 0,
    },
  });

  const t107 = await prisma.queueEntry.create({
    data: {
      queueId: adminQueue.id,
      tokenNumber: 107,
      formattedCode: "A-107",
      customerName: "Gaurav More",
      customerPhone: "+91 98111 10707",
      status: "WAITING",
      joinedAt: new Date(now.getTime() - 5 * 60 * 1000),
      priority: 0,
    },
  });

  // Audit Events for t105
  await prisma.queueEvent.create({
    data: {
      queueEntryId: t105.id,
      eventType: "JOINED",
      details: "Customer joined via mobile QR scan",
    },
  });

  console.log("✅ Seed completed successfully!");
  console.log(`🏢 Business: ${business.name} (${business.slug})`);
  console.log(`📍 Venue: ${venue.name} (${venue.code})`);
  console.log(`📋 Main Queue: ${adminQueue.name} (Code: ${adminQueue.code}, ID: ${adminQueue.id})`);
  console.log(`🎫 Live Demo Token ID: ${t105.id} (Token: ${t105.formattedCode})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
