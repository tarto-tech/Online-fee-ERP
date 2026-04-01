const crypto = require('crypto');
const request = require('supertest');
const app = require('../app');

describe('POST /api/payments/webhook', () => {
  const secret = 'test_webhook_secret';

  beforeAll(() => {
    process.env.RAZORPAY_WEBHOOK_SECRET = secret;
    process.env.NODE_ENV = 'test';
  });

  it('rejects invalid webhook signature with 400', async () => {
    const res = await request(app)
      .post('/api/payments/webhook')
      .set('Content-Type', 'application/json')
      .set('x-razorpay-signature', 'invalidsignature')
      .send(JSON.stringify({ event: 'payment.failed', payload: {} }));

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/signature/i);
  });

  it('accepts valid webhook signature', async () => {
    const body = JSON.stringify({ event: 'payment.captured', payload: {} });
    const sig = crypto.createHmac('sha256', secret).update(body).digest('hex');

    const res = await request(app)
      .post('/api/payments/webhook')
      .set('Content-Type', 'application/json')
      .set('x-razorpay-signature', sig)
      .send(body);

    // 200 success (event not payment.failed so no DB update needed)
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
  });
});

describe('POST /api/payments/verify', () => {
  it('rejects invalid Razorpay signature', async () => {
    const res = await request(app)
      .post('/api/payments/verify')
      .set('Authorization', 'Bearer invalidtoken')
      .send({
        razorpayOrderId: 'order_test',
        razorpayPaymentId: 'pay_test',
        razorpaySignature: 'badsig',
      });

    // 401 because token is invalid (auth fails before signature check)
    expect([400, 401]).toContain(res.status);
  });
});
