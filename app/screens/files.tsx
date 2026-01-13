/**
 * Files screen.
 *
 * Displays a list of all document files (PDF, DOC, PPT, XLS, etc.) from conversations.
 * Features:
 * - Filter chips by file type (All, PDF, DOC, PPT, XLS)
 * - List view with file icon, name, conversation, and timestamp
 * - Search functionality
 * - File open/download on tap
 *
 * Route: /screens/files
 */

import { useCallback, useMemo, useState } from 'react';
import { LayoutChangeEvent, Pressable, ScrollView, StyleSheet, View, TextInput as RNTextInput, Dimensions, Image } from 'react-native';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Text as TamaguiText, XStack, YStack, Stack } from 'tamagui';
import { useRequireAuth } from '@/hooks/useAuthGuard';
import { useFiles } from '@/features/files/hooks';
import type { FileAttachment, FileExtension } from '@/types/database';
import { useTranslation } from '@/i18n';
import { SafeScreen } from '@/components/SafeScreen';
import { Container } from '@/components/ui';

// ============================================================================
// TYPES
// ============================================================================

type FilterType = 'all' | FileExtension;

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 44,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
  },
  headerSeparator: {
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    height: 36,
  },
  chipsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    gap: 8,
    backgroundColor: '#FFFFFF',
    minHeight: 44,
  },
  chipsListSeparator: {
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
  },
  chip: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: 'transparent',
    minHeight: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipActive: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '400',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  chipTextInactive: {
    color: '#888888',
  },
  listContainer: {
    flex: 1,
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 0,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.06)',
    justifyContent: 'center',
  },
  fileRowPressed: {
    backgroundColor: '#F9FAFB',
  },
  fileIconImage: {
    width: 32,
    height: 32,
    marginRight: 10,
  },
  fileIconFallback: {
    width: 32,
    height: 32,
    borderRadius: 4,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  fileInfo: {
    flex: 1,
    gap: 0,
  },
  fileName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#11181C',
    lineHeight: 20,
  },
  conversationName: {
    fontSize: 13,
    fontWeight: '400',
    color: '#888888',
    lineHeight: 16,
    marginTop: 2,
  },
  timestamp: {
    fontSize: 10,
    color: '#999999',
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 15,
    color: '#888888',
    textAlign: 'center',
  },
});

// ============================================================================
// FILE TYPE ICONS
// ============================================================================

function getFileIconAsset(extension: FileExtension): number | undefined {
  const assetMap: Record<string, number> = {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    pdf: require('../../assets/pdf.png'),
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    doc: require('../../assets/doc.png'),
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    docx: require('../../assets/doc.png'),
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    ppt: require('../../assets/ppt.png'),
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    pptx: require('../../assets/ppt.png'),
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    xls: require('../../assets/xls.png'),
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    xlsx: require('../../assets/xls.png'),
  };
  return assetMap[extension];
}

// ============================================================================
// HEADER COMPONENT
// ============================================================================

interface HeaderProps {
  onBack: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearchToggle: () => void;
  searchExpanded: boolean;
  headerWidth: number;
  onLayout: (e: LayoutChangeEvent) => void;
}

function Header({
  onBack,
  searchQuery,
  onSearchChange,
  onSearchToggle,
  searchExpanded,
  headerWidth,
  onLayout,
}: HeaderProps) {
  const { t } = useTranslation();

  return (
    <XStack style={styles.header} onLayout={onLayout}>
      {/* Back button + Title */}
      <XStack alignItems="center" flex={1}>
        <Pressable
          testID="files-back-button"
          onPress={onBack}
          style={styles.backButton}
          accessibilityLabel={t('common.back')}
          accessibilityRole="button"
        >
          <Ionicons name="chevron-back" size={24} color="#11181C" />
        </Pressable>
        {!searchExpanded && (
          <TamaguiText
            fontSize={17}
            fontWeight="600"
            color="#000000"
            marginLeft="$2"
          >
            {t('files.title')}
          </TamaguiText>
        )}
      </XStack>

      {/* Search field / icon */}
      {searchExpanded ? (
        <XStack
          flex={1}
          marginLeft={12}
          alignItems="center"
          paddingHorizontal={12}
          style={[
            styles.searchContainer,
            { maxWidth: Math.min(headerWidth - 120, 200) },
          ]}
        >
          <Ionicons name="search-outline" size={16} color="#999999" />
          <Stack flex={1}>
            <RNTextInput
              testID="files-search-input"
              value={searchQuery}
              onChangeText={onSearchChange}
              placeholder={t('files.search_placeholder')}
              placeholderTextColor="#999999"
              style={{
                flex: 1,
                fontSize: 15,
                color: '#000000',
                paddingHorizontal: 6,
                paddingVertical: 0,
                height: 36,
              }}
              autoFocus
              selectTextOnFocus
            />
          </Stack>
          <Pressable onPress={onSearchToggle} hitSlop={4}>
            <Ionicons name="close" size={16} color="#999999" />
          </Pressable>
        </XStack>
      ) : (
        <Pressable
          testID="files-search-button"
          onPress={onSearchToggle}
          style={styles.backButton}
          accessibilityLabel={t('files.search')}
          accessibilityRole="button"
        >
          <Ionicons name="search-outline" size={24} color="#333333" />
        </Pressable>
      )}
    </XStack>
  );
}

// ============================================================================
// FILTER CHIPS COMPONENT
// ============================================================================

interface FilterChipsProps {
  selectedFilter: FilterType;
  onSelectFilter: (filter: FilterType) => void;
}

function FilterChips({ selectedFilter, onSelectFilter }: FilterChipsProps) {
  const { t } = useTranslation();

  const filters: { type: FilterType; label: string }[] = [
    { type: 'all', label: t('files.filters.all') },
    { type: 'pdf', label: 'PDF' },
    { type: 'doc', label: 'DOC' },
    { type: 'ppt', label: 'PPT' },
    { type: 'xls', label: 'XLS' },
  ];

  return (
    <View style={styles.chipsContainer} testID="files-filter-chips">
      {filters.map((filter) => (
        <Pressable
          key={filter.type}
          testID={`files-filter-${filter.type}`}
          onPress={() => onSelectFilter(filter.type)}
          style={({ pressed }) => [
            styles.chip,
            selectedFilter === filter.type && styles.chipActive,
            pressed && { opacity: 0.7 },
          ]}
          accessibilityLabel={`${filter.label} ${selectedFilter === filter.type ? t('files.selected') : ''}`}
          accessibilityRole="button"
          accessibilityState={{ selected: selectedFilter === filter.type }}
        >
          <TamaguiText
            style={[
              styles.chipText,
              selectedFilter === filter.type ? styles.chipTextActive : styles.chipTextInactive,
            ]}
          >
            {filter.label}
          </TamaguiText>
        </Pressable>
      ))}
    </View>
  );
}

// ============================================================================
// FILE ROW COMPONENT
// ============================================================================

interface FileRowProps {
  file: FileAttachment;
  onPress: (file: FileAttachment) => void;
  height: number;
}

function FileRow({ file, onPress, height }: FileRowProps) {
  const { t } = useTranslation();
  const iconAsset = getFileIconAsset(file.extension);

  return (
    <Pressable
      testID={`files-row-${file.id}`}
      onPress={() => onPress(file)}
      style={({ pressed }) => [
        styles.fileRow,
        { height },
        pressed && styles.fileRowPressed,
      ]}
      accessibilityLabel={`${file.fileName}, ${file.conversationName || t('files.unknown_conversation')}`}
      accessibilityRole="button"
    >
      {/* File type icon */}
      {iconAsset ? (
        <Image source={iconAsset} style={styles.fileIconImage} resizeMode="contain" />
      ) : (
        <View style={styles.fileIconFallback}>
          <Ionicons name="document-outline" size={20} color="#999999" />
        </View>
      )}

      {/* File info */}
      <View style={styles.fileInfo}>
        <TamaguiText style={styles.fileName} numberOfLines={1}>
          {file.fileName}
        </TamaguiText>
        <TamaguiText style={styles.conversationName} numberOfLines={1}>
          {file.conversationName || t('files.unknown_conversation')}
        </TamaguiText>
      </View>

      {/* Timestamp */}
      <TamaguiText style={styles.timestamp}>
        {formatTimestamp(file.createdAt)}
      </TamaguiText>
    </Pressable>
  );
}

/**
 * Format timestamp for display
 */
function formatTimestamp(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    // Today - show time
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  } else if (diffDays < 365) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
}

// ============================================================================
// EMPTY STATE COMPONENT
// ============================================================================

interface EmptyStateProps {
  message: string;
}

function EmptyState({ message }: EmptyStateProps) {
  return (
    <View style={styles.emptyContainer} testID="files-empty-state">
      <Ionicons name="document-outline" size={48} color="#CCCCCC" />
      <TamaguiText style={styles.emptyText}>{message}</TamaguiText>
    </View>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function FilesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { tenantId } = useRequireAuth();

  // State
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('all');
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [headerWidth, setHeaderWidth] = useState(0);
  const [listHeight, setListHeight] = useState(0);

  // Convert filter to extension for query
  const extensionFilter = useMemo((): FileExtension | null => {
    if (selectedFilter === 'all') return null;
    return selectedFilter;
  }, [selectedFilter]);

  // Fetch files
  const { files, loading } = useFiles(tenantId, {
    extension: extensionFilter,
  });

  // Filter files by search query, max 8 displayed
  const displayFiles = useMemo(() => {
    let result = files;
    if (!searchQuery.trim()) {
      result = files;
    } else {
      const query = searchQuery.toLowerCase();
      result = files.filter(
        (file) =>
          file.fileName.toLowerCase().includes(query) ||
          file.conversationName?.toLowerCase().includes(query)
      );
    }
    return result.slice(0, 8);
  }, [files, searchQuery]);

  // Calculate row height based on available list space (8 rows max)
  const rowHeight = useMemo(() => {
    if (listHeight > 0) {
      return listHeight / Math.min(displayFiles.length || 1, 8);
    }
    // Fallback: screen height minus header and chips, divided by 8
    const screenHeight = Dimensions.get('window').height;
    const estimatedAvailable = screenHeight - 44 - 44 - 60; // header + separator + chips
    return estimatedAvailable / 8;
  }, [listHeight, displayFiles.length]);

  // Handlers
  const handleBack = useCallback(() => {
    router.replace('/more' as any);
  }, [router]);

  const handleSearchToggle = useCallback(() => {
    if (searchExpanded) {
      setSearchExpanded(false);
      setSearchQuery('');
    } else {
      setSearchExpanded(true);
    }
  }, [searchExpanded]);

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const handleHeaderLayout = useCallback((e: LayoutChangeEvent) => {
    setHeaderWidth(e.nativeEvent.layout.width);
  }, []);

  const handleFilePress = useCallback(
    (file: FileAttachment) => {
      // Try to open the file URL
      const openFile = async () => {
        try {
          const supported = await Linking.canOpenURL(file.uri);
          if (supported) {
            await Linking.openURL(file.uri);
          } else {
            console.log('[FilesScreen] Cannot open URL:', file.uri);
          }
        } catch (err) {
          console.error('[FilesScreen] Error opening file:', err);
        }
      };

      void openFile();
    },
    []
  );

  const ListHeaderComponent = useCallback(
    () => (
      <>
        <Header
          onBack={handleBack}
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          onSearchToggle={handleSearchToggle}
          searchExpanded={searchExpanded}
          headerWidth={headerWidth}
          onLayout={handleHeaderLayout}
        />
        <View style={styles.headerSeparator} />
        <FilterChips selectedFilter={selectedFilter} onSelectFilter={setSelectedFilter} />
      </>
    ),
    [handleBack, handleSearchChange, handleSearchToggle, handleHeaderLayout, searchQuery, searchExpanded, headerWidth, selectedFilter]
  );

  // Empty state
  if (!loading && displayFiles.length === 0) {
    const emptyMessage = searchQuery
      ? t('files.no_results')
      : selectedFilter === 'all'
        ? t('files.empty')
        : t('files.no_files_for_type');

    return (
      <SafeScreen>
        <Container testID="files-screen" flex={1} backgroundColor="#F5F5F5">
          <ListHeaderComponent />
          <EmptyState message={emptyMessage} />
        </Container>
      </SafeScreen>
    );
  }

  return (
    <SafeScreen>
      <Container testID="files-screen" flex={1} backgroundColor="#F5F5F5">
        <ListHeaderComponent />

        {/* File list - scrollable with calculated row heights */}
        <ScrollView
          style={{ flex: 1 }}
          onLayout={(e) => setListHeight(e.nativeEvent.layout.height)}
        >
          {displayFiles.map((file) => (
            <FileRow
              key={file.id}
              file={file}
              onPress={handleFilePress}
              height={rowHeight}
            />
          ))}
        </ScrollView>
      </Container>
    </SafeScreen>
  );
}
