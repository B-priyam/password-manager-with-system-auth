// WebAuthn / Biometric Authentication utilities
// Uses the Web Authentication API for system-level biometric auth
// (Windows Hello, Touch ID, Face ID, device PIN)

const CREDENTIAL_STORAGE_KEY = "vault_webauthn_credential";

function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function base64UrlToArrayBuffer(base64url: string): ArrayBuffer {
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export function isWebAuthnSupported(): boolean {
  return !!(window.PublicKeyCredential && navigator.credentials);
}

export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  if (!isWebAuthnSupported()) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

export function hasStoredCredential(): boolean {
  return !!localStorage.getItem(CREDENTIAL_STORAGE_KEY);
}

function getStoredCredential(): { id: string; rawId: string } | null {
  const stored = localStorage.getItem(CREDENTIAL_STORAGE_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export async function registerBiometric(userId: string): Promise<boolean> {
  if (!isWebAuthnSupported()) return false;

  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const userIdBytes = new TextEncoder().encode(userId);

    const credential = (await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: {
          name: "VaultGuard",
          id: window.location.hostname,
        },
        user: {
          id: userIdBytes,
          name: "vault-user",
          displayName: "Vault User",
        },
        pubKeyCredParams: [
          { alg: -7, type: "public-key" }, // ES256
          { alg: -257, type: "public-key" }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
          residentKey: "preferred",
        },
        timeout: 60000,
        attestation: "none",
      },
    })) as PublicKeyCredential | null;

    if (!credential) return false;

    const credentialData = {
      id: credential.id,
      rawId: arrayBufferToBase64Url(credential.rawId),
    };

    localStorage.setItem(
      CREDENTIAL_STORAGE_KEY,
      JSON.stringify(credentialData),
    );
    return true;
  } catch (err) {
    console.error("WebAuthn registration failed:", err);
    return false;
  }
}

export async function authenticateBiometric(): Promise<boolean> {
  if (!isWebAuthnSupported()) return false;

  const stored = getStoredCredential();
  if (!stored) return false;

  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));

    const assertion = (await navigator.credentials.get({
      publicKey: {
        challenge,
        rpId: window.location.hostname,
        allowCredentials: [
          {
            id: base64UrlToArrayBuffer(stored.rawId),
            type: "public-key",
            transports: ["internal"],
          },
        ],
        userVerification: "required",
        timeout: 60000,
      },
    })) as PublicKeyCredential | null;

    return !!assertion;
  } catch (err) {
    console.error("WebAuthn authentication failed:", err);
    return false;
  }
}

export function removeBiometric(): void {
  localStorage.removeItem(CREDENTIAL_STORAGE_KEY);
}
