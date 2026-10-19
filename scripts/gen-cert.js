const forge = require('node-forge');
const fs = require('fs');
const path = require('path');

const keys = forge.pki.rsa.generateKeyPair(2048);
const cert = forge.pki.createCertificate();
cert.publicKey = keys.publicKey;
cert.serialNumber = '01';
cert.validity.notBefore = new Date();
cert.validity.notAfter = new Date();
cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);

const attrs = [{ shortName: 'CN', value: 'localhost' }];
cert.setSubject(attrs);
cert.setIssuer(attrs);

cert.setExtensions([
  { name: 'basicConstraints', cA: false },
  { name: 'keyUsage', keyCertSign: true, digitalSignature: true, keyEncipherment: true },
  { name: 'extKeyUsage', serverAuth: true },
  { name: 'subjectAltName', altNames: [
    { type: 2, value: 'localhost' },
    { type: 7, ip: '127.0.0.1' },
    { type: 7, ip: '0.0.0.0' },
  ]},
]);

cert.sign(keys.privateKey);

const dir = path.resolve(__dirname);
fs.writeFileSync(path.join(dir, 'localhost.pem'), forge.pki.certificateToPem(cert));
fs.writeFileSync(path.join(dir, 'localhost-key.pem'), forge.pki.privateKeyToPem(keys.privateKey));
console.log('SSL certificates generated successfully!');
