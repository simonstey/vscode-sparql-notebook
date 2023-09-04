export interface SparqlAskResult {
  boolean: boolean;
}
export interface SparqlResultJson {
  head: {
    vars: string[];
  };
  results: {
    bindings: {
      [key: string]: Term;
    }[];
  };
}

export type PrefixMap = {
  [key: string]: string;
};

export interface Term {
  type: string;
  value: string;
  datatype?: string;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  "xml:lang"?: string;
};

