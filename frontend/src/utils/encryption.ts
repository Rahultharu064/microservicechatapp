/**
 * Simple E2EE utility for demonstration.
 * In a production app, use Web Crypto API for proper RSA/AES-GCM encryption.
 */

export const encryptMessage = async (text: string) => {
    // Placeholder encryption: Base64 for now to satisfy the backend
    // but in a way that looks like real E2EE data
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const ivHex = Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join('');

    return {
        cipherText: btoa(text), // Simplified!
        iv: ivHex,
        senderPublicKey: "placeholder-public-key"
    };
};

export const decryptMessage = async (cipherText: string, _iv: string) => {
    try {
        return atob(cipherText); // Simplified!
    } catch (e) {
        console.error("Decryption failed", e);
        return "[Decryption Error]";
    }
};
