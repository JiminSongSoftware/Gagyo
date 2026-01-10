/**
 * Role-based access control guards for pastoral journals.
 *
 * Provides functions to check if a user has permission to perform
 * specific actions on pastoral journals based on their role and
 * the journal's status.
 */

import type { Role, PastoralJournal } from '@/types/database';

/**
 * Pastoral journal status enum.
 */
export type PastoralJournalStatus = PastoralJournal['status'];

/**
 * Permission check result with optional reason.
 */
export interface PermissionResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Role hierarchy for authorization checks.
 * Higher index = higher authority.
 */
const ROLE_HIERARCHY: Record<Role, number> = {
  member: 0,
  small_group_leader: 1,
  zone_leader: 2,
  pastor: 3,
  admin: 4,
};

/**
 * Check if one role has authority over another.
 */
export function roleHasAuthority(requesterRole: Role, targetRole: Role): boolean {
  return ROLE_HIERARCHY[requesterRole] >= ROLE_HIERARCHY[targetRole];
}

/**
 * Get the minimum role required for a given permission on pastoral journals.
 */
function getRequiredRole(
  permission: 'create' | 'edit' | 'delete' | 'submit' | 'review' | 'confirm' | 'view'
): Role {
  switch (permission) {
    case 'create':
    case 'edit':
    case 'delete':
    case 'submit':
      return 'small_group_leader';
    case 'review':
      return 'zone_leader';
    case 'confirm':
      return 'pastor';
    case 'view':
      return 'member';
    default:
      return 'admin';
  }
}

/**
 * Check if a user can create a pastoral journal.
 *
 * Rules:
 * - small_group_leader and above can create journals
 */
export function canCreateJournal(userRole: Role): PermissionResult {
  const requiredRole = getRequiredRole('create');
  const allowed = roleHasAuthority(userRole, requiredRole);

  return {
    allowed,
    reason: allowed
      ? undefined
      : `Role '${userRole}' cannot create journals. Minimum role: '${requiredRole}'.`,
  };
}

/**
 * Check if a user can edit a pastoral journal.
 *
 * Rules:
 * - Author (small_group_leader) can edit draft journals
 * - zone_leader and above can edit submitted journals
 * - pastor and above can edit any journal
 */
export function canEditJournal(
  userRole: Role,
  journal: PastoralJournal,
  isAuthor: boolean
): PermissionResult {
  // Draft journals can be edited by author
  if (journal.status === 'draft' && isAuthor) {
    return { allowed: true };
  }

  // Zone leaders and above can edit submitted/reviewed journals
  if (journal.status === 'submitted' && roleHasAuthority(userRole, 'zone_leader')) {
    return { allowed: true };
  }

  if (journal.status === 'zone_reviewed' && roleHasAuthority(userRole, 'pastor')) {
    return { allowed: true };
  }

  // Admin can edit any
  if (userRole === 'admin') {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: `Role '${userRole}' cannot edit ${journal.status} journal.`,
  };
}

/**
 * Check if a user can delete a pastoral journal.
 *
 * Rules:
 * - Author can delete draft journals
 * - zone_leader and above can delete any journal
 */
export function canDeleteJournal(
  userRole: Role,
  journal: PastoralJournal,
  isAuthor: boolean
): PermissionResult {
  // Draft journals can be deleted by author
  if (journal.status === 'draft' && isAuthor) {
    return { allowed: true };
  }

  // Zone leaders and above can delete any
  if (roleHasAuthority(userRole, 'zone_leader')) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: `Role '${userRole}' cannot delete ${journal.status} journal.`,
  };
}

/**
 * Check if a user can submit a pastoral journal for review.
 *
 * Rules:
 * - small_group_leader (author) can submit draft journals
 */
export function canSubmitJournal(
  userRole: Role,
  journal: PastoralJournal,
  isAuthor: boolean
): PermissionResult {
  if (journal.status !== 'draft') {
    return {
      allowed: false,
      reason: `Only draft journals can be submitted. Current status: ${journal.status}`,
    };
  }

  if (!isAuthor) {
    return {
      allowed: false,
      reason: 'Only the author can submit their journal',
    };
  }

  const allowed = roleHasAuthority(userRole, 'small_group_leader');

  return {
    allowed,
    reason: allowed
      ? undefined
      : `Role '${userRole}' cannot submit journals. Minimum role: 'small_group_leader'.`,
  };
}

/**
 * Check if a user can review (add comments to) a pastoral journal.
 *
 * Rules:
 * - submitted: zone_leader can review
 * - zone_reviewed: pastor can review
 * - pastor_confirmed: read-only
 * - draft: only author can edit (not review)
 */
export function canReviewJournal(
  userRole: Role,
  journal: PastoralJournal,
  isAuthor: boolean
): PermissionResult {
  // Author can always view their own drafts, but "review" means adding feedback
  if (isAuthor && journal.status === 'draft') {
    return { allowed: true };
  }

  switch (journal.status) {
    case 'submitted':
      return {
        allowed: roleHasAuthority(userRole, 'zone_leader'),
        reason: roleHasAuthority(userRole, 'zone_leader')
          ? undefined
          : `Role '${userRole}' cannot review submitted journals. Minimum role: 'zone_leader'.`,
      };

    case 'zone_reviewed':
      return {
        allowed: roleHasAuthority(userRole, 'pastor'),
        reason: roleHasAuthority(userRole, 'pastor')
          ? undefined
          : `Role '${userRole}' cannot review zone-reviewed journals. Minimum role: 'pastor'.`,
      };

    case 'pastor_confirmed':
      return {
        allowed: false,
        reason: 'Confirmed journals cannot be reviewed further',
      };

    default:
      return { allowed: false, reason: 'Unknown journal status' };
  }
}

/**
 * Check if a user can confirm a pastoral journal.
 *
 * Rules:
 * - pastor and admin can confirm zone_reviewed journals
 */
export function canConfirmJournal(
  userRole: Role,
  journal: PastoralJournal
): PermissionResult {
  if (journal.status !== 'zone_reviewed') {
    return {
      allowed: false,
      reason: `Only zone-reviewed journals can be confirmed. Current status: ${journal.status}`,
    };
  }

  const allowed = roleHasAuthority(userRole, 'pastor');

  return {
    allowed,
    reason: allowed
      ? undefined
      : `Role '${userRole}' cannot confirm journals. Minimum role: 'pastor'.`,
  };
}

/**
 * Check if a user can view a pastoral journal.
 *
 * Rules:
 * - member and above can view journals from their small group
 * - zone_leader can view journals from their zone
 * - pastor and admin can view all journals
 *
 * Note: This is a basic check. In practice, you need to verify
 * the user belongs to the same small_group or zone as the journal.
 */
export function canViewJournal(
  userRole: Role,
  journal: PastoralJournal,
  isInSameSmallGroup: boolean,
  isInSameZone: boolean
): PermissionResult {
  // Admin and pastor can view all
  if (roleHasAuthority(userRole, 'pastor')) {
    return { allowed: true };
  }

  // Zone leader can view journals in their zone
  if (userRole === 'zone_leader' && isInSameZone) {
    return { allowed: true };
  }

  // Small group leader can view their own small group's journals
  if (userRole === 'small_group_leader' && isInSameSmallGroup) {
    return { allowed: true };
  }

  // Regular members can view their small group's journals
  if (userRole === 'member' && isInSameSmallGroup) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: `Role '${userRole}' cannot view this journal`,
  };
}

/**
 * Check if a journal can be converted to a prayer card.
 *
 * Rules:
 * - Only journals with status 'pastor_confirmed' can be converted
 * - Only the author (small_group_leader) or admin can initiate conversion
 */
export function canConvertToPrayerCard(
  userRole: Role,
  journal: PastoralJournal,
  isAuthor: boolean
): PermissionResult {
  if (journal.status !== 'pastor_confirmed') {
    return {
      allowed: false,
      reason: `Only confirmed journals can be converted. Current status: ${journal.status}`,
    };
  }

  // Only author or admin can convert
  if (!isAuthor && userRole !== 'admin') {
    return {
      allowed: false,
      reason: 'Only the author or admin can convert journal to prayer card',
    };
  }

  return { allowed: true };
}

/**
 * Get the next status for a journal based on current status and action.
 */
export function getNextStatus(
  currentStatus: PastoralJournalStatus,
  action: 'submit' | 'review' | 'confirm'
): PastoralJournalStatus | null {
  switch (action) {
    case 'submit':
      return currentStatus === 'draft' ? 'submitted' : null;
    case 'review':
      return currentStatus === 'submitted' ? 'zone_reviewed' : null;
    case 'confirm':
      return currentStatus === 'zone_reviewed' ? 'pastor_confirmed' : null;
    default:
      return null;
  }
}

/**
 * Check if a status transition is valid.
 */
export function isValidStatusTransition(
  from: PastoralJournalStatus,
  to: PastoralJournalStatus
): boolean {
  const validTransitions: Record<PastoralJournalStatus, PastoralJournalStatus[]> = {
    draft: ['submitted', 'draft'],
    submitted: ['zone_reviewed', 'draft'],
    zone_reviewed: ['pastor_confirmed', 'submitted'],
    pastor_confirmed: ['pastor_confirmed'],
  };

  return validTransitions[from]?.includes(to) ?? false;
}
