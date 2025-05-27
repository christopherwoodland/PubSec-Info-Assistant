data "azurerm_client_config" "current" {}

locals {
  principal_list = var.entraOwners == "" ? [] : split(",", var.entraOwners)
  owner_ids      = contains(local.principal_list, data.azurerm_client_config.current.object_id) ? local.principal_list : concat(local.principal_list, [data.azurerm_client_config.current.object_id])
}


resource "azuread_application" "aad_web_app" {
  count                         = var.isInAutomation ? 0 : 1
  display_name                  = "infoasst_web_access_${var.randomString}"
  identifier_uris               = ["api://infoasst-${var.randomString}"]
  owners                        = local.owner_ids
  sign_in_audience              = "AzureADMyOrg"
  oauth2_post_response_required = true
  service_management_reference  = var.serviceManagementReference

  web {
    redirect_uris = ["https://infoasst-web-${var.randomString}.${var.azure_websites_domain}/.auth/login/aad/callback"]
    implicit_grant {
      access_token_issuance_enabled = true
      id_token_issuance_enabled     = true
    }
  }

  # Expose an API scope
  api {
    oauth2_permission_scope {
      admin_consent_description  = "Allow the application to access the Information Assistant API on behalf of the signed-in user."
      admin_consent_display_name = "Access Information Assistant API"
      enabled                    = true
      id                         = "b7b93c00-7de1-4c6c-88dd-8cd4f7f0ef9b"
      type                       = "User"
      user_consent_description   = "Allow the application to access the Information Assistant API on your behalf."
      user_consent_display_name  = "Access Information Assistant API"
      value                      = "access_as_user"
    }
  }

  # Add API permissions for Microsoft Graph
  required_resource_access {
    resource_app_id = "00000003-0000-0000-c000-000000000000" # Microsoft Graph
    resource_access {
      id   = "e1fe6dd8-ba31-4d61-89e7-88639da4683d" # User.Read
      type = "Scope"
    }
  }
}


resource "azuread_service_principal" "aad_web_sp" {
  count                        = var.isInAutomation ? 0 : 1
  client_id                    = azuread_application.aad_web_app[0].client_id
  app_role_assignment_required = var.requireWebsiteSecurityMembership
  owners                       = local.owner_ids
}

# Create a client secret for the web application
resource "azuread_application_password" "aad_web_app_secret" {
  count              = var.isInAutomation ? 0 : 1
  application_id     = azuread_application.aad_web_app[0].id
  display_name       = "Web App Authentication Secret"
  end_date_relative  = "8760h" # 1 year
}

resource "azuread_application" "aad_mgmt_app" {
  count                        = var.isInAutomation ? 0 : 1
  display_name                 = "infoasst_mgmt_access_${var.randomString}"
  owners                       = local.owner_ids
  sign_in_audience             = "AzureADMyOrg"
  service_management_reference = var.serviceManagementReference
}

resource "azuread_service_principal" "aad_mgmt_sp" {
  count     = var.isInAutomation ? 0 : 1
  client_id = azuread_application.aad_mgmt_app[0].client_id
  owners    = local.owner_ids
}

output "azure_ad_web_app_client_id" {
  value       = var.isInAutomation ? var.aadWebClientId : azuread_application.aad_web_app[0].client_id
  description = "Client ID of the Azure AD Web App"
}

output "azure_ad_web_app_client_secret" {
  value       = var.isInAutomation ? "" : azuread_application_password.aad_web_app_secret[0].value
  description = "Client Secret of the Azure AD Web App"
  sensitive   = true
}

output "azure_ad_mgmt_app_client_id" {
  value       = var.isInAutomation ? var.aadMgmtClientId : azuread_application.aad_mgmt_app[0].client_id
  description = "Client ID of the Azure AD Management App"
}

output "azure_ad_mgmt_sp_id" {
  value       = var.isInAutomation ? var.aadMgmtServicePrincipalId : azuread_service_principal.aad_mgmt_sp[0].id
  description = "Service Principal ID of the Azure AD Management App"
}
