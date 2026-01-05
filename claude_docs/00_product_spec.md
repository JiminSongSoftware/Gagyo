---
tags: [spec, sdd, product, figma, chat, push, multi-tenant]
---

# 00 Product Spec

## App Store & Play Store Compliance (Non-Negotiable)

This application must comply with iOS App Store and Google Play policies,
including but not limited to user-generated content moderation, privacy,
account deletion, and messaging safety.

The following are mandatory product requirements:
- Content reporting and user blocking
- Community guidelines and moderation
- In-app account deletion
- Privacy policy accessible within the app
- Internet-based messaging only (no SMS/MMS/calls)
- Accurate metadata and demo access for review

## WHAT
This document is the canonical product specification entrypoint for the Church Messenger app. It anchors feature scope, user experience intent, and links to the source-of-truth Figma flows.

## WHY
- Prevents drift between design, tests, and implementation.
- Enables SDD → TDD → DDD workflow.
- Makes multi-tenant and security constraints explicit early.

## HOW
- Keep this file as a navigational spec index + canonical "Figma Flow Block".
- For any new feature: add a short spec summary here and create/extend the relevant module file(s).
- Ensure every feature references tenant scope + test strategy.

## Ontology Alignment

All terms, entities, and workflows described in this specification
must directly reference concepts defined in the Domain Ontology
(claude_docs/01_domain_glossary.md).

If a required concept does not exist, the ontology must be updated first.

---

## Internationalization (i18n) & Localization (l10n)

### Supported Locales
- **Initial**: `en` (English), `ko` (Korean)
- Primary target audience: Korean-speaking churches with English as secondary

### Non-Goals (for now)
- Plural rules beyond basic singular/plural
- RTL (right-to-left) language support
- Complex gender-based translations
- Region-specific locale variants (e.g., en-US vs en-GB)

### UX Rules

#### Locale Switch Behavior
- User can change locale in Settings
- Locale preference stored at user level (not tenant level)
- App reloads/refreshes UI immediately on locale change
- Locale persisted across sessions

#### Fallback Rules
- If Korean (`ko`) translation missing → fall back to English (`en`)
- If English translation missing → show translation key (development) or empty string (production)
- Log missing translations in development mode

#### Formatting Rules
- **Dates**: Use locale-aware formatting (e.g., `2024-01-15` for en, `2024년 1월 15일` for ko)
- **Numbers**: Use locale-aware separators (e.g., `1,000` for en, `1,000` for ko)
- **Currency**: Not in initial scope (no payment features)

### Test Implications
- **Snapshot tests**: Include both `en` and `ko` locale snapshots for critical UI components
- **E2E tests**: Run critical flows in both locales
- **Unit tests**: Test fallback behavior and missing key handling
- **CI requirement**: Build fails if translation keys are missing in any supported locale

---

## Figma Flow Block

Rule clarification:
* link + ( ... ) gives the description of that specific figma link
* -> indicates flow (sequence / progression)

Figma Link for Church Messenger Gagyo https://www.figma.com/design/6gW1h8DfD1WYH29AmJqaeW/Gagyo?node-id=156-1028&t=GmPkViAhbDpRBxCz-0

### Images
https://www.figma.com/design/6gW1h8DfD1WYH29AmJqaeW/Gagyo?node-id=38-982&t=GmPkViAhbDpRBxCz-0


Shows all images exchanged across every chat room in a single, unified view.

### Prayer Card
https://www.figma.com/design/6gW1h8DfD1WYH29AmJqaeW/Gagyo?node-id=124-7327&t=GmPkViAhbDpRBxCz-0

(Prayer Analytics - Provides prayer insights across three levels:
* My Prayer Statistics
* Small Group (Cell Group) Prayer Statistics
* Church-wide Prayer Statistics

For each level, the system visualizes the number of prayer cards and the response rate using charts segmented by weekly, monthly, quarterly, semi-annual, and annual timeframes.)

-> https://www.figma.com/design/6gW1h8DfD1WYH29AmJqaeW/Gagyo?node-id=37-173&t=GmPkViAhbDpRBxCz-0

(How about adding a feature that provides calm, gentle background music for those who prefer it while praying + Each prayer card created by the user includes a "Answered" button. When marks the prayer as answered, a celebratory notification is sent to all recipients, letting them know that the prayer has been answered.)

-> https://www.figma.com/design/6gW1h8DfD1WYH29AmJqaeW/Gagyo?node-id=37-294&t=GmPkViAhbDpRBxCz-0

(Each prayer card written by the user includes a "Prayer Answered" button. When the user marks a prayer as answered, a congratulatory notification is sent to everyone who received that prayer request, informing them that the prayer has been answered. + Used when requesting prayer content that is visible only to the senior pastor or the intercessory prayer team leader.)

-> https://www.figma.com/design/6gW1h8DfD1WYH29AmJqaeW/Gagyo?node-id=354-39531&t=GmPkViAhbDpRBxCz-0

(Prayer statistics support three levels—individual, small group, and church-wide—and could be presented in a bottom-up pop-up style, sliding up from the bottom of the screen for quick and easy viewing.)

### Chat
https://www.figma.com/design/6gW1h8DfD1WYH29AmJqaeW/Gagyo?node-id=2-780&t=GmPkViAhbDpRBxCz-0

-> https://www.figma.com/design/6gW1h8DfD1WYH29AmJqaeW/Gagyo?node-id=2-776&t=GmPkViAhbDpRBxCz-0

-> https://www.figma.com/design/6gW1h8DfD1WYH29AmJqaeW/Gagyo?node-id=202-1163&t=GmPkViAhbDpRBxCz-0

(Event Chat - A feature that allows messages to be sent in a group chat while excluding one or two specific members from seeing them. For example, it can be used to secretly plan a birthday event without the birthday person knowing. Previously, this required creating a separate chat room that excluded that person. With Event Chat, messages are sent within the original group chat, but selected members are simply prevented from viewing those messages. + Clicking here opens a thread view. The thread view functions like a regular chat window; however, it does not allow creating additional threads within the thread. + The background color of the chat screen varies slightly by room type (such as small group or ministry group), using a limited set of colors to enhance visual clarity and intuitiveness.)

### Home
https://www.figma.com/design/6gW1h8DfD1WYH29AmJqaeW/Gagyo?node-id=38-643&t=GmPkViAhbDpRBxCz-0

-> https://www.figma.com/design/6gW1h8DfD1WYH29AmJqaeW/Gagyo?node-id=128-1255&t=GmPkViAhbDpRBxCz-0

### Setting
https://www.figma.com/design/6gW1h8DfD1WYH29AmJqaeW/Gagyo?node-id=221-30543&t=GmPkViAhbDpRBxCz-0

-> https://www.figma.com/design/6gW1h8DfD1WYH29AmJqaeW/Gagyo?node-id=0-1&p=f&t=GmPkViAhbDpRBxCz-0

-> https://www.figma.com/design/6gW1h8DfD1WYH29AmJqaeW/Gagyo?node-id=126-7645&t=GmPkViAhbDpRBxCz-0

-> https://www.figma.com/design/6gW1h8DfD1WYH29AmJqaeW/Gagyo?node-id=134-981&t=GmPkViAhbDpRBxCz-0

(Users can either take a photo directly or upload one from their photo library. One feature worth adding is photo effects that transform images into a character-style look, with selectable intensity levels: 0% (original), 30%, 60%, and 100% (full character effect). This would likely encourage more users to share their photos. + Display the user's email address during the sign-up process.)

### Pastoral Journal
https://www.figma.com/design/6gW1h8DfD1WYH29AmJqaeW/Gagyo?node-id=156-1028&t=GmPkViAhbDpRBxCz-0

-> https://www.figma.com/design/6gW1h8DfD1WYH29AmJqaeW/Gagyo?node-id=172-1129&t=GmPkViAhbDpRBxCz-0

(Prayer requests written here are automatically converted into small group prayer cards.)

-> https://www.figma.com/design/6gW1h8DfD1WYH29AmJqaeW/Gagyo?node-id=211-3501&t=GmPkViAhbDpRBxCz-0

-> https://www.figma.com/design/6gW1h8DfD1WYH29AmJqaeW/Gagyo?node-id=276-1232&t=GmPkViAhbDpRBxCz-0

(Only the small group leader and co-leader can write and view pastoral journals for their own small group.)

-> https://www.figma.com/design/6gW1h8DfD1WYH29AmJqaeW/Gagyo?node-id=276-1553&t=GmPkViAhbDpRBxCz-0

(When the zone leader clicks on the pastoral journal, all pastoral journals from the small groups within their zone are displayed. When a small group leader or co-leader records and saves a pastoral journal entry, it is delivered to the zone leader like a message, along with a notification.)

-> https://www.figma.com/design/6gW1h8DfD1WYH29AmJqaeW/Gagyo?node-id=276-1778&t=GmPkViAhbDpRBxCz-0

(Once the zone leader has reviewed the pastoral journals, they are forwarded to the pastor. After the pastor reviews them, a confirmation message is sent back to the small group leader and co-leader.)

-> https://www.figma.com/design/6gW1h8DfD1WYH29AmJqaeW/Gagyo?node-id=276-2011&t=GmPkViAhbDpRBxCz-0

(When a small group leader or co-leader records a pastoral journal entry, a message is sent to the zone leader and a comment section becomes available for the zone leader. After the entry is completed and Submit is selected, the journal is sent to the pastor. At this stage, no notification is sent back to the small group leader and co-leader. As an additional feature, AI-assisted commenting could be included so that when the zone leader enters a brief note, the system suggests two or three recommended comments to choose from.)

-> https://www.figma.com/design/6gW1h8DfD1WYH29AmJqaeW/Gagyo?node-id=277-2194&t=GmPkViAhbDpRBxCz-0

(When the zone leader submits a pastoral journal, a message is sent to the pastor and a comment section is opened for the pastor. After the pastor leaves a comment and clicks Confirm, a message is sent to the small group leader and co-leader.)
