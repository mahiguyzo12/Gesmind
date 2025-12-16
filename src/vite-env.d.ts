declare namespace NodeJS {
  interface ProcessEnv {
    API_KEY: string;
    PACKAGE_VERSION: string;
    [key: string]: string | undefined;
  }
}

declare module '*.png' {
  const value: string;
  export default value;
}

declare module '*.jpg' {
  const value: string;
  export default value;
}

declare module '*.svg' {
  const value: string;
  export default value;
}