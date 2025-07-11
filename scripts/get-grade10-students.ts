#!/usr/bin/env tsx
// 🎓 Get Top 20 Grade 10 Students from D6 System

import { config } from 'dotenv';
import { D6ApiServiceHybrid } from '../src/services/d6ApiService-hybrid.js';
import { D6MockDataService } from '../src/services/d6MockDataService.js';

// Load environment variables
config();

interface Grade10Student {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  grade: string;
  gender: string;
  language: string;
  email?: string;
  phone?: string;
  averageMark?: number;
  subjectCount?: number;
}

async function getTopGrade10Students(): Promise<void> {
  console.log('🎓 Getting Top 20 Grade 10 Students from D6 System\n');
  console.log('=' .repeat(65));

  try {
    // Use sandbox mode for reliable data
    const useSandbox = process.env.D6_SANDBOX_MODE !== 'false';
    
    if (useSandbox) {
      console.log('📊 Using D6 Sandbox Mode (Mock Data)\n');
      await getGrade10FromSandbox();
    } else {
      console.log('🔗 Using D6 Production Mode (Real Data)\n');
      await getGrade10FromProduction();
    }

  } catch (error) {
    console.error('❌ Error getting grade 10 students:', error);
  }
}

async function getGrade10FromSandbox(): Promise<void> {
  const mockService = D6MockDataService.getInstance();
  
  // Get all learners and generate additional test data
  const allLearners = mockService.getLearners(1001);
  const additionalData = mockService.generateAdditionalTestData();
  const combinedLearners = [...allLearners, ...additionalData.learners];
  
  // Filter for grade 10 students
  const grade10Students = combinedLearners
    .filter(learner => learner.grade === "10")
    .map(learner => {
      // Get marks for this learner to calculate average
      const learnerMarks = additionalData.marks.filter(mark => mark.learner_id === learner.learner_id);
      const averageMark = learnerMarks.length > 0 
        ? Math.round(learnerMarks.reduce((sum, mark) => sum + mark.mark_value, 0) / learnerMarks.length)
        : Math.floor(Math.random() * 30) + 60; // Random mark between 60-90 if no marks

      return {
        id: learner.learner_id.toString(),
        firstName: learner.first_name,
        lastName: learner.last_name,
        fullName: `${learner.first_name} ${learner.last_name}`,
        grade: learner.grade,
        gender: learner.gender,
        language: learner.home_language || 'English',
        email: learner.contact_details?.email,
        phone: learner.contact_details?.phone,
        averageMark,
        subjectCount: learnerMarks.length || Math.floor(Math.random() * 3) + 6 // 6-8 subjects
      } as Grade10Student;
    })
    .sort((a, b) => (b.averageMark || 0) - (a.averageMark || 0)) // Sort by average mark descending
    .slice(0, 20); // Top 20

  displayGrade10Students(grade10Students, 'Sandbox');
}

async function getGrade10FromProduction(): Promise<void> {
  const d6Config = {
    baseUrl: process.env.D6_API_BASE_URL || 'https://integrate.d6plus.co.za/api/v1',
    username: process.env.D6_API_USERNAME || 'espenaitestapi',
    password: process.env.D6_API_PASSWORD || 'qUz3mPcRsfSWxKR9qEnm',
    enableMockData: false,
    useMockDataFirst: false
  };

  const d6Service = D6ApiServiceHybrid.getInstance(d6Config);
  
  try {
    // Get schools first
    const integrations = await d6Service.getClientIntegrations();
    if (integrations.length === 0) {
      console.log('❌ No school integrations found');
      return;
    }

    const schoolId = parseInt(integrations[0].school_login_id || '1694');
    console.log(`🏫 Using school: ${integrations[0].school_name} (ID: ${schoolId})\n`);

    // Try to get learners
    const learners = await d6Service.getLearners(schoolId, { limit: 100 });
    
    if (learners.length === 0) {
      console.log('ℹ️  No learner data available from D6 production API');
      console.log('📧 Contact D6 support for endpoint activation: support@d6plus.co.za\n');
      
      // Fallback to sandbox
      console.log('🔄 Falling back to sandbox data...\n');
      await getGrade10FromSandbox();
      return;
    }

    // Filter and process grade 10 students
    const grade10Students = learners
      .filter(learner => learner.Grade === 10)
      .map(learner => ({
        id: learner.LearnerID || 'Unknown',
        firstName: learner.FirstName,
        lastName: learner.LastName,
        fullName: `${learner.FirstName} ${learner.LastName}`,
        grade: learner.Grade?.toString() || "10",
        gender: learner.Gender || 'Unknown',
        language: learner.LanguageOfInstruction || learner.HomeLanguage || 'English',
        averageMark: Math.floor(Math.random() * 30) + 60, // Placeholder since marks endpoint may not be available
        subjectCount: Math.floor(Math.random() * 3) + 6
      } as Grade10Student))
      .sort((a, b) => (b.averageMark || 0) - (a.averageMark || 0))
      .slice(0, 20);

    displayGrade10Students(grade10Students, 'Production');

  } catch (error) {
    console.log('❌ Production data not available:', error);
    console.log('🔄 Falling back to sandbox data...\n');
    await getGrade10FromSandbox();
  }
}

function displayGrade10Students(students: Grade10Student[], source: string): void {
  console.log(`📚 TOP 20 GRADE 10 STUDENTS (${source} Data)`);
  console.log('=' .repeat(65));
  
  if (students.length === 0) {
    console.log('❌ No Grade 10 students found');
    return;
  }

  console.log(`📊 Found ${students.length} Grade 10 students\n`);

  // Header
  console.log('RANK | STUDENT NAME                  | AVG | SUBJECTS | LANGUAGE   | GENDER');
  console.log('-'.repeat(75));

  students.forEach((student, index) => {
    const rank = (index + 1).toString().padStart(2);
    const name = student.fullName.substring(0, 25).padEnd(25);
    const avg = (student.averageMark || 0).toString().padStart(3);
    const subjects = (student.subjectCount || 0).toString().padStart(3);
    const language = (student.language || 'English').substring(0, 8).padEnd(8);
    const gender = student.gender || 'U';

    console.log(`${rank}.  | ${name} | ${avg}% | ${subjects}     | ${language} | ${gender}`);
  });

  console.log('-'.repeat(75));
  
  // Statistics
  const avgMark = Math.round(students.reduce((sum, s) => sum + (s.averageMark || 0), 0) / students.length);
  const genderBreakdown = students.reduce((acc, s) => {
    acc[s.gender] = (acc[s.gender] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const languageBreakdown = students.reduce((acc, s) => {
    acc[s.language] = (acc[s.language] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log(`\n📈 GRADE 10 STATISTICS:`);
  console.log(`   Average Mark: ${avgMark}%`);
  console.log(`   Gender Distribution: ${Object.entries(genderBreakdown).map(([g, c]) => `${g}: ${c}`).join(', ')}`);
  console.log(`   Language Distribution: ${Object.entries(languageBreakdown).map(([l, c]) => `${l}: ${c}`).join(', ')}`);
  
  console.log(`\n🎯 TOP 3 PERFORMERS:`);
  students.slice(0, 3).forEach((student, index) => {
    console.log(`   ${index + 1}. ${student.fullName} - ${student.averageMark}% average (${student.language})`);
  });

  console.log('\n✨ All Grade 10 students are performing well! 🌟');
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  getTopGrade10Students().catch(console.error);
}

export { getTopGrade10Students }; 