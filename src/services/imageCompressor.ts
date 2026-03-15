import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { File } from 'expo-file-system';
import { Image } from 'react-native';

const MAX_DIMENSION = 1200;
const MAX_FILE_SIZE = 200 * 1024; // 200KB in bytes
const INITIAL_QUALITY = 0.7;
const MIN_QUALITY = 0.3;
const QUALITY_STEP = 0.1;

/**
 * Get the dimensions of an image from its URI.
 */
function getImageDimensions(
  uri: string,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      (error) => reject(error),
    );
  });
}

/**
 * Calculate the resize dimensions so the longest side is ≤ MAX_DIMENSION,
 * preserving the original aspect ratio.
 * Returns null if no resize is needed.
 */
function calculateResizeDimensions(
  width: number,
  height: number,
): { width: number; height: number } | null {
  const longest = Math.max(width, height);
  if (longest <= MAX_DIMENSION) return null;

  const scale = MAX_DIMENSION / longest;
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}

/**
 * Compress an image at the given URI to JPEG with the specified quality,
 * optionally resizing first. Returns the result URI and file size.
 */
async function compressAtQuality(
  uri: string,
  quality: number,
  resizeDimensions: { width: number; height: number } | null,
): Promise<{ uri: string; size: number }> {
  const context = ImageManipulator.manipulate(uri);

  if (resizeDimensions) {
    context.resize(resizeDimensions);
  }

  const imageRef = await context.renderAsync();
  const result = await imageRef.saveAsync({
    format: SaveFormat.JPEG,
    compress: quality,
  });

  const file = new File(result.uri);
  const size = file.exists ? file.size : 0;

  return { uri: result.uri, size };
}

/**
 * Compress a photo for upload.
 *
 * 1. Resizes so the longest dimension ≤ 1200px (preserving aspect ratio)
 * 2. Compresses to JPEG at quality 0.7
 * 3. If output > 200KB, iteratively lowers quality by 0.1 down to 0.3
 * 4. If still > 200KB at 0.3, rejects with an error
 */
export async function compress(
  uri: string,
): Promise<{ uri: string; size: number }> {
  // 1. Get original dimensions
  const { width, height } = await getImageDimensions(uri);

  // 2. Calculate resize dimensions
  const resizeDimensions = calculateResizeDimensions(width, height);

  // 3. Compress at initial quality
  let result = await compressAtQuality(uri, INITIAL_QUALITY, resizeDimensions);

  // 4. If within size limit, return
  if (result.size <= MAX_FILE_SIZE) {
    return result;
  }

  // 5. Iteratively lower quality
  let quality = INITIAL_QUALITY - QUALITY_STEP;
  while (quality >= MIN_QUALITY - 0.001) {
    result = await compressAtQuality(uri, quality, resizeDimensions);
    if (result.size <= MAX_FILE_SIZE) {
      return result;
    }
    quality -= QUALITY_STEP;
  }

  // 6. Reject — still too large at minimum quality
  throw new Error(
    'This photo is too large to process — please choose another.',
  );
}
