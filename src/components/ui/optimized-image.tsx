"use client";

import { useState } from 'react';
import { useAppStore } from '@/store/app-store';
import Image from 'next/image';
import { cn } from '@/lib/utils/helpers';
import { getOptimizedImageProps, DEFAULT_IMAGES } from '@/lib/image-optimization';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  fallbackSrc?: string;
  quality?: number;
  priority?: boolean;
  blur?: boolean;
  aspectRatio?: '1:1' | '3:4' | '4:3' | '16:9';
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  loading?: 'lazy' | 'eager';
  onLoad?: () => void;
  onError?: () => void;
}

export function OptimizedImage({
  src,
  alt,
  width = 600,
  height = 600,
  className,
  fallbackSrc = DEFAULT_IMAGES.avatar,
  quality = 85,
  priority = false,
  blur = false,
  aspectRatio,
  objectFit = 'cover',
  loading = 'lazy',
  onLoad,
  onError,
}: OptimizedImageProps) {
  const [imageSrc, setImageSrc] = useState(src);
  const { setLoadingState, loadingStates } = useAppStore();
  const isLoading = loadingStates['optimized-image'] || false;
  const [hasError, setHasError] = useState(false);

  const handleLoad = () => {
    setLoadingState('optimized-image', false);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    setLoadingState('optimized-image', false);
    setImageSrc(fallbackSrc);
    onError?.();
  };

  // Calculate dimensions based on aspect ratio
  const getDimensions = () => {
    if (!aspectRatio) return { width, height };

    const ratios = {
      '1:1': { w: 1, h: 1 },
      '3:4': { w: 3, h: 4 },
      '4:3': { w: 4, h: 3 },
      '16:9': { w: 16, h: 9 },
    };

    const ratio = ratios[aspectRatio];
    if (width) {
      return { width, height: Math.round((width * ratio.h) / ratio.w) };
    }
    if (height) {
      return { width: Math.round((height * ratio.w) / ratio.h), height };
    }
    return { width: 600, height: 600 };
  };

  const dimensions = getDimensions();
  const imageProps = getOptimizedImageProps(imageSrc, {
    width: dimensions.width,
    height: dimensions.height,
    quality,
    blur,
  });

  return (
    <div
      className={cn(
        'relative overflow-hidden bg-gray-100',
        aspectRatio === '1:1' && 'aspect-square',
        aspectRatio === '3:4' && 'aspect-[3/4]',
        aspectRatio === '4:3' && 'aspect-[4/3]',
        aspectRatio === '16:9' && 'aspect-video',
        className
      )}
      style={{
        width: dimensions.width,
        height: aspectRatio ? undefined : dimensions.height,
      }}
    >
      {/* Loading placeholder */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 animate-pulse">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
        </div>
      )}

      {/* Error state */}
      {hasError && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-400">
          <div className="text-center">
            <svg
              className="w-12 h-12 mx-auto mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="text-xs">Image not available</p>
          </div>
        </div>
      )}

      {/* Main image */}
      <Image
        {...imageProps}
        alt={alt}
        priority={priority}
        loading={priority ? undefined : loading}
        className={cn(
          'transition-opacity duration-300',
          isLoading ? 'opacity-0' : 'opacity-100',
          objectFit === 'contain' && 'object-contain',
          objectFit === 'cover' && 'object-cover',
          objectFit === 'fill' && 'object-fill',
          objectFit === 'none' && 'object-none',
          objectFit === 'scale-down' && 'object-scale-down'
        )}
        style={{
          width: '100%',
          height: '100%',
        }}
        onLoad={handleLoad}
        onError={handleError}
      />

      {/* Overlay for additional styling */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
    </div>
  );
}

// Avatar-specific optimized image component
export function AvatarImage({
  src,
  alt,
  size = 'md',
  className,
  fallbackSrc = DEFAULT_IMAGES.avatar,
}: {
  src: string;
  alt: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  fallbackSrc?: string;
}) {
  const sizes = {
    xs: 24,
    sm: 32,
    md: 48,
    lg: 64,
    xl: 96,
  };

  const imageSize = sizes[size];

  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={imageSize}
      height={imageSize}
      aspectRatio="1:1"
      className={cn('rounded-full', className)}
      fallbackSrc={fallbackSrc}
      objectFit="cover"
      quality={90}
    />
  );
}

// Gallery image component for remedy documents, etc.
export function GalleryImage({
  src,
  alt,
  className,
  onClick,
}: {
  src: string;
  alt: string;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div
      className={cn(
        'group cursor-pointer relative transition-transform hover:scale-105',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      <OptimizedImage
        src={src}
        alt={alt}
        aspectRatio="4:3"
        className="rounded-lg shadow-md group-hover:shadow-lg transition-shadow"
        objectFit="cover"
        quality={90}
      />
      
      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-lg flex items-center justify-center">
        <div className="w-8 h-8 bg-white/90 rounded-full flex items-center justify-center">
          <svg
            className="w-4 h-4 text-gray-700"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}