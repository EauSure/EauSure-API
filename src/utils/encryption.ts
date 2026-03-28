import crypto from 'crypto';
import config from '../config';

/**
 * AES-GCM Encryption/Decryption Utilities
 * Matches the encryption used by Gateway and IoT Node
 */

const ALGORITHM = 'aes-128-gcm';
const IV_LENGTH = 12; // GCM nonce length (96 bits)
const TAG_LENGTH = 16; // GCM tag length (128 bits)
const KEY_LENGTH = 16; // AES-128 key length (128 bits)

/**
 * Convert hex string to Buffer
 */
function hexToBuffer(hex: string): Buffer {
  // Remove 0x prefix if present
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  return Buffer.from(cleanHex, 'hex');
}

/**
 * Get encryption key from config
 */
function getEncryptionKey(): Buffer {
  const key = hexToBuffer(config.encryption.key);
  if (key.length !== KEY_LENGTH) {
    throw new Error(`Encryption key must be ${KEY_LENGTH} bytes (128 bits)`);
  }
  return key;
}

/**
 * Encrypt data using AES-128-GCM
 * @param plaintext - Data to encrypt (string or Buffer)
 * @param additionalData - Additional authenticated data (AAD)
 * @returns Object containing nonce, ciphertext, and auth tag
 */
export function encrypt(
  plaintext: string | Buffer,
  additionalData?: Buffer
): {
  nonce: Buffer;
  ciphertext: Buffer;
  tag: Buffer;
} {
  const key = getEncryptionKey();
  const nonce = crypto.randomBytes(IV_LENGTH);
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, nonce);
  
  if (additionalData) {
    cipher.setAAD(additionalData);
  }

  const plaintextBuffer = typeof plaintext === 'string' 
    ? Buffer.from(plaintext, 'utf8') 
    : plaintext;

  const ciphertext = Buffer.concat([
    cipher.update(plaintextBuffer),
    cipher.final(),
  ]);

  const tag = cipher.getAuthTag();

  return { nonce, ciphertext, tag };
}

/**
 * Decrypt data using AES-128-GCM
 * @param ciphertext - Encrypted data
 * @param nonce - Initialization vector (12 bytes)
 * @param tag - Authentication tag (16 bytes)
 * @param additionalData - Additional authenticated data (AAD)
 * @returns Decrypted plaintext as Buffer
 */
export function decrypt(
  ciphertext: Buffer,
  nonce: Buffer,
  tag: Buffer,
  additionalData?: Buffer
): Buffer {
  const key = getEncryptionKey();

  if (nonce.length !== IV_LENGTH) {
    throw new Error(`Nonce must be ${IV_LENGTH} bytes`);
  }

  if (tag.length !== TAG_LENGTH) {
    throw new Error(`Tag must be ${TAG_LENGTH} bytes`);
  }

  const decipher = crypto.createDecipheriv(ALGORITHM, key, nonce);
  decipher.setAuthTag(tag);

  if (additionalData) {
    decipher.setAAD(additionalData);
  }

  try {
    const plaintext = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);
    return plaintext;
  } catch (error) {
    throw new Error('Decryption failed - authentication tag mismatch or corrupted data');
  }
}

/**
 * Encrypt JSON data (convenience function)
 */
export function encryptJSON(data: any, additionalData?: Buffer): {
  nonce: string;
  ciphertext: string;
  tag: string;
} {
  const json = JSON.stringify(data);
  const { nonce, ciphertext, tag } = encrypt(json, additionalData);
  
  return {
    nonce: nonce.toString('hex'),
    ciphertext: ciphertext.toString('hex'),
    tag: tag.toString('hex'),
  };
}

/**
 * Decrypt JSON data (convenience function)
 */
export function decryptJSON(
  encryptedData: { nonce: string; ciphertext: string; tag: string },
  additionalData?: Buffer
): any {
  const nonce = hexToBuffer(encryptedData.nonce);
  const ciphertext = hexToBuffer(encryptedData.ciphertext);
  const tag = hexToBuffer(encryptedData.tag);

  const plaintext = decrypt(ciphertext, nonce, tag, additionalData);
  return JSON.parse(plaintext.toString('utf8'));
}

/**
 * Hash data using SHA-256
 */
export function hash(data: string | Buffer): string {
  const buffer = typeof data === 'string' ? Buffer.from(data, 'utf8') : data;
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Generate random hex string
 */
export function randomHex(bytes: number = 16): string {
  return crypto.randomBytes(bytes).toString('hex');
}
