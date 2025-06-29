const API_KEY = process.env.YT_API_KEY;

const PLAYLISTS = {
  donghua: "PLbTlJpronU8_GMDGyQlawguePVZVNnxNO",
  anim3: "PLbTlJpronU8_-c2M_G7P4VwtBJTn1S0wk"
};

export default async function handler(req, res) {
  const { type = "donghua" } = req.query;
  const playlistId = PLAYLISTS[type];
  if (!playlistId) return res.status(400).json({ error: 'Invalid playlist type for latest.' });

  try {
    const items = await fetchAllVideos(playlistId);
    const filtered = items
      .filter(v => v.snippet?.publishedAt && !v.snippet.title.toLowerCase().includes("deleted") && !v.snippet.title.toLowerCase().includes("private"))
      .sort((a, b) => new Date(b.snippet.publishedAt) - new Date(a.snippet.publishedAt))
      .slice(0, 20);

    return res.status(200).json({ latest: filtered });
  } catch (e) {
    console.error("Latest fetch error:", e);
    return res.status(500).json({ error: e.message });
  }
}

async function fetchAllVideos(playlistId) {
  let items = [], pageToken = '';
  do {
    const res = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${playlistId}&pageToken=${pageToken}&key=${API_KEY}`);
    const data = await res.json();
    if (!data.items) break;
    items.push(...data.items);
    pageToken = data.nextPageToken || '';
  } while (pageToken);
  return items;
}
