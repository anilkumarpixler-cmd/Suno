import { Child, Voice, Story } from '../Types';

export const initialChild: Child = {
  id: 'c1',
  name: 'Aarav',
  avatar: '👦🏻',
};

export const initialVoices: Voice[] = [
  {
    id: 'v1',
    name: 'Mummy',
    languages: ['Hindi', 'English'],
    status: 'Ready',
    isDefault: true,
    avatar: '👩🏽',
  },
  {
    id: 'v2',
    name: 'Papa',
    languages: ['English'],
    status: 'Ready',
    isDefault: false,
    avatar: '👨🏽',
  },
  {
    id: 'v3',
    name: 'Nani',
    languages: ['Hindi'],
    status: 'Ready',
    isDefault: false,
    avatar: '👵🏽',
  },
];

export const initialStories: Story[] = [
  {
    id: 's1',
    title: 'The Little Rabbit',
    description: 'A quiet bedtime adventure through the cozy moonlit forest.',
    category: 'Bedtime',
    duration: 300,
    narratorId: 'v1',
    artwork: '🐰',
    progress: 120,
    isFavorite: true,
  },
  {
    id: 's2',
    title: 'The Lion & The Rabbit',
    description: 'A classic tale of wit, wisdom, and unlikely friends.',
    category: 'Animals',
    duration: 240,
    narratorId: 'v2',
    artwork: '🦁',
    progress: 0,
    isFavorite: false,
  },
  {
    id: 's3',
    title: 'Aarav Goes to the Moon',
    description: 'Fly high above the stars to collect glowing bedtime dreams.',
    category: 'Adventure',
    duration: 360,
    narratorId: 'v1',
    artwork: '🚀',
    progress: 0,
    isFavorite: true,
  },
];