export type SortingOption = "trending" | "newest" | "oldest" | "downloads" | "follows" | "comments";

export interface SortingOptionItem {
  label: string;
  value: SortingOption;
}

export interface Mod {
  modid: number;
  modidstrs: string[];
  name: string;
  author: string;
  summary: string;
  logo: string | null;
  urlalias: string | null;
  downloads: number;
  follows: number;
  comments: number;
  trendingpoints: number;
  lastreleased: string;
}

export interface InstalledMod {
  modid: string;
  version: string;
  file: string;
}

export interface ModUpdate {
  modversion: string;
  mainfile: string;
}

export interface ModRelease {
  modversion: string;
  mainfile: string;
}

export interface ModInfo {
  mod: {
    releases?: ModRelease[];
  };
}

export interface DownloadingMod {
  modid: number;
  progress: number;
  speed: number;
}

export interface FilterState {
  sorting: SortingOption;
  showOnlyInstalled: boolean;
  search: string;
  author: string;
  versions: { label: string; value: string }[];
}

export type FilterAction =
  | { type: "SET_SORTING"; payload: SortingOption }
  | { type: "SET_SHOW_ONLY_INSTALLED"; payload: boolean }
  | { type: "SET_SEARCH"; payload: string }
  | { type: "SET_AUTHOR"; payload: string }
  | { type: "SET_VERSIONS"; payload: { label: string; value: string }[] };

export const sortingOptions: SortingOptionItem[] = [
  { label: "Trending", value: "trending" },
  { label: "Newest", value: "newest" },
  { label: "Oldest", value: "oldest" },
  { label: "Most Downloads", value: "downloads" },
  { label: "Most Follows", value: "follows" },
  { label: "Most Comments", value: "comments" },
];

export const initialFilterState: FilterState = {
  sorting: "trending",
  showOnlyInstalled: false,
  search: "",
  author: "",
  versions: [],
};

export const filterReducer = (state: FilterState, action: FilterAction): FilterState => {
  switch (action.type) {
    case "SET_SORTING":
      return { ...state, sorting: action.payload };
    case "SET_SHOW_ONLY_INSTALLED":
      return { ...state, showOnlyInstalled: action.payload };
    case "SET_SEARCH":
      return { ...state, search: action.payload };
    case "SET_AUTHOR":
      return { ...state, author: action.payload };
    case "SET_VERSIONS":
      return { ...state, versions: action.payload };
    default:
      return state;
  }
};
