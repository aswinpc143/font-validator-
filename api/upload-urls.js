export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // For Vercel, we'll handle file upload differently
    // This is a simplified version - in production you'd use a proper file upload service
    const { content } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'File content is required' });
    }
    
    const urls = content.split('\n')
      .map(url => url.trim())
      .filter(url => url.length > 0 && url.startsWith('http'));
    
    res.json({ urls });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to process file' });
  }
}