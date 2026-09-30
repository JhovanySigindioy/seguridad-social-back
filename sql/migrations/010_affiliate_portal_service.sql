CREATE TABLE IF NOT EXISTS agency_portal_services (
  id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  agency_id BIGINT(20) UNSIGNED NOT NULL,
  status ENUM('pending', 'active', 'suspended') NOT NULL DEFAULT 'pending',
  monthly_price DECIMAL(12,2) NOT NULL DEFAULT 6000.00,
  accepted_by_user_id BIGINT(20) UNSIGNED NULL,
  accepted_at TIMESTAMP(6) NULL,
  terms_version VARCHAR(40) NOT NULL DEFAULT 'portal-v1',
  created_at TIMESTAMP(6) NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at TIMESTAMP(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uk_agency_portal_services_agency (agency_id),
  KEY idx_agency_portal_services_status (status),
  CONSTRAINT fk_agency_portal_services_agency FOREIGN KEY (agency_id) REFERENCES agencies (id),
  CONSTRAINT fk_agency_portal_services_user FOREIGN KEY (accepted_by_user_id) REFERENCES users (id)
);
