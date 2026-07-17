import QRCode from 'qrcode';

/**
 * Generates a base64 Data URL for a QR Code containing the provided text.
 * @param text The payload to encode (e.g. invoice link or JSON payload)
 * @returns Base64 image data string
 */
export async function generateQRCode(text: string): Promise<string> {
  try {
    const dataUrl = await QRCode.toDataURL(text, {
      width: 250,
      margin: 2,
      color: {
        dark: '#1e1b15', // Sleek dark/luxury color matching our palette
        light: '#ffffff', // Clean white background
      },
    });
    return dataUrl;
  } catch (error) {
    console.error('Failed to generate QR Code:', error);
    // Fallback simple 1x1 empty pixel data URL if it fails
    return 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
  }
}
