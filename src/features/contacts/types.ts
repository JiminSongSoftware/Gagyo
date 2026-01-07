/**
 * Contact types for the contacts screen.
 */

/**
 * Contact filter categories matching Figma design tabs.
 */
export type ContactFilterType = 'all' | 'small_group' | 'zone' | 'group_team' | 'member' | 'external';

/**
 * Contact category for grouping and display.
 */
export type ContactCategory = 'small_group' | 'zone' | 'group_team' | 'member';

/**
 * Base contact interface.
 */
export interface BaseContact {
  id: string;
  name: string;
  avatarUrl?: string | null;
  category: ContactCategory;
  memberCount?: number;
}

/**
 * Small group contact.
 */
export interface SmallGroupContact extends BaseContact {
  category: 'small_group';
  smallGroupId: string;
  leaderId?: string;
  zoneId?: string | null;
}

/**
 * Zone contact (초원/Prairie).
 */
export interface ZoneContact extends BaseContact {
  category: 'zone';
  zoneId: string;
  zoneLeaderId?: string | null;
}

/**
 * Group/Team contact (e.g., ministry teams, committees).
 */
export interface GroupTeamContact extends BaseContact {
  category: 'group_team';
  type: 'ministry' | 'committee' | 'team';
}

/**
 * Individual member contact.
 */
export interface MemberContact extends BaseContact {
  category: 'member';
  membershipId: string;
  userId: string;
  displayName: string;
  role?: string;
  smallGroupName?: string | null;
}

/**
 * Union type for all contacts.
 */
export type Contact = SmallGroupContact | ZoneContact | GroupTeamContact | MemberContact;

/**
 * Section header data for categorized list.
 */
export interface ContactSection {
  category: ContactCategory;
  title: string;
  data: Contact[];
}

/**
 * Contact list item props.
 */
export interface ContactListItemProps {
  contact: Contact;
  onPress?: (contact: Contact) => void;
  testID?: string;
}
