param location string = resourceGroup().location
param env string
param domainName string

resource staticWebApp 'Microsoft.Web/staticSites@2024-04-01' = {
  name: 'widget-demo-${env}'
  location: location
  sku: {
    name: 'Standard'
    tier: 'Standard'
  }
  properties: {
    stagingEnvironmentPolicy: 'Enabled'
    allowConfigFileUpdates: true
  }
}

resource staticWebAppDomain 'Microsoft.Web/staticSites/customDomains@2024-04-01' = {
  name: 'widget-demo.${domainName}'
  parent: staticWebApp
}

output staticWebAppHostname string = staticWebApp.properties.defaultHostname
output publicDomainName string = staticWebAppDomain.name
