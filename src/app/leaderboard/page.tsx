"use client";

import React, { useState, useEffect } from 'react';
import { Trophy, Users, Calendar, Clock, Share2 } from 'lucide-react';
import Link from 'next/link';
import { useMiniApp } from '@neynar/react';

interface LeaderboardEntry {
  fid: number;
  username: string;
  displayName?: string;
  pfpUrl?: string;
  score: number;
  time: string;
  completedAt: number;
  rank?: number;
}

export default function PublicLeaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalParticipants: 0,
    lastUpdated: ''
  });
  const [copied, setCopied] = useState(false);
  const { context } = useMiniApp();

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const response = await fetch('/api/leaderboard');
      const data = await response.json();
      if (data.leaderboard) {
        setLeaderboard(data.leaderboard);
        setStats({
          totalParticipants: data.totalParticipants || 0,
          lastUpdated: data.lastUpdated || new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
      setLeaderboard([]);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    const shareUrl = typeof window !== 'undefined'
      ? `${window.location.origin}/leaderboard`
      : 'https://quiz-trivia-mu.vercel.app/leaderboard';
    const title = 'Quiz Trivia Leaderboard';
    const text = 'Check out the Quiz Trivia leaderboard!';

    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title, text, url: shareUrl });
        return;
      }

      if (typeof navigator !== 'undefined' && navigator.clipboard && typeof window !== 'undefined' && window.isSecureContext) {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        return;
      }

      // Final fallback: try legacy copy method
      if (typeof document !== 'undefined') {
        const textarea = document.createElement('textarea');
        textarea.value = shareUrl;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'absolute';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        try {
          document.execCommand('copy');
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } finally {
          document.body.removeChild(textarea);
        }
      }
    } catch (err) {
      console.error('Share failed:', err);
      // As a last resort, open Warpcast compose if available in a new tab
      const wcText = encodeURIComponent('I just played Quiz Trivia! 🎉 Join me here:');
      const wcUrl = encodeURIComponent(shareUrl);
      const warpcastUrl = `https://warpcast.com/~/compose?text=${wcText}%20${wcUrl}`;
      if (typeof window !== 'undefined') {
        window.open(warpcastUrl, '_blank', 'noopener,noreferrer');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-800 to-pink-700 p-4">
      <div className="max-w-4xl mx-auto pt-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Trophy className="text-yellow-500 mr-3" size={48} />
            <h1 className="text-4xl font-bold text-white">Quiz Trivia Leaderboard</h1>
          </div>
          <p className="text-white text-lg opacity-90">Central DAO Presents</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl p-6 text-center shadow-lg">
            <Users className="mx-auto text-blue-500 mb-2" size={32} />
            <div className="text-2xl font-bold text-gray-800">{stats.totalParticipants}</div>
            <div className="text-sm text-gray-600">Total Participants</div>
          </div>
          <div className="bg-white rounded-xl p-6 text-center shadow-lg">
            <Trophy className="mx-auto text-yellow-500 mb-2" size={32} />
            <div className="text-2xl font-bold text-gray-800">
              {leaderboard.length > 0 ? leaderboard[0]?.score || 0 : 0}
            </div>
            <div className="text-sm text-gray-600">Highest Score</div>
          </div>
          <div className="bg-white rounded-xl p-6 text-center shadow-lg">
            <Calendar className="mx-auto text-green-500 mb-2" size={32} />
            <div className="text-sm font-bold text-gray-800">
              {stats.lastUpdated ? new Date(stats.lastUpdated).toLocaleDateString() : 'N/A'}
            </div>
            <div className="text-sm text-gray-600">Last Updated</div>
          </div>
        </div>

        {/* Leaderboard */}
        <div className="bg-white rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">🏆 Public Leaderboard</h2>
            <p className="text-gray-600">All Quiz Trivia Participants</p>
            {!loading && (
              <div className="mt-2 text-sm text-gray-500">
                {leaderboard.length} participants • Last updated: {new Date().toLocaleString()}
              </div>
            )}
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="spinner h-8 w-8 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading leaderboard...</p>
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No participants yet. Be the first to complete the quiz!</p>
              <Link 
                href="/" 
                className="mt-4 inline-block bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold py-2 px-6 rounded-lg hover:from-blue-600 hover:to-purple-700 transform hover:scale-105 transition-all duration-200"
              >
                Take the Quiz
              </Link>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {leaderboard.map((player) => (
                <div
                  key={player.fid}
                  className={`flex items-center justify-between p-4 rounded-lg border-2 ${
                    player.rank && player.rank <= 3
                      ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-300'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                      player.rank === 1 ? 'bg-yellow-500 text-yellow-900' :
                      player.rank === 2 ? 'bg-gray-400 text-gray-900' :
                      player.rank === 3 ? 'bg-orange-500 text-orange-900' :
                      'bg-blue-500 text-blue-900'
                    }`}>
                      {player.rank === 1 ? '🥇' : 
                       player.rank === 2 ? '🥈' : 
                       player.rank === 3 ? '🥉' : player.rank}
                    </div>
                    <div className="flex items-center space-x-3">
                      {player.pfpUrl && (
                        <img 
                          src={player.pfpUrl} 
                          alt="Profile" 
                          className="w-8 h-8 rounded-full"
                        />
                      )}
                      <div>
                        <div className="font-semibold text-gray-800">
                          {player.displayName || player.username}
                        </div>
                        <div className="text-sm text-gray-500">@{player.username}</div>
                        <div className="text-xs text-gray-400 flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          Completed in {player.time}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-blue-600">{player.score}</div>
                    <div className="text-xs text-gray-500">points</div>
                    <div className="text-xs text-gray-400">
                      {new Date(player.completedAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-6 text-center space-x-4">
            <button
              onClick={handleShare}
              className="bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold py-2 px-4 rounded-lg hover:from-purple-600 hover:to-pink-700 transform hover:scale-105 transition-all duration-200 flex items-center mx-auto"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </button>
            {copied && (
              <div className="mt-2 text-sm text-green-200">
                ✅ Share link copied to clipboard!
              </div>
            )}
            <Link 
              href="/" 
              className="inline-block bg-gradient-to-r from-green-500 to-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:from-green-600 hover:to-blue-700 transform hover:scale-105 transition-all duration-200"
            >
              🚀 Take the Quiz
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
