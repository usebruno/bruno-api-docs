import type { SecretProviderType } from '@opencollection/types/common/variables';

export const MANAGER_LABELS: Record<string, string> = {
  'vault': 'Vault',
  'vault-server': 'Vault Server',
  'vault-cloud': 'Vault Cloud',
  'aws-secrets-manager': 'AWS Secrets Manager',
  'azure-key-vault': 'Azure Key Vault',
  'gcp-secrets-manager': 'GCP Secrets Manager',
  'one-password': '1Password'
};

const SECRET_POINTER_FIELD: Record<
  SecretProviderType,
  'path' | 'secretName' | 'vaultName' | 'projectId' | 'secretReference'
> = {
  'hashicorp-vault-cloud': 'path',
  'hashicorp-vault-server': 'path',
  'aws-secrets-manager': 'secretName',
  'azure-key-vault': 'vaultName',
  'gcp-secrets-manager': 'projectId',
  'one-password': 'secretReference'
};

export const externalSecretPointer = (
  type: string | undefined
): (typeof SECRET_POINTER_FIELD)[SecretProviderType] =>
  (type && type in SECRET_POINTER_FIELD ? SECRET_POINTER_FIELD[type as SecretProviderType] : 'secretName');
