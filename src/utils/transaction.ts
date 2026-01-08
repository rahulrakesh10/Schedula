import sql from 'mssql';
import { beginTransaction } from '../database/db';

/**
 * Execute a function within a database transaction
 * Automatically commits on success or rolls back on error
 */
export async function withTransaction<T>(
  callback: (transaction: sql.Transaction) => Promise<T>
): Promise<T> {
  const transaction = await beginTransaction();

  try {
    const result = await callback(transaction);
    await transaction.commit();
    return result;
  } catch (error) {
    try {
      await transaction.rollback();
    } catch (rollbackError) {
      console.error('Error rolling back transaction:', rollbackError);
    }
    throw error;
  }
}
