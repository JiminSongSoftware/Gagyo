# Internationalization (i18n) Architecture

This document defines the internationalization strategy for Gagyo, supporting English (en) and Korean (ko) with a scalable foundation for additional languages.

---

## Overview

Gagyo uses **i18next** with **react-i18next** for comprehensive internationalization:

| Library | Purpose |
|---------|---------|
| `i18next` | Core translation engine |
| `react-i18next` | React bindings and hooks |
| `expo-localization` | Device locale detection |

```
┌─────────────────────────────────────────────────────────────────┐
│                         React Components                        │
│                                                                 │
│     const { t } = useTranslation('chat');                      │
│     <Text>{t('message.send')}</Text>                           │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                        react-i18next                            │
│                                                                 │
│     I18nextProvider ──► useTranslation hook                    │
│                         Trans component                         │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                          i18next                                │
│                                                                 │
│     Language detection ──► Resource loading ──► Interpolation  │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Translation Resources                       │
│                                                                 │
│     /locales/en/*.json       /locales/ko/*.json                │
└─────────────────────────────────────────────────────────────────┘
```

---

## Directory Structure

```
src/
├── i18n/
│   ├── index.ts              # i18next configuration
│   ├── types.ts              # TypeScript types for translations
│   └── utils.ts              # Formatting utilities
└── ...

locales/
├── en/
│   ├── common.json           # Shared strings
│   ├── auth.json             # Authentication screens
│   ├── chat.json             # Chat feature
│   ├── prayer.json           # Prayer feature
│   ├── pastoral.json         # Pastoral journals
│   ├── settings.json         # Settings screens
│   └── errors.json           # Error messages
└── ko/
    ├── common.json
    ├── auth.json
    ├── chat.json
    ├── prayer.json
    ├── pastoral.json
    ├── settings.json
    └── errors.json
```

---

## i18next Configuration

```typescript
// src/i18n/index.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import { usePreferencesStore } from '@/stores/preferences';

// Import translation resources
import enCommon from '@/locales/en/common.json';
import enAuth from '@/locales/en/auth.json';
import enChat from '@/locales/en/chat.json';
import enPrayer from '@/locales/en/prayer.json';
import enPastoral from '@/locales/en/pastoral.json';
import enSettings from '@/locales/en/settings.json';
import enErrors from '@/locales/en/errors.json';

import koCommon from '@/locales/ko/common.json';
import koAuth from '@/locales/ko/auth.json';
import koChat from '@/locales/ko/chat.json';
import koPrayer from '@/locales/ko/prayer.json';
import koPastoral from '@/locales/ko/pastoral.json';
import koSettings from '@/locales/ko/settings.json';
import koErrors from '@/locales/ko/errors.json';

export const resources = {
  en: {
    common: enCommon,
    auth: enAuth,
    chat: enChat,
    prayer: enPrayer,
    pastoral: enPastoral,
    settings: enSettings,
    errors: enErrors,
  },
  ko: {
    common: koCommon,
    auth: koAuth,
    chat: koChat,
    prayer: koPrayer,
    pastoral: koPastoral,
    settings: koSettings,
    errors: koErrors,
  },
} as const;

export const supportedLanguages = ['en', 'ko'] as const;
export type SupportedLanguage = typeof supportedLanguages[number];

export const defaultNS = 'common';
export const fallbackLng: SupportedLanguage = 'en';

// Determine initial language
function getInitialLanguage(): SupportedLanguage {
  // 1. Check user preference (from Zustand store)
  const storedLocale = usePreferencesStore.getState().locale;
  if (storedLocale && supportedLanguages.includes(storedLocale as SupportedLanguage)) {
    return storedLocale as SupportedLanguage;
  }

  // 2. Check device locale
  const deviceLocale = Localization.locale.split('-')[0];
  if (supportedLanguages.includes(deviceLocale as SupportedLanguage)) {
    return deviceLocale as SupportedLanguage;
  }

  // 3. Fallback to English
  return fallbackLng;
}

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: getInitialLanguage(),
    fallbackLng,
    defaultNS,
    ns: Object.keys(resources.en),

    interpolation: {
      escapeValue: false, // React Native handles escaping
      format: (value, format, lng) => {
        if (format === 'uppercase') return value.toUpperCase();
        if (format === 'lowercase') return value.toLowerCase();
        return value;
      },
    },

    react: {
      useSuspense: false, // Disable for React Native
    },

    // Debug mode in development
    debug: __DEV__,

    // Missing key handling
    saveMissing: __DEV__,
    missingKeyHandler: (lngs, ns, key, fallbackValue) => {
      if (__DEV__) {
        console.warn(`Missing translation: ${ns}:${key} for ${lngs.join(', ')}`);
      }
    },
  });

// Language change listener
i18n.on('languageChanged', (lng) => {
  // Sync with preferences store
  usePreferencesStore.getState().setLocale(lng as SupportedLanguage);
});

export default i18n;
```

---

## TypeScript Types

```typescript
// src/i18n/types.ts
import { resources, defaultNS } from './index';

// Infer types from English resources (source of truth)
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: typeof defaultNS;
    resources: typeof resources['en'];
  }
}

// Namespace keys
export type TranslationNamespace = keyof typeof resources['en'];

// Helper type for translation keys
export type TranslationKey<NS extends TranslationNamespace = typeof defaultNS> =
  keyof typeof resources['en'][NS];
```

---

## Translation File Structure

### Common Namespace

Shared UI elements used across the app.

```json
// locales/en/common.json
{
  "app": {
    "name": "Gagyo"
  },
  "actions": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit",
    "submit": "Submit",
    "confirm": "Confirm",
    "back": "Back",
    "next": "Next",
    "done": "Done",
    "retry": "Retry",
    "close": "Close",
    "search": "Search",
    "filter": "Filter",
    "refresh": "Refresh",
    "loadMore": "Load more"
  },
  "labels": {
    "loading": "Loading...",
    "empty": "No items found",
    "error": "Something went wrong",
    "required": "Required",
    "optional": "Optional"
  },
  "time": {
    "justNow": "Just now",
    "minutesAgo": "{{count}} minute ago",
    "minutesAgo_plural": "{{count}} minutes ago",
    "hoursAgo": "{{count}} hour ago",
    "hoursAgo_plural": "{{count}} hours ago",
    "daysAgo": "{{count}} day ago",
    "daysAgo_plural": "{{count}} days ago",
    "today": "Today",
    "yesterday": "Yesterday"
  },
  "validation": {
    "required": "This field is required",
    "email": "Please enter a valid email",
    "minLength": "Must be at least {{min}} characters",
    "maxLength": "Must be at most {{max}} characters"
  }
}
```

```json
// locales/ko/common.json
{
  "app": {
    "name": "가교"
  },
  "actions": {
    "save": "저장",
    "cancel": "취소",
    "delete": "삭제",
    "edit": "수정",
    "submit": "제출",
    "confirm": "확인",
    "back": "뒤로",
    "next": "다음",
    "done": "완료",
    "retry": "재시도",
    "close": "닫기",
    "search": "검색",
    "filter": "필터",
    "refresh": "새로고침",
    "loadMore": "더 보기"
  },
  "labels": {
    "loading": "불러오는 중...",
    "empty": "항목이 없습니다",
    "error": "오류가 발생했습니다",
    "required": "필수",
    "optional": "선택"
  },
  "time": {
    "justNow": "방금 전",
    "minutesAgo": "{{count}}분 전",
    "hoursAgo": "{{count}}시간 전",
    "daysAgo": "{{count}}일 전",
    "today": "오늘",
    "yesterday": "어제"
  },
  "validation": {
    "required": "필수 입력 항목입니다",
    "email": "올바른 이메일 주소를 입력해주세요",
    "minLength": "최소 {{min}}자 이상이어야 합니다",
    "maxLength": "최대 {{max}}자까지 입력 가능합니다"
  }
}
```

---

### Auth Namespace

Authentication and onboarding screens.

```json
// locales/en/auth.json
{
  "login": {
    "title": "Welcome to Gagyo",
    "subtitle": "Sign in to continue",
    "email": "Email address",
    "password": "Password",
    "signIn": "Sign In",
    "signUp": "Create Account",
    "forgotPassword": "Forgot password?",
    "or": "or",
    "continueWithGoogle": "Continue with Google",
    "continueWithApple": "Continue with Apple"
  },
  "register": {
    "title": "Create Account",
    "displayName": "Display Name",
    "alreadyHaveAccount": "Already have an account?",
    "termsAgreement": "By creating an account, you agree to our Terms of Service and Privacy Policy"
  },
  "forgotPassword": {
    "title": "Reset Password",
    "subtitle": "Enter your email to receive a reset link",
    "send": "Send Reset Link",
    "backToLogin": "Back to sign in",
    "checkEmail": "Check your email for reset instructions"
  },
  "tenantSelection": {
    "title": "Select Church",
    "subtitle": "Choose a church to continue",
    "noChurches": "You're not a member of any church yet",
    "joinChurch": "Join a Church"
  },
  "errors": {
    "invalidCredentials": "Invalid email or password",
    "emailInUse": "This email is already registered",
    "weakPassword": "Password is too weak",
    "networkError": "Network error. Please check your connection"
  }
}
```

```json
// locales/ko/auth.json
{
  "login": {
    "title": "가교에 오신 것을 환영합니다",
    "subtitle": "로그인하여 시작하세요",
    "email": "이메일 주소",
    "password": "비밀번호",
    "signIn": "로그인",
    "signUp": "회원가입",
    "forgotPassword": "비밀번호를 잊으셨나요?",
    "or": "또는",
    "continueWithGoogle": "Google로 계속하기",
    "continueWithApple": "Apple로 계속하기"
  },
  "register": {
    "title": "회원가입",
    "displayName": "표시 이름",
    "alreadyHaveAccount": "이미 계정이 있으신가요?",
    "termsAgreement": "계정을 생성하면 서비스 약관 및 개인정보 처리방침에 동의하게 됩니다"
  },
  "forgotPassword": {
    "title": "비밀번호 재설정",
    "subtitle": "재설정 링크를 받을 이메일을 입력하세요",
    "send": "재설정 링크 보내기",
    "backToLogin": "로그인으로 돌아가기",
    "checkEmail": "이메일에서 재설정 안내를 확인하세요"
  },
  "tenantSelection": {
    "title": "교회 선택",
    "subtitle": "교회를 선택하여 시작하세요",
    "noChurches": "아직 가입된 교회가 없습니다",
    "joinChurch": "교회 가입하기"
  },
  "errors": {
    "invalidCredentials": "이메일 또는 비밀번호가 올바르지 않습니다",
    "emailInUse": "이미 등록된 이메일입니다",
    "weakPassword": "비밀번호가 너무 약합니다",
    "networkError": "네트워크 오류입니다. 연결을 확인해주세요"
  }
}
```

---

### Chat Namespace

Chat and messaging features.

```json
// locales/en/chat.json
{
  "conversations": {
    "title": "Conversations",
    "empty": "No conversations yet",
    "newConversation": "New Conversation",
    "churchWide": "Church Wide",
    "smallGroup": "Small Group",
    "ministry": "Ministry",
    "direct": "Direct Message"
  },
  "messages": {
    "placeholder": "Type a message...",
    "send": "Send",
    "reply": "Reply",
    "delete": "Delete message",
    "deleted": "This message was deleted",
    "edited": "edited",
    "thread": "Thread",
    "viewThread": "View thread ({{count}} replies)"
  },
  "eventChat": {
    "title": "Event Chat",
    "description": "Hide this message from selected members",
    "excludedMembers": "Hidden from {{count}} member",
    "excludedMembers_plural": "Hidden from {{count}} members",
    "selectMembers": "Select members to exclude"
  },
  "attachments": {
    "photo": "Photo",
    "file": "File",
    "prayerCard": "Prayer Card"
  }
}
```

```json
// locales/ko/chat.json
{
  "conversations": {
    "title": "대화",
    "empty": "대화가 없습니다",
    "newConversation": "새 대화",
    "churchWide": "전체 교회",
    "smallGroup": "소그룹",
    "ministry": "사역팀",
    "direct": "개인 메시지"
  },
  "messages": {
    "placeholder": "메시지를 입력하세요...",
    "send": "보내기",
    "reply": "답장",
    "delete": "메시지 삭제",
    "deleted": "삭제된 메시지입니다",
    "edited": "수정됨",
    "thread": "스레드",
    "viewThread": "스레드 보기 ({{count}}개 답글)"
  },
  "eventChat": {
    "title": "이벤트 채팅",
    "description": "선택한 멤버에게 이 메시지를 숨깁니다",
    "excludedMembers": "{{count}}명에게 숨김",
    "selectMembers": "제외할 멤버 선택"
  },
  "attachments": {
    "photo": "사진",
    "file": "파일",
    "prayerCard": "기도 카드"
  }
}
```

---

### Prayer Namespace

Prayer card features.

```json
// locales/en/prayer.json
{
  "cards": {
    "title": "Prayer Cards",
    "new": "New Prayer Request",
    "myPrayers": "My Prayers",
    "all": "All",
    "unanswered": "Unanswered",
    "answered": "Answered"
  },
  "create": {
    "title": "New Prayer Request",
    "content": "Prayer request",
    "contentPlaceholder": "Share your prayer request...",
    "recipients": "Share with",
    "individual": "Specific people",
    "smallGroup": "My small group",
    "churchWide": "Entire church"
  },
  "detail": {
    "by": "by {{name}}",
    "markAnswered": "Mark as Answered",
    "answered": "Answered!",
    "answeredOn": "Answered on {{date}}",
    "prayingFor": "Praying for you",
    "shareTestimony": "Share your testimony"
  },
  "analytics": {
    "title": "Prayer Analytics",
    "totalPrayers": "Total Prayers",
    "answeredPrayers": "Answered",
    "answerRate": "Answer Rate",
    "thisMonth": "This Month",
    "trend": "{{change}}% from last month"
  }
}
```

```json
// locales/ko/prayer.json
{
  "cards": {
    "title": "기도 카드",
    "new": "새 기도 요청",
    "myPrayers": "내 기도",
    "all": "전체",
    "unanswered": "응답 대기",
    "answered": "응답됨"
  },
  "create": {
    "title": "새 기도 요청",
    "content": "기도 제목",
    "contentPlaceholder": "기도 제목을 나눠주세요...",
    "recipients": "공유 대상",
    "individual": "특정 사람",
    "smallGroup": "내 소그룹",
    "churchWide": "전체 교회"
  },
  "detail": {
    "by": "{{name}}",
    "markAnswered": "응답됨으로 표시",
    "answered": "응답됨!",
    "answeredOn": "{{date}} 응답",
    "prayingFor": "기도하고 있습니다",
    "shareTestimony": "간증 나누기"
  },
  "analytics": {
    "title": "기도 통계",
    "totalPrayers": "전체 기도",
    "answeredPrayers": "응답됨",
    "answerRate": "응답률",
    "thisMonth": "이번 달",
    "trend": "지난 달 대비 {{change}}%"
  }
}
```

---

### Pastoral Namespace

Pastoral journal features.

```json
// locales/en/pastoral.json
{
  "journals": {
    "title": "Pastoral Journals",
    "new": "New Journal",
    "myJournals": "My Journals",
    "pending": "Pending Review",
    "reviewed": "Reviewed"
  },
  "create": {
    "title": "Weekly Journal",
    "week": "Week of {{date}}",
    "content": "Journal content",
    "contentPlaceholder": "Share updates about your small group...",
    "saveDraft": "Save Draft",
    "submit": "Submit to Zone Leader"
  },
  "status": {
    "draft": "Draft",
    "submitted": "Submitted",
    "zoneReviewed": "Zone Leader Reviewed",
    "pastorConfirmed": "Pastor Confirmed"
  },
  "review": {
    "title": "Review Journal",
    "from": "From {{name}}",
    "group": "{{groupName}}",
    "addComment": "Add comment",
    "forward": "Forward to Pastor",
    "confirm": "Confirm Journal"
  },
  "comments": {
    "zoneLeader": "Zone Leader Comment",
    "pastor": "Pastor Comment",
    "placeholder": "Write your comment..."
  }
}
```

```json
// locales/ko/pastoral.json
{
  "journals": {
    "title": "목양 일지",
    "new": "새 일지",
    "myJournals": "내 일지",
    "pending": "검토 대기",
    "reviewed": "검토 완료"
  },
  "create": {
    "title": "주간 일지",
    "week": "{{date}} 주간",
    "content": "일지 내용",
    "contentPlaceholder": "소그룹 소식을 나눠주세요...",
    "saveDraft": "임시 저장",
    "submit": "구역장에게 제출"
  },
  "status": {
    "draft": "임시저장",
    "submitted": "제출됨",
    "zoneReviewed": "구역장 검토 완료",
    "pastorConfirmed": "목사님 확인 완료"
  },
  "review": {
    "title": "일지 검토",
    "from": "{{name}} 작성",
    "group": "{{groupName}}",
    "addComment": "코멘트 추가",
    "forward": "목사님께 전달",
    "confirm": "일지 확인"
  },
  "comments": {
    "zoneLeader": "구역장 코멘트",
    "pastor": "목사님 코멘트",
    "placeholder": "코멘트를 작성하세요..."
  }
}
```

---

### Settings Namespace

Settings and preferences screens.

```json
// locales/en/settings.json
{
  "title": "Settings",
  "profile": {
    "title": "Profile",
    "displayName": "Display Name",
    "email": "Email",
    "photo": "Profile Photo",
    "changePhoto": "Change Photo"
  },
  "preferences": {
    "title": "Preferences",
    "language": "Language",
    "english": "English",
    "korean": "한국어",
    "theme": "Theme",
    "light": "Light",
    "dark": "Dark",
    "system": "System"
  },
  "notifications": {
    "title": "Notifications",
    "push": "Push Notifications",
    "newMessages": "New messages",
    "mentions": "Mentions",
    "prayerAnswered": "Prayer answered",
    "pastoralJournal": "Pastoral journal updates"
  },
  "account": {
    "title": "Account",
    "signOut": "Sign Out",
    "signOutConfirm": "Are you sure you want to sign out?",
    "deleteAccount": "Delete Account",
    "deleteAccountWarning": "This action cannot be undone"
  },
  "about": {
    "title": "About",
    "version": "Version {{version}}",
    "privacyPolicy": "Privacy Policy",
    "termsOfService": "Terms of Service",
    "contact": "Contact Support"
  }
}
```

```json
// locales/ko/settings.json
{
  "title": "설정",
  "profile": {
    "title": "프로필",
    "displayName": "표시 이름",
    "email": "이메일",
    "photo": "프로필 사진",
    "changePhoto": "사진 변경"
  },
  "preferences": {
    "title": "환경 설정",
    "language": "언어",
    "english": "English",
    "korean": "한국어",
    "theme": "테마",
    "light": "라이트",
    "dark": "다크",
    "system": "시스템 설정"
  },
  "notifications": {
    "title": "알림",
    "push": "푸시 알림",
    "newMessages": "새 메시지",
    "mentions": "멘션",
    "prayerAnswered": "기도 응답",
    "pastoralJournal": "목양 일지 업데이트"
  },
  "account": {
    "title": "계정",
    "signOut": "로그아웃",
    "signOutConfirm": "정말 로그아웃하시겠습니까?",
    "deleteAccount": "계정 삭제",
    "deleteAccountWarning": "이 작업은 되돌릴 수 없습니다"
  },
  "about": {
    "title": "정보",
    "version": "버전 {{version}}",
    "privacyPolicy": "개인정보 처리방침",
    "termsOfService": "서비스 약관",
    "contact": "문의하기"
  }
}
```

---

## Usage Patterns

### useTranslation Hook

```typescript
// Basic usage
import { useTranslation } from 'react-i18next';

function ChatScreen() {
  const { t } = useTranslation('chat');

  return (
    <View>
      <Text>{t('conversations.title')}</Text>
      <TextInput placeholder={t('messages.placeholder')} />
    </View>
  );
}
```

### Multiple Namespaces

```typescript
function MyComponent() {
  const { t } = useTranslation(['chat', 'common']);

  return (
    <View>
      <Text>{t('chat:conversations.title')}</Text>
      <Button title={t('common:actions.save')} />
    </View>
  );
}
```

### Interpolation

```typescript
// With variables
t('time.minutesAgo', { count: 5 })  // "5 minutes ago"
t('prayer.detail.by', { name: 'John' })  // "by John"

// With formatting
t('time.answeredOn', { date: formatDate(date) })
```

### Pluralization

English uses `_plural` suffix:
```json
{
  "minutesAgo": "{{count}} minute ago",
  "minutesAgo_plural": "{{count}} minutes ago"
}
```

Korean doesn't typically require plurals (same form used).

---

## Custom Hooks

### useLocale

```typescript
// src/hooks/useLocale.ts
import { useTranslation } from 'react-i18next';
import { usePreferencesStore } from '@/stores/preferences';
import type { SupportedLanguage } from '@/i18n';

export function useLocale() {
  const { i18n } = useTranslation();
  const setLocale = usePreferencesStore((s) => s.setLocale);
  const currentLocale = usePreferencesStore((s) => s.locale);

  const changeLocale = async (locale: SupportedLanguage) => {
    await i18n.changeLanguage(locale);
    setLocale(locale);
  };

  return {
    locale: currentLocale,
    changeLocale,
    isKorean: currentLocale === 'ko',
    isEnglish: currentLocale === 'en',
  };
}
```

### useFormattedDate

```typescript
// src/hooks/useFormattedDate.ts
import { useTranslation } from 'react-i18next';
import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';
import { enUS, ko } from 'date-fns/locale';

const locales = { en: enUS, ko };

export function useFormattedDate() {
  const { i18n } = useTranslation();
  const locale = locales[i18n.language as 'en' | 'ko'] ?? enUS;

  const formatRelative = (date: Date | string) => {
    const d = new Date(date);
    if (isToday(d)) return format(d, 'p', { locale }); // Time only
    if (isYesterday(d)) return 'Yesterday';
    return format(d, 'PP', { locale }); // Date
  };

  const formatTimeAgo = (date: Date | string) => {
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale });
  };

  const formatFull = (date: Date | string) => {
    return format(new Date(date), 'PPpp', { locale });
  };

  return { formatRelative, formatTimeAgo, formatFull };
}
```

---

## ESLint Enforcement

The project ESLint configuration includes rules to catch hardcoded strings:

```javascript
// eslint.config.js (partial)
{
  rules: {
    'no-restricted-syntax': [
      'warn',
      {
        selector: 'JSXText[value=/[a-zA-Z]/]',
        message: 'Hardcoded UI strings are not allowed. Use i18n translation keys.',
      },
    ],
  },
}
```

---

## CI Translation Validation

```bash
#!/bin/bash
# scripts/check-i18n.sh

# Check that all keys in en exist in ko
echo "Checking translation key parity..."

EN_KEYS=$(find locales/en -name "*.json" -exec jq -r 'paths | join(".")' {} \; | sort)
KO_KEYS=$(find locales/ko -name "*.json" -exec jq -r 'paths | join(".")' {} \; | sort)

MISSING_IN_KO=$(comm -23 <(echo "$EN_KEYS") <(echo "$KO_KEYS"))
MISSING_IN_EN=$(comm -13 <(echo "$EN_KEYS") <(echo "$KO_KEYS"))

if [ -n "$MISSING_IN_KO" ]; then
  echo "Keys missing in Korean translations:"
  echo "$MISSING_IN_KO"
  exit 1
fi

if [ -n "$MISSING_IN_EN" ]; then
  echo "Extra keys in Korean (not in English):"
  echo "$MISSING_IN_EN"
  exit 1
fi

echo "All translation keys match!"
```

---

## Adding New Languages

1. Create new locale directory: `locales/{code}/`
2. Copy all JSON files from `locales/en/`
3. Translate all values
4. Add language to `supportedLanguages` in `src/i18n/index.ts`
5. Import resources and add to `resources` object
6. Add date-fns locale mapping
7. Update settings UI to include new language option

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-01-04 | Claude | Initial i18n architecture |

---

## Trans Component for Rich Text

For text with inline formatting or links, use the `Trans` component wrapper:

```typescript
// src/components/ui/Trans.tsx
import { Trans as I18nextTrans } from 'react-i18next';
import { Text } from './Text';

interface TransProps {
  i18nKey: string;
  i18nParams?: Record<string, string | number>;
  components?: Record<string, React.ReactElement>;
  ns?: string;
  values?: Record<string, string | number>;
}

export function Trans({ i18nKey, i18nParams, components, ns, values }: TransProps) {
  const { t } = useTranslation(ns);

  return (
    <I18nextTrans
      i18nKey={i18nKey}
      t={t}
      components={components}
      values={{ ...i18nParams, ...values }}
    />
  );
}
```

### Usage Examples

```tsx
// Translation with link
// locales/en/common.json: { "terms": "By continuing, you agree to our <link>Terms of Service</link>." }
<Trans
  i18nKey="common.terms"
  components={{
    link: <Link href="/terms" style={{ textDecorationLine: 'underline' }} />,
  }}
/>

// Translation with bold text
// locales/en/common.json: { "welcome": "Welcome, <bold>{{name}}</bold>!" }
<Trans
  i18nKey="common.welcome"
  i18nParams={{ name: 'John' }}
  components={{
    bold: <Text style={{ fontWeight: 'bold' }} />,
  }}
/>

// Translation with multiple components
// locales/en/chat.json: { "messageHint": "Press <send>to send</send> or <attach>to attach files</attach>" }
<Trans
  i18nKey="chat.messageHint"
  components={{
    send: <Text style={{ color: '$primary' }} />,
    attach: <Text style={{ color: '$secondary' }} />,
  }}
/>
```

### When to Use Trans vs Text

| Scenario | Component | Example |
|----------|-----------|---------|
| Simple text | `<Text i18nKey="..." />` | Labels, buttons, headings |
| Text with links | `<Trans i18nKey="..." />` | Terms of Service, privacy policy |
| Text with formatting | `<Trans i18nKey="..." />` | Bold, italic, colored text |
| Interpolation | `<Text i18nKey="..." i18nParams={{}} />` | Greetings, names, counts |
| Mixed formatting + values | `<Trans i18nKey="..." />` | "Welcome, **{{name}}**!" |

---

## Utility Functions

The i18n system provides locale-aware formatting utilities:

```typescript
// src/i18n/utils.ts

/**
 * Format a date according to locale conventions
 * @param date - Date or timestamp to format
 * @param options - Format options
 * @returns Formatted date string
 */
export function formatDate(
  date: Date | number,
  options?: {
    format?: 'short' | 'medium' | 'long' | 'full';
    locale?: Locale;
  }
): string;

/**
 * Format a number according to locale conventions
 * @param num - Number to format
 * @param options - Format options
 * @returns Formatted number string
 */
export function formatNumber(
  num: number,
  options?: {
    locale?: Locale;
    style?: 'decimal' | 'percent' | 'currency';
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  }
): string;

/**
 * Format a relative time (e.g., "5 minutes ago")
 * @param date - Date to compare against now
 * @param locale - Target locale
 * @returns Relative time string
 */
export function formatRelativeTime(
  date: Date,
  locale: Locale = 'en'
): string;
```

### Usage Examples

```typescript
import { formatDate, formatNumber, formatRelativeTime } from '@/i18n/utils';

// Date formatting
formatDate(new Date(), { format: 'short', locale: 'en' });  // "1/15/24"
formatDate(new Date(), { format: 'long', locale: 'ko' });    // "2024년 1월 15일"

// Number formatting
formatNumber(1234.56, { locale: 'en' });    // "1,235"
formatNumber(0.85, { style: 'percent', locale: 'en' });  // "85%"

// Relative time
const messageDate = new Date(Date.now() - 1000 * 60 * 5);
formatRelativeTime(messageDate, 'en');  // "5 minutes ago"
formatRelativeTime(messageDate, 'ko');  // "5분 전"
```

---

## Testing Strategy

### Unit Tests

Test i18n functionality in isolation:

```typescript
// src/i18n/__tests__/i18n.test.ts
describe('i18n', () => {
  beforeAll(async () => {
    await initI18n();
  });

  describe('fallback behavior', () => {
    it('falls back to English when key missing in Korean', async () => {
      await changeLocale('ko');
      const result = translate('common.test_fallback_key');
      expect(result).toBe('This key only exists in English');
    });

    it('returns key name when translation missing in all languages', () => {
      const result = translate('common.nonexistent_key');
      expect(result).toBe('common.nonexistent_key');
    });

    it('preserves fallback behavior after multiple locale switches', async () => {
      expect(translate('common.test_fallback_key')).toBe('This key only exists in English');
      await changeLocale('ko');
      expect(translate('common.test_fallback_key')).toBe('This key only exists in English');
      await changeLocale('en');
      expect(translate('common.test_fallback_key')).toBe('This key only exists in English');
    });
  });
});
```

### Component Integration Tests

Test that components properly display translations:

```typescript
// src/components/ui/__tests__/Text.test.tsx
describe('Text i18n integration', () => {
  it('renders English text when locale is en', () => {
    const { getByText } = render(<Text i18nKey="common.app_name" />, { wrapper });
    expect(getByText('Gagyo')).toBeTruthy();
  });

  it('renders Korean text when locale is ko', async () => {
    await act(async () => {
      await changeLocale('ko');
    });

    const { getByText } = render(<Text i18nKey="common.app_name" />, { wrapper });
    expect(getByText('가교')).toBeTruthy();
  });

  it('updates text when locale changes', async () => {
    const { getByText, rerender } = render(<Text i18nKey="common.save" />, { wrapper });

    expect(getByText('Save')).toBeTruthy();

    await act(async () => {
      await changeLocale('ko');
    });

    rerender(<Text i18nKey="common.save" />);
    expect(getByText('저장')).toBeTruthy();
  });
});
```

### E2E Tests

Test locale switching flows end-to-end:

```typescript
// e2e/i18n.test.ts
describe('i18n E2E Tests', () => {
  it('should display Korean text when device locale is Korean', async () => {
    await device.launchApp({
      languageAndRegion: {
        language: 'ko-KR',
        calendar: 'gregorian',
      },
    });

    await expect(element(by.text('가교'))).toBeVisible();
    await expect(element(by.text('저장'))).toBeVisible();
  });

  it('should switch from English to Korean through settings', async () => {
    await element(by.id('settings-button')).tap();
    await element(by.id('language-selector')).tap();
    await element(by.text('한국어')).tap();
    await element(by.id('back-button')).tap();

    await expect(element(by.text('가교'))).toBeVisible();
  });
});
```

---

## Pre-commit Hooks

Husky is configured to run i18n validation before commits:

```bash
# .husky/pre-commit
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

echo "Running pre-commit checks..."

# Run lint-staged for modified files
bunx lint-staged

# Run i18n validation
bun run i18n:validate

echo "Pre-commit checks complete!"
```

### lint-staged Configuration

```json
// package.json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "locales/**/*.json": [
      "bun scripts/check-i18n.ts"
    ]
  }
}
```

This ensures:
1. TypeScript/TSX files are linted and formatted
2. Locale JSON files are validated for key parity and syntax

---

## Storybook Integration

Storybook supports locale switching via the `locale` parameter:

```typescript
// .storybook/preview.tsx
import { I18nextProvider } from 'react-i18next';
import i18n from '@/i18n';

const globalDecorator = (StoryFn: StoryFn, context: StoryContext) => {
  const { locale } = context.parameters;

  // Update i18n instance based on story parameter
  if (locale && i18n.language !== locale) {
    i18n.changeLanguage(locale);
  }

  return (
    <TamaguiProvider>
      <I18nextProvider i18n={i18n}>
        <StoryFn />
      </I18nextProvider>
    </TamaguiProvider>
  );
};

export const decorators = [globalDecorator];

export const parameters = {
  locale: 'en',
  locales: {
    en: 'English',
    ko: '한국어 (Korean)',
  },
};
```

### Creating Locale Variants

```typescript
// Button.stories.tsx
export const Korean = {
  name: 'Korean (한국어)',
  args: {
    labelKey: 'common.save',
  },
  parameters: {
    locale: 'ko',
  },
};

export const AllVariantsKorean = {
  name: 'All Variants (Korean)',
  render: () => (
    <Column gap="$4">
      <Button variant="primary" labelKey="common.save" />
      <Button variant="secondary" labelKey="common.cancel" />
      <Button variant="danger" labelKey="common.delete" />
    </Column>
  ),
  parameters: {
    locale: 'ko',
  },
};
```

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-01-04 | Claude | Initial i18n architecture |
| 1.1 | 2025-01-04 | Claude | Added Trans component, utility functions, testing, pre-commit hooks |
