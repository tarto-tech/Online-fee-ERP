const mongoose = require('mongoose');
const Counter = require('../models/Counter');

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/college_erp_test');
});

afterAll(async () => {
  await mongoose.connection.db.dropDatabase();
  await mongoose.disconnect();
});

describe('Counter - atomic receipt number', () => {
  it('generates unique sequential numbers under concurrency', async () => {
    const results = await Promise.all(
      Array.from({ length: 10 }, () => Counter.nextSeq('receipt_test'))
    );
    const unique = new Set(results);
    expect(unique.size).toBe(10);
    expect(Math.min(...results)).toBeGreaterThan(0);
  });
});
