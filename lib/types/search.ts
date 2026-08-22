export type SearchItem = {
  id: number;
  title: string;
  subtitle: string;
  url: string;
};

export type SearchResults = {
  tests: SearchItem[];
  cards: SearchItem[];
  decks: SearchItem[];
  documents: SearchItem[];
};
