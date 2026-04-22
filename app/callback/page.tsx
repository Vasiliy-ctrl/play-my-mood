"use client";

import { useEffect, useState } from "react";
import { exchangeCodeForToken } from "@/lib/spotify";

export default function CallbackPage() {
  const [message, setMessage] = useState("Finishing Spotify login...");

  useEffect(() => {
    const finishLogin = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const error = params.get("error");

      if (error) {
        setMessage(`Spotify returned an error: ${error}`);
        return;
      }

      if (!code) {
        setMessage("No Spotify code was found in the callback URL.");
        return;
      }

      try {
        const tokenData = await exchangeCodeForToken(code);

        localStorage.setItem("spotify_access_token", tokenData.access_token);
        localStorage.setItem("spotify_token_type", tokenData.token_type);
        localStorage.setItem(
          "spotify_token_expires_at",
          String(Date.now() + tokenData.expires_in * 1000),
        );

        if (tokenData.refresh_token) {
          localStorage.setItem(
            "spotify_refresh_token",
            tokenData.refresh_token,
          );
        }

        localStorage.removeItem("spotify_code_verifier");

        window.location.href = "/";
      } catch (error) {
        console.error(error);
        setMessage("Spotify login failed while exchanging the code for a token.");
      }
    };

    finishLogin();
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-6 text-white">
      <div className="max-w-xl rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
        <p className="text-sm uppercase tracking-[0.3em] text-lime-400">
          Play My Mood
        </p>
        <h1 className="mt-4 text-3xl font-bold">Spotify callback</h1>
        <p className="mt-4 text-zinc-300">{message}</p>
      </div>
    </main>
  );
}