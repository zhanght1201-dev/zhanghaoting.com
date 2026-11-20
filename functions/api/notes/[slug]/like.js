import { handleVisitorRequest } from '../../../../lib/visitor-api.js';
export const onRequest = context => handleVisitorRequest(context, 'like');
