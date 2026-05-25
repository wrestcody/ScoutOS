variable "region" { type = string }
variable "cluster_name" { type = string default = "janus-forge-ecs" }
variable "image" { type = string }
variable "private_subnet_ids" { type = list(string) }
variable "security_group_id" { type = string }
variable "sumo_base_url" { type = string default = "https://api.us2.sumologic.com" }
variable "sumo_access_id_param" { type = string }
variable "sumo_access_key_param" { type = string }

