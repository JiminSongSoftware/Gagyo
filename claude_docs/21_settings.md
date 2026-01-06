# Settings Feature Specification

## WHAT

A comprehensive Settings screen allowing users to manage their profile, app preferences, notifications, and account. The Settings feature includes:

- **Profile Management**: Edit display name, upload and manage profile photo with character effects
- **Locale Switching**: Change app language between English and Korean with immediate UI refresh
- **Notification Preferences**: Toggle notifications for messages, prayers, journals, and system updates
- **Account Management**: Secure logout and account deletion with cascading data removal

## WHY

### User Needs
- Users need to personalize their identity through display names and profile photos
- Multilingual users require language switching without app restart
- Users want control over which notifications they receive
- Users must have a way to permanently delete their account and all associated data per data privacy regulations (GDPR, CCPA)

### Business Requirements
- Profile personalization increases user engagement and community connection
- Locale switching is essential for Korean-English bilingual church communities
- Granular notification controls reduce notification fatigue and churn
- Account deletion is legally required for data privacy compliance

## HOW

### Figma Reference
- **Settings Screen Design**: https://www.figma.com/design/6gW1h8DfD1WYH29AmJqaeW/Gagyo?node-id=221-30543
- Design specifies layout, spacing, typography, and component hierarchy
- Photo effects feature: character overlay at 0%, 30%, 60%, 100% intensity

### User Flows

#### Profile Editing Flow
1. User navigates to Settings screen
2. Taps profile photo to open image picker
3. Selects photo from library or takes new photo
4. Photo uploads with preview
5. User adjusts effect intensity slider (0-100%)
6. Taps "Save" to apply changes
7. Display name can be edited via inline input
8. Email is displayed as read-only for verification

#### Locale Switching Flow
1. User opens Settings screen
2. Scrolls to Appearance section
3. Taps language selector dropdown
4. Selects English or 한국어
5. UI immediately refreshes with selected language
6. Preference persists to database for future sessions

#### Notification Preferences Flow
1. User opens Settings screen
2. Scrolls to Notifications section
3. Toggles individual notification types (messages, prayers, journals, system)
4. Changes auto-save to database
5. Push notification registration updates accordingly

#### Account Deletion Flow
1. User scrolls to Danger Zone section
2. Taps "Delete Account" button
3. AlertDialog appears with warning message
4. User confirms deletion
5. Edge Function cascades deletion across all tables
6. Auth session is cleared
7. User is redirected to login screen

### Data Model

#### users Table Extension
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{
  "messages": true,
  "prayers": true,
  "journals": true,
  "system": true
}'::jsonb;
```

#### Storage Bucket
- **Bucket Name**: `profile-photos`
- **File Size Limit**: 5 MB per file
- **Allowed MIME Types**: image/jpeg, image/png, image/webp
- **RLS Policies**: Users can upload/delete own photos; public read access

#### Edge Function
- **Name**: `delete-user-account`
- **Purpose**: Cascade delete user data across all tenant-scoped tables
- **Tables to Cascade**: memberships, messages, prayer_cards, pastoral_journals, device_tokens, notifications

### Security

#### RLS Policies
- Users can only update their own profile (`user_id() = id`)
- Account deletion requires valid JWT authentication
- Profile photo uploads are bucket-restricted and size-limited

#### Account Deletion Security
- Confirmation dialog prevents accidental deletion
- Edge Function verifies authentication before processing
- Cascade order ensures referential integrity
- Storage cleanup happens after database deletion

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Settings Screen                         │
├─────────────────────────────────────────────────────────────┤
│  ProfileSection        │  LocaleSelector                    │
│  - displayName         │  - Dropdown (en/ko)                │
│  - photo with effects  │  - Immediate UI refresh            │
│  - email (readonly)    │                                    │
├─────────────────────────────────────────────────────────────┤
│  NotificationPreferences  │  AccountDeletionButton          │
│  - messages toggle      │  - AlertDialog confirmation      │
│  - prayers toggle       │  - Edge Function call            │
│  - journals toggle      │  - Redirect to login             │
│  - system toggle        │                                   │
└─────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────────┐
│ useUpdate    │    │ useLocale    │    │ useDeleteAccount │
│ Profile      │    │ (existing)   │    │                  │
└──────────────┘    └──────────────┘    └──────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌──────────────────────────────────────────────────────────┐
│                      Supabase Backend                     │
├──────────────────────────────────────────────────────────┤
│  users table (profile, locale, notification_preferences)  │
│  profile-photos storage bucket                            │
│  delete-user-account Edge Function                        │
└──────────────────────────────────────────────────────────┘
```

## Test Implications

### E2E Tests (Detox)
- Navigate to Settings from Home
- Edit display name and verify save
- Upload profile photo with mocked picker
- Apply photo effects at each intensity level
- Switch locale and verify UI language change
- Toggle each notification preference
- Logout and verify redirect
- Delete account with confirmation and verify removal

### Integration Tests
- Profile update RLS enforcement
- Notification preferences persistence
- Account deletion cascade verification
- Storage bucket access control

### Unit Tests
- `useUpdateProfile` hook mutations
- `useUploadProfilePhoto` upload progress
- `useDeleteAccount` deletion flow
- Component rendering with different states
- i18n key coverage for all strings

## Dependencies

### External Libraries
- `expo-image-picker`: Image selection from gallery/camera
- `expo-image-manipulator`: Photo effects processing

### Existing Code
- `useLocale` hook: Locale switching infrastructure
- `imageUpload.ts`: Base image upload logic to adapt
- `locales/en/settings.json`: English translations
- `locales/ko/settings.json`: Korean translations
- `AlertDialog` component: Confirmation dialogs

## Success Criteria

1. All profile fields (display name, photo, email) are editable/uploadable
2. Photo effects slider works at 0%, 30%, 60%, 100% intensities
3. Locale switching immediately updates all UI strings
4. Notification preferences persist and control push registration
5. Account deletion cascades across all user data
6. All E2E tests pass on iOS and Android
7. RLS policies prevent unauthorized access
8. All user-facing strings use i18n keys
