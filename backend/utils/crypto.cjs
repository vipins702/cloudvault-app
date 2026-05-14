const crypto = require('crypto');

// THE MASTER KEY (Must be in your .env)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-32-character-master-key-here'; 
const IV_LENGTH = 16; 

/**
 * SAAS VAULT UTILITY
 * Encrypts and decrypts sensitive cloud credentials
 */
const SaaSVault = {
  encrypt: (text) => {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  },

  decrypt: (text) => {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  }
};

module.exports = SaaSVault;
