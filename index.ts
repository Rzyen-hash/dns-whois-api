import { Hono } from 'hono';
import { resolveDNS, getWhois, getLookup, isValidDomain } from './src/services/dnswhois';
import { x402DNSMiddleware, x402WhoisMiddleware, x402LookupMiddleware, getX402Manifest } from './src/middleware/x402';
import type { HealthResponse } from './src/types';

const app = new Hono();
const startTime = Date.now();

// Health (free)
app.get('/health', (c) => {
  const response: HealthResponse = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.1.0-x402',
    uptime: Date.now() - startTime,
  };
  return c.json(response);
});

// x402 Manifest endpoint for discovery
app.get('/.well-known/x402-manifest', (c) => {
  return c.json(getX402Manifest());
});

// GET /v1/dns?domain=&type=A (0.01 USDC)
app.get('/v1/dns', x402DNSMiddleware(), async (c) => {
  const domain = c.req.query('domain');
  const type = c.req.query('type') || 'A';

  if (!domain) {
    return c.json({ error: 'Missing required parameter: domain' }, 400);
  }

  if (!isValidDomain(domain)) {
    return c.json({ error: `Invalid domain: ${domain}` }, 400);
  }

  const validTypes = ['A', 'AAAA', 'MX', 'NS', 'TXT', 'CNAME'];
  if (!validTypes.includes(type.toUpperCase())) {
    return c.json({ error: `Invalid DNS type: ${type}. Valid: ${validTypes.join(', ')}` }, 400);
  }

  const result = await resolveDNS(domain, type);

  if (!result) {
    return c.json({ error: `Failed to resolve DNS for ${domain}` }, 404);
  }

  return c.json(result);
});

// GET /v1/whois?domain= (0.02 USDC)
app.get('/v1/whois', x402WhoisMiddleware(), async (c) => {
  const domain = c.req.query('domain');

  if (!domain) {
    return c.json({ error: 'Missing required parameter: domain' }, 400);
  }

  if (!isValidDomain(domain)) {
    return c.json({ error: `Invalid domain: ${domain}` }, 400);
  }

  const result = await getWhois(domain);

  if (!result) {
    return c.json({ error: `Failed to get WHOIS for ${domain}` }, 404);
  }

  return c.json(result);
});

// GET /v1/lookup?domain= combined (0.02 USDC)
app.get('/v1/lookup', x402LookupMiddleware(), async (c) => {
  const domain = c.req.query('domain');

  if (!domain) {
    return c.json({ error: 'Missing required parameter: domain' }, 400);
  }

  if (!isValidDomain(domain)) {
    return c.json({ error: `Invalid domain: ${domain}` }, 400);
  }

  const result = await getLookup(domain);

  if (!result) {
    return c.json({ error: `Failed to lookup ${domain}` }, 404);
  }

  return c.json(result);
});

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Endpoint not found' }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Error:', err);
  return c.json({ error: 'Internal server error' }, 500);
});

const port = process.env.PORT || 3000;

Bun.serve({
  port,
  fetch: app.fetch,
});

console.log(`DNS + WHOIS API running at http://localhost:${port}`);