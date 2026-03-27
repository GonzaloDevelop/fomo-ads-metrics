/**
 * AES-256-GCM encryption for Meta tokens stored in the database.
 * Uses ENCRYPTION_KEY env var (64-char hex).
 */

import crypto from 'crypto';

function getKey() {
    const envKey = process.env.ENCRYPTION_KEY;
    if (envKey && envKey.length >= 64) {
        return Buffer.from(envKey, 'hex');
    }
    return crypto.createHash('sha256').update('meta-ads-dev-key').digest();
}

export function encrypt(plaintext) {
    const key = getKey();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decrypt(ciphertext) {
    try {
        const key = getKey();
        const [ivHex, tagHex, encHex] = ciphertext.split(':');
        const iv = Buffer.from(ivHex, 'hex');
        const tag = Buffer.from(tagHex, 'hex');
        const encrypted = Buffer.from(encHex, 'hex');
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAuthTag(tag);
        return decipher.update(encrypted) + decipher.final('utf8');
    } catch {
        return null;
    }
}
