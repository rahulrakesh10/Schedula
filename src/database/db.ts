import sql from 'mssql';
import { getConfig } from '../config/config';

let pool: sql.ConnectionPool | null = null;

/**
 * Get or create a database connection pool
 */
export async function getDbPool(): Promise<sql.ConnectionPool> {
  if (pool && pool.connected) {
    return pool;
  }

  const config = await getConfig();

  try {
    pool = await sql.connect(config.sqlConnectionString);
    return pool;
  } catch (error) {
    console.error('Database connection error:', error);
    throw new Error('Failed to connect to database');
  }
}

/**
 * Execute a query with automatic retry logic
 */
export async function executeQuery<T>(
  query: string,
  parameters?: Record<string, unknown>
): Promise<sql.IResult<T>> {
  const pool = await getDbPool();
  const request = pool.request();

  if (parameters) {
    for (const [key, value] of Object.entries(parameters)) {
      request.input(key, value);
    }
  }

  return request.query<T>(query);
}

/**
 * Execute a stored procedure
 */
export async function executeProcedure<T>(
  procedureName: string,
  parameters?: Record<string, unknown>
): Promise<sql.IResult<T>> {
  const pool = await getDbPool();
  const request = pool.request();

  if (parameters) {
    for (const [key, value] of Object.entries(parameters)) {
      request.input(key, value);
    }
  }

  return request.execute<T>(procedureName);
}

/**
 * Begin a database transaction
 */
export async function beginTransaction(): Promise<sql.Transaction> {
  const pool = await getDbPool();
  const transaction = new sql.Transaction(pool);
  await transaction.begin();
  return transaction;
}

/**
 * Close the database connection pool
 */
export async function closeDbPool(): Promise<void> {
  if (pool) {
    await pool.close();
    pool = null;
  }
}

