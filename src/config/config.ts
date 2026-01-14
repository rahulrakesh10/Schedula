import { SecretClient } from '@azure/keyvault-secrets';
import { DefaultAzureCredential } from '@azure/identity';

export interface AppConfig {
  sqlConnectionString: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  keyVaultUri?: string;
  appInsightsConnectionString?: string;
  environment: string;
}

let cachedConfig: AppConfig | null = null;

/**
 * Retrieves configuration from environment variables or Azure Key Vault
 */
export async function getConfig(): Promise<AppConfig> {
  if (cachedConfig) {
    return cachedConfig;
  }

  const environment = process.env.ENVIRONMENT || 'local';
  const keyVaultUri = process.env.KEY_VAULT_URI;

  let sqlConnectionString = process.env.SQL_CONNECTION_STRING || '';
  let jwtSecret = process.env.JWT_SECRET || '';
  const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '24h';
  const appInsightsConnectionString = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;

  // In production, retrieve secrets from Key Vault
  if (environment !== 'local' && keyVaultUri) {
    try {
      const credential = new DefaultAzureCredential();
      const secretClient = new SecretClient(keyVaultUri, credential);

      if (!sqlConnectionString) {
        const sqlSecret = await secretClient.getSecret('SQL-CONNECTION-STRING');
        sqlConnectionString = sqlSecret.value || '';
      }

      if (!jwtSecret) {
        const jwtSecretObj = await secretClient.getSecret('JWT-SECRET');
        jwtSecret = jwtSecretObj.value || '';
      }
    } catch (error) {
      console.error('Error retrieving secrets from Key Vault:', error);
      throw new Error('Failed to retrieve configuration from Key Vault');
    }
  }

  if (!sqlConnectionString) {
    throw new Error('SQL_CONNECTION_STRING is not configured');
  }

  if (!jwtSecret) {
    throw new Error('JWT_SECRET is not configured');
  }

  cachedConfig = {
    sqlConnectionString,
    jwtSecret,
    jwtExpiresIn,
    keyVaultUri,
    appInsightsConnectionString,
    environment,
  };

  return cachedConfig;
}

/**
 * Clear cached configuration (useful for testing)
 */
export function clearConfigCache(): void {
  cachedConfig = null;
}


