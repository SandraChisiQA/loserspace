export default function handler(req: any, res: any) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { url } = req;

  if (url === '/') {
    res.status(200).json({
      message: 'Losers API is running - BASIC TEST',
      status: 'ok',
      timestamp: new Date().toISOString(),
      url: url,
      method: req.method
    });
    return;
  }

  if (url === '/api/posts' || url.startsWith('/api/posts')) {
    res.status(200).json({
      posts: [
        { id: 1, title: 'Test Post', content: 'This is a test', category: 'GENERAL' }
      ],
      message: 'Basic test data',
      url: url
    });
    return;
  }

  // Default 404
  res.status(404).json({
    error: 'Not Found',
    url: url,
    message: 'Basic handler working but route not found'
  });
}