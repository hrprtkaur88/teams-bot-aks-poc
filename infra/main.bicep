targetScope = 'subscription'

@description('Resource group that will contain all POC resources.')
param resourceGroupName string

@description('Azure region for all resources.')
param location string = 'eastus'

@description('Globally unique-ish prefix, lowercase alphanumeric only.')
param namePrefix string

@description('Public DNS host for the AKS ingress/load balancer. Update after ingress is known.')
param botEndpointHost string = 'pending.example.com'

resource rg 'Microsoft.Resources/resourceGroups@2024-03-01' = {
  name: resourceGroupName
  location: location
}

module loganalytics 'loganalytics.bicep' = {
  name: 'loganalytics'
  scope: rg
  params: {
    location: location
    namePrefix: namePrefix
  }
}

module appinsights 'appinsights.bicep' = {
  name: 'appinsights'
  scope: rg
  params: {
    location: location
    namePrefix: namePrefix
    workspaceResourceId: loganalytics.outputs.workspaceResourceId
  }
}

module acr 'acr.bicep' = {
  name: 'acr'
  scope: rg
  params: {
    location: location
    namePrefix: namePrefix
  }
}

module identity 'identity.bicep' = {
  name: 'identity'
  scope: rg
  params: {
    location: location
    namePrefix: namePrefix
  }
}

module keyvault 'keyvault.bicep' = {
  name: 'keyvault'
  scope: rg
  params: {
    location: location
    namePrefix: namePrefix
  }
}

module networking 'networking.bicep' = {
  name: 'networking'
  scope: rg
  params: {
    location: location
    namePrefix: namePrefix
  }
}

module aks 'aks.bicep' = {
  name: 'aks'
  scope: rg
  params: {
    location: location
    namePrefix: namePrefix
    acrResourceId: acr.outputs.acrResourceId
    logAnalyticsWorkspaceResourceId: loganalytics.outputs.workspaceResourceId
  }
}

module bot 'bot.bicep' = {
  name: 'bot'
  scope: rg
  params: {
    location: 'global'
    namePrefix: namePrefix
    botEndpoint: 'https://${botEndpointHost}/api/messages'
    userAssignedIdentityClientId: identity.outputs.clientId
    userAssignedIdentityResourceId: identity.outputs.resourceId
    tenantId: subscription().tenantId
  }
}

output resourceGroup string = rg.name
output aksName string = aks.outputs.aksName
output acrName string = acr.outputs.acrName
output acrLoginServer string = acr.outputs.loginServer
output botName string = bot.outputs.botName
output botEndpoint string = bot.outputs.messagingEndpoint
output applicationInsightsName string = appinsights.outputs.applicationInsightsName
output applicationInsightsConnectionString string = appinsights.outputs.connectionString
output managedIdentityClientId string = identity.outputs.clientId
