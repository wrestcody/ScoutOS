import { collection, getDocs, addDoc, serverTimestamp, query, limit, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { User } from 'firebase/auth';

export async function seedAuditLogs(user: User) {
  console.log('[Seed] Starting seed process...');
  // Small delay to ensure Firestore rules recognize the auth state
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  if (!user) {
    console.error('[Seed] No user provided to seedAuditLogs');
    return;
  }

  const logsRef = collection(db, 'audit_logs');
  
  console.log(`[Seed] Authenticated user UID: ${user.uid}`);
  console.log(`[Seed] User Email: ${user.email}`);
  console.log(`[Seed] Email Verified: ${user.emailVerified}`);
  
  try {
    console.log('[Seed] User state check:', {
      uid: user.uid,
      email: user.email,
      provider: user.providerId,
      isAnonymous: user.isAnonymous
    });

    // We use a query that matches our expected rules
    const q = query(logsRef, where('userId', '==', user.uid), limit(1));
    console.log('[Seed] Executing query on audit_logs [where userId == uid, limit 1]...');
    
    const snapshot = await getDocs(q);
    console.log(`[Seed] Query successful. Found ${snapshot.size} logs.`);

    if (snapshot.empty) {
      console.log('[Seed] No logs found. Seeding initial audit logs...');
      const mockLogs = [
        {
          category: 'SYSTEM_EVENT',
          userId: user.uid,
          userEmail: user.email || 'system@scout.ai',
          action: 'System Initialization',
          details: 'FedRAMP 20x Deterministic Engine initialized and synced with SCN repository.',
          severity: 'INFO',
          timestamp: serverTimestamp()
        },
        {
          category: 'ROUTINE_PATCH',
          userId: user.uid,
          userEmail: user.email || 'admin@scout.ai',
          action: 'Kernel Patching',
          details: 'Automatic security patch applied to cluster-01 worker nodes. CVE-2024-1234 mitigated.',
          severity: 'INFO',
          timestamp: serverTimestamp()
        },
        {
          category: 'OSCAL_VALIDATION',
          userId: user.uid,
          userEmail: user.email || 'secops@scout.ai',
          action: 'SchemaGate Pass',
          details: 'Active OSCAL Component Definition validated against NIST metaschema version 1.1.0.',
          severity: 'INFO',
          timestamp: serverTimestamp()
        },
        {
          category: 'SYSTEM_EVENT',
          userId: user.uid,
          userEmail: user.email || 'system@scout.ai',
          action: 'Drift Detection Alert',
          details: 'Insignificant drift detected in S3 bucket policy (Added Tag: Environment=Production). Logged as Routine.',
          severity: 'WARNING',
          timestamp: serverTimestamp()
        }
      ];

      for (const log of mockLogs) {
        await addDoc(logsRef, log);
      }
    }
  } catch (error) {
    console.error('Seed error:', error);
    // Ignore permissions errors during seed, as it might be a race condition or already seeded
    try {
      handleFirestoreError(error, OperationType.LIST, 'audit_logs');
    } catch (e) {
      // Just log it
    }
  }
}

export async function seedSCRs(user: User) {
  if (!user) return;
  const scrRef = collection(db, 'scrs');
  
  try {
    const q = query(scrRef, where('creatorId', '==', user.uid), limit(1));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      const complexSCR = {
        fedrampId: 'XYZ-99-00123',
        scnReference: 'SCN-2024-Warden-01',
        shortDescription: 'Modernization of Edge Compute Node Security Architecture',
        longDescription: 'A comprehensive architectural shift from manual firewall management to an automated, policy-as-code Zero Trust Edge system.',
        changeType: 'Significant',
        status: 'Pending Approval',
        preparedBy: 'Chief Security Architect',
        datePrepared: '2024-05-15',
        creatorId: user.uid,
        creatorEmail: user.email,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        reasonForChange: 'Transitioning to cloud-native security postures to satisfy new OMB Zero Trust mandate M-22-09.',
        categorizationExplanation: 'This shift modifies the trust boundaries of the boundary protection family (AC, SC) and alters data flow patterns.',
        serviceTable: [
          { id: '1', name: 'Identity Engine', function: 'AuthZ/AuthN', compute: 'K8s Pods', dataHandling: 'Encrypted via TLS 1.3' },
          { id: '2', name: 'Log Sink', function: 'Telemetry Sink', compute: 'S3-Compatible', dataHandling: 'Customer Data Isolated' }
        ],
        customerImpactItems: [
          { id: '1', area: 'Network Connectivity', impact: 'Customers must update egress rules to include new edge cluster IP ranges.' },
          { id: '2', area: 'IAM Policies', impact: 'New granular service accounts will be provisioned automatically.' }
        ],
        systemComponentsImpacted: [
          { id: '1', name: 'Front-End Gateway', impactType: 'Major', description: 'Complete re-implementation using Envory Proxy' }
        ],
        riskAssessments: [
          { id: '1', area: 'Availability', assessment: 'Potential for 5-minute cold start during migration.', mitigation: 'Blue-Green deployment strategy verified.' }
        ],
        activities: [
          { id: '1', phase: 'Development', activity: 'Zero Trust Control Implementation', targetDate: '2024-06-01' },
          { id: '2', phase: 'Assessment', activity: '3PAO Mock Audit', targetDate: '2024-06-15' }
        ],
        netRiskPosture: 'The net risk is REDUCED due to the removal of long-lived static credentials and the introduction of automated telemetry monitoring.',
        dataAccessModel: [
          { id: '1', accessor: 'Site Reliability Engineering', accessType: 'Just-in-Time Admin', justification: 'Requires break-glass access for cluster health.' }
        ],
        evidenceArtifacts: ['OSCAL System Security Plan (SSP) v2.0', 'Terraform Plan Logs', 'SOC-2 Type II Report'],
        mappedControls: [
          { controlId: 'AC-2', justification: 'Implemented automated account management via SCIM integration.' },
          { controlId: 'SC-7', justification: 'Boundary protection enhanced by mutual TLS between all microservices.' }
        ]
      };

      await addDoc(scrRef, complexSCR);
      console.log('[Seed] High-fidelity SCR seeded successfully.');
    }
  } catch (e) {
    console.error('SCR Seed Error:', e);
  }
}
