export async function onRequest() {
  const q = encodeURIComponent('"Måns Ågren" OR "Mans Agren" Brooks Bandits BCHL');
  return Response.json({ media: [
    { title:'Google News – Måns Ågren', source:'Google News', url:`https://news.google.com/search?q=${q}`, tag:'Måns' },
    { title:'Brooks Bandits', source:'Brooks', url:'https://www.brooksbandits.ca/', tag:'Lag' },
    { title:'BCHL', source:'BCHL', url:'https://bchl.ca/', tag:'Liga' },
    { title:'EliteProspects – Måns', source:'EP', url:'https://www.eliteprospects.com/player/801209/mans-agren', tag:'Statistik' }
  ]});
}
