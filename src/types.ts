export interface ProvisionRequest {
  customer_id: string;
  domain: string;
  company_name: string;
  contact_email: string;
}

export interface ProvisioningStatus {
  status: 'provisioning' | 'provisioned' | 'dns_waiting' | 'dns_timeout' | 'failed';
  eta?: string;
  url?: string;
  deployed_at?: string;
  last_check?: string;
  error_message?: string;
  request_id?: string;
}

export interface ProvisionRecord {
  request_id: string;
  customer_id: string;
  domain: string;
  company_name: string;
  contact_email: string;
  status: 'provisioning' | 'provisioned' | 'dns_waiting' | 'dns_timeout' | 'failed';
  container_id?: string;
  db_name?: string;
  created_at: Date;
  updated_at: Date;
  error_message?: string;
  dns_check_count?: number;
  dns_last_check?: Date;
  url?: string;
  deployed_at?: string;
}
