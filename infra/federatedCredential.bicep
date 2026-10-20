@description('Name of the existing user-assigned managed identity to attach the federated credential to.')
param identityName string

@description('AKS cluster OIDC issuer URL (from aks.bicep output oidcIssuerUrl).')
param aksOidcIssuerUrl string

@description('Kubernetes namespace of the bot workload.')
param k8sNamespace string = 'teams-bot-poc'

@description('Kubernetes ServiceAccount name annotated for workload identity.')
param k8sServiceAccountName string = 'teams-bot-workload-identity'

resource identity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' existing = {
  name: identityName
}

// Binds the AKS-projected Kubernetes service-account token (OIDC) to this
// user-assigned managed identity, enabling Azure Workload Identity
// Federation — matching the architecture diagram's
// "AKS OIDC issuer -> projects service-account token -> federated token
// exchange with Microsoft Entra ID" flow. No client secret is involved.
resource federatedCredential 'Microsoft.ManagedIdentity/userAssignedIdentities/federatedIdentityCredentials@2023-01-31' = {
  parent: identity
  name: 'aks-federated-credential'
  properties: {
    issuer: aksOidcIssuerUrl
    subject: 'system:serviceaccount:${k8sNamespace}:${k8sServiceAccountName}'
    audiences: [
      'api://AzureADTokenExchange'
    ]
  }
}

output federatedCredentialName string = federatedCredential.name
