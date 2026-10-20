export {
	STORIES_STORAGE_KEY,
	getStories,
	getStoryById,
	saveStory,
	updateStory,
	deleteStory,
	clearStories,
	getDeletedStoryIds,
	markStoryDeleted,
} from './storyStorage';

export type { Story } from '../Types';
