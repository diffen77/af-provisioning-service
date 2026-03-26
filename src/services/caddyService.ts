import axios, { AxiosInstance } from 'axios';
import logger from '../logger';

const caddyAdminUrl = process.env.CADDY_ADMIN_URL || 'http://localhost:2019';
const client: AxiosInstance = axios.create({
  baseURL: caddyAdminUrl,
  timeout: 5000,
});

export async function createRoute(
  domain: string,
  containerPort: number = 3000
): Promise<void> {
  try {
    // Get current config
    const configRes = await client.get('/config/apps/http');
    const currentConfig = configRes.data;

    // Create route object
    const route = {
      match: [
        {
          host: [domain],
        },
      ],
      handle: [
        {
          handler: 'reverse_proxy',
          upstreams: [
            {
              dial: `localhost:${containerPort}`,
            },
          ],
        },
      ],
    };

    // Update Caddy config
    const updatePayload = {
      apps: {
        http: {
          ...currentConfig.apps?.http,
          servers: {
            srv0: {
              ...currentConfig.apps?.http?.servers?.srv0,
              routes: [
                ...(currentConfig.apps?.http?.servers?.srv0?.routes || []),
                route,
              ],
            },
          },
        },
      },
    };

    await client.post('/load', updatePayload);
    logger.info(`Created Caddy route for ${domain} -> localhost:${containerPort}`);
  } catch (error: any) {
    logger.error(`Failed to create Caddy route for ${domain}`, {
      error: error.message,
      status: error.response?.status,
      data: error.response?.data,
    });
    throw error;
  }
}

export async function deleteRoute(domain: string): Promise<void> {
  try {
    const configRes = await client.get('/config/apps/http');
    const currentConfig = configRes.data;

    const routes = (currentConfig.apps?.http?.servers?.srv0?.routes || []).filter(
      (route: any) => !route.match?.[0]?.host?.includes(domain)
    );

    const updatePayload = {
      apps: {
        http: {
          ...currentConfig.apps?.http,
          servers: {
            srv0: {
              ...currentConfig.apps?.http?.servers?.srv0,
              routes,
            },
          },
        },
      },
    };

    await client.post('/load', updatePayload);
    logger.info(`Deleted Caddy route for ${domain}`);
  } catch (error: any) {
    logger.error(`Failed to delete Caddy route for ${domain}`, {
      error: error.message,
    });
    throw error;
  }
}

export async function testCaddyConnection(): Promise<boolean> {
  try {
    const res = await client.get('/config');
    return res.status === 200;
  } catch (error: any) {
    logger.error('Caddy connection failed', {
      error: error.message,
    });
    return false;
  }
}
