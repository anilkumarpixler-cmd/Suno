export {
	STORIES_STORAGE_KEY,
	getStories,
	getStoryById,
	saveStory,
	updateStory,
	deleteStory,
	clearStories,
} from './storyStorage';

export type { Story } from '../app/Types';

export {
	VOICES_STORAGE_KEY,
	getVoices,
	saveVoice,
	updateVoice,
	deleteVoice,
} from './voiceStorage';
