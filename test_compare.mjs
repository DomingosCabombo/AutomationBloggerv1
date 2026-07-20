function cleanStringForDeduplication(str) {
  if (!str) return "";
  
  let text = str
    .replace(/&#8211;/g, "-")
    .replace(/&#8212;/g, "-")
    .replace(/–/g, "-")
    .replace(/—/g, "-")
    .replace(/&#038;/g, "e")
    .replace(/&amp;/g, "e")
    .replace(/&quot;/g, "")
    .replace(/&#039;/g, "")
    .replace(/&nbsp;/g, " ");

  text = text.toLowerCase();
  text = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // Remove parentheses/brackets content containing feat/featuring/ft/prod/download/etc.
  text = text.replace(/\s*[\(\[][^\)\]]*(?:feat|featuring|ft|prod|by|with|e|&|and|vs|versus|download|mp3|original|completo)[^\)\]]*[\)\]]/gi, "");
  text = text.replace(/\s*\([^)]*\)/g, "").replace(/\s*\[[^\]]*\]/g, "");

  // Clean special characters but keep alphanumeric, spaces and dashes
  text = text.replace(/[^\w\s\-]/g, " ");
  text = text.replace(/\s+/g, " ").trim();

  return text;
}

function getArtistWords(artistStr) {
  const stopwords = ["de", "do", "da", "em", "um", "uma", "os", "as", "com", "feat", "prod", "and", "the", "para"];
  return artistStr
    .split(/\s+/)
    .map(w => w.trim())
    .filter(w => w.length >= 2 && !stopwords.includes(w));
}

function getCoreArtistAndTitle(artist, title) {
  const cleanTitle = cleanStringForDeduplication(title);
  const cleanArtist = cleanStringForDeduplication(artist);

  let coreArtist = cleanArtist;
  let coreTitle = cleanTitle;

  if (cleanTitle.includes("-")) {
    const parts = cleanTitle.split("-");
    coreArtist = parts[0].trim();
    coreTitle = parts[1].trim();
  }

  // Remove the artist name from coreTitle if it is included
  if (coreArtist && coreTitle.includes(coreArtist)) {
    coreTitle = coreTitle.replace(coreArtist, "").replace(/\s+/g, " ").trim();
  }

  return {
    artist: coreArtist,
    title: coreTitle
  };
}

function checkDuplicate(songA, songB) {
  const coreA = getCoreArtistAndTitle(songA.artist, songA.title);
  const coreB = getCoreArtistAndTitle(songB.artist, songB.title);
  
  console.log(`\nComparing:\n  A: "${songA.artist} - ${songA.title}"\n  B: "${songB.artist} - ${songB.title}"`);
  console.log("  Core A:", coreA);
  console.log("  Core B:", coreB);
  
  if (coreA.title === coreB.title) {
    const w1 = getArtistWords(coreA.artist);
    const w2 = getArtistWords(coreB.artist);
    const hasCommonArtist = w1.some(w => w2.includes(w)) || coreA.artist === coreB.artist;
    console.log("  Words A:", w1);
    console.log("  Words B:", w2);
    console.log("  Is duplicate? =>", hasCommonArtist);
    return hasCommonArtist;
  }
  
  console.log("  Is duplicate? => false (titles differ)");
  return false;
}

// Test case 1 & 2
const song1 = {
  artist: "Deezy , Dj Devictor , Filho do Zua , Kelson Monst Wanted , Preto Show",
  title: "Preto Show &#8211; Coringa (feat. Filho Do Zua, Kelson Monst Wanted, Deezy e Dj Devictor)"
};
const song2 = {
  artist: "Deezy",
  title: "Preto Show &#8211; Coringa (feat. Deezy,Filho Do Zua &amp; Kelson Most Wanted)"
};
checkDuplicate(song1, song2);

// Test case 3: Pegou
const song3a = {
  artist: "3 Finer , Black Spygo , Tdjay",
  title: "Pegou (feat. Tdjay)"
};
const song3b = {
  artist: "3 Finer",
  title: "Black Spygo, 3 Finer, Black Vision – Pegou (feat. T-Djay)"
};
checkDuplicate(song3a, song3b);

