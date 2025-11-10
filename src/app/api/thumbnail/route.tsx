import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import React from "react";
import { APP_NAME } from "~/lib/constants";
import { getNeynarUser } from "~/lib/neynar";
import { getLeaderboardCollection, type LeaderboardEntry } from "~/lib/mongodb";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const WIDTH = 1200;
const HEIGHT = 800;

function formatMode(mode?: string | null) {
  if (!mode) return "Quiz Trivia";
  const normalized = mode.toLowerCase();
  switch (normalized) {
    case "weekly":
    case "weekly-quiz":
    case "classic":
      return "Weekly Challenge";
    case "time":
    case "timed":
    case "time_mode":
    case "time-mode":
      return "Timed Sprint";
    default:
      return normalized
        .replace(/[_-]/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase());
  }
}

function formatStat(label: string, value?: string | null) {
  if (!value) return null;
  return (
    <div
      key={`${label}-${value}`}
      style={{
        display: "flex",
        flexDirection: "column",
        padding: "12px 20px",
        borderRadius: "16px",
        background: "rgba(17, 24, 39, 0.65)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        minWidth: "180px",
      }}
    >
      <span
        style={{
          fontSize: "20px",
          fontWeight: 600,
          color: "rgba(255, 255, 255, 0.65)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}
      >
        {label}
      </span>
      <span
        style={{
          marginTop: "6px",
          fontSize: "42px",
          fontWeight: 700,
          color: "#FACC15",
          lineHeight: 1,
        }}
      >
        {value}
      </span>
    </div>
  );
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const fidParam = searchParams.get("fid");
  const modeParam = searchParams.get("mode");
  const scoreParam = searchParams.get("score");
  const timeParam = searchParams.get("time");
  const questionsParam = searchParams.get("questions");
  const accuracyParam = searchParams.get("accuracy");

  const fallbackImage = new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(circle at top left, #1e3a8a, #6d28d9 60%, #be123c)",
          color: "white",
          padding: "80px",
        }}
      >
        <div
          style={{
            fontSize: "64px",
            fontWeight: 800,
            letterSpacing: "-0.02em",
            marginBottom: "24px",
          }}
        >
          {APP_NAME}
        </div>
        <div
          style={{
            fontSize: "32px",
            opacity: 0.8,
            textAlign: "center",
            maxWidth: "700px",
            lineHeight: 1.4,
          }}
        >
          Share your latest run and show off your trivia powers.
        </div>
      </div>
    ),
    {
      width: WIDTH,
      height: HEIGHT,
      headers: {
        "Cache-Control":
          "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
      },
    },
  );

  if (!fidParam) {
    return fallbackImage;
  }

  const fid = Number(fidParam);
  if (Number.isNaN(fid)) {
    return fallbackImage;
  }

  const user = await getNeynarUser(fid).catch((error) => {
    console.error("thumbnail:getNeynarUser", error);
    return null;
  });

  // Fetch recent TIME_MODE players (excluding current user)
  let recentPlayers: LeaderboardEntry[] = [];
  if (modeParam && (modeParam.toLowerCase() === "time" || modeParam.toLowerCase() === "timed" || modeParam.toLowerCase() === "time_mode" || modeParam.toLowerCase() === "time-mode")) {
    try {
      const collection = await getLeaderboardCollection();
      const timeModeEntries = await collection
        .find({
          mode: "TIME_MODE",
          fid: { $ne: fid }, // Exclude current user
          quizId: { $exists: false }, // Ensure no quizId
        })
        .sort({ completedAt: -1 }) // Most recent first
        .limit(5)
        .toArray();
      
      recentPlayers = timeModeEntries as LeaderboardEntry[];
    } catch (error) {
      console.error("thumbnail:fetchRecentPlayers", error);
      // Continue without recent players if fetch fails
    }
  }

  const modeLabel = formatMode(modeParam);
  const stats: React.ReactElement[] = [];
  const scoreValue =
    scoreParam && scoreParam.trim().length > 0 ? scoreParam.trim() : null;
  const timeValue = timeParam ?? null;
  const questionsValue = questionsParam ?? null;
  const accuracyValue = accuracyParam ?? null;

  if (scoreValue) {
    stats.push(
      formatStat(
        modeLabel === "Timed Sprint" ? "Correct" : "Score",
        scoreValue,
      )!,
    );
  }
  if (timeValue) {
    stats.push(formatStat("Time", timeValue)!);
  }
  if (questionsValue) {
    stats.push(formatStat("Questions", questionsValue)!);
  }
  if (accuracyValue) {
    stats.push(formatStat("Accuracy", accuracyValue)!);
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background:
            "linear-gradient(130deg, rgba(30,64,175,1) 0%, rgba(76,29,149,1) 45%, rgba(185,28,28,1) 100%)",
          padding: "80px",
          color: "white",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: "0",
            background:
              "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.2), transparent 55%)",
          }}
        />

        <div
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            gap: "32px",
          }}
        >
          <div
            style={{
              width: "190px",
              height: "190px",
              borderRadius: "48px",
              overflow: "hidden",
              border: "6px solid rgba(255,255,255,0.25)",
              boxShadow: "0 20px 40px rgba(0,0,0,0.35)",
              background: "rgba(15,23,42,0.6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "64px",
              fontWeight: 700,
              textTransform: "uppercase",
            }}
          >
            {user?.pfp_url ? (
              <img
                src={user.pfp_url}
                alt={user?.display_name || user?.username || "Player"}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              (user?.username?.[0] || "Q").toUpperCase()
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div
              style={{
                fontSize: "28px",
                fontWeight: 600,
                letterSpacing: "0.28em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.7)",
              }}
            >
              {modeLabel}
            </div>
            <div
              style={{
                fontSize: "72px",
                fontWeight: 800,
                letterSpacing: "-0.03em",
                lineHeight: 1.05,
                textShadow: "0 8px 24px rgba(15,23,42,0.8)",
              }}
            >
              {user?.display_name || user?.username || "Trivia Master"}
            </div>
            <div
              style={{
                fontSize: "32px",
                color: "rgba(255,255,255,0.8)",
                display: "flex",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <span>🎯</span>
              <span>Think you can beat this? I challenge you!</span>
            </div>
          </div>
        </div>

        {stats.length > 0 && (
          <div
            style={{
              position: "relative",
              marginTop: "80px",
              display: "flex",
              gap: "24px",
            }}
          >
            {stats}
          </div>
        )}

        <div
          style={{
            position: "absolute",
            bottom: "80px",
            right: "80px",
            fontSize: "28px",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.7)",
          }}
        >
          {APP_NAME}
        </div>

        {/* Recent TIME_MODE Players - Bottom Left */}
        {recentPlayers.length > 0 && (
          <div
            style={{
              position: "absolute",
              bottom: "80px",
              left: "80px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            <div
              style={{
                fontSize: "20px",
                fontWeight: 600,
                color: "rgba(255,255,255,0.8)",
                marginBottom: "8px",
              }}
            >
              Recent Players
            </div>
            <div
              style={{
                display: "flex",
                gap: "12px",
                alignItems: "center",
              }}
            >
              {recentPlayers.slice(0, 5).map((player) => (
                <div
                  key={player.fid}
                  style={{
                    position: "relative",
                    width: "56px",
                    height: "56px",
                    borderRadius: "12px",
                    overflow: "hidden",
                    border: "2px solid rgba(255,255,255,0.3)",
                    background: "rgba(17, 24, 39, 0.6)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "24px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                  }}
                >
                  {player.pfpUrl ? (
                    <img
                      src={player.pfpUrl}
                      alt={player.displayName || player.username || "Player"}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    (player.username?.[0] || "?").toUpperCase()
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    ),
    {
      width: WIDTH,
      height: HEIGHT,
      headers: {
        "Cache-Control":
          "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
      },
    },
  );
}

