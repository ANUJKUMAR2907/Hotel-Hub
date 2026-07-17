import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || '';
const API_KEY = process.env.CLOUDINARY_API_KEY || '';
const API_SECRET = process.env.CLOUDINARY_API_SECRET || '';

const isCloudinaryConfigured = 
  CLOUD_NAME && CLOUD_NAME !== 'mock_cloud_name' &&
  API_KEY && API_KEY !== 'mock_api_key' &&
  API_SECRET && API_SECRET !== 'mock_api_secret';

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: CLOUD_NAME,
    api_key: API_KEY,
    api_secret: API_SECRET,
  });
}

// Default stock images for hotels/rooms to use as high-quality fallback
const STOCK_IMAGES = [
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80', // Luxury Exterior
  'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=800&q=80', // Pool Resort
  'https://images.unsplash.com/photo-1540518614846-7eded433c457?auto=format&fit=crop&w=800&q=80', // Luxury Suite Room
  'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80', // Standard Queen Room
  'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=800&q=80', // Deluxe Bedroom
  'https://images.unsplash.com/photo-1568495248636-6432b97bd949?auto=format&fit=crop&w=800&q=80', // Twin Room
];

/**
 * Uploads a base64-encoded image or buffer to Cloudinary or saves it locally.
 * @param fileData Base64 data string (e.g. data:image/png;base64,iVBOR...)
 * @param folder Target folder/category name
 * @returns Uploaded image URL
 */
export async function uploadImage(fileData: string, folder: string = 'hotel_booking'): Promise<string> {
  // If it's already an HTTP URL, return it directly
  if (fileData.startsWith('http://') || fileData.startsWith('https://')) {
    return fileData;
  }

  // 1. If Cloudinary is configured, upload to Cloudinary
  if (isCloudinaryConfigured) {
    try {
      const response = await cloudinary.uploader.upload(fileData, {
        folder: folder,
        resource_type: 'image',
      });
      return response.secure_url;
    } catch (error) {
      console.error('Cloudinary upload failed, falling back to local storage:', error);
    }
  }

  // 2. Local File System Storage Fallback (stores in public/uploads)
  try {
    // Extract base64 header if present
    const matches = fileData.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    let buffer: Buffer;
    let extension = 'jpg';

    if (matches && matches.length === 3) {
      const mimeType = matches[1];
      buffer = Buffer.from(matches[2], 'base64');
      
      // Determine file extension
      if (mimeType.includes('png')) extension = 'png';
      else if (mimeType.includes('gif')) extension = 'gif';
      else if (mimeType.includes('webp')) extension = 'webp';
    } else {
      // If it's raw base64 or other data
      buffer = Buffer.from(fileData, 'base64');
    }

    const filename = `${folder}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${extension}`;
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    
    // Ensure the public/uploads directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, filename);
    fs.writeFileSync(filePath, buffer);
    
    return `/uploads/${filename}`;
  } catch (error) {
    console.error('Local file write failed, falling back to stock image:', error);
    // 3. Fallback to random premium unsplash stock image
    const randomIndex = Math.floor(Math.random() * STOCK_IMAGES.length);
    return STOCK_IMAGES[randomIndex];
  }
}
