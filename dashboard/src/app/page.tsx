"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

// ─── Chicago coordinates ────────────────────────────────
const CHICAGO = { lng: -87.6244, lat: 41.8827 }; // Willis Tower area
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

// ─── 3D Map Hero ────────────────────────────────────────
function ChicagoMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const animationRef = useRef<number>(0);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    // Mapbox Standard style — includes textured 3D landmark buildings
    // Willis Tower, Hancock Center, Trump Tower, etc. are pre-modeled
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/standard",
      center: [CHICAGO.lng, CHICAGO.lat],
      zoom: 16.2,
      pitch: 65,
      bearing: -30,
      antialias: true,
      interactive: false,
      attributionControl: false,
    });

    const m = map.current;

    m.on("style.load", () => {
      // ── Standard style config: enable 3D buildings + landmarks + night theme ──
      try {
        m.setConfigProperty("basemap", "lightPreset", "night");
        m.setConfigProperty("basemap", "showPlaceLabels", false);
        m.setConfigProperty("basemap", "showPointOfInterestLabels", false);
        m.setConfigProperty("basemap", "showTransitLabels", false);
        m.setConfigProperty("basemap", "showRoadLabels", false);
      } catch {
        // Fallback if Standard config not available
      }

      // ── Fog for cinematic depth ──
      m.setFog({
        color: "rgb(10, 15, 26)",
        "high-color": "rgb(15, 25, 45)",
        "horizon-blend": 0.06,
        "star-intensity": 0.15,
        "space-color": "rgb(8, 12, 22)",
      });

      setMapLoaded(true);

      // ── Cinematic camera: slow orbit around Chicago Loop ──
      let bearing = -30;
      const rotateCamera = () => {
        bearing += 0.007;
        m.rotateTo(bearing % 360, { duration: 0 });
        animationRef.current = requestAnimationFrame(rotateCamera);
      }
      rotateCamera();
    });

    return () => {
      cancelAnimationFrame(animationRef.current);
      map.current?.remove();
      map.current = null;
    };
  }, []);

  return (
    <>
      <div
        ref={mapContainer}
        className="absolute inset-0 w-full h-full"
        style={{ minHeight: "100vh" }}
      />
      {/* Dark gradient overlays for readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0f1a]/70 via-[#0a0f1a]/30 to-[#0a0f1a]/90 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#0a0f1a]/60 via-transparent to-[#0a0f1a]/40 pointer-events-none" />
      {/* Subtle scanline texture */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{
        backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(212,255,81,0.1) 2px, rgba(212,255,81,0.1) 3px)",
      }} />
      {/* Map loading pulse */}
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0a0f1a]">
          <div className="w-3 h-3 rounded-full bg-accent animate-ping" />
        </div>
      )}
    </>
  );
}

// ─── Animated counter ───────────────────────────────────
function AnimatedStat({ value, suffix, label }: { value: number; suffix: string; label: string }) {
  const [count, setCount] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.3 });
    const el = document.getElementById(`stat-${label}`);
    if (el) observer.observe(el);
    return () => observer.disconnect();
  }, [label]);

  useEffect(() => {
    if (!visible) return;
    const steps = 40;
    const increment = value / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) { setCount(value); clearInterval(timer); }
      else setCount(Math.floor(current));
    }, 1500 / steps);
    return () => clearInterval(timer);
  }, [visible, value]);

  return (
    <div id={`stat-${label}`} className="text-center">
      <div className="text-4xl sm:text-5xl font-light text-accent">
        {count}<span className="text-2xl">{suffix}</span>
      </div>
      <div className="text-xs text-text-dim mt-2 uppercase tracking-[0.2em]">{label}</div>
    </div>
  );
}

// ─── Feature Card ───────────────────────────────────────
function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="rounded-xl p-6 border border-white/[0.06] bg-[#0a0f1a]/60 backdrop-blur-xl hover:border-accent/20 transition-all duration-300 group cursor-pointer">
      <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center mb-4 group-hover:bg-accent/20 transition-colors">
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-text-primary mb-2">{title}</h3>
      <p className="text-[13px] text-text-dim leading-relaxed">{description}</p>
    </div>
  );
}

// ─── Step ───────────────────────────────────────────────
function Step({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="flex gap-5">
      <div className="shrink-0 w-10 h-10 rounded-full border border-accent/30 flex items-center justify-center">
        <span className="text-sm font-mono text-accent">{number}</span>
      </div>
      <div>
        <h4 className="text-sm font-semibold text-text-primary mb-1">{title}</h4>
        <p className="text-[13px] text-text-dim leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────
export default function LandingPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="min-h-screen relative bg-[#0a0f1a]">

      {/* ═══════════════════════════════════════════════════ */}
      {/* HERO: Full-screen 3D Chicago Map                   */}
      {/* ═══════════════════════════════════════════════════ */}
      <section className="relative h-screen overflow-hidden">
        <ChicagoMap />

        {/* Nav — floating glass */}
        <nav className="absolute top-0 left-0 right-0 z-50 h-14 flex items-center justify-between px-8 bg-[#0a0f1a]/40 backdrop-blur-md border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-5 bg-accent rounded-full" />
            <span className="text-[11px] font-semibold tracking-[0.25em] uppercase text-text-secondary">
              Chicago Intelligence Company
            </span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#features" className="text-[11px] tracking-[0.15em] uppercase text-text-dim hover:text-accent transition-colors hidden sm:block">Features</a>
            <a href="#how-it-works" className="text-[11px] tracking-[0.15em] uppercase text-text-dim hover:text-accent transition-colors hidden sm:block">Process</a>
            <a href="#report" className="text-[11px] tracking-[0.15em] uppercase text-text-dim hover:text-accent transition-colors hidden sm:block">Output</a>
            <Link
              href="/dashboard"
              className="px-4 py-1.5 rounded-lg bg-accent text-bg-primary text-[11px] font-semibold tracking-wider uppercase hover:shadow-[0_0_20px_rgba(212,255,81,0.3)] transition-all duration-200"
            >
              Launch Platform
            </Link>
          </div>
        </nav>

        {/* Hero content — centered over the 3D city */}
        <div className={`absolute inset-0 flex items-center justify-center z-10 px-6 transition-all duration-1000 delay-500 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          <div className="max-w-4xl text-center">
            <div className="inline-flex items-center gap-3 mb-8">
              <div className="w-2 h-2 rounded-full bg-accent animate-dot-pulse" />
              <span className="text-[11px] font-medium tracking-[0.3em] uppercase text-white/60">
                Autonomous Intelligence — Chicago, IL
              </span>
              <div className="w-2 h-2 rounded-full bg-accent animate-dot-pulse" />
            </div>

            <h1 className="text-5xl sm:text-7xl lg:text-8xl font-light tracking-tight text-white leading-[1.05] mb-6">
              AI that performs
              <br />
              <span className="text-accent font-normal">due diligence</span>
              <br />
              <span className="text-white/80">like a senior analyst</span>
            </h1>

            <p className="text-lg sm:text-xl text-white/50 font-light max-w-2xl mx-auto mb-10 leading-relaxed">
              Enter a company name. Our autonomous agent researches across multiple
              dimensions, verifies data, and produces a structured investment report in minutes.
            </p>

            <div className="flex items-center justify-center gap-4">
              <Link
                href="/dashboard"
                className="px-8 py-3.5 bg-accent text-[#0a0f1a] font-semibold rounded-lg hover:shadow-[0_0_40px_rgba(212,255,81,0.4)] transition-all duration-300 text-sm tracking-wide"
              >
                Start Analysis
              </Link>
              <Link
                href="/dashboard?demo=true"
                className="px-8 py-3.5 border border-white/15 text-white/70 rounded-lg hover:border-accent/40 hover:text-accent backdrop-blur-sm transition-all duration-300 text-sm tracking-wide"
              >
                Watch Demo
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom fade into content */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0a0f1a] to-transparent z-20 pointer-events-none" />

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-2 animate-bounce">
          <span className="text-[9px] uppercase tracking-[0.3em] text-white/30">Scroll</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-white/30">
            <path d="M12 5v14M5 12l7 7 7-7" />
          </svg>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════ */}
      {/* STATS BAR                                          */}
      {/* ═══════════════════════════════════════════════════ */}
      <section className="relative z-30 py-16 px-6 border-y border-white/[0.06] bg-[#0a0f1a]">
        <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-8">
          <AnimatedStat value={10} suffix="" label="Report Sections" />
          <AnimatedStat value={20} suffix="+" label="Web Searches" />
          <AnimatedStat value={8} suffix="" label="Research Tasks" />
          <AnimatedStat value={3} suffix="" label="Output Formats" />
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════ */}
      {/* FEATURES                                           */}
      {/* ═══════════════════════════════════════════════════ */}
      <section id="features" className="relative z-30 py-20 px-6 bg-[#0a0f1a]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-8 h-px bg-accent/40" />
              <span className="text-[10px] font-medium tracking-[0.3em] uppercase text-text-dim">Capabilities</span>
              <div className="w-8 h-px bg-accent/40" />
            </div>
            <h2 className="text-3xl font-light text-text-primary">
              Comprehensive <span className="text-accent font-normal">analysis engine</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FeatureCard
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-accent"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>}
              title="Autonomous Web Research"
              description="The agent searches across multiple data sources, cross-references claims, and builds a comprehensive picture without human intervention."
            />
            <FeatureCard
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-accent"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4-4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>}
              title="LinkedIn Team Verification"
              description="Each executive is searched and verified against LinkedIn profiles. Unverified claims are flagged — no fabricated data, ever."
            />
            <FeatureCard
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-accent"><path d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2z"/><path d="M14 2v6h6"/></svg>}
              title="Structured Report Output"
              description="10-section investment report delivered as XLSX, CSV, and JSON. Formatted for immediate use in investment committee decks."
            />
            <FeatureCard
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-accent"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>}
              title="Risk Assessment Matrix"
              description="Systematic evaluation of key person dependency, market risks, competitive threats, and technology disruption with severity ratings."
            />
            <FeatureCard
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-accent"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></svg>}
              title="Pitch Deck Analysis"
              description="Upload a pitch deck alongside the company name. The agent cross-references pitch claims against publicly available data."
            />
            <FeatureCard
              icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-accent"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>}
              title="Real-time Dashboard"
              description="Watch the agent work in real-time. See every web search, every research file, every task completion as it happens."
            />
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════ */}
      {/* HOW IT WORKS                                       */}
      {/* ═══════════════════════════════════════════════════ */}
      <section id="how-it-works" className="relative z-30 py-20 px-6 border-t border-white/[0.06] bg-[#0a0f1a]">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-14">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-8 h-px bg-accent/40" />
              <span className="text-[10px] font-medium tracking-[0.3em] uppercase text-text-dim">Process</span>
              <div className="w-8 h-px bg-accent/40" />
            </div>
            <h2 className="text-3xl font-light text-text-primary">
              How the <span className="text-accent font-normal">agent works</span>
            </h2>
          </div>
          <div className="space-y-8">
            <Step number="01" title="You enter a company name" description="Type the target company. Optionally upload a pitch deck, sales deck, or financial document for cross-referencing." />
            <div className="ml-5 w-px h-6 bg-white/10" />
            <Step number="02" title="Agent creates a research plan" description="The AI analyst generates 5-8 research objectives covering company overview, leadership, market size, competitors, traction, financials, and risks." />
            <div className="ml-5 w-px h-6 bg-white/10" />
            <Step number="03" title="Autonomous deep research" description="For each task, the agent conducts web searches, verifies team members on LinkedIn, analyzes market data, and saves findings to a structured scratchpad." />
            <div className="ml-5 w-px h-6 bg-white/10" />
            <Step number="04" title="Investment report delivered" description="A 10-section VC analysis report is compiled with a clear recommendation (BUY / LEAN BUY / PASS) and downloadable as XLSX, CSV, and JSON." />
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════ */}
      {/* REPORT PREVIEW                                     */}
      {/* ═══════════════════════════════════════════════════ */}
      <section id="report" className="relative z-30 py-20 px-6 border-t border-white/[0.06] bg-[#0a0f1a]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-8 h-px bg-accent/40" />
              <span className="text-[10px] font-medium tracking-[0.3em] uppercase text-text-dim">Output</span>
              <div className="w-8 h-px bg-accent/40" />
            </div>
            <h2 className="text-3xl font-light text-text-primary">
              10-section <span className="text-accent font-normal">investment report</span>
            </h2>
          </div>
          <div className="rounded-xl p-8 grid grid-cols-2 md:grid-cols-5 gap-3 border border-white/[0.06] bg-[#0a0f1a]/60 backdrop-blur-xl">
            {[
              "Executive Summary", "Leadership Team", "Market Analysis",
              "Product & Positioning", "Traction Metrics", "Competitive Landscape",
              "Financial Analysis", "Risk Assessment", "Investment Recommendation", "Download All",
            ].map((section, i) => (
              <div
                key={section}
                className={`px-3 py-3 rounded-lg border text-center text-[11px] font-medium tracking-wide transition-colors cursor-pointer ${
                  i === 9
                    ? "border-accent/40 text-accent bg-accent/5 hover:bg-accent/10"
                    : "border-white/[0.06] text-text-dim hover:border-accent/20 hover:text-text-secondary"
                }`}
              >
                {section}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════ */}
      {/* CTA                                                */}
      {/* ═══════════════════════════════════════════════════ */}
      <section className="relative z-30 py-24 px-6 border-t border-white/[0.06] bg-[#0a0f1a]">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-light text-text-primary mb-4">
            Ready to <span className="text-accent font-normal">analyze?</span>
          </h2>
          <p className="text-text-dim mb-8">Enter any company. Get a structured VC analysis in minutes.</p>
          <Link
            href="/dashboard"
            className="inline-block px-10 py-4 bg-accent text-[#0a0f1a] font-semibold rounded-lg hover:shadow-[0_0_40px_rgba(212,255,81,0.4)] transition-all duration-300 text-sm tracking-wide"
          >
            Launch Platform
          </Link>
          <p className="text-[11px] text-text-dim mt-4">No signup required. Bring your own Anthropic API key.</p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════ */}
      {/* FOOTER                                             */}
      {/* ═══════════════════════════════════════════════════ */}
      <footer className="relative z-30 py-8 px-6 border-t border-white/[0.06] bg-[#0a0f1a]">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-1 h-3 bg-accent rounded-full" />
            <span className="text-[10px] tracking-[0.2em] uppercase text-text-dim">Chicago Intelligence Company</span>
          </div>
          <span className="text-[10px] text-text-dim">AI-powered due diligence</span>
        </div>
      </footer>

      <div className="accent-line relative z-30" />
    </div>
  );
}
