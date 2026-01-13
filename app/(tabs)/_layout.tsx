import { Platform } from 'react-native';
import { NativeTabs, Icon, Label, VectorIcon } from 'expo-router/unstable-native-tabs';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { useTranslation } from '@/i18n';

export default function TabLayout() {
  const { loading } = useAuthGuard();
  const { t } = useTranslation();

  if (loading) return null;

  return (
    <NativeTabs
      minimizeBehavior="onScrollDown"
      labelStyle={{
        color: Platform.select({
          ios: 'rgba(0, 0, 0, 1)',
          android: '#000000',
        }),
      }}
      tintColor={Platform.select({
        ios: 'rgba(0, 0, 0, 1)',
        android: '#000000',
      })}
    >
      {/* Home Tab */}
      <NativeTabs.Trigger name="index">
        <Label>{t('nav.home')}</Label>
        {Platform.select({
          ios: <Icon sf={{ default: 'house', selected: 'house.fill' }} />,
          android: <Icon src={<VectorIcon family={Ionicons} name="home" />} />,
        })}
      </NativeTabs.Trigger>

      {/* Chat Tab */}
      <NativeTabs.Trigger name="chat">
        <Label>{t('nav.chat')}</Label>
        <Icon
          src={{
            default: require('../../assets/chat-not-filled.png'),
            selected: require('../../assets/chat-icon.png'),
          }}
        />
      </NativeTabs.Trigger>

      {/* Prayer Tab - uses custom image */}
      <NativeTabs.Trigger name="prayer">
        <Label>{t('nav.prayer')}</Label>
        <Icon
          src={{
            default: require('../../assets/hands-not-filled.png'),
            selected: require('../../assets/hands.png'),
          }}
        />
      </NativeTabs.Trigger>

      {/* More Tab */}
      <NativeTabs.Trigger name="more">
        <Label>{t('nav.more')}</Label>
        <Icon
          src={{
            default: require('../../assets/fainted-three-dots.png'),
            selected: require('../../assets/three-dots.png'),
          }}
        />
      </NativeTabs.Trigger>

      {/* Search Tab - separate button on iOS 18+ */}
      <NativeTabs.Trigger name="search" role="search">
        <Label>{t('common.search')}</Label>
        {Platform.select({
          ios: <Icon sf="magnifyingglass" />,
          android: <Icon src={<VectorIcon family={Ionicons} name="search" />} />,
        })}
      </NativeTabs.Trigger>

    </NativeTabs>
  );
}
