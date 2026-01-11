/**
 * Hook for querying document files from conversations.
 *
 * Fetches file attachments (PDF, DOC, PPT, XLS, etc.) with pagination,
 * filtering by file type, and tenant isolation via RLS.
 */

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { FileAttachment, FileExtension, ConversationType } from '@/types/database';

/**
 * Options for querying files
 */
export interface UseFilesOptions {
  /** Filter by specific conversation */
  conversationId?: string | null;
  /** Filter by file extension */
  extension?: FileExtension | null;
  /** Number of files per page */
  limit?: number;
  /** Starting offset for pagination */
  offset?: number;
}

/**
 * State returned by useFiles hook
 */
export interface UseFilesState {
  /** Array of file attachments */
  files: FileAttachment[];
  /** Whether data is being loaded */
  loading: boolean;
  /** Error from the last query */
  error: Error | null;
  /** Whether there are more files to load */
  hasMore: boolean;
  /** Load the next page of files */
  loadMore: () => void;
  /** Refresh the file list */
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
  file_type: string;
  created_at: string;
  message: {
    id: string;
    conversation_id: string;
    conversation: {
      id: string;
      name: string | null;
      type: ConversationType;
    };
    sender_id: string;
    sender: {
      id: string;
      user: {
        display_name: string | null;
      };
    };
  };
}

const DEFAULT_LIMIT = 30;

/**
 * Extract file extension from filename
 */
function extractExtension(fileName: string): FileExtension {
  const parts = fileName.split('.');
  const ext = parts[parts.length - 1]?.toLowerCase() ?? '';

  const validExtensions: Record<string, FileExtension> = {
    pdf: 'pdf',
    doc: 'doc',
    docx: 'docx',
    ppt: 'ppt',
    pptx: 'pptx',
    xls: 'xls',
    xlsx: 'xlsx',
    txt: 'txt',
    zip: 'zip',
  };

  return validExtensions[ext] ?? 'unknown';
}

/**
 * Check if mime type is a document (not image)
 */
function isDocumentMimeType(mimeType: string): boolean {
  if (mimeType.startsWith('image/')) return false;
  if (mimeType.startsWith('video/')) return false;

  // Include document types
  const documentMimeTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.ms-word',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'application/zip',
    'application/x-zip-compressed',
  ];

  return documentMimeTypes.some((type) => mimeType.includes(type));
}

/**
 * Transform raw attachment data to FileAttachment type
 */
function transformAttachment(raw: RawAttachmentData): FileAttachment {
  const extension = extractExtension(raw.file_name);

  return {
    id: raw.id,
    uri: raw.url,
    fileName: raw.file_name,
    extension,
    mimeType: raw.file_type,
    fileSize: raw.file_size,
    createdAt: raw.created_at,
    conversationId: raw.message.conversation_id,
    conversationName: raw.message.conversation.name,
    conversationType: raw.message.conversation.type,
    senderId: raw.message.sender_id,
    senderName: raw.message.sender?.user?.display_name ?? undefined,
  };
}

/**
 * Real sample file URLs for development/testing.
 * Uses publicly accessible documents so opening works on real devices.
 */
const SAMPLE_FILE_URLS: Record<string, string> = {
  pdf: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
  doc: 'https://calibre-ebook.com/downloads/demos/demo.doc',
  docx: 'https://calibre-ebook.com/downloads/demos/demo.docx',
  ppt: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/presentation/demo.ppt',
  pptx: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/presentation/demo.pptx',
  xls: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/excel/dummy.xls',
  xlsx: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/excel/dummy.xlsx',
};

/**
 * Generate mock files for development/testing.
 *
 * This is used when no real files exist in the database, allowing
 * visual verification of the list layout and filtering.
 */
function generateMockFiles(count: number, offset: number = 0): FileAttachment[] {
  const now = Date.now();
  const mockFiles: FileAttachment[] = [];

  const extensions: FileExtension[] = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'];
  const fileNames = [
    '주간보고서',
    '교회헌금내역',
    '기도제목장',
    '행사계획서',
    '수료회의록',
    '교구학교안',
    '찬양목록',
    '봉사일정표',
    '셀그룹과제',
    '전도전략',
  ];

  for (let i = 0; i < count; i++) {
    const ext: FileExtension = extensions[i % extensions.length] as FileExtension;
    // Stagger timestamps so newest appears first
    const timestamp = new Date(now - offset * 60000 - i * 3600000).toISOString();

    // Use real sample file URLs that are publicly accessible
    const sampleUrl = SAMPLE_FILE_URLS[ext] || SAMPLE_FILE_URLS.pdf;

    mockFiles.push({
      id: `mock-file-${offset}-${i}`,
      uri: sampleUrl,
      fileName: `${fileNames[i % fileNames.length]}.${ext}`,
      extension: ext,
      mimeType: `application/${ext === 'pdf' ? 'pdf' : ext}`,
      fileSize: 50000 + Math.floor(Math.random() * 500000),
      createdAt: timestamp,
      conversationId: `mock-conv-${i % 4}`,
      conversationName: (['가방 셀', '교회 행정', '봉사팀', '기도팀'] as const)[i % 4] ?? null,
      conversationType: ['small_group', 'church_wide', 'ministry', 'small_group'][i % 4] as ConversationType,
      senderId: `mock-user-${i % 3}`,
      senderName: ['김철수', '이영희', '박목자'][i % 3],
    });
  }

  return mockFiles;
}

/**
 * Hook for querying document files from conversations.
 *
 * @param tenantId - The tenant ID to query files for
 * @param options - Query options including pagination and filtering
 * @returns UseFilesState with files array, loading state, and pagination controls
 */
export function useFiles(tenantId: string | null, options: UseFilesOptions = {}): UseFilesState {
  const { conversationId = null, extension = null, limit = DEFAULT_LIMIT } = options;

  const [files, setFiles] = useState<FileAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [usingMockData, setUsingMockData] = useState(false);

  /**
   * Build mime type filter for extension
   */
  const getMimeTypeFilter = useCallback((ext: FileExtension | null): string | null => {
    if (!ext || ext === 'unknown') return null;

    const mimeTypeMap: Partial<Record<FileExtension, string>> = {
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ppt: 'application/vnd.ms-powerpoint',
      pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      txt: 'text/plain',
      zip: 'application/zip',
    };

    return mimeTypeMap[ext] ?? null;
  }, []);

  /**
   * Fetch files from the database
   */
  const fetchFiles = useCallback(
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
            file_type,
            created_at,
            message:messages!inner (
              id,
              conversation_id,
              sender_id,
              conversation:conversations!inner (
                id,
                name,
                type
              ),
              sender:memberships!messages_sender_id_fkey (
                id,
                user:users!memberships_user_id_fkey (
                  display_name
                )
              )
            )
          `
          )
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: false })
          .range(currentOffset, currentOffset + limit - 1);

        // Apply conversation filter if specified
        if (conversationId) {
          query = query.eq('message.conversation_id', conversationId);
        }

        // Apply extension/file type filter
        const mimeTypeFilter = getMimeTypeFilter(extension);
        if (mimeTypeFilter) {
          query = query.like('file_type', `${mimeTypeFilter}%`);
        } else {
          // Filter out images and videos when showing "All" or unknown types
          // We'll filter client-side for more control
        }

        const { data, error: queryError } = await query;

        if (queryError) {
          throw queryError;
        }

        let transformedData = (data as unknown as RawAttachmentData[])
          .map(transformAttachment)
          .filter((file) => isDocumentMimeType(file.mimeType));

        // Additional filter for extension if needed (e.g., for 'unknown' type)
        if (extension && extension !== 'unknown') {
          transformedData = transformedData.filter((file) => file.extension === extension);
        }

        // If no real files exist and this is the initial load, use mock data in development
        const shouldUseMockData =
          __DEV__ &&
          !append &&
          transformedData.length === 0 &&
          currentOffset === 0 &&
          !conversationId &&
          !extension;

        if (shouldUseMockData) {
          console.log('[useFiles] No real files found. Using mock data for development.');
          const mockData = generateMockFiles(12, 0);
          setFiles(mockData);
          setHasMore(false);
          setUsingMockData(true);
        } else {
          if (append) {
            setFiles((prev) => [...prev, ...transformedData]);
          } else {
            setFiles(transformedData);
          }

          setHasMore(transformedData.length === limit);

          if (usingMockData && transformedData.length > 0) {
            setUsingMockData(false);
          }
        }
      } catch (err) {
        console.error('[useFiles] Failed to fetch files:', err);

        // In development, fall back to mock data on error
        if (
          __DEV__ &&
          !append &&
          currentOffset === 0 &&
          !conversationId &&
          !extension
        ) {
          console.log('[useFiles] Falling back to mock data due to error.');
          const mockData = generateMockFiles(12, 0);
          setFiles(mockData);
          setHasMore(false);
          setUsingMockData(true);
          setError(null);
        } else {
          setError(err instanceof Error ? err : new Error('Failed to fetch files'));
        }
      } finally {
        setLoading(false);
      }
    },
    [tenantId, conversationId, extension, limit, usingMockData, getMimeTypeFilter]
  );

  /**
   * Load initial data and when filters change
   */
  useEffect(() => {
    setOffset(0);
    setHasMore(true);
    setUsingMockData(false);
    void fetchFiles(0, false);
  }, [fetchFiles]);

  /**
   * Load more files for pagination
   */
  const loadMore = useCallback(() => {
    if (loading || !hasMore || usingMockData) {
      return;
    }

    const newOffset = offset + limit;
    setOffset(newOffset);
    void fetchFiles(newOffset, true);
  }, [loading, hasMore, offset, limit, fetchFiles, usingMockData]);

  /**
   * Refresh the file list
   */
  const refresh = useCallback(() => {
    setOffset(0);
    setHasMore(true);
    setUsingMockData(false);
    void fetchFiles(0, false);
  }, [fetchFiles]);

  return {
    files,
    loading,
    error,
    hasMore,
    loadMore,
    refresh,
  };
}

/**
 * Hook for getting a single file by ID
 */
export function useFile(
  fileId: string | null,
  tenantId: string | null
): {
  file: FileAttachment | null;
  loading: boolean;
  error: Error | null;
} {
  const [file, setFile] = useState<FileAttachment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!fileId || !tenantId) {
      setLoading(false);
      return;
    }

    const fetchFile = async () => {
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
            file_type,
            created_at,
            message:messages!inner (
              id,
              conversation_id,
              sender_id,
              conversation:conversations!inner (
                id,
                name,
                type
              ),
              sender:memberships!messages_sender_id_fkey (
                id,
                user:users!memberships_user_id_fkey (
                  display_name
                )
              )
            )
          `
          )
          .eq('id', fileId)
          .eq('tenant_id', tenantId)
          .single();

        if (queryError) {
          throw queryError;
        }

        const raw = data as unknown as RawAttachmentData;
        const transformed = transformAttachment(raw);

        if (isDocumentMimeType(transformed.mimeType)) {
          setFile(transformed);
        } else {
          setError(new Error('Not a document file'));
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch file'));
      } finally {
        setLoading(false);
      }
    };

    void fetchFile();
  }, [fileId, tenantId]);

  return { file, loading, error };
}
