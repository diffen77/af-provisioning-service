import { Router, Request, Response } from 'express';
import logger from '../logger';
import { getProvisionRecordByCustomerId } from '../store';

const router = Router();

// GET /status/:customerId
router.get('/:customerId', (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;

    const record = getProvisionRecordByCustomerId(customerId);

    if (!record) {
      return res.status(404).json({
        error: 'Provision request not found for customer',
        customer_id: customerId,
      });
    }

    const response: any = {
      status: record.status,
      request_id: record.request_id,
    };

    if (record.status === 'provisioning') {
      response.eta = 'Please wait...';
    }

    if (record.status === 'provisioned') {
      response.url = record.url;
      response.deployed_at = record.deployed_at;
    }

    if (record.status === 'dns_waiting') {
      response.last_check = record.dns_last_check?.toISOString();
      response.attempts = record.dns_check_count;
    }

    if (record.status === 'dns_timeout' || record.status === 'failed') {
      response.error_message = record.error_message;
      response.last_check = record.dns_last_check?.toISOString();
    }

    logger.info(`Status check for ${customerId}`, {
      customer_id: customerId,
      status: record.status,
    });

    res.json(response);
  } catch (error: any) {
    logger.error('Error in GET /status/:customerId', {
      error: error.message,
      stack: error.stack,
    });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
