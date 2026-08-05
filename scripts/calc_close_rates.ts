import { DASHBOARD_DATA } from '../client/src/data/dashboardData';

// Aggregate species across all territories
const speciesAgg: Record<string, { species: string; revenue: number; jobs: number }> = {};
let totalNetworkRevenue = 0;
let totalNetworkJobs = 0;

for (const [id, data] of Object.entries(DASHBOARD_DATA)) {
  totalNetworkRevenue += data.total_revenue;
  totalNetworkJobs += data.total_jobs;
  
  for (const sp of data.species) {
    if (!speciesAgg[sp.species]) {
      speciesAgg[sp.species] = { species: sp.species, revenue: 0, jobs: 0 };
    }
    speciesAgg[sp.species].revenue += sp.total_revenue;
    speciesAgg[sp.species].jobs += sp.total_jobs;
  }
}

// Sort by revenue
const sorted = Object.values(speciesAgg).sort((a, b) => b.revenue - a.revenue);

console.log(`\nNetwork Totals: Revenue ${(totalNetworkRevenue/1000000).toFixed(2)}M, Jobs ${totalNetworkJobs}`);
console.log(`Network Avg Job Value: $${(totalNetworkRevenue / totalNetworkJobs).toFixed(0)}`);
console.log(`\nSpecies Breakdown (network-wide):`);
console.log(`${'Species'.padEnd(20)} ${'Revenue'.padStart(12)} ${'Jobs'.padStart(8)} ${'Avg Job'.padStart(10)} ${'% Rev'.padStart(8)}`);
console.log('-'.repeat(60));

for (const sp of sorted.slice(0, 12)) {
  const avgJob = sp.jobs > 0 ? sp.revenue / sp.jobs : 0;
  const pctRev = (sp.revenue / totalNetworkRevenue * 100).toFixed(1);
  console.log(`${sp.species.padEnd(20)} $${(sp.revenue/1000).toFixed(0).padStart(10)}K ${String(sp.jobs).padStart(8)} $${avgJob.toFixed(0).padStart(9)} ${pctRev.padStart(7)}%`);
}

console.log(`\nTotal territories: ${Object.keys(DASHBOARD_DATA).length}`);

// Also check GBP data availability
let gbpTerritories = 0;
let gscTerritories = 0;
for (const [id, data] of Object.entries(DASHBOARD_DATA)) {
  if (data.gbp.monthly.length > 0) gbpTerritories++;
  if (data.gsc.monthly.length > 0) gscTerritories++;
}
console.log(`\nTerritories with GBP data: ${gbpTerritories}/${Object.keys(DASHBOARD_DATA).length}`);
console.log(`Territories with GSC data: ${gscTerritories}/${Object.keys(DASHBOARD_DATA).length}`);

// Output as JSON for use in the router
console.log(`\n--- JSON for router ---`);
const networkSpecies = sorted.slice(0, 10).map(sp => ({
  species: sp.species,
  networkRevenue: Math.round(sp.revenue),
  networkJobs: sp.jobs,
  networkAvgJobValue: Math.round(sp.jobs > 0 ? sp.revenue / sp.jobs : 0),
  pctOfNetworkRevenue: parseFloat((sp.revenue / totalNetworkRevenue * 100).toFixed(1)),
}));
console.log(JSON.stringify(networkSpecies, null, 2));
