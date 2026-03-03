import dns from 'node:dns/promises';
import whois from 'whois-json';
import type { DNSRecord, DNSResponse, WhoisResponse, LookupResponse } from '../types';

const CACHE_TTL = 300000; // 5 minutes

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const dnsCache: Map<string, CacheEntry<DNSResponse>> = new Map();
const whoisCache: Map<string, CacheEntry<WhoisResponse>> = new Map();

export function isValidDomain(domain: string): boolean {
  const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
  return domainRegex.test(domain) || domain === 'localhost';
}

export async function resolveDNS(domain: string, type: string): Promise<DNSResponse | null> {
  const cacheKey = `${domain}:${type}`;
  
  // Check cache
  const cached = dnsCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return {
      ...cached.data,
      freshness: {
        ...cached.data.freshness,
        staleness: Math.floor((Date.now() - cached.timestamp) / 1000),
      },
    };
  }

  try {
    let records: DNSRecord[] = [];

    switch (type.toUpperCase()) {
      case 'A':
        const aRecords = await dns.resolve4(domain);
        records = aRecords.map((ip, i) => ({
          type: 'A',
          name: domain,
          ttl: 300,
          data: ip,
        }));
        break;

      case 'AAAA':
        const aaaaRecords = await dns.resolve6(domain);
        records = aaaaRecords.map((ip) => ({
          type: 'AAAA',
          name: domain,
          ttl: 300,
          data: ip,
        }));
        break;

      case 'MX':
        const mxRecords = await dns.resolveMx(domain);
        records = mxRecords.map((mx) => ({
          type: 'MX',
          name: domain,
          ttl: 300,
          data: `${mx.priority} ${mx.exchange}`,
        }));
        break;

      case 'NS':
        const nsRecords = await dns.resolveNs(domain);
        records = nsRecords.map((ns) => ({
          type: 'NS',
          name: domain,
          ttl: 300,
          data: ns,
        }));
        break;

      case 'TXT':
        const txtRecords = await dns.resolveTxt(domain);
        records = txtRecords.map((txt) => ({
          type: 'TXT',
          name: domain,
          ttl: 300,
          data: txt.join(' '),
        }));
        break;

      case 'CNAME':
        const cnameRecords = await dns.resolveCname(domain);
        records = cnameRecords.map((cname) => ({
          type: 'CNAME',
          name: domain,
          ttl: 300,
          data: cname,
        }));
        break;

      default:
        return null;
    }

    const result: DNSResponse = {
      domain,
      type: type.toUpperCase(),
      records,
      freshness: {
        fetchedAt: new Date().toISOString(),
        staleness: 0,
        confidence: 0.95,
      },
    };

    dnsCache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  } catch (error) {
    console.error('DNS lookup error:', error);
    return null;
  }
}

export async function getWhois(domain: string): Promise<WhoisResponse | null> {
  // Check cache
  const cached = whoisCache.get(domain);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return {
      ...cached.data,
      freshness: {
        ...cached.data.freshness,
        staleness: Math.floor((Date.now() - cached.timestamp) / 1000),
      },
    };
  }

  try {
    const whoisData = await whois(domain);
    
    const result: WhoisResponse = {
      domain,
      registrar: whoisData.registrar || null,
      createdAt: whoisData.creationDate || whoisData.createdDate || null,
      expiresAt: whoisData.registryExpiryDate || whoisData.expirationDate || null,
      nameservers: whoisData.nameServer ? 
        (Array.isArray(whoisData.nameServer) ? whoisData.nameServer : [whoisData.nameServer]) : 
        [],
      status: whoisData.status ? 
        (Array.isArray(whoisData.status) ? whoisData.status : [whoisData.status]) : 
        [],
      updatedAt: whoisData.updatedDate || null,
      freshness: {
        fetchedAt: new Date().toISOString(),
        staleness: 0,
        confidence: 0.85,
      },
    };

    whoisCache.set(domain, { data: result, timestamp: Date.now() });
    return result;
  } catch (error) {
    console.error('WHOIS lookup error:', error);
    return null;
  }
}

export async function getLookup(domain: string): Promise<LookupResponse | null> {
  try {
    const [aRecords, mxRecords, nsRecords, txtRecords, cnameRecords, whoisData] = await Promise.all([
      resolveDNS(domain, 'A'),
      resolveDNS(domain, 'MX'),
      resolveDNS(domain, 'NS'),
      resolveDNS(domain, 'TXT'),
      resolveDNS(domain, 'CNAME').catch(() => null),
      getWhois(domain),
    ]);

    const now = new Date().toISOString();

    return {
      domain,
      dns: {
        A: aRecords?.records || [],
        MX: mxRecords?.records || [],
        NS: nsRecords?.records || [],
        TXT: txtRecords?.records || [],
        CNAME: cnameRecords?.records || [],
      },
      whois: whoisData || {
        domain,
        registrar: null,
        createdAt: null,
        expiresAt: null,
        nameservers: [],
        status: [],
        updatedAt: null,
        freshness: { fetchedAt: now, staleness: 0, confidence: 0 },
      },
      freshness: {
        fetchedAt: now,
        staleness: 0,
        confidence: 0.9,
      },
    };
  } catch (error) {
    console.error('Lookup error:', error);
    return null;
  }
}
