import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import logger from '../logger';
import { ProvisionRequest, ProvisionRecord } from '../types';
import { saveProvisionRecord, updateProvisionRecord } from '../store';
import * as containerService from '../services/containerService';
import * as dbService from '../services/dbService';
import * as caddyService from '../services/caddyService';
import * as dnsService from '../services/dnsService';

const router = Router();

// Validate provision request
function validateProvisionRequest(req: Request): { valid: boolean; error?: string } {
  const { customer_id, domain, company_name, contact_email } = req.body;

  if (!customer_id || typeof customer_id !== 'string') {
    return { valid: false, error: 'customer_id is required and must be a string' };
  }

  if (!domain || typeof domain !== 'string') {
    return { valid: false, error: 'domain is required and must be a string' };
  }

  if (!company_name || typeof company_name !== 'string') {
    return { valid: false, error: 'company_name is required and must be a string' };
  }

  if (!contact_email || typeof contact_email !== 'string') {
    return { valid: false, error: 'contact_email is required and must be a string' };
  }

  return { valid: true };
}

// POST /provision
router.post('/', async (req: Request, res: Response) => {
  try {
    const validation = validateProvisionRequest(req);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    const provisionReq: ProvisionRequest = req.body;
    const request_id = uuidv4();

    // Create initial record
    const record: ProvisionRecord = {
      request_id,
      customer_id: provisionReq.customer_id,
      domain: provisionReq.domain,
      company_name: provisionReq.company_name,
      contact_email: provisionReq.contact_email,
      status: 'provisioning',
      created_at: new Date(),
      updated_at: new Date(),
      dns_check_count: 0,
    };

    saveProvisionRecord(record);

    // Return 202 Accepted immediately
    res.status(202).json({
      status: 202,
      request_id,
      message: 'Provisioning started',
    });

    // Start provisioning asynchronously
    provisioningFlow(request_id, provisionReq).catch(error => {
      logger.error(`Provisioning flow failed for ${request_id}`, {
        error: error.message,
        stack: error.stack,
      });
    });
  } catch (error: any) {
    logger.error('Error in POST /provision', {
      error: error.message,
      stack: error.stack,
    });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

async function provisioningFlow(request_id: string, req: ProvisionRequest): Promise<void> {
  try {
    logger.info(`Starting provisioning flow for ${req.customer_id}`, { request_id });

    // Step 1: Create database
    const { dbUrl, dbName, password } = await dbService.createCustomerDatabase(req.customer_id);
    updateProvisionRecord(request_id, { db_name: dbName });

    // Step 2: Generate and start container
    const composeFilePath = await containerService.generateDockerCompose(
      req.customer_id,
      req.domain,
      dbUrl,
      dbName
    );

    const containerId = await containerService.startContainer(req.customer_id, composeFilePath);
    updateProvisionRecord(request_id, { container_id: containerId });

    // Step 3: Create Caddy route
    await caddyService.createRoute(req.domain, 3000);

    // Step 4: Update status to dns_waiting
    updateProvisionRecord(request_id, { status: 'dns_waiting' });

    // Step 5: Poll DNS
    const dnsResult = await dnsService.pollDNS(req.domain);
    
    if (dnsResult.resolved) {
      // Provisioning complete
      const deployedAt = new Date();
      const url = `https://${req.domain}`;
      
      updateProvisionRecord(request_id, {
        status: 'provisioned',
        url,
        deployed_at: deployedAt.toISOString(),
        dns_check_count: dnsResult.attempts,
        dns_last_check: dnsResult.lastCheck,
      });

      logger.info(`Provisioning completed for ${req.customer_id}`, {
        request_id,
        url,
        attempts: dnsResult.attempts,
      });
    } else {
      // DNS timeout
      updateProvisionRecord(request_id, {
        status: 'dns_timeout',
        dns_check_count: dnsResult.attempts,
        dns_last_check: dnsResult.lastCheck,
        error_message: `DNS resolution failed after ${dnsResult.attempts} attempts`,
      });

      logger.warn(`DNS timeout for ${req.customer_id}`, {
        request_id,
        attempts: dnsResult.attempts,
      });
    }
  } catch (error: any) {
    logger.error(`Provisioning flow error for ${req.customer_id}`, {
      request_id,
      error: error.message,
      stack: error.stack,
    });

    updateProvisionRecord(request_id, {
      status: 'failed',
      error_message: error.message,
    });
  }
}

export default router;
