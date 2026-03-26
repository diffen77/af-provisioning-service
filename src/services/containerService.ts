import Dockerode from 'dockerode';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import logger from '../logger';

const execAsync = promisify(exec);

const docker = new Dockerode({
  socketPath: process.env.DOCKER_HOST || '/var/run/docker.sock',
});

const GENERATED_COMPOSE_DIR = '/home/diffen/docker-compose-generated';

export async function ensureGenerateDir(): Promise<void> {
  if (!fs.existsSync(GENERATED_COMPOSE_DIR)) {
    fs.mkdirSync(GENERATED_COMPOSE_DIR, { recursive: true });
    logger.info(`Created directory ${GENERATED_COMPOSE_DIR}`);
  }
}

export async function generateDockerCompose(
  customerId: string,
  domain: string,
  dbUrl: string,
  dbName: string
): Promise<string> {
  await ensureGenerateDir();

  const composeContent = `version: '3.8'

services:
  af-${customerId}:
    image: af-portal:latest
    container_name: af-${customerId}
    ports:
      - "3000"
    environment:
      DATABASE_URL: ${dbUrl}
      DATABASE_NAME: ${dbName}
      NODE_ENV: production
    restart: unless-stopped
    networks:
      - harrydabbqse_default

networks:
  harrydabbqse_default:
    external: true
`;

  const filePath = path.join(GENERATED_COMPOSE_DIR, `docker-compose-${customerId}.yml`);
  fs.writeFileSync(filePath, composeContent);
  logger.info(`Generated docker-compose for ${customerId} at ${filePath}`);
  
  return filePath;
}

export async function startContainer(
  customerId: string,
  composeFilePath: string
): Promise<string> {
  try {
    const command = `docker-compose -f ${composeFilePath} -p af-${customerId} up -d`;
    const { stdout, stderr } = await execAsync(command);
    
    logger.info(`Container started for ${customerId}`, {
      stdout,
      stderr,
    });

    // Wait for container to be up (with timeout of 60s)
    const startTime = Date.now();
    const maxWait = 60000;

    while (Date.now() - startTime < maxWait) {
      try {
        const container = docker.getContainer(`af-${customerId}`);
        const inspect = await container.inspect();
        
        if (inspect.State?.Running) {
          logger.info(`Container af-${customerId} is running`);
          return inspect.Id;
        }
      } catch (e) {
        // Container not found yet
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    throw new Error(`Container af-${customerId} did not start within 60 seconds`);
  } catch (error: any) {
    logger.error(`Failed to start container for ${customerId}`, {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

export async function getContainerStatus(customerId: string): Promise<any> {
  try {
    const container = docker.getContainer(`af-${customerId}`);
    const inspect = await container.inspect();
    return inspect;
  } catch (error: any) {
    logger.error(`Failed to get container status for ${customerId}`, {
      error: error.message,
    });
    throw error;
  }
}

export async function listContainers(): Promise<any[]> {
  try {
    const containers = await docker.listContainers({ all: true });
    return containers.filter((c: any) => c.Names[0]?.includes('af-'));
  } catch (error: any) {
    logger.error('Failed to list containers', {
      error: error.message,
    });
    throw error;
  }
}
