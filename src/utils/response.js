/**
 * Response Helper
 * Unified response handler for both Node.js HTTP and Vercel serverless functions
 */

/**
 * Send JSON response that works with both Node.js and Vercel
 */
export function sendJson(res, statusCode, data) {
  // Vercel serverless response (has .status() method)
  if (typeof res.status === 'function') {
    res.status(statusCode).json(data);
  }
  // Node.js HTTP response
  else {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  }
}

/**
 * Send text response
 */
export function sendText(res, statusCode, text) {
  // Vercel serverless response
  if (typeof res.status === 'function') {
    res.status(statusCode).send(text);
  }
  // Node.js HTTP response
  else {
    res.writeHead(statusCode, { 'Content-Type': 'text/plain' });
    res.end(text);
  }
}
