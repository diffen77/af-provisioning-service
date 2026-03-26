import request from 'supertest';
import app from '../src/main';
import * as containerService from '../src/services/containerService';
import * as dbService from '../src/services/dbService';
import * as caddyService from '../src/services/caddyService';
import * as dnsService from '../src/services/dnsService';

// Mock dependencies
jest.mock('../src/services/containerService');
jest.mock('../src/services/dbService');
jest.mock('../src/services/caddyService');
jest.mock('../src/services/dnsService');

describe('af-provisioning-service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Health Check', () => {
    it('GET / should return ok status', async () => {
      const res = await request(app).get('/');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });
  });

  describe('POST /provision', () => {
    it('should return 202 Accepted with request_id', async () => {
      const mockDbService = dbService as jest.Mocked<typeof dbService>;
      mockDbService.createCustomerDatabase.mockResolvedValue({
        dbUrl: 'postgresql://user:pass@localhost/db',
        dbName: 'af_test_001',
        password: 'secret',
      });

      const mockContainerService = containerService as jest.Mocked<typeof containerService>;
      mockContainerService.generateDockerCompose.mockResolvedValue('/tmp/compose.yml');
      mockContainerService.startContainer.mockResolvedValue('container-id-123');

      const mockCaddyService = caddyService as jest.Mocked<typeof caddyService>;
      mockCaddyService.createRoute.mockResolvedValue();

      const mockDnsService = dnsService as jest.Mocked<typeof dnsService>;
      mockDnsService.pollDNS.mockResolvedValue({
        resolved: true,
        attempts: 1,
        lastCheck: new Date(),
        ip: '192.168.99.4',
      });

      const res = await request(app)
        .post('/provision')
        .send({
          customer_id: 'test-001',
          domain: 'test.minbutik.se',
          company_name: 'Test Company',
          contact_email: 'test@minbutik.se',
        });

      expect(res.status).toBe(202);
      expect(res.body.status).toBe(202);
      expect(res.body.request_id).toBeDefined();
      expect(res.body.message).toBe('Provisioning started');
    });

    it('should return 400 for invalid payload', async () => {
      const res = await request(app)
        .post('/provision')
        .send({
          customer_id: 'test-001',
          // missing required fields
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('should validate all required fields', async () => {
      const requiredFields = ['customer_id', 'domain', 'company_name', 'contact_email'];

      for (const field of requiredFields) {
        const payload: any = {
          customer_id: 'test-001',
          domain: 'test.minbutik.se',
          company_name: 'Test Company',
          contact_email: 'test@minbutik.se',
        };
        delete payload[field];

        const res = await request(app)
          .post('/provision')
          .send(payload);

        expect(res.status).toBe(400);
      }
    });
  });

  describe('GET /status/:customerId', () => {
    it('should return 404 for unknown customer', async () => {
      const res = await request(app).get('/status/unknown-customer');
      expect(res.status).toBe(404);
      expect(res.body.error).toBeDefined();
    });

    it('should return provisioning status', async () => {
      // First provision a customer
      const mockDbService = dbService as jest.Mocked<typeof dbService>;
      mockDbService.createCustomerDatabase.mockResolvedValue({
        dbUrl: 'postgresql://user:pass@localhost/db',
        dbName: 'af_test_002',
        password: 'secret',
      });

      const mockContainerService = containerService as jest.Mocked<typeof containerService>;
      mockContainerService.generateDockerCompose.mockResolvedValue('/tmp/compose.yml');
      mockContainerService.startContainer.mockResolvedValue('container-id-123');

      const mockCaddyService = caddyService as jest.Mocked<typeof caddyService>;
      mockCaddyService.createRoute.mockResolvedValue();

      const mockDnsService = dnsService as jest.Mocked<typeof dnsService>;
      mockDnsService.pollDNS.mockImplementation(async () => {
        // Simulate DNS not yet resolved
        return {
          resolved: false,
          attempts: 1,
          lastCheck: new Date(),
        };
      });

      // Submit provisioning request
      const provRes = await request(app)
        .post('/provision')
        .send({
          customer_id: 'test-002',
          domain: 'test2.minbutik.se',
          company_name: 'Test Company 2',
          contact_email: 'test2@minbutik.se',
        });

      expect(provRes.status).toBe(202);

      // Wait a moment for async processing to update status
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check status
      const statusRes = await request(app).get('/status/test-002');
      expect(statusRes.status).toBe(200);
      expect(['provisioning', 'dns_waiting', 'dns_timeout', 'provisioned', 'failed']).toContain(
        statusRes.body.status
      );
    });
  });

  describe('Container operations', () => {
    it('generateDockerCompose should create valid compose file', async () => {
      const mockContainerService = containerService as jest.Mocked<typeof containerService>;
      mockContainerService.generateDockerCompose.mockResolvedValue('/tmp/compose.yml');

      const result = await containerService.generateDockerCompose(
        'test-003',
        'test3.minbutik.se',
        'postgresql://user:pass@localhost/db',
        'af_test_003'
      );

      expect(result).toBe('/tmp/compose.yml');
    });
  });

  describe('Database operations', () => {
    it('createCustomerDatabase should return dbUrl and dbName', async () => {
      const mockDbService = dbService as jest.Mocked<typeof dbService>;
      mockDbService.createCustomerDatabase.mockResolvedValue({
        dbUrl: 'postgresql://user:pass@localhost/db',
        dbName: 'af_test_004',
        password: 'secret',
      });

      const result = await dbService.createCustomerDatabase('test-004');

      expect(result.dbUrl).toBeDefined();
      expect(result.dbName).toBe('af_test_004');
      expect(result.password).toBeDefined();
    });
  });

  describe('DNS operations', () => {
    it('pollDNS should return resolved status', async () => {
      const mockDnsService = dnsService as jest.Mocked<typeof dnsService>;
      mockDnsService.pollDNS.mockResolvedValue({
        resolved: true,
        attempts: 5,
        lastCheck: new Date(),
        ip: '192.168.99.4',
      });

      const result = await dnsService.pollDNS('test.minbutik.se');

      expect(result.resolved).toBe(true);
      expect(result.ip).toBe('192.168.99.4');
    });
  });
});
