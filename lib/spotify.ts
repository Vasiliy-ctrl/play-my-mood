const CLIENT_ID = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
const REDIRECT_URI = process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI;

const SCOPES = [
  "user-library-read",
  "playlist-modify-private",
  "playlist-modify-public",
];

function generateRandomString(length: number) {
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const values = crypto.getRandomValues(new Uint8Array(length));

  return Array.from(values)
    .map((value) => possible[value % possible.length])
    .join("");
}

function base64UrlEncode(buffer: ArrayBuffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function generateCodeChallenge(codeVerifier: string) {
  const data = new TextEncoder().encode(codeVerifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return base64UrlEncode(digest);
}

export async function loginWithSpotify() {
  if (!CLIENT_ID || !REDIRECT_URI) {
    throw new Error("Missing Spotify environment variables.");
  }

  const codeVerifier = generateRandomString(64);
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  localStorage.setItem("spotify_code_verifier", codeVerifier);

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: "code",
    redirect_uri: REDIRECT_URI,
    scope: SCOPES.join(" "),
    code_challenge_method: "S256",
    code_challenge: codeChallenge,
  });

  window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`;
}

type TokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
};

export async function exchangeCodeForToken(
  code: string,
): Promise<TokenResponse> {
  if (!CLIENT_ID || !REDIRECT_URI) {
    throw new Error("Missing Spotify environment variables.");
  }

  const codeVerifier = localStorage.getItem("spotify_code_verifier");

  if (!codeVerifier) {
    throw new Error("Missing code verifier. Start login again.");
  }

  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    grant_type: "authorization_code",
    code,
    redirect_uri: REDIRECT_URI,
    code_verifier: codeVerifier,
  });

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Spotify token request failed.");
  }

  return response.json();
}

export function clearSpotifySession() {
  localStorage.removeItem("spotify_access_token");
  localStorage.removeItem("spotify_token_type");
  localStorage.removeItem("spotify_token_expires_at");
  localStorage.removeItem("spotify_refresh_token");
  localStorage.removeItem("spotify_code_verifier");
}

export function getStoredAccessToken() {
  const token = localStorage.getItem("spotify_access_token");
  const expiresAt = localStorage.getItem("spotify_token_expires_at");

  if (!token || !expiresAt) {
    return null;
  }

  const expiresAtNumber = Number(expiresAt);

  if (Number.isNaN(expiresAtNumber) || Date.now() >= expiresAtNumber) {
    clearSpotifySession();
    return null;
  }

  return token;
}

async function spotifyApiFetch<T>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const token = getStoredAccessToken();

  if (!token) {
    throw new Error("No valid Spotify token found. Please connect again.");
  }

  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });

  if (response.status === 401) {
    clearSpotifySession();
    throw new Error("Spotify session expired. Please connect again.");
  }

  if (!response.ok) {
    const text = await response.text();

    if (response.status === 403) {
      throw new Error(
        "Spotify Development Mode is currently blocking playlist creation for this app. Mood preview still works, and full playlist creation can be enabled later.",
      );
    }

    throw new Error(text || "Spotify API request failed.");
  }

  return response.json();
}

export type SavedTrack = {
  id: string;
  uri: string;
  name: string;
  artists: string[];
  album: string;
  imageUrl: string | null;
  spotifyUrl: string | null;
};

type SpotifySavedTracksResponse = {
  items: Array<{
    track: {
      id: string;
      uri: string;
      name: string;
      artists: Array<{ name: string }>;
      album: {
        name: string;
        images?: Array<{ url: string }>;
      };
      external_urls?: {
        spotify?: string;
      };
    };
  }>;
};

export async function fetchSavedTracks(limit = 20): Promise<SavedTrack[]> {
  const data = await spotifyApiFetch<SpotifySavedTracksResponse>(
    `https://api.spotify.com/v1/me/tracks?limit=${limit}`,
  );

  return data.items
    .filter((item) => item.track?.id && item.track?.uri)
    .map((item) => ({
      id: item.track.id,
      uri: item.track.uri,
      name: item.track.name,
      artists: item.track.artists.map((artist) => artist.name),
      album: item.track.album.name,
      imageUrl: item.track.album.images?.[0]?.url ?? null,
      spotifyUrl: item.track.external_urls?.spotify ?? null,
    }));
}

type CurrentUserProfile = {
  id: string;
  display_name: string | null;
};

type CreatePlaylistResponse = {
  id: string;
  name: string;
  external_urls?: {
    spotify?: string;
  };
};

export async function createMoodPlaylist(options: {
  moodTitle: string;
  tracks: SavedTrack[];
}) {
  const { moodTitle, tracks } = options;

  const uniqueUris = Array.from(new Set(tracks.map((track) => track.uri))).slice(
    0,
    30,
  );

  if (uniqueUris.length === 0) {
    throw new Error("No tracks available for this mood yet.");
  }

  const me = await spotifyApiFetch<CurrentUserProfile>(
    "https://api.spotify.com/v1/me",
  );

  const playlistName = `Play My Mood — ${moodTitle}`;
  const playlistDescription = `Generated by Play My Mood for the "${moodTitle}" mood.`;

  const playlist = await spotifyApiFetch<CreatePlaylistResponse>(
    `https://api.spotify.com/v1/users/${me.id}/playlists`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: playlistName,
        description: playlistDescription,
        public: false,
      }),
    },
  );

  await spotifyApiFetch<{ snapshot_id: string }>(
    `https://api.spotify.com/v1/playlists/${playlist.id}/tracks`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        uris: uniqueUris,
      }),
    },
  );

  return {
    playlistName,
    playlistUrl: playlist.external_urls?.spotify ?? null,
    totalTracks: uniqueUris.length,
  };
}