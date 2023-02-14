import fs from 'fs';
import { chromium } from 'playwright';
import { CombinedMatch, Match, PP, Teams } from './types';
import teams from './teams.json';

async function RunAsync(): Promise<void> {
  const browser = await chromium.launch({
    headless: true,
  });

  const betcContext = await browser.newContext();
  const tenbetContext = await browser.newContext();

  const matchRowClasses = '.mx-1 > .flex.justify-between > .flex.flex-col';

  const betc = await betcContext.newPage();

  await betc.goto('https://sport.netbet.com/ice-hockey/north-america-nhl/');
  await betc.waitForTimeout(1500);

  const betcElements: Teams[] = await betc.$$eval(matchRowClasses, (items) => {
    const data: Teams[] = [];
    items.forEach((match) => {
      if (match instanceof HTMLElement) {
        const teams = match.innerText;
        if (teams.length > 0) {
          data.push({ teams });
        }
      }
    });
    return data;
  });
  const parsedBetc: Match[] = parseMatches(betcElements);

  for (let i = 0; i < parsedBetc.length; i++) {
    await betc.click('text=' + parsedBetc[i].home);

    await betc.waitForTimeout(1000);
    await betc.locator('.v-hl-container :text("All")').click();

    const ppWrapper =
      'div.flex.flex-col.w-full.text-gray-900.mb-0:has-text("powerplay points")';
    await betc.waitForTimeout(1500);

    const ppRows = betc.locator(ppWrapper);

    for (const el of await ppRows.elementHandles()) {
      await el.click();
    }

    const powerplayPlayers: string[] = await betc
      .locator(ppWrapper)
      .allTextContents();

    parsedBetc[i] = {
      ...parsedBetc[i],
      pp: parseBetconstValues(powerplayPlayers),
    };
    await betc.goBack();
  }

  const betcMatches: Match[] = parsedBetc.map((match) => {
    return {
      ...match,
      home: getTenbetTeamName(match.home),
      away: getTenbetTeamName(match.away),
    };
  });

  fs.writeFile(
    'results/betconstruct.json',
    JSON.stringify(betcMatches),
    (err) => {
      if (err) throw err;
      console.log('betconstruct file has been saved!');
    }
  );

  //
  // 10bet
  //

  const tenbet = await tenbetContext.newPage();
  await tenbet.goto('https://www.10bet.com/sports/ice-hockey/nhl/');
  await tenbet.waitForTimeout(1500);

  const tenbetRowClasses =
    '.rj-ev-list__ev-card__section-item.rj-ev-list__ev-card__names';

  const tenbetElements: Teams[] = await tenbet.$$eval(
    tenbetRowClasses,
    (items) => {
      const data: Teams[] = [];
      items.forEach((match) => {
        if (match instanceof HTMLElement) {
          const teams = match.innerText;
          data.push({ teams });
        }
      });
      return data;
    }
  );

  const tenbetMatches: Match[] = parseMatches(tenbetElements);

  for (let i = 0; i < tenbetMatches.length; i++) {
    await tenbet.click('text=' + tenbetMatches[i].home);

    await tenbet.waitForTimeout(1000);

    const pptenbetWrapper =
      'li.hoverable-event-container:has-text("Power Play Points")';
    await tenbet.waitForTimeout(1000);

    const powerplayPlayers: string[] = await tenbet
      .locator(pptenbetWrapper)
      .allTextContents();

    tenbetMatches[i] = {
      ...tenbetMatches[i],
      pp: parseTenbetValues(powerplayPlayers),
    };
    await tenbet.goBack();
  }

  fs.writeFile('results/tenbet.json', JSON.stringify(tenbetMatches), (err) => {
    if (err) throw err;
    console.log('tenbet file has been saved!');
  });

  await browser.close();

  //
  // COMBINE DATA
  //

  const combineMatches = (betcMatches: Match[], tenbetMatches: Match[]) => {
    const result: CombinedMatch[] = [];
    for (const betcMatch of betcMatches) {
      for (const tenbetMatch of tenbetMatches) {
        if (
          betcMatch.home === tenbetMatch.home &&
          betcMatch.away === tenbetMatch.away
        ) {
          result.push({
            home: betcMatch.home,
            away: betcMatch.away,
            pp: {
              betc: betcMatch.pp,
              tenbet: tenbetMatch.pp,
            },
          });
        }
      }
    }

    return result;
  };

  const nhl: CombinedMatch[] = combineMatches(betcMatches, tenbetMatches);

  fs.writeFile('results/nhl.json', JSON.stringify(nhl), (err) => {
    if (err) throw err;
    console.log('NHL file has been saved!');
  });
}

RunAsync().catch((e) => {
  throw e;
});

function parseMatches(array: Teams[]) {
  const result: Match[] = [];
  for (const obj of array) {
    const [first, second] = obj.teams.split('\n');
    result.push({
      home: second,
      away: first,
      pp: [],
    });
  }
  return result;
}

// get the strings from the array above into a array of objects using regex
// with the following structure:
// [
//   {
//     player: 'Alexander Newhook',
//     team: 'COL Avalanche',
//     over: 6.70,
//     under: 1.07
//   },
//   ...
// ]

// the regex should be able to handle the following cases:
// - player name with spaces
// - team name with spaces
// - over and under values with decimals

function parseBetconstValues(array: string[]) {
  const regex =
    /^([\w\s\.-]+)\s\(\w+\s([\w\s\.-]+)\)\s.*\sOver.*\s(\d+\.\d+)\s.*\sUnder.*\s(\d+\.\d+)\s/;

  const result: PP[] = [];
  for (const str of array) {
    const match = str.match(regex);
    if (match) {
      result.push({
        player: match[1].trim(),
        team: match[2].trim(),
        over: parseFloat(match[3]),
        under: parseFloat(match[4]),
      });
    }
  }
  return result;
}

function parseTenbetValues(array: string[]) {
  const regex =
    /^([\w\s.'-]+?)\s*(?:\([\w.-]+\)\s*)?Power Play Points(?:Under \(.*\)(\d+\.\d+)|Over \(.*\)(\d+\.\d+))(?:Under \(.*\)(\d+\.\d+)|Over \(.*\)(\d+\.\d+))$/;

  const result: PP[] = [];
  for (const str of array) {
    const match = str.match(regex).filter((value) => value !== undefined);
    if (match) {
      result.push({
        player: match[1].trim(),
        over: parseFloat(match[3]),
        under: parseFloat(match[2]),
      });
    }
  }

  return result;
}

// the team names from the betconstruct website are in the following format:
// 'San Jose Sharks'
// the team names from the tenbet website are in the following format:
// 'SJ Sharks'
// the team names from the teams.json file are in the following format:
// 'SJ Sharks'
// the function needs to pass through the names from the betconstruct website and return the names from the tenbet website
// e.g. 'San Jose Sharks' => 'SJ Sharks'
// where the common part is 'Sharks' so the string needs to be evaluated from the end and the first match should be returned as the result, the string needs to be split so that "SJ" or "San Jose" is ignored

function getTenbetTeamName(betcTeamName) {
  const teamName = betcTeamName.split(' ').pop();
  for (const team of teams) {
    if (team.includes(teamName)) {
      return team;
    }
  }
  return betcTeamName;
}
