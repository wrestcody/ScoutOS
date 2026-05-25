export type SCRStatus = 'Draft' | 'Pending Assessment' | 'Pending Approval' | 'Approved' | 'Rejected';
export type ChangeType = 'Adaptive' | 'Transformative' | 'Routine';

export interface ValidationHook {
  id: string;
  name: string;
  type: 'AWS_Lambda' | 'API_Endpoint' | 'Custom_Script';
  targetKsi: string;
  status: 'PENDING' | 'PASS' | 'FAIL';
  lastRunHash?: string;
  lastRunTimestamp?: any;
}

export interface TelemetrySource {
  id: string;
  type: 'Log' | 'Metric' | 'Config' | 'IaC';
  sourceUrl: string;
  lastSync: any;
}

export interface HLAMetadata {
  nodes: { id: string; name: string; type: string; criticality: string }[];
  flows: { from: string; to: string; encrypted: boolean }[];
  boundaryPoints: string[];
  telemetryAnchors: string[];
}

export interface MappedControl {
  controlId: string;
  justification: string;
  telemetrySourceId?: string;
  status?: 'Compliant' | 'Non-Compliant' | 'Scanning';
}

export interface ScnServiceItem {
  id: string;
  name: string;
  function: string;
  compute: string;
  dataHandling: string;
}

export interface ImpactItem {
  id: string;
  area: string;
  impact: string;
}

export interface ComponentImpactItem {
  id: string;
  name: string;
  impactType: 'New' | 'Existing';
  description: string;
}

export interface SecurityControlImpactItem {
  id: string;
  controlId: string;
  rationale: string;
}

export interface RiskItem {
  id: string;
  area: string;
  assessment: string;
  mitigation: string;
}

export interface ReviewItem {
  id: string;
  reviewId: string;
  scope: string;
  status: 'Approved' | 'Pending' | 'In Progress' | 'Rejected';
}

export interface AccessItem {
  id: string;
  accessor: string;
  accessType: string;
  justification: string;
}

export interface ActivityItem {
  id: string;
  phase: string;
  activity: string;
  targetDate: string;
}

export interface SecretItem {
  id: string;
  keyName: string;
  provider: 'AWS_Secrets_Manager' | 'HashiCorp_Vault' | 'Azure_Key_Vault' | 'Internal';
  providerRef: string;
  status: 'UNCHECKED' | 'VERIFIED' | 'EXPIRED' | 'ROTATED';
  lastChecked?: any;
}

export interface SCR {
  id?: string;
  fedrampId: string;
  scnReference?: string;
  datePrepared?: string;
  preparedBy?: string;
  jiraLinks?: string; // Markdown formatted links
  jiraTicketId?: string;
  jiraStatus?: string;
  
  // Section 1: Description
  shortDescription: string;
  serviceTable: ScnServiceItem[];
  architecturalFacts: string[];

  // Section 2: Reason
  reasonForChange: string;
  valuePoints: string[];

  // Section 3: Classification
  changeType: ChangeType;
  categorizationExplanation: string;

  // Section 4: Customer Impact
  customerImpactItems: ImpactItem[];

  // Section 5: System Components
  systemComponentsImpacted: ComponentImpactItem[];

  // Section 6: Security Controls
  securityControlImpacts: SecurityControlImpactItem[];

  // Section 7: Security Impact Analysis
  riskAssessments: RiskItem[];
  netRiskPosture: string;
  internalSecurityReviews: ReviewItem[];
  dataAccessModel: AccessItem[];

  // Section 8: Plan and Timeline
  activities: ActivityItem[];
  hardDeadline?: string;
  assessmentApproach?: string;

  // Section 9: Validation Plan
  validationMethodologies: string[];
  evidenceArtifacts: string[];

  // Existing/Auxiliary fields
  poamId: string;
  assessorName: string;
  assessorEmail?: string;
  assessorPhone?: string;
  assessorOnContract?: boolean;
  sapAttached?: boolean;

  hlaDescription?: string;
  hlaData?: HLAMetadata;
  mappedControls?: MappedControl[];
  validationHooks?: ValidationHook[];
  telemetrySources?: TelemetrySource[];
  secretsInventory?: SecretItem[];
  isDeterministic: boolean;
  driftDetectionEnabled: boolean;
  validationResult?: { valid: boolean; report: string };
  cspApproverName: string;
  cspApproverTitle: string;
  status: SCRStatus;
  creatorId: string;
  creatorEmail: string;
  createdAt: any;
  updatedAt: any;
}

export interface AuditLog {
  id?: string;
  scrId?: string; // Optional
  category: 'SCR_EDIT' | 'ROUTINE_PATCH' | 'SYSTEM_EVENT' | 'OSCAL_VALIDATION';
  userId: string;
  userEmail: string;
  action: string;
  details: string;
  severity?: 'INFO' | 'WARNING' | 'CRITICAL';
  timestamp: any;
}
