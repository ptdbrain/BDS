import { encryptPII, decryptPII, hashPII, verifyVietQRWebhookSignature } from '../src/lib/security.ts';
import { acquireProductLock } from '../src/lib/locks.ts';
import { db } from '../src/lib/db.ts';

async function runTests() {
  console.log('===================================================');
  console.log('AHS BDS SYSTEM INTEGRATION & CONCURRENCY TEST SUITE');
  console.log('===================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, detail = '') {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName} - ${detail}`);
      failed++;
    }
  }

  // TEST 1: PII Encryption & Hashing
  console.log('--- 1. Testing PII Security & Cryptography ---');
  const sampleCCCD = '001095012345';
  const ciphertext = encryptPII(sampleCCCD);
  const decrypted = decryptPII(ciphertext);
  const hash1 = hashPII(sampleCCCD);
  const hash2 = hashPII('001095012345 ');

  assert(ciphertext.includes(':'), 'AES-256 IV format check');
  assert(decrypted === sampleCCCD, 'AES-256 Decryption matches original text');
  assert(hash1 === hash2, 'SHA-256 Hash normalization handles whitespace');
  assert(hash1.length === 64, 'SHA-256 Hash hex string length is 64 chars');

  // TEST 2: VietQR Signature Verification
  console.log('\n--- 2. Testing Webhook Security ---');
  const validSig = verifyVietQRWebhookSignature('{"test": true}', 'invalid_sig');
  assert(validSig === false, 'Invalid signature rejected safely');

  // TEST 3: Lock Concurrency Stress Test
  console.log('\n--- 3. Testing Lock Concurrency (50 Simultaneous Requests) ---');
  try {
    // Find an AVAILABLE product
    let product = await db.product.findFirst({ where: { status: 'AVAILABLE' } });
    if (!product) {
      console.log('No AVAILABLE product found, creating temporary test unit...');
      const proj = await db.project.findFirst() || await db.project.create({
        data: { code: 'TEST_PROJ', name: 'Test Project', location: 'HN', status: 'SELLING' }
      });
      const type = await db.productType.findFirst() || await db.productType.create({
        data: { code: 'TEST_TYPE', name: 'Test Type' }
      });
      product = await db.product.create({
        data: {
          projectId: proj.id,
          productTypeId: type.id,
          productCode: `TEST-UNIT-${Date.now()}`,
          building: 'Tòa A',
          floor: 1,
          area: 60,
          status: 'AVAILABLE'
        }
      });
    }

    console.log(`Targeting unit ${product.productCode} (${product.id}) for 50 concurrent lock attempts...`);

    const concurrentRequests = Array.from({ length: 50 }).map((_, i) => 
      acquireProductLock({
        productId: product.id,
        salesEmployeeId: 'emp_sales_01',
        salesEmployeeName: `Sales Agent ${i + 1}`
      }).catch(err => ({ success: false, error: err.message }))
    );

    const results = await Promise.all(concurrentRequests);
    const successCount = results.filter(r => r.success === true).length;
    const lockConflictCount = results.filter(r => r.error === 'PRODUCT_ALREADY_LOCKED').length;

    const uniqueErrors = [...new Set(results.filter(r => !r.success).map(r => r.error))];
    console.log('Distinct errors received:', uniqueErrors);

    assert(successCount === 1, `Exactly 1 request succeeded (Actual: ${successCount})`);
    assert(lockConflictCount === 49, `Exactly 49 requests blocked with PRODUCT_ALREADY_LOCKED (Actual: ${lockConflictCount})`);

  } catch (err) {
    console.error('Error during concurrency test:', err);
    failed++;
  }

  console.log('\n===================================================');
  console.log(`TEST RESULTS SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log('===================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test suite error:', err);
  process.exit(1);
});
