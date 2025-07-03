#!/usr/bin/env node

// 🎭 Simple D6 Sandbox Demo
// Demonstrates the mock data that's available

console.log('🎭 D6 Sandbox Mode - Mock Data Demo\n');

// Mock school data that would be available
const mockSchools = [
  {
    school_id: 1001,
    school_name: "Greenwood Primary School",
    admin_email_address: "admin@greenwood.school.za",
    telephone_number: "0123456789",
    api_type: "Admin+ API",
    activated_by_integrator: "Yes"
  },
  {
    school_id: 1002,
    school_name: "Riverside High School", 
    admin_email_address: "principal@riverside.edu.za",
    telephone_number: "0124567890",
    api_type: "Curriculum+ API",
    activated_by_integrator: "Yes"
  },
  {
    school_id: 1003,
    school_name: "Sunnydale Academy",
    admin_email_address: "office@sunnydale.co.za", 
    telephone_number: "0125678901",
    api_type: "Finance+ API",
    activated_by_integrator: "No"
  }
];

// Mock learner data
const mockLearners = [
  {
    learner_id: 2001,
    first_name: "Amara",
    last_name: "Ngcobo", 
    gender: "F",
    grade: "7",
    home_language: "Zulu",
    email: "amara.ngcobo@student.greenwood.za"
  },
  {
    learner_id: 2002,
    first_name: "Liam",
    last_name: "Van Der Merwe",
    gender: "M",
    grade: "8", 
    home_language: "Afrikaans",
    email: "liam.vandermerwe@student.greenwood.za"
  },
  {
    learner_id: 2003,
    first_name: "Kgothatso",
    last_name: "Molefe",
    gender: "M",
    grade: "9",
    home_language: "Setswana", 
    email: "kgothatso.molefe@student.riverside.za"
  }
];

// Mock staff data
const mockStaff = [
  {
    staff_id: 4001,
    first_name: "Patricia",
    last_name: "Mthembu",
    email: "p.mthembu@greenwood.school.za",
    role: "Mathematics Teacher",
    subjects: ["Mathematics", "Physical Sciences"]
  },
  {
    staff_id: 4002,
    first_name: "David", 
    last_name: "Williams",
    email: "d.williams@riverside.edu.za",
    role: "English Teacher",
    subjects: ["English Home Language", "English First Additional Language"]
  }
];

// Mock marks data
const mockMarks = [
  {
    learner_id: 2001,
    subject_code: "MATH",
    subject_name: "Mathematics",
    term: 1,
    year: 2024,
    mark_value: 78,
    mark_type: "Test"
  },
  {
    learner_id: 2001,
    subject_code: "ENG", 
    subject_name: "English Home Language",
    term: 1,
    year: 2024,
    mark_value: 85,
    mark_type: "Assignment"
  }
];

// Mock lookup data
const mockLookups = {
  genders: [
    { id: "M", name: "Male" },
    { id: "F", name: "Female" }
  ],
  grades: [
    { id: "R", name: "Grade R" },
    { id: "1", name: "Grade 1" },
    { id: "2", name: "Grade 2" },
    { id: "7", name: "Grade 7" },
    { id: "8", name: "Grade 8" },
    { id: "9", name: "Grade 9" },
    { id: "10", name: "Grade 10" },
    { id: "11", name: "Grade 11" },
    { id: "12", name: "Grade 12" }
  ],
  languages: [
    { id: "ENG", name: "English" },
    { id: "AFR", name: "Afrikaans" },
    { id: "ZUL", name: "IsiZulu" },
    { id: "XHO", name: "IsiXhosa" },
    { id: "TSW", name: "Setswana" }
  ]
};

// Display the mock data
console.log('🏫 Mock Schools Available:');
mockSchools.forEach(school => {
  console.log(`  ✅ ${school.school_name} (ID: ${school.school_id})`);
  console.log(`     📧 ${school.admin_email_address}`);
  console.log(`     📞 ${school.telephone_number}`);
  console.log(`     🔗 API: ${school.api_type}`);
  console.log('');
});

console.log('👨‍🎓 Mock Learners Available:');
mockLearners.forEach(learner => {
  console.log(`  ✅ ${learner.first_name} ${learner.last_name} (ID: ${learner.learner_id})`);
  console.log(`     📚 Grade ${learner.grade} • ${learner.gender === 'M' ? 'Male' : 'Female'}`);
  console.log(`     🗣️ ${learner.home_language} • 📧 ${learner.email}`);
  console.log('');
});

console.log('👨‍🏫 Mock Staff Available:');
mockStaff.forEach(staff => {
  console.log(`  ✅ ${staff.first_name} ${staff.last_name} (ID: ${staff.staff_id})`);
  console.log(`     💼 ${staff.role}`);
  console.log(`     📚 Subjects: ${staff.subjects.join(', ')}`);
  console.log(`     📧 ${staff.email}`);
  console.log('');
});

console.log('📊 Mock Marks Available:');
mockMarks.forEach(mark => {
  console.log(`  ✅ Learner ${mark.learner_id} - ${mark.subject_name}`);
  console.log(`     📈 ${mark.mark_value}% (${mark.mark_type}) • Term ${mark.term}, ${mark.year}`);
  console.log('');
});

console.log('📋 Mock Lookup Data Available:');
Object.entries(mockLookups).forEach(([type, items]) => {
  console.log(`  ✅ ${type}: ${items.map(item => item.name).join(', ')}`);
});

console.log('\n🎯 Benefits of Sandbox Mode:');
console.log('  ✅ No D6 API credentials required for development');
console.log('  ✅ Realistic South African school data');
console.log('  ✅ Instant responses (no network delays)');
console.log('  ✅ Consistent data for testing');
console.log('  ✅ No API rate limits');
console.log('  ✅ Works offline');

console.log('\n🔧 How to Enable Sandbox Mode:');
console.log('  Environment Variables:');
console.log('    NODE_ENV=development');
console.log('    D6_SANDBOX_MODE=true');
console.log('');
console.log('  Or in code:');
console.log('    enableMockData: true');
console.log('    useMockDataFirst: true');

console.log('\n✨ Perfect for development, testing, and demos!'); 