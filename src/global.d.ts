// Add type definitions for Node.js globals
declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: 'development' | 'production' | 'test';
    REACT_APP_STELLAR_NETWORK: 'testnet' | 'public';
    REACT_APP_HORIZON_URL: string;
  }
  interface Process {
    env: ProcessEnv;
  }
  let process: Process;
}

// Add Stellar SDK to the global window object
declare global {
  interface Window {
    StellarSdk: typeof import('@stellar/stellar-sdk');
  }
}

// Minimal redirect shim for any stray type-only imports
declare module 'stellar-sdk' {
  export * from '@stellar/stellar-sdk';
}

export {}
