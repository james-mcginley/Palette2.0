import type { MediaItem } from '@/lib/types/media';

export type OnboardingStackParamList = {
  Welcome: undefined;
  ImportLists: undefined;
  PickLovedTitles: undefined;
  PickGenres: undefined;
  FollowPeople: undefined;
};

export type MainTabParamList = {
  Feed: undefined;
  Friends: undefined;
  Add: undefined;
  Discover: undefined;
  Library: undefined;
};

export type RootStackParamList = {
  Onboarding: undefined;
  Main: undefined;
  Mailbox: undefined;
  Profile: { userId?: string } | undefined;
  Settings: undefined;
  MediaDetail: { mediaId: string; media?: MediaItem };
  QuickCapture: undefined;
  LogSheet: { media: MediaItem };
  CuratorPath: { pathId: string };
  CurationDetail: { curationId: string; title?: string };
  FindPeople: undefined;
  Terms: undefined;
  Asks: undefined;
  AskDetail: { askId: string; question?: string };
};
