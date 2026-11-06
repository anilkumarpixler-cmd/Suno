import { Story, StoryLanguage } from '../Types';

export type StoryAlbum = { language: StoryLanguage; label: string; icon: string };

/** One album per story language, in the order Albums shows them. */
export const STORY_ALBUMS: StoryAlbum[] = [
  { language: 'English', label: 'English', icon: '🇬🇧' },
  { language: 'Hindi', label: 'हिंदी', icon: '🇮🇳' },
  { language: 'Hinglish', label: 'Hinglish', icon: '🗣️' },
];

/** Built-in and older stories have no language: they are spoken (and grouped) as English. */
export const storyLanguage = (story: Story): StoryLanguage => story.language || 'English';

export const albumLabel = (language: StoryLanguage) =>
  STORY_ALBUMS.find((album) => album.language === language)?.label ?? language;
