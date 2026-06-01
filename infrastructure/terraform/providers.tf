terraform {
  required_version = ">= 1.7"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.110"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  # Remote state — provisionné par scripts/bootstrap-state.sh avant le premier apply
  backend "azurerm" {
    resource_group_name  = "rg-optiflow-tfstate"
    storage_account_name = "optiflowterrastate"
    container_name       = "tfstate"
    key                  = "optiflow.terraform.tfstate"
  }
}

provider "azurerm" {
  features {
    key_vault {
      purge_soft_delete_on_destroy    = true
      recover_soft_deleted_key_vaults = true
    }
    resource_group {
      prevent_deletion_if_contains_resources = false
    }
  }
}
