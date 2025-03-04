addEventListener('fetch', event => {
    // Pass the entire event to handleRequest
    event.respondWith(handleRequest(event));
  });
  
  const mimeTypes = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.webm': 'video/webm',
    // Add more MIME types as needed
  };
  
  async function handleRequest(event) {
    const request = event.request; // Extract the request from the event
    try {
      const url = new URL(request.url);
      console.log(`Request URL: ${url.href}`); // Log the full request URL
  
      if (url.pathname.startsWith('/images/')) {
        const cache = caches.default;
        let response = await cache.match(request);
        if (!response) {
          // Remove '/images/' prefix to get the correct object key
          const objectKey = url.pathname.replace(/^\/images\//, '');
          console.log(`Object Key: ${objectKey}`); // For debugging
  
          // Fetch the object from the R2 bucket
          const object = await R2_BUCKET.get(objectKey);
          if (object === null) {
            console.error(`Object not found in R2 bucket: ${objectKey}`);
            return new Response('Not Found', { status: 404 });
          }
  
          const extensionMatch = objectKey.match(/\.[^.]+$/);
          const extension = extensionMatch ? extensionMatch[0] : '';
          console.log(`File Extension: ${extension}`); // Log the file extension
  
          const contentType = mimeTypes[extension] || 'application/octet-stream';
          console.log(`Content Type: ${contentType}`); // Log the content type
  
          const headers = new Headers();
          headers.set('Content-Type', contentType);
          headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  
          response = new Response(object.body, { headers });
          // Store the response in the cache
          event.waitUntil(cache.put(request, response.clone()));
        } else {
          console.log('Cache hit');
        }
        return response;
      } else {
        console.error(`Invalid request path: ${url.pathname}`);
        return new Response('Not Found', { status: 404 });
      }
    } catch (error) {
      console.error('Error in Worker:', error.message);
      console.error(error.stack);
      return new Response('Internal Server Error', { status: 500 });
    }
  }
  