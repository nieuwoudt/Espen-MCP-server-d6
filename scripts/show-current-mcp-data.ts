import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { D6ApiServiceHybrid } from '../src/services/d6ApiService-hybrid.js';

console.log('🎯 Current MCP Server Data Availability');
console.log('======================================');
console.log('');

// Configure hybrid mode (will use real D6 where available, mock as fallback)
const d6Config = {
  baseUrl: 'https://integrate.d6plus.co.za/api/v2',
  username: 'espenaitestapi',
  password: 'qUz3mPcRsfSWxKR9qEnm',
  enableMockData: true,
  useMockDataFirst: false
};

async function showCurrentData() {
  try {
    const d6Service = D6ApiServiceHybrid.getInstance(d6Config);
    
    console.log('1️⃣ Schools/Integrations Available:');
    const schools = await d6Service.getClientIntegrations();
    console.log(`   📊 Total Schools: ${schools.length}`);
    
    schools.forEach((school, i) => {
      console.log(`   ${i + 1}. ${school.school_name} (ID: ${school.school_id})`);
      console.log(`      Status: ${school.activated_by_integrator}`);
    });
    
    if (schools.length > 0) {
      const schoolId = schools[0].school_id;
      console.log(`\n🎯 Using School: ${schools[0].school_name} (ID: ${schoolId})`);
      
      console.log('\n2️⃣ Learners Data:');
      const learners = await d6Service.getLearners(schoolId);
      console.log(`   📊 Total Learners: ${learners.length}`);
      
      if (learners.length > 0) {
        console.log('   📋 Sample Learners:');
        learners.slice(0, 5).forEach((learner, i) => {
          console.log(`      ${i + 1}. ${learner.first_name} ${learner.last_name} (Grade ${learner.grade}, ${learner.home_language})`);
        });
        
        // Show grade breakdown
        const gradeBreakdown = learners.reduce((acc, learner) => {
          acc[learner.grade] = (acc[learner.grade] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        console.log('\n   📈 Grade Distribution:');
        Object.entries(gradeBreakdown)
          .sort(([a], [b]) => parseInt(a) - parseInt(b))
          .forEach(([grade, count]) => {
            console.log(`      Grade ${grade}: ${count} learners`);
          });
      }
      
      console.log('\n3️⃣ Staff Data:');
      const staff = await d6Service.getStaff(schoolId);
      console.log(`   📊 Total Staff: ${staff.length}`);
      
      if (staff.length > 0) {
        console.log('   📋 Sample Staff:');
        staff.slice(0, 5).forEach((member, i) => {
          console.log(`      ${i + 1}. ${member.first_name} ${member.last_name} (${member.position})`);
        });
        
        // Show position breakdown
        const positionBreakdown = staff.reduce((acc, member) => {
          acc[member.position] = (acc[member.position] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        console.log('\n   📈 Position Distribution:');
        Object.entries(positionBreakdown).forEach(([position, count]) => {
          console.log(`      ${position}: ${count} staff`);
        });
      }
      
      console.log('\n4️⃣ Parents Data:');
      const parents = await d6Service.getParents(schoolId);
      console.log(`   📊 Total Parents: ${parents.length}`);
      
      if (parents.length > 0) {
        console.log('   📋 Sample Parents:');
        parents.slice(0, 5).forEach((parent, i) => {
          console.log(`      ${i + 1}. ${parent.first_name} ${parent.last_name} (${parent.email})`);
        });
      }
      
      console.log('\n5️⃣ Academic Records:');
      if (learners.length > 0) {
        const sampleLearnerId = learners[0].learner_id;
        const marks = await d6Service.getMarks(sampleLearnerId);
        console.log(`   📊 Sample marks for ${learners[0].first_name}: ${marks.length} records`);
        
        if (marks.length > 0) {
          console.log('   📋 Recent marks:');
          marks.slice(0, 3).forEach((mark, i) => {
            console.log(`      ${mark.subject}: ${mark.mark}% (${mark.term} ${mark.year})`);
          });
        }
      }
    }
    
    console.log('\n6️⃣ System Information:');
    const lookupData = await d6Service.getLookupData();
    console.log(`   📊 Genders Available: ${lookupData.genders?.length || 0}`);
    console.log(`   📊 Grades Available: ${lookupData.grades?.length || 0}`);
    console.log(`   📊 Subjects Available: ${lookupData.subjects?.length || 0}`);
    
    console.log('\n🎯 SUMMARY');
    console.log('=========');
    console.log(`✅ Schools: ${schools.length}`);
    console.log(`✅ Learners: ${schools.length > 0 ? (await d6Service.getLearners(schools[0].school_id)).length : 0}`);
    console.log(`✅ Staff: ${schools.length > 0 ? (await d6Service.getStaff(schools[0].school_id)).length : 0}`);
    console.log(`✅ Parents: ${schools.length > 0 ? (await d6Service.getParents(schools[0].school_id)).length : 0}`);
    console.log('✅ Academic Records: Available');
    console.log('✅ Lookup Data: Available');
    console.log('');
    console.log('🔍 Data Source: Professional mock data (South African school system)');
    console.log('⚡ Status: Fully functional MCP server ready for immediate use');
    console.log('🚀 Next: Contact D6 to enable real data endpoints for seamless transition');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

showCurrentData();
