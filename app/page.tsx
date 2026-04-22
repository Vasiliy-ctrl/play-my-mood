"use client";

import { useEffect, useMemo, useState } from "react";
import {
  clearSpotifySession,
  fetchSavedTracks,
  getStoredAccessToken,
  loginWithSpotify,
  type SavedTrack,
} from "@/lib/spotify";

type MoodKey =
  | "sad"
  | "relaxed"
  | "good-sleep"
  | "car-aux"
  | "party"
  | "afterglow"
  | "background-flow"
  | "full-volume"
  | "main-character"
  | "good-vibes";

type Mood = {
  key: MoodKey;
  title: string;
  subtitle: string;
  accent: string;
  description: string;
  keywords: string[];
  boost: string[];
  avoid?: string[];
};

const moods: Mood[] = [
  {
    key: "sad",
    title: "Sad",
    subtitle: "For soft nights, heartbreak, and overthinking.",
    accent: "Emotional",
    description:
      "A softer, heavier mood for heartbreak, overthinking, and late-night feelings.",
    keywords: [
      "sad",
      "cry",
      "lonely",
      "alone",
      "heart",
      "miss",
      "leave",
      "hopeless",
      "broken",
      "tears",
      "lost",
      "angel",
      "blossom",
    ],
    boost: ["melancholy", "hurt", "goodbye", "gone"],
    avoid: ["party", "dance", "club", "lit"],
  },
  {
    key: "relaxed",
    title: "Relaxed",
    subtitle: "Easy tracks to breathe, rest, and slow down.",
    accent: "Calm",
    description:
      "A calmer mood for slowing down, relaxing, and letting the music feel light and easy.",
    keywords: [
      "calm",
      "slow",
      "soft",
      "easy",
      "quiet",
      "dream",
      "bloom",
      "gentle",
      "blue",
      "sunset",
      "cloud",
      "peace",
      "float",
    ],
    boost: ["mellow", "rest", "still", "breeze"],
    avoid: ["rage", "heavy", "wild", "club"],
  },
  {
    key: "good-sleep",
    title: "Good Sleep",
    subtitle: "Gentle songs for quiet evenings and sleep mode.",
    accent: "Sleep",
    description:
      "The softest late-night option. Quiet, dreamy, gentle songs that fit sleep mode.",
    keywords: [
      "sleep",
      "dream",
      "moon",
      "stars",
      "night",
      "lullaby",
      "soft",
      "quiet",
      "calm",
      "heaven",
      "angel",
      "blossom",
    ],
    boost: ["midnight", "sleepy", "pillow", "dusk"],
    avoid: ["party", "loud", "rage", "bass"],
  },
  {
    key: "car-aux",
    title: "On Car AUX",
    subtitle: "Road-ready songs that hit right in the car.",
    accent: "Drive",
    description:
      "Songs that feel good on the move. More bounce, more motion, more road energy.",
    keywords: [
      "drive",
      "ride",
      "road",
      "speed",
      "city",
      "night",
      "fast",
      "motion",
      "highway",
      "aux",
      "lane",
    ],
    boost: ["engine", "street", "run", "cruise"],
    avoid: ["sleep", "lullaby", "quiet"],
  },
  {
    key: "party",
    title: "Party Mood",
    subtitle: "High-energy tracks for fun, motion, and loud vibes.",
    accent: "Energy",
    description:
      "A louder, brighter, more energetic mood for fun, movement, and hype.",
    keywords: [
      "party",
      "dance",
      "club",
      "move",
      "lit",
      "turn",
      "shake",
      "night",
      "hype",
      "up",
      "wild",
    ],
    boost: ["floor", "bounce", "drunk", "neon"],
    avoid: ["sleep", "quiet", "broken"],
  },
  {
    key: "afterglow",
    title: "Afterglow",
    subtitle: "Soft romantic energy with warmth, longing, and glow.",
    accent: "Romantic",
    description:
      "Warm, romantic, slightly dreamy songs with love, softness, and a glowing feeling.",
    keywords: [
      "love",
      "kiss",
      "touch",
      "glow",
      "sunset",
      "heart",
      "afterglow",
      "honey",
      "angel",
      "warm",
      "heaven",
    ],
    boost: ["darling", "baby", "romance", "rose"],
    avoid: ["rage", "heavy", "club"],
  },
  {
    key: "background-flow",
    title: "Background Flow",
    subtitle: "Smooth tracks that sit softly in the background.",
    accent: "Lowkey",
    description:
      "Easy, non-intrusive music for being in the background while you think, work, or just exist.",
    keywords: [
      "interlude",
      "intro",
      "ambient",
      "flow",
      "motion",
      "background",
      "dream",
      "soft",
      "light",
      "easy",
      "float",
      "loop",
    ],
    boost: ["scene", "air", "drift", "tape"],
    avoid: ["party", "rage", "wild", "loud"],
  },
  {
    key: "full-volume",
    title: "Full Volume",
    subtitle: "Big, loud, heavy energy with no holding back.",
    accent: "Loud",
    description:
      "For tracks that hit harder, feel louder, and demand more energy.",
    keywords: [
      "loud",
      "volume",
      "rage",
      "bass",
      "heavy",
      "hard",
      "scream",
      "wild",
      "energy",
      "power",
    ],
    boost: ["blast", "chaos", "crash", "noise"],
    avoid: ["sleep", "quiet", "calm"],
  },
  {
    key: "main-character",
    title: "Main Character",
    subtitle: "Confident, stylish, powerful music with presence.",
    accent: "Confident",
    description:
      "Music that feels confident, cinematic, stylish, and strong — like your own main-character moment.",
    keywords: [
      "iconic",
      "star",
      "shine",
      "gold",
      "power",
      "confident",
      "queen",
      "king",
      "main",
      "glow",
      "control",
    ],
    boost: ["boss", "spotlight", "velvet", "luxury"],
    avoid: ["broken", "hopeless", "sleep"],
  },
  {
    key: "good-vibes",
    title: "Good Vibes",
    subtitle: "Warm, positive, feel-good music with light energy.",
    accent: "Positive",
    description:
      "Brighter, kinder, easier songs that feel warm, light, and genuinely good.",
    keywords: [
      "good",
      "vibe",
      "sunny",
      "smile",
      "joy",
      "light",
      "warm",
      "summer",
      "happy",
      "fun",
      "glow",
    ],
    boost: ["bright", "shine", "laugh", "daylight"],
    avoid: ["broken", "rage", "hopeless"],
  },
];

function hasAny(text: string, words: string[]) {
  return words.some((word) => text.includes(word));
}

function scoreTrackForMood(track: SavedTrack, mood: Mood) {
  const text =
    `${track.name} ${track.artists.join(" ")} ${track.album}`.toLowerCase();

  let score = 0;

  for (const keyword of mood.keywords) {
    if (text.includes(keyword)) {
      score += 2;
    }
  }

  for (const keyword of mood.boost) {
    if (text.includes(keyword)) {
      score += 3;
    }
  }

  for (const keyword of mood.avoid ?? []) {
    if (text.includes(keyword)) {
      score -= 2;
    }
  }

  if (mood.key === "sad") {
    if (hasAny(text, ["love", "leave"])) score += 2;
    if (hasAny(text, ["hopeless", "broken", "alone"])) score += 3;
  }

  if (mood.key === "relaxed") {
    if (hasAny(text, ["calm", "soft", "gentle", "peace"])) score += 3;
    if (hasAny(text, ["easy", "bloom", "float", "quiet"])) score += 2;
  }

  if (mood.key === "good-sleep") {
    if (hasAny(text, ["night", "moon", "dream"])) score += 2;
    if (hasAny(text, ["sleep", "lullaby"])) score += 3;
  }

  if (mood.key === "car-aux") {
    if (hasAny(text, ["drive", "ride", "road", "city", "night"])) score += 2;
    if (hasAny(text, ["fast", "speed", "highway"])) score += 3;
  }

  if (mood.key === "party") {
    if (hasAny(text, ["party", "dance", "club", "move"])) score += 2;
    if (hasAny(text, ["lit", "hype", "wild"])) score += 3;
  }

  if (mood.key === "afterglow") {
    if (hasAny(text, ["love", "kiss", "touch", "glow"])) score += 2;
    if (hasAny(text, ["heart", "warm", "sunset"])) score += 2;
  }

  if (mood.key === "background-flow") {
    if (hasAny(text, ["interlude", "ambient", "flow", "loop"])) score += 3;
    if (hasAny(text, ["soft", "dream", "light"])) score += 2;
  }

  if (mood.key === "full-volume") {
    if (hasAny(text, ["loud", "bass", "heavy", "rage"])) score += 3;
    if (hasAny(text, ["power", "wild", "hard"])) score += 2;
  }

  if (mood.key === "main-character") {
    if (hasAny(text, ["iconic", "star", "shine", "power"])) score += 3;
    if (hasAny(text, ["gold", "queen", "king", "confident"])) score += 2;
  }

  if (mood.key === "good-vibes") {
    if (hasAny(text, ["sunny", "smile", "joy", "happy"])) score += 3;
    if (hasAny(text, ["light", "warm", "summer", "fun"])) score += 2;
  }

  return Math.max(score, 0);
}

function getMoodPreview(tracks: SavedTrack[], mood: Mood) {
  return [...tracks]
    .map((track) => ({
      track,
      score: scoreTrackForMood(track, mood),
    }))
    .sort(
      (a, b) => b.score - a.score || a.track.name.localeCompare(b.track.name),
    )
    .slice(0, 8);
}

function getScoreLabel(score: number) {
  if (score >= 8) return "strong";
  if (score >= 4) return "good";
  if (score >= 1) return "light";
  return "low";
}

export default function Home() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [tracks, setTracks] = useState<SavedTrack[]>([]);
  const [isLoadingTracks, setIsLoadingTracks] = useState(false);
  const [tracksError, setTracksError] = useState("");
  const [selectedMoodKey, setSelectedMoodKey] = useState<MoodKey>("sad");

  useEffect(() => {
    const token = getStoredAccessToken();
    setIsConnected(Boolean(token));
  }, []);

  useEffect(() => {
    if (!isConnected) {
      setTracks([]);
      setTracksError("");
      return;
    }

    const loadTracks = async () => {
      try {
        setIsLoadingTracks(true);
        setTracksError("");
        const savedTracks = await fetchSavedTracks(20);
        setTracks(savedTracks);
      } catch (error) {
        console.error(error);

        const message =
          error instanceof Error
            ? error.message
            : "Failed to load saved tracks.";

        setTracksError(message);
        setTracks([]);
        setIsConnected(Boolean(getStoredAccessToken()));
      } finally {
        setIsLoadingTracks(false);
      }
    };

    loadTracks();
  }, [isConnected]);

  const selectedMood =
    moods.find((mood) => mood.key === selectedMoodKey) ?? moods[0];

  const moodPreview = useMemo(() => {
    return getMoodPreview(tracks, selectedMood);
  }, [tracks, selectedMood]);

  const strongMatches = moodPreview.filter((item) => item.score > 0);
  const previewTracks =
    strongMatches.length > 0 ? strongMatches.slice(0, 8) : moodPreview.slice(0, 6);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    element?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      await loginWithSpotify();
    } catch (error) {
      console.error(error);
      alert("Spotify connection failed. Check .env.local and try again.");
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    clearSpotifySession();
    setIsConnected(false);
    setTracks([]);
    setTracksError("");
    setIsConnecting(false);
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-10">
        <header className="flex items-center justify-between border-b border-white/10 pb-6">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-lime-400">
              Play My Mood
            </p>
            <h1 className="mt-2 text-2xl font-semibold">
              Mood-based playlists from your saved songs
            </h1>
          </div>

          <div className="flex gap-3">
            {isConnected ? (
              <button
                onClick={handleDisconnect}
                className="rounded-full border border-white/15 px-5 py-2 text-sm font-medium text-white transition hover:bg-white/5"
              >
                Disconnect
              </button>
            ) : null}

            <button
              onClick={handleConnect}
              disabled={isConnecting || isConnected}
              className="rounded-full border border-lime-400/40 px-5 py-2 text-sm font-medium text-lime-300 transition hover:bg-lime-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isConnected
                ? "Spotify connected"
                : isConnecting
                  ? "Connecting..."
                  : "Connect Spotify"}
            </button>
          </div>
        </header>

        <section className="py-16">
          <div className="max-w-3xl">
            <p className="mb-4 text-sm uppercase tracking-[0.3em] text-zinc-400">
              Your music, organized by mood
            </p>

            <h2 className="text-4xl font-bold leading-tight sm:text-6xl">
              Turn your saved songs into playlists that match how you feel.
            </h2>

            <p className="mt-6 max-w-2xl text-lg text-zinc-300">
              Play My Mood connects to your Spotify library and turns your liked
              songs into mood-based previews that already feel like real
              playlists.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <button
                onClick={() => scrollToSection("preview-section")}
                className="rounded-full bg-lime-400 px-6 py-3 font-semibold text-black transition hover:opacity-90"
              >
                Preview {selectedMood.title} playlist
              </button>

              <button
                onClick={() => scrollToSection("moods-section")}
                className="rounded-full border border-white/15 px-6 py-3 font-medium text-white transition hover:bg-white/5"
              >
                Explore moods
              </button>
            </div>

            {isConnected ? (
              <p className="mt-6 text-sm text-lime-300">
                Spotify connected successfully.
              </p>
            ) : (
              <p className="mt-6 text-sm text-zinc-400">
                Connect Spotify to continue.
              </p>
            )}
          </div>

          <div
            id="moods-section"
            className="mt-14 grid gap-4 md:grid-cols-2 xl:grid-cols-5"
          >
            {moods.map((mood) => {
              const isSelected = selectedMood.key === mood.key;

              return (
                <button
                  key={mood.key}
                  onClick={() => setSelectedMoodKey(mood.key)}
                  className={`rounded-3xl border p-5 text-left backdrop-blur-sm transition ${
                    isSelected
                      ? "border-lime-400/60 bg-lime-400/10 shadow-[0_0_0_1px_rgba(163,230,53,0.15)]"
                      : "border-white/10 bg-white/5 hover:-translate-y-1 hover:border-lime-400/30"
                  }`}
                >
                  <p className="text-xs uppercase tracking-[0.25em] text-lime-300">
                    {mood.accent}
                  </p>
                  <h3 className="mt-3 text-xl font-semibold">{mood.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-zinc-300">
                    {mood.subtitle}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        <section className="border-t border-white/10 py-10">
          <div className="rounded-3xl border border-lime-400/20 bg-lime-400/5 p-6">
            <p className="text-sm uppercase tracking-[0.3em] text-lime-300">
              Selected mood
            </p>
            <h3 className="mt-3 text-3xl font-bold">{selectedMood.title}</h3>
            <p className="mt-3 max-w-2xl text-zinc-300">
              {selectedMood.description}
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              {selectedMood.keywords.slice(0, 6).map((keyword) => (
                <span
                  key={keyword}
                  className="rounded-full border border-lime-400/20 bg-lime-400/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-lime-200"
                >
                  {keyword}
                </span>
              ))}
            </div>

            <p className="mt-5 text-sm text-zinc-400">
              Preview ready from {previewTracks.length} ranked tracks.
            </p>
          </div>

          <div className="mt-6 rounded-3xl border border-amber-400/20 bg-amber-400/10 p-6 text-amber-100">
            <p className="text-sm uppercase tracking-[0.3em]">
              Development mode notice
            </p>
            <p className="mt-3">
              Spotify Development Mode is currently blocking direct playlist
              creation for this app. Mood discovery, ranking, and playlist
              preview still work normally.
            </p>
          </div>
        </section>

        <section id="preview-section" className="border-t border-white/10 py-10">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-zinc-400">
                Playlist preview
              </p>
              <h3 className="mt-2 text-2xl font-semibold">
                {selectedMood.title} playlist preview
              </h3>
            </div>

            {isConnected && previewTracks.length > 0 ? (
              <p className="text-sm text-zinc-400">
                {previewTracks.length} ranked tracks
              </p>
            ) : null}
          </div>

          {!isConnected ? (
            <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6 text-zinc-300">
              Connect Spotify to preview tracks for this mood.
            </div>
          ) : isLoadingTracks ? (
            <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6 text-zinc-300">
              Building your mood preview...
            </div>
          ) : tracksError ? (
            <div className="mt-6 rounded-3xl border border-red-500/20 bg-red-500/10 p-6 text-red-200">
              {tracksError}
            </div>
          ) : tracks.length === 0 ? (
            <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6 text-zinc-300">
              You don’t have any saved songs yet. Like a few tracks in Spotify
              and come back.
            </div>
          ) : previewTracks.length === 0 ? (
            <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6 text-zinc-300">
              No preview tracks were found yet for this mood.
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {previewTracks.map(({ track, score }, index) => (
                <article
                  key={`${selectedMood.key}-${track.id}`}
                  className="flex gap-4 rounded-3xl border border-white/10 bg-white/5 p-4"
                >
                  <div className="flex w-10 flex-shrink-0 items-center justify-center text-sm font-semibold text-zinc-500">
                    #{index + 1}
                  </div>

                  <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-2xl bg-zinc-800">
                    {track.imageUrl ? (
                      <img
                        src={track.imageUrl}
                        alt={track.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-zinc-500">
                        No art
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h4 className="truncate text-lg font-semibold">
                          {track.name}
                        </h4>
                        <p className="mt-1 truncate text-sm text-zinc-300">
                          {track.artists.join(", ")}
                        </p>
                        <p className="mt-1 truncate text-sm text-zinc-500">
                          {track.album}
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <span className="rounded-full border border-lime-400/20 bg-lime-400/10 px-2.5 py-1 text-xs uppercase tracking-[0.2em] text-lime-300">
                          {getScoreLabel(score)}
                        </span>
                        <span className="text-xs text-zinc-500">
                          score {score}
                        </span>
                      </div>
                    </div>

                    {track.spotifyUrl ? (
                      <a
                        href={track.spotifyUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-block text-sm text-lime-300 hover:text-lime-200"
                      >
                        Open in Spotify
                      </a>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="border-t border-white/10 py-10">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-zinc-400">
                Your Spotify library
              </p>
              <h3 className="mt-2 text-2xl font-semibold">Recent saved songs</h3>
            </div>

            {isConnected && !isLoadingTracks && tracks.length > 0 ? (
              <p className="text-sm text-zinc-400">
                Showing {tracks.length} saved tracks
              </p>
            ) : null}
          </div>

          {!isConnected ? (
            <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6 text-zinc-300">
              Connect Spotify to load your saved songs here.
            </div>
          ) : isLoadingTracks ? (
            <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6 text-zinc-300">
              Loading your saved songs...
            </div>
          ) : tracksError ? (
            <div className="mt-6 rounded-3xl border border-red-500/20 bg-red-500/10 p-6 text-red-200">
              {tracksError}
            </div>
          ) : tracks.length === 0 ? (
            <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6 text-zinc-300">
              You don’t have any saved songs yet in your Spotify library.
            </div>
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {tracks.map((track) => (
                <article
                  key={track.id}
                  className="flex gap-4 rounded-3xl border border-white/10 bg-white/5 p-4"
                >
                  <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-2xl bg-zinc-800">
                    {track.imageUrl ? (
                      <img
                        src={track.imageUrl}
                        alt={track.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-zinc-500">
                        No art
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h4 className="truncate text-lg font-semibold">
                      {track.name}
                    </h4>
                    <p className="mt-1 truncate text-sm text-zinc-300">
                      {track.artists.join(", ")}
                    </p>
                    <p className="mt-1 truncate text-sm text-zinc-500">
                      {track.album}
                    </p>

                    {track.spotifyUrl ? (
                      <a
                        href={track.spotifyUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-block text-sm text-lime-300 hover:text-lime-200"
                      >
                        Open in Spotify
                      </a>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <footer className="border-t border-white/10 pt-6 text-sm text-zinc-500">
          Prototype v1 · Spotify mood playlist generator
        </footer>
      </section>
    </main>
  );
}