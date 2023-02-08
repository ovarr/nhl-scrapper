export type Teams = {
  teams: string;
};

export type Match = {
  home: string;
  away: string;
  pp: PP[] | [];
};

export type PP = {
  player: string;
  team?: string;
  over: number;
  under: number;
};

export type combinedPP = {
  betc: PP[] | [];
  tenbet: PP[] | [];
};

export type CombinedMatch = {
  home: string;
  away: string;
  pp: combinedPP;
};
