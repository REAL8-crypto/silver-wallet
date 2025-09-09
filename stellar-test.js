// Test stellar SDK import patterns
const StellarSdk = require('@stellar/stellar-sdk');

console.log('StellarSdk.Horizon:', Object.keys(StellarSdk.Horizon || {}));

// Try creating a server
try {
  const server = new StellarSdk.Horizon.Server('https://horizon.stellar.org');
  console.log('Server created successfully with Horizon.Server');
} catch (e) {
  console.log('Horizon.Server creation failed:', e.message);
}

// Check default
console.log('default keys:', Object.keys(StellarSdk.default || {}));