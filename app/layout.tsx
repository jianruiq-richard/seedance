import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";
import Providers from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://seedance.technology"
  ),
  title: {
    default: "Seedance 2.0 AI Video Generator",
    template: "%s | Seedance 2",
  },
  description:
    "Create cinematic AI videos with Seedance 2.0. Generate text to video, image to video, video reference edits, audio synced clips, and watermark-free downloads.",
  applicationName: "Seedance 2",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Seedance 2.0 AI Video Generator",
    description:
      "Generate AI videos from text, images, video references, and audio inputs with Seedance 2.0.",
    url: "/",
    siteName: "Seedance 2",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Seedance 2.0 AI Video Generator",
    description:
      "Create text to video, image to video, and reference-based AI videos with Seedance 2.0.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
const clarityProjectId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID;
const criticalFallbackCss = `
  html {
    background: #0a0b10;
    color: #ffffff;
    color-scheme: dark;
  }
  body {
    margin: 0;
    min-height: 100vh;
    background: #0a0b10;
    color: #ffffff;
    font-family: Arial, Helvetica, sans-serif;
  }
  a {
    color: inherit;
    text-decoration: none;
  }
  button,
  input,
  select,
  textarea {
    font: inherit;
  }
  button,
  a[href] {
    touch-action: manipulation;
  }
  img,
  video {
    max-width: 100%;
  }
  body::before {
    content: "";
    position: fixed;
    inset: 0;
    z-index: -1;
    pointer-events: none;
    background:
      radial-gradient(circle at 10% -10%, rgba(247, 197, 120, 0.18), transparent 30rem),
      radial-gradient(circle at 90% 10%, rgba(115, 190, 255, 0.14), transparent 24rem),
      #0a0b10;
  }
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <style
          id="critical-fallback-css"
          dangerouslySetInnerHTML={{ __html: criticalFallbackCss }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>{children}</Providers>
        {clarityProjectId ? (
          <Script id="microsoft-clarity" strategy="lazyOnload">
            {`
              (function(c,l,a,r,i,t,y){
                c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
              })(window, document, "clarity", "script", "${clarityProjectId}");
            `}
          </Script>
        ) : null}
        <Analytics />
        {gaMeasurementId ? (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}`}
              strategy="lazyOnload"
            />
            <Script id="google-analytics" strategy="lazyOnload">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${gaMeasurementId}');
              `}
            </Script>
          </>
        ) : null}
      </body>
    </html>
  );
}
