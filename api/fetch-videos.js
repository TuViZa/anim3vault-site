import fetch from 'node-fetch';

const API_KEY = process.env.YT_API_KEY;

const PLAYLISTS = {
  donghua: "PLbTlJpronU8_GMDGyQlawguePVZVNnxNO",
  news: "PLbTlJpronU89p4fsTtmbW_bNgcJonX2ae",
  anim3: "PLbTlJpronU8_-c2M_G7P4VwtBJTn1S0wk"
};

const DONGHUA_TITLES = [
  "Unusual News from the City of sky", "Heaven swallow", "Wukong", "Against the sky supreme",
  "Supreme god emperor", "Swallowed star", "Stellar transformations", "My senior brother is too strong",
  "Ten thousand worlds", "One hundred thousand years of Qi Training", "Martial master",
  "Spirit sword sovereign", "A will eternal", "Shrouding The Heavens", "The immortal Doctor in Modern City",
  "Throne of seal", "Jade dynasty", "Embers", "The all devouring whale", "Perfect worlds",
  "Soul land 2", "Laid off demon", "Strongest upgrade", "Immortal ascension",
  "Battle through the heavens", "Tales of herding gods", "Renegade immortal", "Peerless soul"
];

const isValidVideo = (v) => (
  v?.snippet?.title &&
  !v.snippet.title.toLowerCase().includes("deleted") &&
  !v.snippet.title.toLowerCase().includes("private") &&
  v.snippet.resourceId?.videoId
);

async function fetchAllVideos(playlistId) {
  let videos = [], nextPage = '';
  try {
    while (true) {
      const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${playlistId}&pageToken=${nextPage}&key=${API_KEY}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok || !data.items) break;
      videos.push(...data.items);
      if (!data.nextPageToken) break;
      nextPage = data.nextPageToken;
    }
  } catch (e) {
    console.error("YouTube API fetch error:", e.message);
    return null;
  }
  return videos.filter(isValidVideo);
}

function matchTitle(title, keyword) {
  return title.toLowerCase().includes(keyword.toLowerCase());
}

export default async function handler(req, res) {
  const { type = 'donghua' } = req.query;
  const playlistId = PLAYLISTS[type];

  if (!playlistId) {
    return res.status(400).json({ error: "Invalid playlist type." });
  }

  const videos = await fetchAllVideos(playlistId);
  if (!videos) {
    return res.status(500).json({ error: "Failed to fetch videos." });
  }

  const added = new Set();

  // For flat list (anim3)
  if (type === "anim3") {
    const mixed = videos.filter(v => {
      const id = v.snippet.resourceId.videoId;
      if (added.has(id)) return false;
      added.add(id);
      return true;
    });
    return res.status(200).json({ mixed });
  }

  // For grouped (donghua/news)
  const grouped = {}, mixed = [];
  for (const keyword of DONGHUA_TITLES) {
    grouped[keyword] = [];
  }

  for (const v of videos) {
    const id = v.snippet.resourceId.videoId;
    const title = v.snippet.title;
    if (added.has(id)) continue;

    let matched = false;
    for (const keyword of DONGHUA_TITLES) {
      if (matchTitle(title, keyword)) {
        grouped[keyword].push(v);
        matched = true;
        break;
      }
    }

    if (!matched) mixed.push(v);
    added.add(id);
  }

  return res.status(200).json({ grouped, mixed });
}
