import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "../components/MarketingShell";

export const metadata: Metadata = {
  title: "AI Image Studio | Text to Image & Image to Image Generator",
  description:
    "Generate AI images from text prompts or transform existing photos into production-ready visual references for Seedance 2.0 AI video creation.",
  keywords: [
    "AI image generator",
    "text to image",
    "image to image",
    "AI photo editor",
    "Seedance AI image",
    "AI video reference image",
  ],
};

const ratios = ["Auto", "1:1", "9:16", "16:9", "3:4", "4:3", "3:2", "2:3", "21:9"];
const workflows = [
  {
    title: "Text to Image",
    copy: "Describe a subject, scene, product shot, character, background, or storyboard frame and generate a clean image reference.",
  },
  {
    title: "Image to Image",
    copy: "Upload an existing image and transform it into a new style, composition, product concept, campaign asset, or Seedance 2.0 reference.",
  },
  {
    title: "Video Reference Assets",
    copy: "Create first frames, end frames, character sheets, product angles, and scene boards that can guide image to video generation.",
  },
];

export default function AiImagePage() {
  return (
    <PageShell>
      <main>
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(247,197,120,0.2),transparent_30rem),radial-gradient(circle_at_85%_12%,rgba(86,180,155,0.16),transparent_24rem)]" />
          <div className="relative mx-auto grid w-full max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#f7c578]">
                AI Image Studio
              </p>
              <h1 className="mt-4 text-4xl font-semibold leading-tight text-white sm:text-5xl">
                Generate images for prompts, products, characters, and video references
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-white/64">
                Use text to image and image to image workflows to prepare
                source material for Seedance 2.0 image to video, product videos,
                creative ads, storyboards, and brand content.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link className="rounded-full bg-[#f7c578] px-6 py-3 text-sm font-semibold text-[#080a0f]" href="/app">
                  Create Video from Image
                </Link>
                <Link className="rounded-full border border-white/18 px-6 py-3 text-sm font-semibold text-white/80" href="/guide">
                  Learn Image Prompts
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-white/45">
                    AI Model
                  </p>
                  <h2 className="mt-2 text-lg font-semibold text-white">
                    Premium Image Generator
                  </h2>
                </div>
                <span className="rounded-full border border-white/14 px-3 py-1 text-xs text-white/58">
                  1K / 2K / 4K
                </span>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-2 text-xs">
                {["Text to Image", "Image to Image"].map((item, index) => (
                  <span
                    key={item}
                    className={`rounded-full border px-3 py-2 text-center ${
                      index === 0 ? "border-white bg-white text-[#080a0f]" : "border-white/15 text-white/64"
                    }`}
                  >
                    {item}
                  </span>
                ))}
              </div>
              <div className="mt-4 min-h-28 rounded-2xl border border-white/10 bg-black/22 p-4 text-sm leading-6 text-white/66">
                A high-end skincare bottle on wet black stone, golden rim light,
                macro lens, realistic condensation, luxury product photography.
              </div>
              <div className="mt-4">
                <p className="mb-2 text-xs uppercase tracking-[0.2em] text-white/42">
                  Aspect Ratio
                </p>
                <div className="flex flex-wrap gap-2">
                  {ratios.map((ratio) => (
                    <span key={ratio} className="rounded-full border border-white/14 px-3 py-1 text-xs text-white/62">
                      {ratio}
                    </span>
                  ))}
                </div>
              </div>
              <button className="mt-5 w-full rounded-2xl bg-[#f7c578] px-4 py-3 text-sm font-semibold text-[#080a0f]">
                Generate Image
              </button>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6">
          <h2 className="text-2xl font-semibold text-white sm:text-3xl">
            AI Image Workflows for Video Creators
          </h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {workflows.map((item) => (
              <article key={item.title} className="rounded-2xl border border-white/10 bg-white/[0.045] p-5">
                <h3 className="font-semibold text-white">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-white/58">{item.copy}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </PageShell>
  );
}
