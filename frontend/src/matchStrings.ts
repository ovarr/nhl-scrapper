import Fuse from 'fuse.js';

const matchStrings = (betcPlayer: string, tenbetPlayer: string) => {
  let maxScore = 0;
  let bestMatch = null;

  const options = {
    includeScore: true,
  };

  const [betcFirst, betcLast] = betcPlayer.split(' ');
  console.log('betcPlayer', betcFirst, betcLast);
  // const tenbet = tenbetPlayer.split(' ');
  console.log('tenbet', [tenbetPlayer]);

  const fuse = new Fuse([tenbetPlayer], options);
  console.log('searcher', fuse);
  const result = fuse.search(betcLast);
  console.log('result', result);

  if (result.length > 0 && result[0].score > maxScore) {
    maxScore = result[0].score;
    bestMatch = tenbetPlayer;
  }

  if (bestMatch) {
    return bestMatch;
  }
};

export default matchStrings;
