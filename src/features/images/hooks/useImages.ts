/**
 * Hook for querying images from the gallery.
 *
 * Fetches image attachments with pagination, filtering by conversation,
 * and tenant isolation via RLS.
 *
 * See: claude_docs/17_images_view.md for architecture documentation
 */

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { ImageAttachment, ConversationType } from '@/types/database';

/**
 * Options for querying images
 */
export interface UseImagesOptions {
  /** Filter by specific conversation */
  conversationId?: string | null;
  /** Number of images per page */
  limit?: number;
  /** Starting offset for pagination */
  offset?: number;
}

/**
 * State returned by useImages hook
 */
export interface UseImagesState {
  /** Array of image attachments */
  images: ImageAttachment[];
  /** Whether data is being loaded */
  loading: boolean;
  /** Error from the last query */
  error: Error | null;
  /** Whether there are more images to load */
  hasMore: boolean;
  /** Load the next page of images */
  loadMore: () => void;
  /** Refresh the image list */
  refresh: () => void;
}

/**
 * Raw attachment data from Supabase query
 */
interface RawAttachmentData {
  id: string;
  url: string;
  file_name: string;
  file_size: number;
  created_at: string;
  message: {
    id: string;
    conversation_id: string;
    conversation: {
      id: string;
      name: string | null;
      type: ConversationType;
    };
    sender: {
      user: {
        display_name: string | null;
        photo_url: string | null;
      };
    };
  };
}

const DEFAULT_LIMIT = 50;

/**
 * Transform raw attachment data to ImageAttachment type
 */
function transformAttachment(raw: RawAttachmentData): ImageAttachment {
  return {
    id: raw.id,
    url: raw.url,
    fileName: raw.file_name,
    fileSize: raw.file_size,
    createdAt: raw.created_at,
    message: {
      id: raw.message.id,
      conversationId: raw.message.conversation_id,
      conversation: {
        id: raw.message.conversation.id,
        name: raw.message.conversation.name,
        type: raw.message.conversation.type,
      },
      sender: {
        displayName: raw.message.sender?.user?.display_name ?? null,
        photoUrl: raw.message.sender?.user?.photo_url ?? null,
      },
    },
  };
}

/**
 * Hook for querying images from the gallery.
 *
 * @param tenantId - The tenant ID to query images for
 * @param options - Query options including pagination and filtering
 * @returns UseImagesState with images array, loading state, and pagination controls
 *
 * @example
 * ```tsx
 * function ImagesScreen() {
 *   const { tenantId } = useRequireAuth();
 *   const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
 *
 *   const { images, loading, hasMore, loadMore, error } = useImages(tenantId, {
 *     conversationId: selectedConversation,
 *   });
 *
 *   return (
 *     <FlatList
 *       data={images}
 *       renderItem={({ item }) => <ImageThumbnail image={item} />}
 *       onEndReached={loadMore}
 *       ListFooterComponent={hasMore ? <ActivityIndicator /> : null}
 *     />
 *   );
 * }
 * ```
 */
export function useImages(tenantId: string | null, options: UseImagesOptions = {}): UseImagesState {
  const { conversationId = null, limit = DEFAULT_LIMIT } = options;

  const [images, setImages] = useState<ImageAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);

  /**
   * Fetch images from the database
   */
  const fetchImages = useCallback(
    async (currentOffset: number, append: boolean = false) => {
      if (!tenantId) {
        setLoading(false);
        return;
      }

      if (!append) {
        setLoading(true);
      }
      setError(null);

      try {
        let query = supabase
          .from('attachments')
          .select(
            `
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
              sender:memberships!messages_sender_id_fkey (
                user:users!memberships_user_id_fkey (
                  display_name,
                  photo_url
                )
              )
            )
          `
          )
          .eq('tenant_id', tenantId)
          .like('file_type', 'image/%')
          .order('created_at', { ascending: false })
          .range(currentOffset, currentOffset + limit - 1);

        // Apply conversation filter if specified
        if (conversationId) {
          query = query.eq('message.conversation_id', conversationId);
        }

        const { data, error: queryError } = await query;

        if (queryError) {
          throw queryError;
        }

        const transformedData = (data as unknown as RawAttachmentData[]).map(transformAttachment);

        if (append) {
          setImages((prev) => [...prev, ...transformedData]);
        } else {
          setImages(transformedData);
        }

        // Check if there are more images
        setHasMore(transformedData.length === limit);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch images'));
      } finally {
        setLoading(false);
      }
    },
    [tenantId, conversationId, limit]
  );

  /**
   * Load initial data and when filters change
   */
  useEffect(() => {
    setOffset(0);
    setHasMore(true);
    void fetchImages(0, false);
  }, [fetchImages]);

  /**
   * Load more images for pagination
   */
  const loadMore = useCallback(() => {
    if (loading || !hasMore) {
      return;
    }

    const newOffset = offset + limit;
    setOffset(newOffset);
    void fetchImages(newOffset, true);
  }, [loading, hasMore, offset, limit, fetchImages]);

  /**
   * Refresh the image list
   */
  const refresh = useCallback(() => {
    setOffset(0);
    setHasMore(true);
    void fetchImages(0, false);
  }, [fetchImages]);

  return {
    images,
    loading,
    error,
    hasMore,
    loadMore,
    refresh,
  };
}

/**
 * Hook for getting a single image by ID
 */
export function useImage(
  imageId: string | null,
  tenantId: string | null
): {
  image: ImageAttachment | null;
  loading: boolean;
  error: Error | null;
} {
  const [image, setImage] = useState<ImageAttachment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!imageId || !tenantId) {
      setLoading(false);
      return;
    }

    const fetchImage = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data, error: queryError } = await supabase
          .from('attachments')
          .select(
            `
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
              sender:memberships!messages_sender_id_fkey (
                user:users!memberships_user_id_fkey (
                  display_name,
                  photo_url
                )
              )
            )
          `
          )
          .eq('id', imageId)
          .eq('tenant_id', tenantId)
          .like('file_type', 'image/%')
          .single();

        if (queryError) {
          throw queryError;
        }

        setImage(transformAttachment(data as unknown as RawAttachmentData));
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch image'));
      } finally {
        setLoading(false);
      }
    };

    void fetchImage();
  }, [imageId, tenantId]);

  return { image, loading, error };
}
