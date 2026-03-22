"use client";

import { useState, useEffect } from "react";

// Fallback sample videos with gradients (used while loading or if no real videos exist)
const fallbackVideos = [
  {
    id: "neon-city",
    title: "Cinematic establishing shot of a futuristic neon-lit cyberpunk city",
    style: "Cinematic Cyberpunk",
    duration: "8 seconds",
    description: "Futuristic cityscape with neon lights",
    gradient: "from-purple-600/20 via-pink-500/15 to-cyan-400/20",
    icon: "🌃",
    videoUrl: null
  },
  {
    id: "ocean-sunset",
    title: "Breathtaking golden hour ocean scene with massive waves",
    style: "Nature Documentary",
    duration: "10 seconds",
    description: "Dramatic ocean scene with golden hour lighting",
    gradient: "from-blue-600/25 via-cyan-400/20 to-teal-300/15",
    icon: "🌊",
    videoUrl: null
  },
  {
    id: "space-nebula",
    title: "Epic deep space cinematography of a colorful nebula",
    style: "Space Epic",
    duration: "12 seconds",
    description: "Ethereal space scene with cosmic phenomena",
    gradient: "from-purple-600/20 via-blue-500/15 to-indigo-400/20",
    icon: "✨",
    videoUrl: null
  }
];

type SampleVideo = {
  id: string;
  title: string;
  style: string;
  duration: string;
  description?: string;
  gradient?: string;
  icon?: string;
  videoUrl: string | null;
};

export default function SampleVideoPreview() {
  const [sampleVideos, setSampleVideos] = useState<SampleVideo[]>(fallbackVideos);
  const [currentVideo, setCurrentVideo] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(true);

  const current = sampleVideos[currentVideo];

  // Load real sample videos on mount
  useEffect(() => {
    const loadSampleVideos = async () => {
      try {
        const response = await fetch('/samples/videos.json');
        if (response.ok) {
          const realVideos = await response.json();
          if (realVideos && realVideos.length > 0) {
            // Merge real videos with fallback data
            const mergedVideos = realVideos.map((video: any, index: number) => ({
              ...fallbackVideos[index] || fallbackVideos[0],
              ...video,
              videoUrl: video.videoUrl || null
            }));
            setSampleVideos(mergedVideos);
            console.log('✅ Loaded real sample videos:', mergedVideos);
          }
        }
      } catch (error) {
        console.log('📱 Using fallback sample videos (real videos not generated yet)');
      } finally {
        setLoading(false);
      }
    };

    loadSampleVideos();
  }, []);

  // Auto-cycle through videos
  useEffect(() => {
    if (isPlaying) return; // Don't cycle while playing

    const interval = setInterval(() => {
      setCurrentVideo((prev) => (prev + 1) % sampleVideos.length);
    }, 10000); // Longer interval for video viewing

    return () => clearInterval(interval);
  }, [sampleVideos.length, isPlaying]);

  const handlePlay = () => {
    if (current.videoUrl && !isPlaying) {
      setIsPlaying(true);
    }
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  const nextVideo = () => {
    setCurrentVideo((prev) => (prev + 1) % sampleVideos.length);
    setIsPlaying(false);
  };

  const prevVideo = () => {
    setCurrentVideo((prev) => (prev - 1 + sampleVideos.length) % sampleVideos.length);
    setIsPlaying(false);
  };

  const selectVideo = (index: number) => {
    setCurrentVideo(index);
    setIsPlaying(false);
  };

  return (
    <div className="mt-4 relative">
      {/* Main Video Display */}
      <div className="relative h-64 rounded-2xl overflow-hidden bg-black">
        {current.videoUrl && isPlaying ? (
          // Real video playback
          <video
            key={current.videoUrl}
            className="w-full h-full object-cover"
            autoPlay
            loop
            muted
            onLoadedData={() => console.log('Video loaded:', current.title)}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
            controls={false}
          >
            <source src={current.videoUrl} type="video/mp4" />
          </video>
        ) : (
          // Fallback gradient display
          <div className={`relative w-full h-full bg-gradient-to-br ${current.gradient || 'from-gray-800 to-gray-900'}`}>
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_25%_25%,white_1px,transparent_1px)] bg-[length:24px_24px]" />

            {/* Floating particles animation */}
            <div className="absolute inset-0 overflow-hidden">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className={`absolute w-1 h-1 bg-white/30 rounded-full animate-pulse`}
                  style={{
                    left: `${15 + i * 12}%`,
                    top: `${20 + (i % 3) * 30}%`,
                    animationDelay: `${i * 0.8}s`,
                    animationDuration: `${3 + i * 0.3}s`
                  }}
                />
              ))}
            </div>

            {/* Content overlay */}
            <div className="relative h-full flex items-center justify-center p-6">
              <div className="text-center text-white max-w-sm">
                <div className="text-5xl mb-4 opacity-80">
                  {current.icon || '🎬'}
                </div>
                <h3 className="text-base font-semibold mb-2 leading-tight">
                  {current.title}
                </h3>
                <p className="text-xs text-white/60 mb-4 leading-relaxed">
                  {current.description || "AI-generated sample video"}
                </p>

                {/* Play Button */}
                {current.videoUrl ? (
                  <button
                    onClick={handlePlay}
                    className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-5 py-2 text-sm font-medium text-white transition-all hover:bg-white/25 hover:scale-105"
                  >
                    <span className="text-base">▶</span>
                    Play Video
                  </button>
                ) : (
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur px-5 py-2 text-xs text-white/60">
                    <span className="animate-spin">⏳</span>
                    {loading ? "Loading samples..." : "Sample generating..."}
                  </div>
                )}
              </div>
            </div>

            {/* Navigation arrows */}
            <button
              onClick={prevVideo}
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/40 backdrop-blur p-2 text-white/70 transition hover:bg-black/60 hover:text-white"
            >
              ←
            </button>
            <button
              onClick={nextVideo}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/40 backdrop-blur p-2 text-white/70 transition hover:bg-black/60 hover:text-white"
            >
              →
            </button>

            {/* Video indicators */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {sampleVideos.map((_, index) => (
                <button
                  key={index}
                  onClick={() => selectVideo(index)}
                  className={`h-1.5 w-6 rounded-full transition-all ${
                    index === currentVideo ? 'bg-white' : 'bg-white/30 hover:bg-white/50'
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Video controls overlay */}
        {current.videoUrl && isPlaying && (
          <button
            onClick={handlePause}
            className="absolute top-4 right-4 rounded-full bg-black/50 backdrop-blur p-2 text-white/80 transition hover:bg-black/70"
          >
            ⏸
          </button>
        )}
      </div>

      {/* Video Info */}
      <div className="mt-5 grid gap-3 text-sm text-white/70">
        <div className="flex items-center justify-between">
          <span>Prompt</span>
          <span className="text-white/40 transition-all duration-300 text-right max-w-[200px] truncate">
            {current.title}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>Style</span>
          <span className="text-white/40 transition-all duration-300">{current.style}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Duration</span>
          <span className="text-white/40 transition-all duration-300">{current.duration}</span>
        </div>
        {current.videoUrl && (
          <div className="flex items-center justify-between">
            <span>Status</span>
            <span className="text-green-400 text-xs flex items-center gap-1">
              <span className="w-2 h-2 bg-green-400 rounded-full"></span>
              AI Generated
            </span>
          </div>
        )}
      </div>
    </div>
  );
}