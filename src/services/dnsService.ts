import { exec } from 'child_process';
import { promisify } from 'util';
import logger from '../logger';

const execAsync = promisify(exec);
const EXPECTED_IP = '192.168.99.4';
const MAX_ATTEMPTS = 288; // 24 hours / 5 minutes
const CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export interface DNSPollResult {
  resolved: boolean;
  attempts: number;
  lastCheck: Date;
  ip?: string;
}

export async function pollDNS(
  domain: string,
  maxAttempts: number = MAX_ATTEMPTS
): Promise<DNSPollResult> {
  logger.info(`Starting DNS polling for ${domain}`, { maxAttempts });

  let attempts = 0;
  let lastCheck = new Date();

  while (attempts < maxAttempts) {
    attempts++;

    try {
      const ip = await resolveDomain(domain);
      lastCheck = new Date();

      if (ip === EXPECTED_IP) {
        logger.info(`DNS resolved for ${domain} -> ${ip} after ${attempts} attempts`);
        return {
          resolved: true,
          attempts,
          lastCheck,
          ip,
        };
      }

      logger.debug(`DNS not ready for ${domain}: got ${ip}, expected ${EXPECTED_IP}`, {
        attempt: attempts,
      });
    } catch (error: any) {
      logger.debug(`DNS check failed for ${domain}`, {
        attempt: attempts,
        error: error.message,
      });
    }

    if (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, CHECK_INTERVAL_MS));
    }
  }

  logger.warn(`DNS polling timeout for ${domain} after ${maxAttempts} attempts`);
  return {
    resolved: false,
    attempts: maxAttempts,
    lastCheck,
  };
}

export async function resolveDomain(domain: string): Promise<string> {
  try {
    const { stdout } = await execAsync(`nslookup ${domain}`);
    
    // Parse nslookup output to extract IP
    const lines = stdout.split('\n');
    for (const line of lines) {
      if (line.includes('Address:')) {
        const parts = line.split(':');
        if (parts.length >= 2) {
          const ip = parts[1].trim();
          if (isValidIP(ip)) {
            return ip;
          }
        }
      }
    }

    throw new Error(`Could not parse IP from nslookup output for ${domain}`);
  } catch (error: any) {
    logger.debug(`DNS resolution failed for ${domain}`, {
      error: error.message,
    });
    throw error;
  }
}

function isValidIP(ip: string): boolean {
  const parts = ip.split('.');
  if (parts.length !== 4) return false;
  return parts.every(part => {
    const num = parseInt(part, 10);
    return num >= 0 && num <= 255;
  });
}

export async function checkDNSStatus(
  domain: string
): Promise<{ resolved: boolean; ip?: string }> {
  try {
    const ip = await resolveDomain(domain);
    return {
      resolved: ip === EXPECTED_IP,
      ip,
    };
  } catch (error) {
    return {
      resolved: false,
    };
  }
}
