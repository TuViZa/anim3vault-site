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
  "Spirit sword sovereign", "A will eternal", "Shrouding The Heavens", "immortal Doctor in Modern City",
  "Throne of seal", "Jade dynasty", "Embers", "The all devouring whale", "Perfect world",
  "Soul land 2", "Laid off demon", "Strongest upgrade", "Immortal ascension",
  "Battle through the heavens", "Tales of herding gods", "Renegade immortal", "Peerless soul",
  "mo-tian records", "lord of mysteries", "above the kingdom of god"
];

function titleMatches(title, keyword) {
  return title.toLowerCase().includes(keyword.toLowerCase());
}

export default async function handler(req, res) {
  const { type = "donghua" } = req.query;
  const playlistId = PLAYLISTS[type];
  if (!playlistId) return res.status(400).json({ error: 'Invalid playlist type.' });

  let items = [], pageToken = '';
  try {
    do {
      const ytRes = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${playlistId}&pageToken=${pageToken}&key=${API_KEY}`);
      const data = await ytRes.json();
      if (!data.items) break;
      items.push(...data.items);
      pageToken = data.nextPageToken || '';
    } while (pageToken);

    const addedIds = new Set();
    const grouped = {};
    const mixed = [];
    const latest = [];

    // Initialize groups (for donghua only)
    if (type === "donghua") {
      for (let keyword of DONGHUA_TITLES) {
        grouped[keyword] = [];
      }
    }

    for (let v of items) {
      const title = v.snippet?.title || "";
      const id = v.snippet?.resourceId?.videoId;
      if (!title || !id || title.toLowerCase().includes("deleted") || title.toLowerCase().includes("private") || addedIds.has(id)) continue;

      let matched = false;
      if (type === "donghua") {
        for (let keyword of DONGHUA_TITLES) {
  if (title.toLowerCase().includes(keyword.toLowerCase())) {
    grouped[keyword].push(v);
    matched = true;
  }
}

      }

      if (!matched) mixed.push(v);
      addedIds.add(id);
    }

    // Add LATEST for anim3 or donghua
    if (type === "donghua" || type === "anim3") {
      const sorted = [...items].filter(v => v.snippet?.publishedAt).sort((a, b) =>
        new Date(b.snippet.publishedAt) - new Date(a.snippet.publishedAt)
      );
      latest.push(...sorted.slice(0, 20));
    }

    // Sort group order (donghua only) based on newest video timestamp
    if (type === "donghua") {
  const sortedGroups = Object.entries(grouped)
    .filter(([_, vids]) => vids.length > 0)
    .map(([name, vids]) => ({
      name,
      videos: vids.sort((a, b) => new Date(b.snippet.publishedAt) - new Date(a.snippet.publishedAt)),
      latestTime: Math.max(...vids.map(v => new Date(v.snippet.publishedAt).getTime()))
    }))
    .sort((a, b) => b.latestTime - a.latestTime);

  const sortedGrouped = {};
  for (const group of sortedGroups) {
    sortedGrouped[group.name] = group.videos;
  }

  // ✅ ADD THIS LOG LINE HERE:
  console.log("Donghua groups:", Object.entries(sortedGrouped).map(([k, v]) => [k, v.length]));

  return res.status(200).json({ latest, mixed, grouped: sortedGrouped });
}


      return res.status(200).json({ latest, mixed, grouped: sortedGrouped });
    }

    // For anim3 or news
    return res.status(200).json({
      latest: type === "anim3" ? latest : [],
      mixed,
      grouped: {}
    });

  } catch (e) {
    console.error("Fetch error:", e);
    return res.status(500).json({ error: e.message });
  }
}
