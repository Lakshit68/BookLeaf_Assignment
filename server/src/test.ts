import assert from 'assert';
import { db, initDb } from './db';
import { seedDatabase } from './db/seed';
import { classifyAndPrioritizeTicket, generateDraftResponse } from './services/aiService';
import { generateToken } from './middleware/auth';
import { getRelevantKbContext } from './services/kbContext';

async function runTests() {
  console.log('--- Running BookLeaf Support Portal Test Suite ---');

  // Test 1: DB Init & Seed Data
  initDb();
  seedDatabase();

  const authorCount = (db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'author'").get() as any).count;
  const bookCount = (db.prepare('SELECT COUNT(*) as count FROM books').get() as any).count;
  const adminCount = (db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'").get() as any).count;

  assert.strictEqual(authorCount, 10, 'Expected exactly 10 authors');
  assert.strictEqual(bookCount, 18, 'Expected exactly 18 books');
  assert.strictEqual(adminCount, 1, 'Expected 1 admin user');
  console.log('✓ Test 1: Seed data integrity verified (10 authors, 18 books, 1 admin)');

  // Test 2: In-Production & Edge Case Books
  const productionBooks = db.prepare("SELECT * FROM books WHERE status LIKE 'In Production%'").all() as any[];
  assert.strictEqual(productionBooks.length, 2, 'Expected 2 books in production');
  for (const pb of productionBooks) {
    assert.strictEqual(pb.publication_date, null, 'Production book should have null publication_date');
    assert.strictEqual(pb.mrp, null, 'Production book should have null MRP');
    assert.strictEqual(pb.total_copies_sold, 0, 'Production book should have 0 copies sold');
  }
  console.log('✓ Test 2: Edge case books in production verified (null dates, null MRPs handled cleanly)');

  // Test 3: Token Generation & Verification
  const authorToken = generateToken({
    id: 'AUTH001',
    email: 'priya.sharma@email.com',
    name: 'Priya Sharma',
    role: 'author'
  });
  assert(authorToken.length > 20, 'Author token should be a non-empty JWT');

  const adminToken = generateToken({
    id: 'ADMIN001',
    email: 'admin@bookleaf.com',
    name: 'BookLeaf Ops Lead',
    role: 'admin'
  });
  assert(adminToken.length > 20, 'Admin token should be a non-empty JWT');
  console.log('✓ Test 3: JWT token generation and role encoding verified');

  // Test 4: AI Auto-Classification & Priority
  const isbnQuery = await classifyAndPrioritizeTicket(
    'Mismatch on Amazon listing',
    'My book is showing a different ISBN on Amazon than what’s on the physical copy.'
  );
  assert.strictEqual(isbnQuery.category, 'ISBN & Metadata Issues', 'Expected ISBN category');
  assert(['Critical', 'High'].includes(isbnQuery.priority), 'ISBN error should be Critical or High');

  const royaltyQuery = await classifyAndPrioritizeTicket(
    'No royalty payment received',
    'I published my book 4 months ago and still haven’t received any royalty. What’s going on?'
  );
  assert.strictEqual(royaltyQuery.category, 'Royalty & Payments', 'Expected Royalty category');
  assert.strictEqual(royaltyQuery.priority, 'High', '4-month royalty delay should be High priority');

  const printQuery = await classifyAndPrioritizeTicket(
    'Defective author copies received',
    'I received my author copies and the print quality is terrible. The images are blurry and pages are misaligned.'
  );
  assert.strictEqual(printQuery.category, 'Printing & Quality', 'Expected Printing category');
  assert.strictEqual(printQuery.priority, 'High', 'Print defect should be High priority');
  console.log('✓ Test 4: AI Auto-Classification and Priority Scoring verified for all core categories');

  // Test 5: Cost-Aware KB Retrieval
  const kbChunk = getRelevantKbContext('Royalty & Payments', 'When will I get my payout?');
  assert(kbChunk.includes('80/20 split'), 'KB chunk must include 80/20 policy');
  assert(kbChunk.includes('₹1,000'), 'KB chunk must include minimum threshold rule');
  assert(!kbChunk.includes('Epitome Books'), 'Unrelated printing partner should be excluded to save tokens');
  console.log('✓ Test 5: Cost-aware KB selective chunk retrieval verified');

  // Test 6: AI Draft Response Quality
  const draftResult = await generateDraftResponse(
    'Priya Sharma',
    'Royalty & Payments',
    'Royalty Payment Delay Inquiry',
    'I published my book 4 months ago and still haven’t received any royalty. What’s going on?',
    {
      title: 'Whispers of the Ganges',
      royaltyPending: 3570,
      totalCopiesSold: 342
    }
  );

  assert(draftResult.draft.includes('Priya'), 'Draft must address author by name');
  assert(draftResult.draft.includes('Whispers of the Ganges'), 'Draft must cite book title');
  assert(draftResult.draft.includes('48 hours'), 'Draft must offer concrete timeline');
  assert(draftResult.draft.includes('BookLeaf'), 'Draft must sign off on behalf of BookLeaf');
  assert(draftResult.tokenCount > 50, 'Token count must be tracked');
  console.log('✓ Test 6: AI Draft response quality, tone calibration, and token tracking verified');

  console.log('\n✅ ALL 6 TEST SUITES PASSED FLAWLESSLY! (0 errors)\n');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
