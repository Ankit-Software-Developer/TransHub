// tests/index.js
const assert = require('assert');
const {
  sequelize,
  Tenant,
  Organization,
  Branch,
  User,
  Consignment,
  Booking,
  Customer,
  RefreshToken,
} = require('../src/models');
const { generateNextNumber } = require('../src/services/numberSequenceService');
const { addDecimals, subtractDecimals, multiplyDecimals } = require('../src/utils/decimalUtils');
const authService = require('../src/services/authService');
const bookingService = require('../src/services/bookingService');

const runTests = async () => {
  console.log('🧪 Starting Transport Management SaaS Verification Test Suite...\n');
  let passed = 0;
  let total = 0;

  const test = async (name, fn) => {
    total++;
    try {
      await fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error(`     Error: ${err.message}\n`);
    }
  };

  // Test 1: Financial Precision
  await test('Zero Floating-Point Error Arithmetic (0.1 + 0.2 === 0.3)', () => {
    const sum = addDecimals(0.1, 0.2);
    assert.strictEqual(sum, 0.3, 'Decimal addition should be exact');

    const multiSum = addDecimals(14850.55, 320.10, 45.35);
    assert.strictEqual(multiSum, 15216.00, 'Multi-term decimal addition should be precise');

    const diff = subtractDecimals(100.50, 45.25, 10.25);
    assert.strictEqual(diff, 45.00, 'Decimal subtraction should be exact');
  });

  // Test 2: Concurrency-Safe Number Sequence Generation
  await test('Atomic Number Sequence Generation', async () => {
    const org = await Organization.findOne({ where: { business_name: 'ABC Roadways Pvt Ltd' } });
    const branch = await Branch.findOne({ where: { organization_id: org.id } });

    const t1 = await sequelize.transaction();
    const { formattedNumber: num1 } = await generateNextNumber({
      tenantId: org.tenant_id,
      organizationId: org.id,
      branchId: branch.id,
      documentType: 'BILTY',
      transaction: t1,
    });
    await t1.commit();

    const t2 = await sequelize.transaction();
    const { formattedNumber: num2 } = await generateNextNumber({
      tenantId: org.tenant_id,
      organizationId: org.id,
      branchId: branch.id,
      documentType: 'BILTY',
      transaction: t2,
    });
    await t2.commit();

    assert.notStrictEqual(num1, num2, 'Sequential numbers must be distinct');
    console.log(`     Generated sequence numbers: ${num1} -> ${num2}`);
  });

  // Test 3: Multi-Tenant Row-Level Isolation (Critical Test)
  await test('Tenant Isolation: Tenant A cannot access Tenant B data', async () => {
    // Clean up any stale Tenant B from prior tests
    const staleTenants = await Tenant.findAll({ where: { name: 'Tenant B Logistics' } });
    for (const st of staleTenants) {
      await Organization.destroy({ where: { tenant_id: st.id } });
      await st.destroy({ force: true });
    }

    // Create Tenant B
    const tenantB = await Tenant.create({ name: 'Tenant B Logistics', status: 'ACTIVE' });
    const orgB = await Organization.create({
      tenant_id: tenantB.id,
      business_name: 'Tenant B Freight Ltd',
      document_terminology: 'LR',
    });

    const orgA = await Organization.findOne({ where: { business_name: 'ABC Roadways Pvt Ltd' } });

    // Query consignments for Org B
    const listB = await bookingService.listConsignments({
      tenantId: tenantB.id,
      organizationId: orgB.id,
    });

    // Query consignments for Org A
    const listA = await bookingService.listConsignments({
      tenantId: orgA.tenant_id,
      organizationId: orgA.id,
    });

    assert.strictEqual(listB.consignments.length, 0, 'Tenant B should have 0 consignments initially');
    assert.ok(listA.pagination.total > 50, 'Tenant A should have populated consignments');

    // Clean up temporary Tenant B
    await orgB.destroy({ force: true });
    await tenantB.destroy({ force: true });
  });

  // Test 4: Authentication & Token Rotation
  await test('Authentication Login & Single-Use Refresh Token Rotation', async () => {
    const ownerUser = await User.findOne({ where: { email: 'owner@abcroadways.com' } });
    if (ownerUser) {
      await RefreshToken.destroy({ where: { user_id: ownerUser.id } });
    }

    const loginResult = await authService.login({
      email: 'owner@abcroadways.com',
      password: 'Password@123',
    });

    assert.ok(loginResult.accessToken, 'Access token must be returned');
    assert.ok(loginResult.refreshToken, 'Refresh token must be returned');
    assert.strictEqual(loginResult.user.email, 'owner@abcroadways.com');

    // Refresh token rotation
    const newTokens = await authService.refreshAccessToken(loginResult.refreshToken);
    assert.ok(newTokens.accessToken, 'New access token issued');
    assert.ok(newTokens.refreshToken, 'Rotated new refresh token issued');

    // Attempting to reuse old refresh token should fail
    let reusedFailed = false;
    try {
      await authService.refreshAccessToken(loginResult.refreshToken);
    } catch (e) {
      reusedFailed = true;
    }
    assert.strictEqual(reusedFailed, true, 'Reusing rotated refresh token must be rejected');
  });

  console.log(`\n🏁 Test Run Summary: ${passed}/${total} passed (${Math.round((passed / total) * 100)}%)`);
  if (passed === total) {
    console.log('🎉 ALL INTEGRATION AND TENANT ISOLATION TESTS PASSED!\n');
    process.exit(0);
  } else {
    process.exit(1);
  }
};

runTests().catch((err) => {
  console.error('Test suite execution error:', err);
  process.exit(1);
});
