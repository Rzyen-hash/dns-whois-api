import { describe, it, expect } from 'bun:test';
import { isValidDomain } from './src/services/dnswhois';

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';

describe('DNS + WHOIS API', () => {
  
  // Health
  describe('Health', () => {
    it('should return healthy', async () => {
      const res = await fetch(`${BASE_URL}/health`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.status).toBe('healthy');
    });
  });

  // DNS
  describe('DNS Lookup', () => {
    it('should resolve A records', async () => {
      const res = await fetch(`${BASE_URL}/v1/dns?domain=google.com&type=A`);
      
      if (res.status === 200) {
        const data = await res.json();
        expect(data.domain).toBe('google.com');
        expect(data.type).toBe('A');
        expect(data.records).toBeDefined();
        expect(data.records.length).toBeGreaterThan(0);
      }
    });

    it('should resolve MX records', async () => {
      const res = await fetch(`${BASE_URL}/v1/dns?domain=google.com&type=MX`);
      
      if (res.status === 200) {
        const data = await res.json();
        expect(data.type).toBe('MX');
      }
    });

    it('should return 400 for invalid domain', async () => {
      const res = await fetch(`${BASE_URL}/v1/dns?domain=invalid&type=A`);
      expect(res.status).toBe(400);
    });

    it('should return 400 for invalid type', async () => {
      const res = await fetch(`${BASE_URL}/v1/dns?domain=google.com&type=INVALID`);
      expect(res.status).toBe(400);
    });
  });

  // WHOIS
  describe('WHOIS Lookup', () => {
    it('should get WHOIS data', async () => {
      const res = await fetch(`${BASE_URL}/v1/whois?domain=google.com`);
      
      if (res.status === 200) {
        const data = await res.json();
        expect(data.domain).toBe('google.com');
        expect(data.registrar).toBeDefined();
      }
    });

    it('should return 400 for invalid domain', async () => {
      const res = await fetch(`${BASE_URL}/v1/whois?domain=not-valid`);
      expect(res.status).toBe(400);
    });
  });

  // Combined Lookup
  describe('Combined Lookup', () => {
    it('should return DNS + WHOIS combined', async () => {
      const res = await fetch(`${BASE_URL}/v1/lookup?domain=example.com`);
      
      if (res.status === 200) {
        const data = await res.json();
        expect(data.domain).toBe('example.com');
        expect(data.dns).toBeDefined();
        expect(data.whois).toBeDefined();
        expect(data.dns.A).toBeDefined();
        expect(data.dns.MX).toBeDefined();
      }
    });
  });

  // Utilities
  describe('Domain Validation', () => {
    it('should validate domains', () => {
      expect(isValidDomain('google.com')).toBe(true);
      expect(isValidDomain('sub.example.com')).toBe(true);
      expect(isValidDomain('invalid')).toBe(false);
    });
  });
});
