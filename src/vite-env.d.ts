// Removed reference to vite/client to prevent type definition error.
// Augmented NodeJS.ProcessEnv to prevent redeclaration error and provide type safety.

declare namespace NodeJS {
  interface ProcessEnv {
    API_KEY: string;
    PACKAGE_VERSION: string;
    [key: string]: string | undefined;
  }
}