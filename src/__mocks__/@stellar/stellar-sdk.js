// Mock for @stellar/stellar-sdk in test environment
export class Server {
  constructor(url) {
    this.url = url;
  }
  
  async loadAccount(_pk) {
    // Simulate unfunded; mirror Horizon 404 shape where consumed
    const err = new Error('Not Found');
    err.response = { status: 404 };
    throw err;
  }
  
  async fetchBaseFee() {
    return 100;
  }
  
  async submitTransaction(_tx) {
    return { hash: 'TEST_HASH' };
  }
}

export class Keypair {
  static random() {
    return new Keypair();
  }
  
  static fromSecret(_s) {
    return new Keypair();
  }
  
  secret() {
    return 'S'.padEnd(56, 'X');
  }
  
  publicKey() {
    return 'G'.padEnd(56, 'Y');
  }
}

export class Asset {
  static native() {
    return new Asset('XLM', '');
  }
  
  constructor(code, issuer) {
    this.code = code;
    this.issuer = issuer;
  }
}

export class TransactionBuilder {
  constructor(account, opts) {
    this.account = account;
    this.opts = opts;
    this.ops = [];
    this.memo = undefined;
  }
  
  addOperation(op) {
    this.ops.push(op);
    return this;
  }
  
  addMemo(m) {
    this.memo = m;
    return this;
  }
  
  setTimeout() {
    return this;
  }
  
  build() {
    return {
      sign: () => {},
      toXDR: () => 'XDR'
    };
  }
}

export const Operation = {
  payment: (o) => ({ type: 'payment', ...o }),
  changeTrust: (o) => ({ type: 'changeTrust', ...o })
};

export const Networks = {
  TESTNET: 'Test SDF Network ; September 2015',
  PUBLIC: 'Public Global Stellar Network ; September 2015'
};

export const Memo = {
  text: (v) => ({ type: 'text', value: v })
};