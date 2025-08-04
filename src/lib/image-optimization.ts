// Image optimization utilities for the Ashram Management System

export interface ImageOptimizationOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png' | 'auto';
  blur?: boolean;
  placeholder?: 'blur' | 'empty';
}

export interface OptimizedImageSizes {
  thumbnail: { width: number; height: number };
  small: { width: number; height: number };
  medium: { width: number; height: number };
  large: { width: number; height: number };
}

// Predefined image sizes for different use cases
export const IMAGE_SIZES: OptimizedImageSizes = {
  thumbnail: { width: 100, height: 100 },
  small: { width: 300, height: 300 },
  medium: { width: 600, height: 600 },
  large: { width: 1200, height: 1200 },
};

// Common aspect ratios
export const ASPECT_RATIOS = {
  square: '1:1',
  portrait: '3:4',
  landscape: '4:3',
  wide: '16:9',
} as const;

// Utility to generate Next.js Image component props
export const getOptimizedImageProps = (
  src: string,
  options: ImageOptimizationOptions = {}
) => {
  const {
    width = 600,
    height = 600,
    quality = 85,
    blur = false,
    placeholder = 'empty',
  } = options;

  return {
    src,
    width,
    height,
    quality,
    placeholder,
    blurDataURL: blur ? generateBlurDataURL(width, height) : undefined,
    sizes: generateResponsiveSizes(),
  };
};

// Generate responsive sizes attribute
export const generateResponsiveSizes = () => {
  return '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw';
};

// Generate blur placeholder data URL
export const generateBlurDataURL = (width: number, height: number): string => {
  const canvas = typeof window !== 'undefined' ? document.createElement('canvas') : null;
  if (!canvas) {
    // Server-side fallback
    return `data:image/svg+xml;base64,${Buffer.from(
      `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#f3f4f6"/></svg>`
    ).toString('base64')}`;
  }

  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  
  // Create gradient blur effect
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#f3f4f6');
  gradient.addColorStop(1, '#e5e7eb');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  
  return canvas.toDataURL('image/jpeg', 0.1);
};

// Image compression for file uploads
export const compressImage = (
  file: File,
  maxWidth: number = 1200,
  maxHeight: number = 1200,
  quality: number = 0.8
): Promise<File> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const img = new Image();

    img.onload = () => {
      // Calculate new dimensions
      let { width, height } = img;
      
      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;

      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          } else {
            reject(new Error('Failed to compress image'));
          }
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
};

// Validate image file
export const validateImageFile = (file: File): { valid: boolean; error?: string } => {
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Only JPEG, PNG, and WebP images are allowed',
    };
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'Image size must be less than 10MB',
    };
  }

  return { valid: true };
};

// Generate srcSet for responsive images
export const generateSrcSet = (baseSrc: string, sizes: number[]): string => {
  return sizes
    .map((size) => `${baseSrc}?w=${size}&q=75 ${size}w`)
    .join(', ');
};

// Extract image metadata
export const getImageMetadata = (file: File): Promise<{
  width: number;
  height: number;
  size: number;
  type: string;
}> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
        size: file.size,
        type: file.type,
      });
    };
    
    img.onerror = () => reject(new Error('Failed to load image metadata'));
    img.src = URL.createObjectURL(file);
  });
};

// Create optimized image variants for different devices
export const createImageVariants = async (
  file: File
): Promise<{
  thumbnail: File;
  small: File;
  medium: File;
  large: File;
  original: File;
}> => {
  const [thumbnail, small, medium, large] = await Promise.all([
    compressImage(file, IMAGE_SIZES.thumbnail.width, IMAGE_SIZES.thumbnail.height, 0.7),
    compressImage(file, IMAGE_SIZES.small.width, IMAGE_SIZES.small.height, 0.8),
    compressImage(file, IMAGE_SIZES.medium.width, IMAGE_SIZES.medium.height, 0.85),
    compressImage(file, IMAGE_SIZES.large.width, IMAGE_SIZES.large.height, 0.9),
  ]);

  return {
    thumbnail,
    small,
    medium,
    large,
    original: file,
  };
};

// Utility for progressive image loading
export const createProgressiveImageLoader = () => {
  const loadedImages = new Set<string>();

  return {
    isLoaded: (src: string) => loadedImages.has(src),
    markAsLoaded: (src: string) => loadedImages.add(src),
    preloadImage: (src: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        if (loadedImages.has(src)) {
          resolve();
          return;
        }

        const img = new Image();
        img.onload = () => {
          loadedImages.add(src);
          resolve();
        };
        img.onerror = reject;
        img.src = src;
      });
    },
  };
};

// Default image paths for the ashram system
export const DEFAULT_IMAGES = {
  avatar: '/images/default-avatar.png',
  ashram: '/images/ashram-default.jpg',
  guruji: '/images/guruji-placeholder.jpg',
  remedy: '/images/remedy-placeholder.png',
  logo: '/images/ashram-logo.png',
} as const;