export interface DNSRecord {
  type: string;
  name: string;
  ttl: number;
  data: string;
}

export interface DNSResponse {
  domain: string;
  type: string;
  records: DNSRecord[];
  freshness: {
    fetchedAt: string;
    staleness: number;
    confidence: number;
  };
}

export interface WhoisResponse {
  domain: string;
  registrar: string | null;
  createdAt: string | null;
  expiresAt: string | null;
  nameservers: string[];
  status: string[];
  updatedAt: string | null;
  freshness: {
    fetchedAt: string;
    staleness: number;
    confidence: number;
  };
}

export interface LookupResponse {
  domain: string;
  dns: {
    A: DNSRecord[];
    MX: DNSRecord[];
    NS: DNSRecord[];
    TXT: DNSRecord[];
    CNAME: DNSRecord[];
  };
  whois: WhoisResponse;
  freshness: {
    fetchedAt: string;
    staleness: number;
    confidence: number;
  };
}

export interface HealthResponse {
  status: string;
  timestamp: string;
  version: string;
  uptime: number;
}
