/**
 * seed.js
 * Database seeder for the Remote Patient Monitoring system.
 *
 * Creates:
 *  - 1 Admin:    admin@rpm.local   / Admin@123
 *  - 1 Doctor:   doctor@rpm.local  / Doctor@123
 *  - 3 Patients: p001@rpm.local, p002@rpm.local, p003@rpm.local / Patient@123
 *  - 3 Devices:  DEV_001 → P001, DEV_002 → P002, DEV_003 → P003
 *  - Doctor recommendations for each patient
 *  - 20 historical health readings per patient (varied alert levels)
 *  - Alerts for level 2 and 3 readings
 *
 * Raw device tokens are printed to console (only time they're visible).
 *
 * Usage: npm run seed
 */

'use strict';

require('dotenv').config();

const mongoose = require('mongoose');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

// Models
const User = require('./src/models/User');
const Patient = require('./src/models/Patient');
const Device = require('./src/models/Device');
const HealthReading = require('./src/models/HealthReading');
const Alert = require('./src/models/Alert');
const Recommendation = require('./src/models/Recommendation');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Map level number to label string */
const levelToLabel = (level) =>
  ({ 1: 'Normal', 2: 'Attention Needed', 3: 'Doctor Attention Recommended' }[level]);

/**
 * Generate a set of 20 varied health readings.
 * Distribution: ~60% normal, ~25% attention needed, ~15% doctor attention.
 */
const generateReadings = (baseDate) => {
  const readings = [];

  // Predefined patterns to ensure variety and reproducibility
  const patterns = [
    { hr: 72, spo2: 98, level: 1 },
    { hr: 75, spo2: 97, level: 1 },
    { hr: 80, spo2: 96, level: 1 },
    { hr: 68, spo2: 99, level: 1 },
    { hr: 78, spo2: 97, level: 1 },
    { hr: 85, spo2: 95, level: 1 },
    { hr: 70, spo2: 98, level: 1 },
    { hr: 65, spo2: 96, level: 1 },
    { hr: 73, spo2: 97, level: 1 },
    { hr: 77, spo2: 99, level: 1 },
    { hr: 95, spo2: 93, level: 2 },  // Attention
    { hr: 102, spo2: 94, level: 2 }, // Attention
    { hr: 55, spo2: 93, level: 2 },  // Attention
    { hr: 108, spo2: 94, level: 2 }, // Attention
    { hr: 98, spo2: 93, level: 2 },  // Attention
    { hr: 120, spo2: 90, level: 3 }, // Doctor Attention
    { hr: 130, spo2: 88, level: 3 }, // Doctor Attention
    { hr: 40, spo2: 89, level: 3 },  // Doctor Attention
    { hr: 76, spo2: 95, level: 1 },
    { hr: 71, spo2: 98, level: 1 },
  ];

  for (let i = 0; i < patterns.length; i++) {
    const p = patterns[i];
    // Space readings 30 minutes apart going back from now
    const timestamp = new Date(baseDate.getTime() - (patterns.length - i) * 30 * 60 * 1000);

    readings.push({
      heartRate: p.hr,
      spo2: p.spo2,
      alertLevel: p.level,
      alertLabel: levelToLabel(p.level),
      timestamp,
    });
  }

  return readings;
};

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Populate seed data logic (runs on any active mongoose connection)
// ---------------------------------------------------------------------------
async function populateSeedData() {

  // ---------------------------------------------------------------------------
  // 1. Clear existing data (ordered to respect references)
  // ---------------------------------------------------------------------------
  console.log('🗑️  Clearing existing data…');
  await Alert.deleteMany({});
  await HealthReading.deleteMany({});
  await Recommendation.deleteMany({});
  await Patient.deleteMany({});
  await Device.deleteMany({});
  await User.deleteMany({});
  console.log('   Done.\n');

  // ---------------------------------------------------------------------------
  // 2. Create Admin
  // ---------------------------------------------------------------------------
  console.log('👤 Creating admin…');
  const admin = await User.create({
    name: 'System Admin',
    email: 'admin@rpm.local',
    password: 'Admin@123',
    role: 'admin',
  });
  console.log(`   Admin created: ${admin.email}`);

  // ---------------------------------------------------------------------------
  // 3. Create Doctor
  // ---------------------------------------------------------------------------
  console.log('\n👨‍⚕️  Creating doctor…');
  const doctor = await User.create({
    name: 'Dr. Sarah Johnson',
    email: 'doctor@rpm.local',
    password: 'Doctor@123',
    role: 'doctor',
  });
  console.log(`   Doctor created: ${doctor.email}`);

  // ---------------------------------------------------------------------------
  // 4. Create Patients (User + Patient profile)
  // ---------------------------------------------------------------------------
  console.log('\n🏥 Creating patients…');
  const patientData = [
    {
      name: 'Alice Thompson',
      email: 'p001@rpm.local',
      dob: new Date('1985-03-12'),
      gender: 'Female',
      contact: '+1-555-0101',
    },
    {
      name: 'Bob Martinez',
      email: 'p002@rpm.local',
      dob: new Date('1972-07-25'),
      gender: 'Male',
      contact: '+1-555-0102',
    },
    {
      name: 'Carol Wilson',
      email: 'p003@rpm.local',
      dob: new Date('1990-11-08'),
      gender: 'Female',
      contact: '+1-555-0103',
    },
  ];

  const patients = [];
  for (const pd of patientData) {
    const patientId = await Patient.generateNextPatientId();

    // Create login account
    const userAccount = await User.create({
      name: pd.name,
      email: pd.email,
      password: 'Patient@123',
      role: 'patient',
    });

    // Create patient profile
    const patient = await Patient.create({
      patientId,
      userId: userAccount._id,
      name: pd.name,
      dateOfBirth: pd.dob,
      gender: pd.gender,
      contactNumber: pd.contact,
      assignedDoctor: doctor._id,
    });

    // Back-link user → patient
    userAccount.patientRef = patient._id;
    await userAccount.save({ validateBeforeSave: false });

    patients.push(patient);
    console.log(`   Patient ${patientId} created: ${pd.email}`);
  }

  // ---------------------------------------------------------------------------
  // 5. Create Devices (one per patient)
  // ---------------------------------------------------------------------------
  console.log('\n📟 Creating devices…');
  console.log('   ⚠️  SAVE THESE RAW TOKENS — shown only once:\n');

  const devices = [];
  for (let i = 0; i < patients.length; i++) {
    const patient = patients[i];
    const deviceId = await Device.generateNextDeviceId();

    // Generate a random 32-byte hex token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = await bcrypt.hash(rawToken, 12);

    const device = await Device.create({
      deviceId,
      deviceToken: hashedToken,
      status: 'active',
      assignedPatient: patient._id,
      assignedDoctor: doctor._id,
    });

    // Link device to patient
    patient.assignedDevice = device._id;
    await patient.save();

    devices.push(device);

    console.log(`   Device ${deviceId} → Patient ${patient.patientId}`);
    console.log(`     Raw Token: ${rawToken}`);
  }

  // ---------------------------------------------------------------------------
  // 6. Create Doctor Recommendations for each patient
  // ---------------------------------------------------------------------------
  console.log('\n📋 Creating recommendations…');
  for (const patient of patients) {
    await Recommendation.create({
      patientRef: patient._id,
      doctorRef: doctor._id,
      level1Text: 'Your readings look good. Continue your current health routine and monitor regularly.',
      level2Text:
        'Your readings show some variation. Please follow your prescribed medication schedule and avoid strenuous activity until your next checkup.',
      level3Text:
        'Your readings require immediate attention. Please contact Dr. Johnson or go to the nearest emergency facility.',
      updatedAt: new Date(),
    });
    console.log(`   Recommendations set for ${patient.patientId}`);
  }

  // ---------------------------------------------------------------------------
  // 7. Generate 20 health readings per patient + alerts for level >= 2
  // ---------------------------------------------------------------------------
  console.log('\n📊 Generating health readings and alerts…');
  const now = new Date();

  for (let i = 0; i < patients.length; i++) {
    const patient = patients[i];
    const device = devices[i];
    const readingPatterns = generateReadings(now);

    let readingCount = 0;
    let alertCount = 0;

    for (const rp of readingPatterns) {
      const reading = await HealthReading.create({
        patientId: patient.patientId,
        patientRef: patient._id,
        deviceId: device.deviceId,
        deviceRef: device._id,
        heartRate: rp.heartRate,
        spo2: rp.spo2,
        alertLevel: rp.alertLevel,
        alertLabel: rp.alertLabel,
        mlPrediction: {
          level: rp.alertLevel,
          label: rp.alertLabel,
          confidence: parseFloat((0.75 + Math.random() * 0.20).toFixed(4)),
          features: {
            heartRate: rp.heartRate,
            spo2: rp.spo2,
          },
          mlAvailable: true,
        },
        timestamp: rp.timestamp,
      });

      readingCount++;

      // Create alert for level 2 or 3
      if (rp.alertLevel >= 2) {
        await Alert.create({
          patientRef: patient._id,
          patientId: patient.patientId,
          deviceRef: device._id,
          readingRef: reading._id,
          level: rp.alertLevel,
          label: rp.alertLabel,
          heartRate: rp.heartRate,
          spo2: rp.spo2,
          reviewed: false,
          timestamp: rp.timestamp,
        });
        alertCount++;
      }
    }

    console.log(
      `   ${patient.patientId}: ${readingCount} readings, ${alertCount} alerts created`
    );
  }

  // ---------------------------------------------------------------------------
  // 8. Summary
  // ---------------------------------------------------------------------------
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('✅  Seed completed successfully!\n');
  console.log('   Credentials:');
  console.log('   ┌─────────────────────────────────────────────────┐');
  console.log('   │ Admin:   admin@rpm.local    / Admin@123         │');
  console.log('   │ Doctor:  doctor@rpm.local   / Doctor@123        │');
  console.log('   │ Patient: p001@rpm.local     / Patient@123       │');
  console.log('   │ Patient: p002@rpm.local     / Patient@123       │');
  console.log('   │ Patient: p003@rpm.local     / Patient@123       │');
  console.log('   └─────────────────────────────────────────────────┘');
  console.log('═══════════════════════════════════════════════════════\n');

}
 
async function seed() {
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI not set in .env');
    process.exit(1);
  }

  console.log('🔌 Connecting to MongoDB…');
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected.\n');

  await populateSeedData();

  await mongoose.disconnect();
  console.log('🔌 Disconnected from MongoDB.');
}

module.exports = { populateSeedData, seed };

// Run if called directly
if (require.main === module) {
  seed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Seed failed:', err);
      mongoose.disconnect();
      process.exit(1);
    });
}
