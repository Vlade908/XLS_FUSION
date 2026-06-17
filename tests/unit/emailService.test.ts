import nodemailer from 'nodemailer';
import { sendResetEmail } from '../../src/server/utils/emailService';

jest.mock('nodemailer');

describe('emailService', () => {
  let mockTransporter: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockTransporter = {
      sendMail: jest.fn().mockResolvedValue({ messageId: 'test-id' })
    };
    (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter);
  });

  it('sends email via custom SMTP if host, user and pass are configured', async () => {
    process.env.SMTP_HOST = 'smtp.test.com';
    process.env.SMTP_USER = 'user';
    process.env.SMTP_PASS = 'pass';
    process.env.SMTP_PORT = '587';

    const result = await sendResetEmail('user@test.com', 'my-token');

    expect(nodemailer.createTransport).toHaveBeenCalledWith({
      host: 'smtp.test.com',
      port: 587,
      secure: false,
      auth: { user: 'user', pass: 'pass' }
    });
    expect(mockTransporter.sendMail).toHaveBeenCalled();
    expect(result.sent).toBe(true);
    expect(result.method).toBe('SMTP');
  });

  it('handles custom SMTP send error', async () => {
    process.env.SMTP_HOST = 'smtp.test.com';
    process.env.SMTP_USER = 'user';
    process.env.SMTP_PASS = 'pass';
    
    mockTransporter.sendMail.mockRejectedValue(new Error('SMTP failure'));

    const result = await sendResetEmail('user@test.com', 'my-token');
    expect(result.sent).toBe(false);
    expect(result.error).toBe('SMTP failure');
  });

  it('sends email via Ethereal fallback if no SMTP credentials configured', async () => {
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;

    const mockTestAccount = { user: 'ethereal-user', pass: 'ethereal-pass' };
    (nodemailer.createTestAccount as jest.Mock).mockResolvedValue(mockTestAccount);
    (nodemailer.getTestMessageUrl as jest.Mock).mockReturnValue('http://ethereal.email/preview');

    const result = await sendResetEmail('user@test.com', 'my-token');

    expect(nodemailer.createTestAccount).toHaveBeenCalled();
    expect(nodemailer.createTransport).toHaveBeenCalledWith({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: { user: 'ethereal-user', pass: 'ethereal-pass' }
    });
    expect(result.sent).toBe(true);
    expect(result.method).toBe('Ethereal');
    expect(result.previewUrl).toBe('http://ethereal.email/preview');
  });

  it('handles Ethereal failure with simulator fallback', async () => {
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;

    (nodemailer.createTestAccount as jest.Mock).mockRejectedValue(new Error('Ethereal offline'));

    const result = await sendResetEmail('user@test.com', 'my-token');
    expect(result.sent).toBe(true);
    expect(result.method).toBe('console');
  });
});
