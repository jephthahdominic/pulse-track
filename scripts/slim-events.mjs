// One-off (re-runnable) cleanup to bring the events collection back under the Atlas free-tier cap.
//
//   node scripts/slim-events.mjs            # dry run: prints what would change
//   node scripts/slim-events.mjs --apply    # actually do it
//
// Retention comes from EVENT_RETENTION_DAYS (default 30), same as the TTL index in EventModel.
import 'dotenv/config';
import mongoose from 'mongoose';

const APPLY = process.argv.includes('--apply');
const DAYS = Math.max(1, Number(process.env.EVENT_RETENTION_DAYS) || 30);
const cutoff = new Date(Date.now() - DAYS * 86400000);
const mb = (n) => (n / 1024 / 1024).toFixed(1) + ' MB';

await mongoose.connect(process.env.MONGODB_URI);
const db = mongoose.connection.db;
const ev = db.collection('events');

async function report(label) {
  const s = await db.stats();
  console.log(`${label}: data ${mb(s.dataSize)} + indexes ${mb(s.indexSize)} = ${mb(s.dataSize + s.indexSize)} (free tier cap 512 MB)`);
}
await report('Before');

const heartbeats = await ev.countDocuments({ type: 'heartbeat' });
const old = await ev.countDocuments({ type: { $ne: 'heartbeat' }, timestamp: { $lt: cutoff } });
const toSlim = await ev.countDocuments({ type: { $nin: ['heartbeat'] }, timestamp: { $gte: cutoff } });
console.log(`Delete heartbeat events: ${heartbeats}`);
console.log(`Delete events older than ${DAYS} days (${cutoff.toISOString().slice(0, 10)}): ${old}`);
console.log(`Strip duplicated device/geo/createdAt/updatedAt/__v from remaining: ${toSlim}`);
const redundant = ['projectId_1', 'workspaceId_1', 'userId_1', 'type_1', 'timestamp_1'];
const existing = (await ev.indexes()).map((i) => i.name);
console.log(`Drop redundant indexes: ${redundant.filter((n) => existing.includes(n)).join(', ') || 'none'}`);

if (!APPLY) {
  console.log('\nDry run only. Re-run with --apply to make these changes.');
  await mongoose.disconnect();
  process.exit(0);
}

// Deletes first: they are allowed even while the cluster is over quota and free the most space.
console.log('\nDeleting heartbeats…', (await ev.deleteMany({ type: 'heartbeat' })).deletedCount);
console.log('Deleting expired events…', (await ev.deleteMany({ timestamp: { $lt: cutoff } })).deletedCount);

for (const name of redundant) {
  if (existing.includes(name)) { await ev.dropIndex(name); console.log('Dropped index', name); }
}

console.log('Slimming click/pageview/performance…', (await ev.updateMany(
  { type: { $in: ['click', 'pageview', 'performance'] } },
  { $unset: { device: '', geo: '', createdAt: '', updatedAt: '', __v: '', 'data.sessionId': '', 'data.device': '' } },
)).modifiedCount);

console.log('Slimming error/custom/identify…', (await ev.updateMany(
  { type: { $in: ['error', 'custom', 'identify'] } },
  [
    { $set: {
      device: { browser: '$device.browser', os: '$device.os', deviceType: '$device.deviceType' },
      geo: { country: '$geo.country', countryCode: '$geo.countryCode', city: '$geo.city' },
    } },
    { $unset: ['createdAt', 'updatedAt', '__v', 'data.sessionId', 'data.device'] },
  ],
)).modifiedCount);

await ev.createIndex({ timestamp: 1 }, { expireAfterSeconds: DAYS * 86400, name: 'timestamp_ttl' });
console.log(`TTL index ensured: events expire after ${DAYS} days`);

await report('After');
await mongoose.disconnect();
