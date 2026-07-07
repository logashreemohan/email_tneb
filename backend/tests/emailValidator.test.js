const { validateEmail } = require('../src/utils/emailValidator');
const dns = require('dns').promises;

// Mock DNS module so tests don't require internet connection and are fast
jest.mock('dns', () => ({
  promises: {
    resolveMx: jest.fn(),
    resolve: jest.fn()
  }
}));

describe('Email Validator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Validates a correctly formatted email', async () => {
    // Mock successful MX record lookup
    dns.resolveMx.mockResolvedValue([{ exchange: 'mail.google.com', priority: 10 }]);

    const result = await validateEmail('test.user@gmail.com');
    expect(result.status).toBe('valid');
    expect(result.checks.format).toBe(true);
    expect(result.checks.mx_record).toBe(true);
    expect(result.checks.not_disposable).toBe(true);
  });

  test('Rejects emails missing the @ symbol', async () => {
    const result = await validateEmail('test.usergmail.com');
    expect(result.status).toBe('invalid');
    expect(result.checks.has_at_symbol).toBe(false);
    expect(result.reason).toContain('Missing @ symbol');
  });

  test('Detects common typos and provides a suggestion', async () => {
    dns.resolveMx.mockResolvedValue([{ exchange: 'mail.google.com', priority: 10 }]);

    const result = await validateEmail('user@gamil.com');
    expect(result.suggestion).toBe('user@gmail.com');
  });

  test('Rejects known disposable email providers', async () => {
    const result = await validateEmail('spam@mailinator.com');
    expect(result.status).toBe('invalid');
    expect(result.checks.not_disposable).toBe(false);
    expect(result.is_disposable).toBe(true);
    expect(result.reason).toContain('disposable');
  });

  test('Rejects invalid username formats', async () => {
    const result = await validateEmail('.invalid@gmail.com');
    expect(result.status).toBe('invalid');
    expect(result.checks.valid_username).toBe(false);
    expect(result.reason).toContain('username');
  });
});
