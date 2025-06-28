export default async function handler(req, res) {
  const API_KEY = process.env.YT_API_KEY;
  const playlistId = req.query.playlistId;
  const maxResults = req.query.maxResults || 20;

  const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=${maxResults}&key=${API_KEY}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch videos' });
  }
}
