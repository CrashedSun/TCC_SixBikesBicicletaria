// server/config/secretManager.js
// Lê secrets do Google Cloud Secret Manager em runtime

const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');

let secretCache = {};

/**
 * Acessa um secret do Google Cloud Secret Manager
 * @param {string} secretName - Nome do secret (ex: "SUPABASE_DB_PASSWORD")
 * @param {string} projectId - Project ID (ex: "sixbikes")
 * @returns {Promise<string>} - Valor do secret
 */
async function getSecret(secretName, projectId = 'sixbikes') {
  // Retorna do cache se já foi lido
  if (secretCache[secretName]) {
    return secretCache[secretName];
  }

  try {
    const client = new SecretManagerServiceClient();
    
    const name = client.secretVersionPath(projectId, secretName, 'latest');
    const [version] = await client.accessSecretVersion({ name });

    const secretValue = version.payload.data.toString('utf8');
    secretCache[secretName] = secretValue;

    return secretValue;
  } catch (error) {
    console.error(`Erro ao acessar secret ${secretName}:`, error.message);
    throw error;
  }
}

module.exports = { getSecret };
