const { blockToken, isTokenBlocked } = require('../config/cache');

describe('Token revocation (blocklist)', () => {
  it('blocks a token and detects it as blocked', async () => {
    const jti = 'test-jti-123';
    await blockToken(jti, 60);
    const blocked = await isTokenBlocked(jti);
    expect(blocked).toBe(true);
  });

  it('returns false for unknown jti', async () => {
    const blocked = await isTokenBlocked('unknown-jti-xyz');
    expect(blocked).toBe(false);
  });
});
