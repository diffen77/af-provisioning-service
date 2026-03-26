import { Client } from 'pg';
import logger from '../logger';

interface DBConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

export async function createCustomerDatabase(
  customerId: string
): Promise<{ dbUrl: string; dbName: string; password: string }> {
  const dbName = `af_${customerId.replace(/-/g, '_')}`;
  const password = generateRandomPassword();
  
  const adminUrl = process.env.DATABASE_ADMIN_URL || 'postgresql://postgres:postgres@localhost:5432/postgres';
  
  try {
    // Parse connection string
    const client = new Client(adminUrl);
    await client.connect();

    // Create database
    await client.query(`CREATE DATABASE "${dbName}"`);
    logger.info(`Created database ${dbName}`);

    // Create user with password
    const userId = `af_${customerId.replace(/-/g, '_')}`;
    await client.query(
      `CREATE USER "${userId}" WITH PASSWORD $1`,
      [password]
    );
    logger.info(`Created user ${userId}`);

    // Grant privileges
    await client.query(
      `GRANT ALL PRIVILEGES ON DATABASE "${dbName}" TO "${userId}"`
    );
    logger.info(`Granted privileges for ${userId} on ${dbName}`);

    await client.end();

    const dbUrl = `postgresql://${userId}:${password}@${extractHost(adminUrl)}/${dbName}`;
    
    logger.info(`Database provisioned for ${customerId}`, {
      dbName,
      user: userId,
    });

    return { dbUrl, dbName, password };
  } catch (error: any) {
    logger.error(`Failed to create database for ${customerId}`, {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

export async function getDatabase(customerId: string): Promise<{ dbUrl: string; dbName: string } | null> {
  const dbName = `af_${customerId.replace(/-/g, '_')}`;
  const adminUrl = process.env.DATABASE_ADMIN_URL || 'postgresql://postgres:postgres@localhost:5432/postgres';
  
  try {
    const client = new Client(adminUrl);
    await client.connect();

    const result = await client.query(
      `SELECT datname FROM pg_database WHERE datname = $1`,
      [dbName]
    );

    await client.end();

    if (result.rows.length === 0) {
      return null;
    }

    const dbUrl = `postgresql://af_${customerId}@${extractHost(adminUrl)}/${dbName}`;
    return { dbUrl, dbName };
  } catch (error: any) {
    logger.error(`Failed to get database for ${customerId}`, {
      error: error.message,
    });
    throw error;
  }
}

function extractHost(connectionString: string): string {
  // Parse postgresql://user:password@host:port/db
  const url = new URL(connectionString.replace('postgresql://', 'postgres://'));
  const host = url.hostname;
  const port = url.port || '5432';
  return `${host}:${port}`;
}

function generateRandomPassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < 32; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}
