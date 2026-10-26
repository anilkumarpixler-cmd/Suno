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
	getStoryChanges,
} from './storyStorage';

export type { StoryChanges } from './storyStorage';

export type { Story } from '../Types';
