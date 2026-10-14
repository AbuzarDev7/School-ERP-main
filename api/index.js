import app from '../server/app.js';

// Vercel supports Express apps directly. 
// By exporting the app instance, the Vercel Node.js runtime 
// handles the request/response lifecycle automatically.
export default app;