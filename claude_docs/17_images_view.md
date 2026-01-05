---
tags: [sdd, images, gallery, storage, attachments]
---

# 17 Unified Images View

## WHAT

The Unified Images View provides a centralized gallery for browsing, viewing, and filtering all images shared across conversations within a tenant context. It consists of:

1. **Image Grid**: Thumbnail grid displaying all images from accessible conversations with infinite scroll
2. **Full-Screen Viewer**: Swipe-enabled image viewer with pinch-to-zoom, metadata overlay, and sharing capability
3. **Conversation Filter**: Bottom sheet allowing users to filter images by specific conversation
4. **Image Upload Integration**: Seamless image upload from chat with automatic gallery indexing

### Screen Structure

```
┌─────────────────────────────────────┐
│ Images                    [Filter] │
│─────────────────────────────────────│
│                                     │
│ ┌─────┐ ┌─────┐ ┌─────┐            │
│ │ IMG │ │ IMG │ │ IMG │            │
│ └─────┘ └─────┘ └─────┘            │
│                                     │
│ ┌─────┐ ┌─────┐ ┌─────┐            │
│ │ IMG │ │ IMG │ │ IMG │            │
│ └─────┘ └─────┘ └─────┘            │
│                                     │
│ ┌─────┐ ┌─────┐ ┌─────┐            │
│ │ IMG │ │ IMG │ │ IMG │            │
│ └─────┘ └─────┘ └─────┘            │
│                                     │
│        [Load More...]              │
│                                     │
├─────────────────────────────────────┤
│ [Home] [Chat] [Prayer] [Pastoral]   │
│                    [Images] [Settings] │
└─────────────────────────────────────┘
```

### Component Hierarchy

| Component | Location | Description |
|-----------|----------|-------------|
| ImagesScreen | `app/(tabs)/images.tsx` | Main screen orchestrating grid, viewer, and filter |
| ImageGrid | `src/features/images/components/ImageGrid.tsx` | Virtualized thumbnail grid |
| ImageViewer | `src/features/images/components/ImageViewer.tsx` | Full-screen image viewer |
| ImageFilterSheet | `src/features/images/components/ImageFilterSheet.tsx` | Conversation filter bottom sheet |

---

## WHY

### Centralized Image Access

1. **Cross-Conversation Discovery**: Users need to find images without remembering which conversation contains them
2. **Quick Photo Sharing Review**: Leaders reviewing shared photos can browse all images in one place
3. **Content Moderation**: Administrators need visibility into shared media for policy compliance

### UX Pattern Alignment

1. **Gallery Pattern**: Standard mobile UX for media browsing (grid → full-screen → swipe)
2. **Filtering**: Allows progressive disclosure from all images to conversation-specific views
3. **Native Feel**: Pinch-to-zoom and swipe navigation match native photo apps

### Multi-Tenant Security

1. **Tenant Isolation**: Users only see images from their tenant's conversations
2. **Conversation Access Control**: Images inherit access permissions from parent conversation
3. **Storage Security**: RLS policies on both database and storage layers

---

## HOW

### Data Model

#### Dual Storage Model

Images are stored in two places for different purposes:

1. **Supabase Storage** (`images` bucket): Binary image files with folder structure `{tenant_id}/{message_id}/{filename}`
2. **`attachments` table**: Metadata for gallery queries (indexed by `tenant_id`, `file_type`)
3. **`messages` table**: URL reference in `content` field when `content_type = 'image'`

#### Storage Bucket Configuration

```sql
-- Bucket: images
-- Access: Private (RLS controlled)
-- Max file size: 5 MiB
-- Allowed MIME types: image/jpeg, image/png, image/gif, image/webp
```

#### Query Model

```typescript
// Gallery query joins attachments with message and conversation data
const query = supabase
  .from('attachments')
  .select(`
    id,
    url,
    file_name,
    file_size,
    created_at,
    message:messages!inner (
      id,
      conversation_id,
      conversation:conversations!inner (
        id,
        name,
        type
      ),
      sender_membership_id
    )
  `)
  .eq('tenant_id', tenantId)
  .like('file_type', 'image/%')
  .order('created_at', { ascending: false });
```

### Implementation Approach

#### 1. Storage Setup (`supabase/migrations/20250106000000_create_images_storage.sql`)

- Create `images` bucket with private access
- Configure RLS policies for tenant-scoped access
- Set file size limit and MIME type restrictions

#### 2. Image Upload Utility (`src/lib/imageUpload.ts`)

```typescript
export async function uploadImage(
  tenantId: string,
  messageId: string,
  imageUri: string,
  fileName: string
): Promise<string>
```

- Generate unique storage path: `{tenantId}/{messageId}/{timestamp}-{fileName}`
- Upload to storage bucket
- Create attachment record
- Return public URL for message content

#### 3. Image Query Hook (`src/features/images/hooks/useImages.ts`)

```typescript
export function useImages(options?: {
  conversationId?: string;
  limit?: number;
  offset?: number;
}): {
  images: ImageAttachment[];
  loading: boolean;
  error: Error | null;
  hasMore: boolean;
  loadMore: () => void;
}
```

#### 4. Gallery Components

- **ImageGrid**: FlashList-based virtualized grid with 3 columns, 120x120 thumbnails
- **ImageViewer**: Modal with `react-native-image-viewing` or custom implementation
- **ImageFilterSheet**: Tamagui Sheet with conversation list and search

#### 5. Images Screen (`app/(tabs)/images.tsx`)

- Orchestrates grid, viewer, and filter components
- Manages selected conversation filter state
- Handles image press → viewer navigation

### API Boundaries

| Boundary | Method | Purpose |
|----------|--------|---------|
| Storage Upload | `supabase.storage.from('images').upload()` | Binary file upload |
| Storage URL | `supabase.storage.from('images').getPublicUrl()` | Generate access URL |
| Attachment Create | `supabase.from('attachments').insert()` | Metadata record |
| Image Query | `supabase.from('attachments').select()` | Gallery listing |

### Navigation

- **Tab Access**: Bottom tab navigation (already configured as tab index 4)
- **Deep Link**: `gagyo://images?conversation={id}` opens filtered view
- **Image Viewer**: Modal overlay, dismissible via close button or swipe down

---

## Figma References

- **Images Gallery Screen**: `node-id=38-982`
- **Image Viewer Modal**: Follows native iOS/Android photo viewer patterns
- **Filter Sheet**: Standard Tamagui Sheet styling

---

## Test Implications

### Integration Tests (`__tests__/integration/image-storage-rls.test.ts`)

| Test Case | Setup | Action | Expected Result |
|-----------|-------|--------|-----------------|
| Same tenant upload | User A in Tenant 1 | Upload image to Tenant 1 folder | Success, attachment created |
| Cross-tenant upload | User A in Tenant 1 | Attempt upload to Tenant 2 folder | RLS blocks, error returned |
| View own tenant images | User A in Tenant 1, images exist | Query images for Tenant 1 | All Tenant 1 images returned |
| View other tenant images | User A in Tenant 1 | Query images for Tenant 2 | Empty result (RLS filters) |
| Delete own image | User A uploaded image | Delete own image | Success, image removed |
| Delete other user's image | User B uploaded image | User A attempts delete | RLS blocks, error returned |

### E2E Tests (`e2e/images.test.ts`)

| Scenario | Expected Behavior |
|----------|-------------------|
| Display images from all conversations | Image grid visible with thumbnails |
| Open full-screen viewer on image tap | Image viewer modal opens with selected image |
| Filter images by conversation | Only images from selected conversation shown |
| Upload image from chat appears in gallery | New image visible in Images view after upload |
| Handle empty state | "No images yet" message displayed |
| Load more images on scroll | Additional images loaded when scrolling to bottom |

### Unit Tests

| Component/Hook | Test Cases |
|----------------|------------|
| `useImages` | Returns images, handles pagination, filters by conversation, handles errors |
| `useImageUpload` | Uploads successfully, validates file size, handles network errors |
| `ImageGrid` | Renders thumbnails, calls onImagePress, shows loading state, shows empty state |
| `ImageViewer` | Opens with correct image, swipe navigation works, closes on dismiss |
| `ImageFilterSheet` | Lists conversations, handles selection, clears filter |

---

## i18n Requirements

### New Translation Keys

#### `locales/en/common.json`
```json
{
  "images": {
    "title": "Images",
    "empty_state": "No images yet",
    "filter_by_conversation": "Filter by conversation",
    "all_conversations": "All conversations",
    "loading": "Loading images...",
    "upload_failed": "Failed to upload image",
    "delete_confirm": "Delete this image?",
    "file_too_large": "Image file is too large (max 5 MB)",
    "invalid_format": "Invalid image format",
    "upload_success": "Image uploaded successfully"
  }
}
```

#### `locales/ko/common.json`
```json
{
  "images": {
    "title": "이미지",
    "empty_state": "아직 이미지가 없습니다",
    "filter_by_conversation": "대화별 필터",
    "all_conversations": "모든 대화",
    "loading": "이미지 로딩 중...",
    "upload_failed": "이미지 업로드 실패",
    "delete_confirm": "이 이미지를 삭제하시겠습니까?",
    "file_too_large": "이미지 파일이 너무 큽니다 (최대 5 MB)",
    "invalid_format": "잘못된 이미지 형식입니다",
    "upload_success": "이미지가 업로드되었습니다"
  }
}
```

---

## Security Considerations

### Storage RLS Policies

1. **SELECT**: Users can view images from conversations they have access to (via `memberships` table)
2. **INSERT**: Users can upload to their tenant's folder only
3. **DELETE**: Users can delete only their own uploaded images

### Validation

- File size validation before upload (client-side + server-side 5 MiB limit)
- MIME type validation (jpeg, png, gif, webp only)
- File path validation (prevents directory traversal)

### Tenant Isolation

- Storage folder structure enforces tenant separation
- Database queries filtered by `tenant_id` with RLS enforcement
- No cross-tenant image access possible

---

## Implementation Status

- [x] SDD Specification (this document)
- [x] Supabase Storage bucket and RLS policies created
- [x] Image upload utility implemented
- [x] Image upload hook implemented
- [x] Image query hook implemented
- [x] ImageGrid component created
- [x] ImageViewer component created
- [x] ImageFilterSheet component created
- [x] Images screen implemented
- [x] Chat integration for image upload
- [x] Translation keys added (en/ko)
- [x] Integration tests passing
- [x] E2E tests passing
- [ ] Figma design verified

### Files Created/Modified

| File | Status | Description |
|------|--------|-------------|
| `supabase/migrations/20250106000000_create_images_storage.sql` | Created | Storage bucket setup and RLS policies |
| `src/lib/imageUpload.ts` | Created | Image upload utility with validation |
| `src/features/chat/hooks/useImageUpload.ts` | Created | React hook for image upload |
| `src/features/images/hooks/useImages.ts` | Created | React hook for image queries with pagination |
| `src/features/images/components/ImageGrid.tsx` | Created | Virtualized thumbnail grid component |
| `src/features/images/components/ImageViewer.tsx` | Created | Full-screen image viewer with swipe |
| `src/features/images/components/ImageFilterSheet.tsx` | Created | Conversation filter bottom sheet |
| `src/features/images/components/index.ts` | Created | Component exports |
| `app/(tabs)/images.tsx` | Modified | Main Images screen implementation |
| `src/features/chat/components/MessageInput.tsx` | Modified | Added image upload button integration |
| `locales/en/common.json` | Modified | Added `images` translation keys |
| `locales/ko/common.json` | Modified | Added `images` translation keys |
| `__tests__/integration/storage-rls.test.ts` | Created | Storage RLS integration tests |
| `e2e/helpers/images-helpers.ts` | Created | E2E test helper functions |
| `e2e/images.test.ts` | Created | E2E test suite for Images view |
