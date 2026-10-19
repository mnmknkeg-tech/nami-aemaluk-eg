'use client';

import React, { useEffect, useRef, useState } from 'react';

interface BannerBackgroundProps {
  videoUrl?: string;
  gradientColor?: string;
  fadeDuration?: number;
  startOffset?: number;
}

const DEFAULT_VIDEO_URL =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260328_083109_283f3553-e28f-428b-a723-d639c617eb2b.mp4';

export default function BannerBackground({
  videoUrl = DEFAULT_VIDEO_URL,
  gradientColor = '#020617',
  fadeDuration = 0.5,
  startOffset = 0.8,
}: BannerBackgroundProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoOpacity, setVideoOpacity] = useState(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let animationFrameId: number;
    let isResetting = false;

    const monitorVideoFade = () => {
      if (video && !isResetting && video.duration && !isNaN(video.duration) && video.duration > 0) {
        const current = video.currentTime;
        const duration = video.duration;
        let targetOpacity = 1;

        // Fade in from startOffset
        if (current < startOffset + fadeDuration) {
          targetOpacity = Math.max(0, Math.min(1, (current - startOffset) / fadeDuration));
        } else if (current > duration - fadeDuration) {
          targetOpacity = Math.max(0, Math.min(1, (duration - current) / fadeDuration));
        }

        setVideoOpacity(targetOpacity);
        video.style.opacity = targetOpacity.toString();
      }
      animationFrameId = requestAnimationFrame(monitorVideoFade);
    };

    animationFrameId = requestAnimationFrame(monitorVideoFade);

    const handleEnded = () => {
      isResetting = true;
      setVideoOpacity(0);
      if (videoRef.current) videoRef.current.style.opacity = '0';

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.currentTime = startOffset;
          videoRef.current.play().then(() => { isResetting = false; }).catch(() => { isResetting = false; });
        } else {
          isResetting = false;
        }
      }, 100);
    };

    // Set initial time to skip black frame
    const handleLoadedData = () => {
      if (videoRef.current) {
        videoRef.current.currentTime = startOffset;
      }
    };

    video.addEventListener('ended', handleEnded);
    video.addEventListener('loadeddata', handleLoadedData);
    video.play().catch(() => {});

    return () => {
      cancelAnimationFrame(animationFrameId);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('loadeddata', handleLoadedData);
    };
  }, [videoUrl, fadeDuration, startOffset]);

  return (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
      <video
        ref={videoRef}
        src={videoUrl}
        muted
        playsInline
        autoPlay
        preload="auto"
        className="w-full h-full object-cover transition-opacity duration-75 ease-linear"
        style={{ opacity: videoOpacity, willChange: 'opacity' }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `linear-gradient(to bottom, ${gradientColor} 0%, transparent 40%, transparent 60%, ${gradientColor} 100%)`,
        }}
      />
    </div>
  );
}
