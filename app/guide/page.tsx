import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "../components/MarketingShell";

export const metadata: Metadata = {
  title: "Seedance 2.0 Prompt Guide | AI Video Prompting Examples",
  description:
    "Learn how to write Seedance 2.0 prompts for text to video, image references, video references, camera movement, video editing, extension, and audio synced AI videos.",
  keywords: [
    "Seedance prompt guide",
    "AI video prompt",
    "text to video prompt",
    "image reference prompt",
    "video reference prompt",
    "AI video editing prompt",
    "Seedance 2.0 examples",
  ],
};

const sections = [
  {
    title: "01 General Prompt Formula",
    items: [
      "Subject: define who or what appears in the scene.",
      "Motion: describe the action, gesture, speed, and direction.",
      "Environment: specify location, lighting, season, background, and mood.",
      "Aesthetics: add style terms such as cinematic, documentary, anime, product photography, or realistic VFX.",
      "Camera: describe close-up, dolly push, tracking shot, handheld, FPV, orbit, crane, or one-take movement.",
      "Audio: request ambient sound, music rhythm, voiceover, effects, or beat synchronization.",
    ],
  },
  {
    title: "02 Text to Video Prompts",
    items: [
      "Use a clear subject and action before visual style details.",
      "Add shot language when you need precise framing or pacing.",
      "Mention subtitle text, sign text, title cards, or speech bubbles directly in the prompt.",
      "Keep rare characters and overly complex typography out of generated text.",
    ],
  },
  {
    title: "03 Image Reference Prompts",
    items: [
      "Use uploaded images for character identity, product shape, outfit, logo, composition, or first frame control.",
      "Refer to assets by order, such as Image 1 for the subject and Image 2 for the outfit.",
      "For products, ask for front, side, back, close-up, rotation, and clean studio lighting.",
      "For characters, specify which visual traits must remain consistent across the video.",
    ],
  },
  {
    title: "04 Video Reference Prompts",
    items: [
      "Use video references for action, choreography, camera movement, transitions, and effects.",
      "State exactly what should be copied from the source video and what should change.",
      "For camera replication, name the movement: orbit, dolly, tracking, push-in, pull-back, pan, tilt, or FPV.",
      "For motion replication, pair the reference action with your new character, product, or environment.",
    ],
  },
  {
    title: "05 Video Editing and Extension",
    items: [
      "Add elements by specifying the time, location, object, and how it should interact with the scene.",
      "Remove or replace elements while asking the model to preserve camera movement and background continuity.",
      "Extend a clip forward or backward by describing what happens before or after the uploaded video.",
      "Connect multiple clips by describing the transition point and the visual bridge between scenes.",
    ],
  },
];

const examples = [
  {
    label: "Product Video",
    prompt:
      "Use Image 1 as the product reference. Place the bottle on a reflective black table, slow orbit camera, warm rim light, water droplets, premium skincare advertisement style.",
  },
  {
    label: "Character Consistency",
    prompt:
      "Reference the woman from Image 1 and Image 2. She walks into a coffee shop, smiles, picks up a cake, and keeps the same face, hairstyle, and outfit across the full clip.",
  },
  {
    label: "Camera Movement Reference",
    prompt:
      "Use the camera movement from Video 1. Replace the city with a futuristic tech campus from Image 1, keeping the same first-person dive and smooth acceleration.",
  },
  {
    label: "Video Extension",
    prompt:
      "Extend Video 1 forward. After the character opens the door, the camera moves into a bright studio where a product reveal begins with soft music.",
  },
];

export default function GuidePage() {
  return (
    <PageShell>
      <main>
        <section className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#f7c578]">
            Seedance 2.0 Prompt Guide
          </p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight text-white sm:text-5xl">
            Master AI video prompts for text, image, video, and audio references
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-8 text-white/64">
            Use this guide to write better Seedance 2.0 prompts for text to
            video, image to video, reference-based motion, video editing, video
            extension, subtitles, sound, and camera control.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link className="rounded-full bg-[#f7c578] px-6 py-3 text-sm font-semibold text-[#080a0f]" href="/app">
              Try These Prompts
            </Link>
            <Link className="rounded-full border border-white/18 px-6 py-3 text-sm font-semibold text-white/80" href="/pricing">
              View Credit Pricing
            </Link>
          </div>
        </section>

        <section className="mx-auto grid w-full max-w-7xl gap-6 px-4 pb-12 sm:px-6 lg:grid-cols-[0.34fr_0.66fr]">
          <aside className="rounded-2xl border border-white/10 bg-white/[0.045] p-5 lg:sticky lg:top-24 lg:self-start">
            <h2 className="text-sm font-semibold text-white">Table of Contents</h2>
            <div className="mt-4 grid gap-2 text-sm text-white/58">
              {sections.map((section) => (
                <a key={section.title} className="hover:text-white" href={`#${section.title.slice(0, 2)}`}>
                  {section.title}
                </a>
              ))}
            </div>
          </aside>
          <div className="grid gap-5">
            {sections.map((section) => (
              <article
                key={section.title}
                id={section.title.slice(0, 2)}
                className="rounded-2xl border border-white/10 bg-white/[0.045] p-5 sm:p-6"
              >
                <h2 className="text-xl font-semibold text-white">{section.title}</h2>
                <ul className="mt-4 grid gap-3 text-sm leading-6 text-white/62">
                  {section.items.map((item) => (
                    <li key={item} className="rounded-xl border border-white/8 bg-black/16 p-3">
                      {item}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section className="border-y border-white/10 bg-white/[0.025]">
          <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6">
            <h2 className="text-2xl font-semibold text-white sm:text-3xl">
              Seedance 2.0 Prompt Examples
            </h2>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {examples.map((example) => (
                <article key={example.label} className="rounded-2xl border border-white/10 bg-black/18 p-5">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#f7c578]">
                    {example.label}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-white/66">{example.prompt}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
    </PageShell>
  );
}
