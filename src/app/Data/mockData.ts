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
    duration: 20,
    narratorId: 'v1',
    artwork: '🐰',
    progress: 10,
    isFavorite: true,
    language: 'English',
    script:
      'Once upon a time a little rabbit hopped through a moonlit forest. Soft leaves whispered goodnight as the rabbit found a warm burrow and drifted to sleep.',
  },
  {
    id: 's2',
    title: 'The Lion & The Rabbit',
    description: 'A classic tale of wit, wisdom, and unlikely friends.',
    category: 'Animals',
    duration: 20,
    narratorId: 'v2',
    artwork: '🦁',
    progress: 0,
    isFavorite: false,
    language: 'English',
    script:
      'A mighty lion met a clever little rabbit by the river. The rabbit used wit and kindness, and the two became the most unlikely friends in the jungle.',
  },
  {
    id: 's3',
    title: 'Aarav Goes to the Moon',
    description: 'Fly high above the stars to collect glowing bedtime dreams.',
    category: 'Adventure',
    duration: 20,
    narratorId: 'v1',
    artwork: '🚀',
    progress: 0,
    isFavorite: true,
    language: 'English',
    script:
      'Aarav climbed into a silver rocket and flew above the stars. On the moon he collected glowing bedtime dreams and brought them home for a cozy night.',
  },
];
