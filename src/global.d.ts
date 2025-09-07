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

// Export the Stellar SDK types for easier access
declare module '@stellar/stellar-sdk' {
  export * from 'stellar-sdk';
}

// Add type definitions for Stellar SDK
declare module 'stellar-sdk' {
  export class Server {
    constructor(serverUrl: string, opts?: { allowHttp?: boolean });
    loadAccount(accountId: string): Promise<any>;
    submitTransaction(transaction: any): Promise<any>;
    fetchBaseFee(): Promise<string>;
  }
  
  export class Keypair {
    publicKey(): string;
    secret(): string;
    static fromSecret(secretKey: string): Keypair;
    static random(): Keypair;
  }
  
  export class TransactionBuilder {
    constructor(sourceAccount: any, options: { 
      fee: string | number; 
      networkPassphrase: string;
      timebounds?: { minTime?: number | string; maxTime?: number | string; };
    });
    addOperation(operation: any): this;
    setTimeout(seconds: number): this;
    build(): any;
  }
  
  export const Networks: {
    TESTNET: string;
    PUBLIC: string;
  };
  
  export namespace Operation {
    function payment(options: { 
      destination: string; 
      asset: Asset; 
      amount: string;
      source?: string;
    }): any;
    
    function changeTrust(options: { 
      asset: Asset;
      limit?: string;
      source?: string;
    }): any;
  }
  
  export class Asset {
    constructor(code: string, issuer: string);
    static native(): Asset;
    static fromOperation(asset: { code: string; issuer: string }): Asset;
    getCode(): string;
    getIssuer(): string;
    getAssetType(): string;
  }
  
  // Export other commonly used types and functions
  export const Transaction: any;
  export const xdr: any;
  export const StrKey: any;
  export const TimeoutInfinite: number;
  
  export class Memo {
    static text(value: string): any;
    static none(): any;
  }
}
