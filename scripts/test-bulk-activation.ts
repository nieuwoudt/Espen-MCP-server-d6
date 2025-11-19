#!/usr/bin/env tsx

/**
 * Test bulk activation logic (dry run simulation)
 */

interface BulkActivationResult {
  school_id: number;
  school_name?: string;
  success: boolean;
  status?: number;
  response?: any;
  error?: string;
}

const ALL_17_SCHOOLS = [
  { id: 1450, name: 'Laerskool Bergsig' },
  { id: 1376, name: 'Laerskool Louis Leipoldt' },
  { id: 2100, name: 'Laerskool Gericke Primary' },
  { id: 1352, name: 'Laerskool Monumentpark' },
  { id: 1674, name: 'Hoërskool Klerksdorp' },
  { id: 3118, name: 'Laerskool Bredasdorp Primary School' },
  { id: 3664, name: 'Laerskool Oranje-Noord' },
  { id: 2240, name: 'Xanadu Private School' },
  { id: 2219, name: 'Rietvlei Akademie Lyttelton' },
  { id: 1367, name: 'Laerskool Tzaneen Primary' },
  { id: 1483, name: 'Laerskool Kruinsig' },
  { id: 1875, name: 'Laerskool Unika' },
  { id: 2752, name: 'Kleinspoortjies Hennopspark (Pty) Ltd' },
  { id: 1479, name: 'Laerskool Boerefort' },
  { id: 1430, name: 'Hoërskool Brits' },
  { id: 3652, name: 'Laerskool Eureka Kimberley' },
  { id: 1431, name: 'Laerskool Hennopspark' },
];

async function simulateBulkActivation() {
  console.log('🧪 Simulating Bulk Activation Logic\n');
  console.log(`Processing ${ALL_17_SCHOOLS.length} schools...\n`);

  const results: BulkActivationResult[] = [];
  
  for (const school of ALL_17_SCHOOLS) {
    console.log(`Activating: ${school.id} - ${school.name}`);
    
    // Simulate success (in reality, would call API)
    results.push({
      school_id: school.id,
      school_name: school.name,
      success: true,
      status: 204,
      response: 'No content',
    });
    
    // Simulate delay (500ms between requests)
    await new Promise(resolve => setTimeout(resolve, 100)); // faster for demo
  }

  // Generate results table
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  const rows = results.map((r) => {
    const statusIcon = r.success ? '✅' : '❌';
    const statusText = r.success ? 'Success' : 'Failed';
    const details = r.success 
      ? (r.response === 'No content' || r.response === null ? '204 No Content' : '200 OK')
      : (r.error || 'Unknown error');
    return `| ${r.school_id} | ${r.school_name || 'Unknown'} | ${statusIcon} ${statusText} | ${details} |`;
  });

  const summary = [
    `✅ **Bulk D6 School Activation Complete**`,
    "",
    `**Summary:**`,
    `- Processed: ${results.length} schools`,
    `- Successful: ${successful}`,
    `- Failed: ${failed}`,
    "",
    "| School ID | School Name | Status | Response |",
    "|-----------|-------------|--------|----------|",
    ...rows,
  ].join("\n");

  console.log('\n' + summary);
  console.log('\n✅ Simulation complete!');
}

simulateBulkActivation().catch(console.error);

