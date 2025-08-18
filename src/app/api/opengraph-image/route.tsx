import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { getNeynarUser } from "~/lib/neynar";
import { getLeaderboardCollection } from "~/lib/mongodb";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const fid = searchParams.get('fid');

  if (!fid) {
    return new ImageResponse(
      (
        <div tw="flex h-full w-full flex-col justify-center items-center bg-gray-900">
          <h1 tw="text-6xl text-white">Quiz Trivia</h1>
          <p tw="text-2xl mt-4 text-gray-400">Share your score!</p>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  }

  try {
    // Get user info from Neynar
    const user = await getNeynarUser(Number(fid));
    
    // Get leaderboard data
    const collection = await getLeaderboardCollection();
    const leaderboard = await collection.find({}).toArray();
    
    // Find the specific user's entry
    const userEntry = leaderboard.find(entry => entry.fid === Number(fid));
    
    // Get top participants for avatars (excluding the current user)
    const topParticipants = leaderboard
      .filter(entry => entry.fid !== Number(fid))
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);

    // Format date
    const formatDate = (timestamp: number) => {
      const date = new Date(timestamp);
      const months = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 
                     'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
      const month = months[date.getMonth()];
      const day = date.getDate();
      const year = date.getFullYear();
      return `${month} ${day}, ${year}`;
    };

    // Calculate total participants (excluding current user)
    const totalParticipants = leaderboard.length - 1;

    return new ImageResponse(
      (
        <div tw="flex h-full w-full flex-col bg-gray-900 p-16">
          {/* Header Section */}
          <div tw="flex items-center mb-8">
            {user?.pfp_url && (
              <div tw="flex w-24 h-24 rounded-full overflow-hidden mr-6 border-4 border-purple-500">
                <img src={user.pfp_url} alt="Profile" tw="w-full h-full object-cover" />
              </div>
            )}
            <div tw="flex flex-col">
              <h1 tw="text-5xl font-bold text-white mb-2">
                {user?.display_name || user?.username || 'Anonymous'}
              </h1>
              <p tw="text-2xl text-gray-400">
                {userEntry ? formatDate(userEntry.completedAt) : 'Just now'}
              </p>
            </div>
          </div>

          {/* Activity Section */}
          <div tw="mb-8">
            <h2 tw="text-4xl text-white font-semibold mb-4">
              I just played Quiz Trivia
            </h2>
            {userEntry && (
              <div tw="flex items-center space-x-8">
                <div tw="flex items-center">
                  <span tw="text-3xl text-purple-400 font-bold mr-2">Score:</span>
                  <span tw="text-3xl text-white font-bold">{userEntry.score}/10</span>
                </div>
                <div tw="flex items-center">
                  <span tw="text-3xl text-purple-400 font-bold mr-2">Time:</span>
                  <span tw="text-3xl text-white font-bold">{userEntry.time}</span>
                </div>
              </div>
            )}
          </div>

          {/* Participants Section */}
          <div tw="flex items-center">
            <span tw="text-2xl text-gray-400 mr-4">Join the challenge:</span>
            <div tw="flex items-center">
              {topParticipants.map((participant, index) => (
                <div key={participant.fid} tw={`flex w-16 h-16 rounded-full overflow-hidden border-2 border-gray-700 ${index > 0 ? '-ml-4' : ''}`}>
                  <img 
                    src={participant.pfpUrl || 'https://picsum.photos/64/64'} 
                    alt="Participant" 
                    tw="w-full h-full object-cover" 
                  />
                </div>
              ))}
              {totalParticipants > 4 && (
                <div tw="flex items-center justify-center w-16 h-16 rounded-full bg-purple-500 border-2 border-gray-700 -ml-4">
                  <span tw="text-lg font-bold text-white">+{totalParticipants - 4}</span>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div tw="absolute bottom-8 right-8">
            <div tw="flex items-center">
              <span tw="text-2xl text-purple-400 mr-2">🎯</span>
              <span tw="text-2xl text-white font-semibold">Quiz Trivia</span>
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (error) {
    console.error('Error generating OG image:', error);
    
    // Fallback image
    return new ImageResponse(
      (
        <div tw="flex h-full w-full flex-col justify-center items-center bg-gray-900">
          <h1 tw="text-6xl text-white mb-4">Quiz Trivia</h1>
          <p tw="text-2xl text-gray-400">Share your quiz results!</p>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  }
}