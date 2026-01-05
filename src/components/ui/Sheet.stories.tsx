import type { Meta } from '@storybook/react-native';
import { Sheet } from './Sheet';
import { Button } from './Button';
import { Text } from './Text';
import { useState } from 'react';

/**
 * Sheet component stories demonstrating bottom sheet behavior.
 */
export default {
  title: 'Components/Sheet',
  component: Sheet,
} as Meta;

export const Default = {
  render: function DefaultStory() {
    const [open, setOpen] = useState(false);
    return (
      <>
        <Button labelKey="common.confirm" onPress={() => setOpen(true)} />
        <Sheet open={open} onOpenChange={setOpen}>
          <Sheet.Content>
            <Text i18nKey="common.app_name" />
          </Sheet.Content>
        </Sheet>
      </>
    );
  },
};

export const WithSnapPoints = {
  render: function SnapPointsStory() {
    const [open, setOpen] = useState(false);
    return (
      <>
        <Button labelKey="common.confirm" onPress={() => setOpen(true)} />
        <Sheet
          open={open}
          onOpenChange={setOpen}
          snapPoints={[25, 50, 75]}
          defaultSnapPoint={1}
        >
          <Sheet.Content padding="$4">
            <Text i18nKey="common.app_name" mb="$2" />
            <Text i18nKey="common.loading" color="muted" />
          </Sheet.Content>
        </Sheet>
      </>
    );
  },
};

export const Fullscreen = {
  render: function FullscreenStory() {
    const [open, setOpen] = useState(false);
    return (
      <>
        <Button labelKey="common.confirm" onPress={() => setOpen(true)} />
        <Sheet open={open} onOpenChange={setOpen} snapPoints={[100]} dismissOnSnapToBottom={false}>
          <Sheet.Content padding="$4">
            <Text i18nKey="common.app_name" mb="$2" />
            <Text i18nKey="common.loading" color="muted" />
          </Sheet.Content>
        </Sheet>
      </>
    );
  },
};

export const WithActions = {
  render: function ActionsStory() {
    const [open, setOpen] = useState(false);
    return (
      <>
        <Button labelKey="common.confirm" onPress={() => setOpen(true)} />
        <Sheet
          open={open}
          onOpenChange={setOpen}
          confirmLabelKey="common.save"
          cancelLabelKey="common.cancel"
          onConfirm={() => {
            console.log('Confirmed');
            setOpen(false);
          }}
          onCancel={() => setOpen(false)}
        >
          <Sheet.Content padding="$4">
            <Text i18nKey="common.app_name" mb="$2" />
            <Text i18nKey="common.loading" color="muted" />
          </Sheet.Content>
        </Sheet>
      </>
    );
  },
};

export const WithoutBackdrop = {
  render: function NoBackdropStory() {
    const [open, setOpen] = useState(false);
    return (
      <>
        <Button labelKey="common.confirm" onPress={() => setOpen(true)} />
        <Sheet open={open} onOpenChange={setOpen} backdrop={false}>
          <Sheet.Content padding="$4">
            <Text i18nKey="common.app_name" mb="$2" />
            <Text i18nKey="common.loading" color="muted" />
          </Sheet.Content>
        </Sheet>
      </>
    );
  },
};

export const WithHeader = {
  render: function HeaderStory() {
    const [open, setOpen] = useState(false);
    return (
      <>
        <Button labelKey="common.confirm" onPress={() => setOpen(true)} />
        <Sheet open={open} onOpenChange={setOpen}>
          <Sheet.Header>
            <Text i18nKey="common.app_name" weight="semibold" size="lg" />
          </Sheet.Header>
          <Sheet.Content padding="$4">
            <Text i18nKey="common.loading" color="muted" />
          </Sheet.Content>
        </Sheet>
      </>
    );
  },
};

export const NonDismissable = {
  render: function NonDismissableStory() {
    const [open, setOpen] = useState(false);
    return (
      <>
        <Button labelKey="common.confirm" onPress={() => setOpen(true)} />
        <Sheet
          open={open}
          onOpenChange={setOpen}
          dismissible={false}
          confirmLabelKey="common.save"
          onConfirm={() => setOpen(false)}
        >
          <Sheet.Content padding="$4">
            <Text i18nKey="common.app_name" mb="$2" />
            <Text i18nKey="common.loading" color="muted" />
          </Sheet.Content>
        </Sheet>
      </>
    );
  },
};
