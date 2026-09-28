const crypto = require('crypto');

// Use a secure key, either from a specific env var or derived from JWT_SECRET
// Must be 32 bytes for AES-256
const getSecretKey = () => {
    const secret = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || 'default_secret_key_32_bytes_long!';
    // Create a 32 byte hash of the secret to ensure correct length
    return crypto.createHash('sha256').update(String(secret)).digest('base64').substring(0, 32);
};

const algorithm = 'aes-256-cbc';

const encrypt = (text) => {
    if (!text) return null;
    const iv = crypto.randomBytes(16);
    const key = getSecretKey();
    const cipher = crypto.createCipheriv(algorithm, Buffer.from(key), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
};

const decrypt = (text) => {
    if (!text) return null;
    try {
        const textParts = text.split(':');
        const iv = Buffer.from(textParts.shift(), 'hex');
        const encryptedText = Buffer.from(textParts.join(':'), 'hex');
        const key = getSecretKey();
        const decipher = crypto.createDecipheriv(algorithm, Buffer.from(key), iv);
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString();
    } catch (error) {
        console.error('Error decrypting token:', error);
        return null;
    }
};

module.exports = {
    encrypt,
    decrypt
};
