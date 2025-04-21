export type ThemaCodes = Record<string, ThemaCodeDetail>;
  
  export interface ThemaCodeDetail {
    CodeValue: string;
    CodeDescription: string;
    CodeNotes: string;
    CodeParent: string;
    IssueNumber: number;
    Modified: number | string;
  }