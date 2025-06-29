async function loadGrouped(section, containerId) {
  const container = document.getElementById(containerId);
  const loading = container.previousElementSibling;
  loading.textContent = "Loading...";
  const data = await fetchVideos(section);
  loading.style.display = 'none';

  const allGroups = [];

  // 1. Render fixed LATEST group
  const latestVideos = (data.latest || []).filter(v => !loadedVideos[section].has(v.snippet.resourceId.videoId));
  if (latestVideos.length) {
    const heading = document.createElement('div');
    heading.className = 'group-heading';
    heading.style.background = 'red';
    heading.style.color = 'black';
    heading.textContent = 'LATEST';

    const wrapper = document.createElement('div');
    wrapper.className = section === 'news' ? 'vertical-scroll' : 'scroll-row';

    latestVideos.forEach(v => {
      loadedVideos[section].add(v.snippet.resourceId.videoId);
      wrapper.appendChild(createCard(v));
    });

    container.appendChild(heading);
    container.appendChild(wrapper);
  }

  // 2. Prepare all groups with latest timestamp
  if (section !== 'news') {
    for (const groupName of Object.keys(data.grouped || {})) {
      const vids = data.grouped[groupName].filter(v => !loadedVideos[section].has(v.snippet.resourceId.videoId));
      if (vids.length) {
        const latest = Math.max(...vids.map(v => new Date(v.snippet.publishedAt).getTime()));
        allGroups.push({ name: groupName, videos: vids, latest });
      }
    }
  }

  const mixed = (data.mixed || []).filter(v => !loadedVideos[section].has(v.snippet.resourceId.videoId));
  if (mixed.length) {
    const latest = Math.max(...mixed.map(v => new Date(v.snippet.publishedAt).getTime()));
    allGroups.push({ name: 'Mixed', videos: mixed, latest });
  }

  allGroups.sort((a, b) => b.latest - a.latest); // Newest first

  for (const group of allGroups) {
    const heading = document.createElement('div');
    heading.className = 'group-heading';
    heading.textContent = group.name;
    const wrapper = document.createElement('div');
    wrapper.className = section === 'news' ? 'vertical-scroll' : 'scroll-row';

    group.videos.forEach(v => {
      loadedVideos[section].add(v.snippet.resourceId.videoId);
      wrapper.appendChild(createCard(v));
    });

    container.appendChild(heading);
    container.appendChild(wrapper);
  }
}
