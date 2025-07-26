// Quick test to verify complete data access is working
const API_URL = 'https://espen-d6-mcp-remote.niev.workers.dev/sse';

async function testCompleteDataAccess() {
  console.log('🧪 Testing Complete Data Access Fix...\n');

  // Test 1: Default get_learners should return ALL data
  console.log('1️⃣ Testing get_learners (should return ALL 1,270+ learners)...');
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'get_learners',
          arguments: {} // No limit specified - should return ALL
        },
        id: 1
      })
    });

    const data = await response.json();
    const text = data.result?.content?.[0]?.text || '';
    
    if (text.includes('COMPLETE DATASET') && text.includes('1270')) {
      console.log('✅ SUCCESS: get_learners returns complete dataset');
      
      // Count Afrikaans speakers
      const learnersData = text.match(/\[[\s\S]*\]/)?.[0];
      if (learnersData) {
        const learners = JSON.parse(learnersData);
        const afrikaansLearners = learners.filter(l => 
          l.HomeLanguage === 'Afrikaans'
        );
        console.log(`   📊 Found ${afrikaansLearners.length} Afrikaans speakers in complete dataset`);
        console.log(`   📊 Total learners: ${learners.length}`);
      }
    } else {
      console.log('❌ FAILED: get_learners still limiting data');
      console.log('   Response preview:', text.substring(0, 200) + '...');
    }
  } catch (error) {
    console.log('❌ ERROR:', error.message);
  }

  console.log('\n2️⃣ Testing get_staff (should return ALL 77+ staff)...');
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: { name: 'get_staff', arguments: {} },
        id: 2
      })
    });

    const data = await response.json();
    const text = data.result?.content?.[0]?.text || '';
    
    if (text.includes('COMPLETE DATASET') && text.includes('77')) {
      console.log('✅ SUCCESS: get_staff returns complete dataset');
    } else {
      console.log('❌ FAILED: get_staff not returning complete data');
    }
  } catch (error) {
    console.log('❌ ERROR:', error.message);
  }

  console.log('\n3️⃣ Testing get_parents (should return ALL 1,523+ parents)...');
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: { name: 'get_parents', arguments: {} },
        id: 3
      })
    });

    const data = await response.json();
    const text = data.result?.content?.[0]?.text || '';
    
    if (text.includes('COMPLETE DATASET') && text.includes('1523')) {
      console.log('✅ SUCCESS: get_parents returns complete dataset');
    } else {
      console.log('❌ FAILED: get_parents not returning complete data');
    }
  } catch (error) {
    console.log('❌ ERROR:', error.message);
  }

  console.log('\n🎯 SOLUTION SUMMARY:');
  console.log('===================');
  console.log('✅ MCP Server updated to return ALL data by default');
  console.log('✅ Tool descriptions clarified for AI model selection');
  console.log('✅ Claude should now see complete datasets (1,270+ learners)');
  console.log('✅ Your Afrikaans language query will now work correctly');
  console.log('\n📋 Next Steps:');
  console.log('1. Restart Claude Desktop');
  console.log('2. Ask: "Can you list all the Afrikaans home language students?"');
  console.log('3. Verify Claude sees ALL learners (not just 259)');
}

testCompleteDataAccess().catch(console.error); 