import { handleNoteLikeCounts } from '../../lib/note-like-counts.js';
export const onRequest = context => handleNoteLikeCounts(context);
