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

  // Bet Mode specific params (for dynamic thumbnails when sharing Bet Mode results)
  const payoutParam = searchParams.get("payout");
  const profitParam = searchParams.get("profit");
  // Removed ticketsParam - tickets section removed from Bet Mode thumbnails

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
  const statsData: Array<{ label: string; value: string }> = [];
  const scoreValue =
    scoreParam && scoreParam.trim().length > 0 ? scoreParam.trim() : null;
  const timeValue = timeParam ?? null;
  const questionsValue = questionsParam ?? null;
  const accuracyValue = accuracyParam ?? null;
  const payoutValue = payoutParam ?? null;
  const profitValue = profitParam ?? null;
  // Removed tickets section from Bet Mode thumbnails

  if (scoreValue) {
    statsData.push({
      label: modeLabel === "Timed Sprint" ? "Correct" : "Score",
      value: scoreValue,
    });
  }
  if (timeValue) {
    statsData.push({ label: "Time", value: timeValue });
  }
  if (questionsValue) {
    statsData.push({ label: "Questions", value: questionsValue });
  }
  if (accuracyValue) {
    statsData.push({ label: "Accuracy", value: accuracyValue });
  }

  // Bet Mode stats - used when sharing Bet Mode results
  if (payoutValue) {
    statsData.push({ label: "Payout", value: payoutValue });
  }
  if (profitValue) {
    statsData.push({ label: "Profit", value: profitValue });
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(130deg, rgba(30,64,175,1) 0%, rgba(76,29,149,1) 45%, rgba(185,28,28,1) 100%)",
          padding: "80px",
          color: "white",
          position: "relative",
        }}
      >
        {/* Background overlay for depth */}
        <div
          style={{
            position: "absolute",
            inset: "0",
            background:
              "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.15), transparent 55%)",
          }}
        />

        {/* Main Card Container - Inspired by screenshot design */}
        <div
          style={{
            position: "relative",
            width: "100%",
            maxWidth: "900px",
            display: "flex",
            flexDirection: "column",
            background: "rgba(255, 255, 255, 0.12)",
            borderRadius: "32px",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            padding: "60px",
            backdropFilter: "blur(20px)",
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.4)",
          }}
        >
          {/* Top Section: Profile Picture and Username */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "24px",
              marginBottom: "40px",
            }}
          >
            <div
              style={{
                width: "120px",
                height: "120px",
                borderRadius: "24px",
                overflow: "hidden",
                border: "4px solid rgba(255,255,255,0.3)",
                boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
                background: "rgba(15,23,42,0.6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "48px",
                fontWeight: 700,
                textTransform: "uppercase",
                flexShrink: 0,
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

            <div style={{ display: "flex", flexDirection: "column", gap: "8px", flex: 1 }}>
              <div
                style={{
                  fontSize: "18px",
                  fontWeight: 600,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.7)",
                }}
              >
                {modeLabel}
              </div>
              <div
                style={{
                  fontSize: "48px",
                  fontWeight: 800,
                  letterSpacing: "-0.02em",
                  lineHeight: 1.1,
                  textShadow: "0 4px 12px rgba(0,0,0,0.3)",
                }}
              >
                {user?.display_name || user?.username || "Trivia Master"}
              </div>
            </div>
          </div>

          {/* Main Score/Value Section */}
          {statsData.length > 0 && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "32px",
                marginBottom: "40px",
              }}
            >
              {/* Primary Stat - Large Display */}
              {statsData[0] && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "20px",
                      fontWeight: 600,
                      color: "rgba(255,255,255,0.7)",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                    }}
                  >
                    {statsData[0].label === "Correct" ? "CORRECT ANSWERS" : statsData[0].label.toUpperCase()}
                  </div>
                  <div
                    style={{
                      fontSize: "96px",
                      fontWeight: 800,
                      lineHeight: 1,
                      color: "#FACC15",
                      textShadow: "0 8px 24px rgba(250, 204, 21, 0.3)",
                    }}
                  >
                    {statsData[0].value}
                  </div>
                </div>
              )}

              {/* Secondary Stats - Grid Layout */}
              {statsData.length > 1 && (
                <div
                  style={{
                    display: "flex",
                    gap: "20px",
                    flexWrap: "wrap",
                  }}
                >
                  {statsData.slice(1).map((stat, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        padding: "20px 28px",
                        borderRadius: "20px",
                        background: "rgba(255, 255, 255, 0.1)",
                        border: "1px solid rgba(255, 255, 255, 0.15)",
                        minWidth: "200px",
                        flex: 1,
                      }}
                    >
                      <span
                        style={{
                          fontSize: "16px",
                          fontWeight: 600,
                          color: "rgba(255,255,255,0.7)",
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                          marginBottom: "8px",
                        }}
                      >
                        {stat.label}
                      </span>
                      <span
                        style={{
                          fontSize: "36px",
                          fontWeight: 700,
                          color: "#FACC15",
                          lineHeight: 1,
                        }}
                      >
                        {stat.value}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Bottom Section: App Name and Recent Players */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              marginTop: "auto",
            }}
          >
            {/* Recent TIME_MODE Players */}
            {recentPlayers.length > 0 && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                <div
                  style={{
                    fontSize: "16px",
                    fontWeight: 600,
                    color: "rgba(255,255,255,0.7)",
                    marginBottom: "4px",
                  }}
                >
                  Recent Players
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                    alignItems: "center",
                  }}
                >
                  {recentPlayers.slice(0, 5).map((player) => (
                    <div
                      key={player.fid}
                      style={{
                        width: "48px",
                        height: "48px",
                        borderRadius: "12px",
                        overflow: "hidden",
                        border: "2px solid rgba(255,255,255,0.3)",
                        background: "rgba(17, 24, 39, 0.6)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "20px",
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

            {/* App Name */}
            <div
              style={{
                fontSize: "24px",
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.8)",
                marginLeft: "auto",
              }}
            >
              {APP_NAME}
            </div>
          </div>
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
}

