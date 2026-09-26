export interface GitHubDeps {
  run?: (args: string[]) => string;
}
export declare function runGitHub(args: string[]): string;
export declare function githubJson<T = unknown>(route: string, deps?: GitHubDeps): T;
export declare function githubPages<T = unknown>(route: string, deps?: GitHubDeps): T[];
