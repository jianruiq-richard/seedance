"use client";

import { useState, useEffect } from "react";

const sampleVideos = [
  {
    id: 1,
    title: "Neon city in slow motion",
    style: "Cinematic Glow",
    duration: "6 seconds",
    description: "Futuristic cityscape with neon lights",
    gradient: "from-purple-600/20 via-pink-500/15 to-cyan-400/20",
    icon: "🌃"
  },
  {
    id: 2,
    title: "Ocean waves crashing",
    style: "Natural",
    duration: "8 seconds",
    description: "Dramatic ocean scene with golden hour lighting",
    gradient: "from-blue-600/25 via-cyan-400/20 to-teal-300/15",
    icon: "🌊"
  },
  {
    id: 3,
    title: "Forest morning mist",
    style: "Atmospheric",
    duration: "10 seconds",
    description: "Ethereal forest scene with morning fog",
    gradient: "from-green-600/20 via-emerald-400/15 to-lime-300/10",
    icon: "🌲"
  }
];

export default function SampleVideoPreview() {
  const [currentVideo, setCurrentVideo] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const current = sampleVideos[currentVideo];

  // Auto-cycle through videos
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentVideo((prev) => (prev + 1) % sampleVideos.length);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  const handlePlay = () => {
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 3000);
  };

  const nextVideo = () => {
    setCurrentVideo((prev) => (prev + 1) % sampleVideos.length);
  };

  const prevVideo = () => {
    setCurrentVideo((prev) => (prev - 1 + sampleVideos.length) % sampleVideos.length);
  };

  return (
    <div className="mt-4 relative">
      {/* Main Video Display */}
      <div className="relative h-64 rounded-2xl overflow-hidden bg-black">
        {/* Animated Background */}
        <div className={`absolute inset-0 bg-gradient-to-br ${current.gradient} transition-all duration-1000`}>
          {/* Floating particles animation */}
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className={`absolute w-1 h-1 bg-white/20 rounded-full animate-pulse ${
                  isAnimating ? 'animate-bounce' : ''
                }`}
                style={{
                  left: `${20 + i * 15}%`,
                  top: `${30 + (i % 2) * 40}%`,
                  animationDelay: `${i * 0.5}s`,
                  animationDuration: `${2 + i * 0.5}s`
                }}
              />
            ))}
          </div>

          {/* Content overlay */}
          <div className="relative h-full flex items-center justify-center">
            <div className="text-center text-white">
              <div className={`text-6xl mb-4 transition-transform duration-500 ${
                isAnimating ? 'scale-110' : 'scale-100'
              }`}>
                {current.icon}
              </div>
              <h3 className="text-lg font-semibold mb-2">{current.title}</h3>
              <p className="text-sm text-white/60 mb-4 max-w-xs">{current.description}</p>

              {/* Play Button */}
              <button
                onClick={handlePlay}
                className={`inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur px-6 py-3 text-sm font-medium text-white transition-all hover:bg-white/20 ${
                  isAnimating ? 'scale-105 bg-white/20' : ''
                }`}
              >
                <span className="text-lg">{isAnimating ? '⏸' : '▶'}</span>
                {isAnimating ? 'Playing...' : 'Preview'}
              </button>
            </div>
          </div>

          {/* Navigation arrows */}
          <button
            onClick={prevVideo}
            className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-black/30 backdrop-blur p-2 text-white/60 transition hover:bg-black/50 hover:text-white"
          >
            ←
          </button>
          <button
            onClick={nextVideo}
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-black/30 backdrop-blur p-2 text-white/60 transition hover:bg-black/50 hover:text-white"
          >
            →
          </button>

          {/* Video indicators */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {sampleVideos.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentVideo(index)}
                className={`h-2 w-8 rounded-full transition ${
                  index === currentVideo ? 'bg-white' : 'bg-white/30'
                }`}
              />
            ))}
          </div>

          {/* Progress bar for auto-cycling */}
          <div className="absolute top-0 left-0 h-1 bg-white/20 rounded">
            <div
              className="h-full bg-white/60 rounded transition-all duration-1000 ease-linear"
              style={{
                width: `${((Date.now() % 8000) / 8000) * 100}%`,
                animation: 'progress 8s linear infinite'
              }}
            />
          </div>
        </div>
      </div>

      {/* Video Info */}
      <div className="mt-5 grid gap-3 text-sm text-white/70">
        <div className="flex items-center justify-between">
          <span>Prompt</span>
          <span className="text-white/40 transition-all duration-300">{current.title}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Style</span>
          <span className="text-white/40 transition-all duration-300">{current.style}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Duration</span>
          <span className="text-white/40 transition-all duration-300">{current.duration}</span>
        </div>
      </div>

      <style jsx>{`
        @keyframes progress {
          from { width: 0% }
          to { width: 100% }
        }
      `}</style>
    </div>
  );
}