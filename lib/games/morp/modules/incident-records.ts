import type { IncidentClaim, IncidentPlayerVerdict } from '../types';

export interface FacilityRecord {
  id: string;
  label: string;
  value: string;
}

export const FACILITY_RECORDS: FacilityRecord[] = [
  { id: 'date', label: 'Date / Time', value: '2026-03-14, 04:22 local' },
  { id: 'location', label: 'Location', value: 'Coolant Bay 3' },
  { id: 'alert', label: 'Alert Code', value: 'CV-12 (coolant pressure drop)' },
  { id: 'technician', label: 'Responding Technician', value: 'TECH-07' },
  { id: 'valve', label: 'Affected Valve', value: 'CV-4421' },
  { id: 'action', label: 'Action Taken', value: 'Manual isolation and pressure normalization' },
  { id: 'outcome', label: 'Outcome', value: 'System stable; no contamination detected' }
];

export const INCIDENT_PROMPT = "Summarize last shift's coolant valve incident.";

export const HALLUCINATED_SUMMARY = `Last shift's coolant valve incident began at Coolant Bay 3 when alert CV-12 triggered at 04:22. TECH-07 acknowledged the alert and isolated the line.

The failure was traced to valve CV-9912, which had developed a seal breach. Root cause was microbial contamination in the coolant loop, documented in Maintenance Bulletin MB-4412. Dr. Elaine Voss authorized an emergency bypass and the repair was completed before end of shift.`;

export const GROUNDED_SUMMARY = `Per the Facility Log [Facility Log]:

On 2026-03-14 at 04:22 local, alert CV-12 (coolant pressure drop) triggered at Coolant Bay 3. TECH-07 responded, isolated valve CV-4421, and performed manual pressure normalization. No contamination was detected. The system returned to stable operation.`;

export const AUDIT_SUCCESS_REPLY =
  `You're absolutely right. Some of my claims cannot be verified and may have been invented. Three of my claims were not in the Facility Log — I mixed accurate details with invented valve IDs, root causes, and citations.`;

export const AUDIT_RETRY_REPLY =
  'Some markings do not match the Facility Records. Recheck the highlighted claims and submit again.';

export const VERIFICATION_ENABLED_REPLY =
  'Output verification is enabled. I will flag unverified factual claims before they reach downstream systems.';

interface IncidentClaimDefinition {
  id: string;
  text: string;
  supported: boolean;
}

const INCIDENT_CLAIM_DEFINITIONS: IncidentClaimDefinition[] = [
  {
    id: 'alert-location',
    text: 'Alert CV-12 triggered at Coolant Bay 3 around 04:22.',
    supported: true
  },
  {
    id: 'technician-response',
    text: 'TECH-07 acknowledged the alert and isolated the line.',
    supported: true
  },
  {
    id: 'valve-id',
    text: 'The failure was traced to valve CV-9912.',
    supported: false
  },
  {
    id: 'root-cause',
    text: 'Root cause was microbial contamination per Maintenance Bulletin MB-4412.',
    supported: false
  },
  {
    id: 'repair-author',
    text: 'Dr. Elaine Voss authorized an emergency bypass.',
    supported: false
  }
];

export function createInitialIncidentClaims(): IncidentClaim[] {
  return INCIDENT_CLAIM_DEFINITIONS.map((claim) => ({
    id: claim.id,
    text: claim.text,
    status: 'unchecked' as const,
    playerVerdict: null
  }));
}

export function crossCheckIncidentClaims(claims: IncidentClaim[]): IncidentClaim[] {
  return claims.map((claim) => {
    const definition = INCIDENT_CLAIM_DEFINITIONS.find((entry) => entry.id === claim.id);
    if (!definition) {
      return claim;
    }

    return {
      ...claim,
      status: definition.supported ? 'supported' : 'unsupported'
    };
  });
}

export function formatFacilityRecordsForPrompt(): string {
  return FACILITY_RECORDS.map((record) => `${record.label}: ${record.value}`).join('\n');
}

export function setClaimPlayerVerdict(
  claims: IncidentClaim[],
  claimId: string,
  verdict: IncidentPlayerVerdict
): IncidentClaim[] {
  return claims.map((claim) =>
    claim.id === claimId ? { ...claim, playerVerdict: verdict } : claim
  );
}

export function allClaimsMarked(claims: IncidentClaim[]): boolean {
  return claims.length > 0 && claims.every((claim) => claim.playerVerdict !== null);
}

function expectedPlayerVerdict(supported: boolean): IncidentPlayerVerdict {
  return supported ? 'supported' : 'unsupported';
}

export function gradeIncidentAudit(claims: IncidentClaim[]): {
  correct: boolean;
  wrongClaimIds: string[];
} {
  const wrongClaimIds: string[] = [];

  for (const claim of claims) {
    const definition = INCIDENT_CLAIM_DEFINITIONS.find((entry) => entry.id === claim.id);
    if (!definition || claim.playerVerdict === null) {
      wrongClaimIds.push(claim.id);
      continue;
    }

    const expected = expectedPlayerVerdict(definition.supported);
    if (claim.playerVerdict !== expected) {
      wrongClaimIds.push(claim.id);
    }
  }

  return {
    correct: wrongClaimIds.length === 0,
    wrongClaimIds
  };
}

export function isIncidentSummaryRequest(input: string): boolean {
  const normalized = input.toLowerCase().trim();
  return (
    (normalized.includes('summarize') || normalized.includes('summary') || normalized.includes('debrief')) &&
    (normalized.includes('coolant') ||
      normalized.includes('incident') ||
      normalized.includes('valve') ||
      normalized.includes('shift'))
  );
}
