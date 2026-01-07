/**
 * Home screen - Contacts view.
 *
 * This is the main home screen displaying contacts (Groups + Members)
 * based on the Figma design.
 *
 * Figma: https://www.figma.com/design/6gW1h8DfD1WYH29AmJqaeW/Gagyo?node-id=128-1255
 */

import { ContactsScreen } from '@/features/contacts';

export default function HomeScreen() {
  return <ContactsScreen testID="home-screen" />;
}
