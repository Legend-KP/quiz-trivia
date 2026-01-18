"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Trophy, Users, Calendar, Clock, Share2 } from 'lucide-react';
import Link from 'next/link';
import { useMiniApp } from '@neynar/react';
import { currentWeeklyQuiz } from '~/lib/weeklyQuiz';

interface LeaderboardEntry {
  fid: number;
  username: string;
  displayName?: string;
  pfpUrl?: string;
  score: number;
  time: string;
  completedAt: number;
  rank?: number;
  mode: 'CLASSIC' | 'TIME_MODE';
}

export default function PublicLeaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null); // ✅ FIX #3: Add error state
  
  // Check URL params for mode parameter
  const getInitialMode = (): 'CLASSIC' | 'TIME_MODE' => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const mode = params.get('mode');
      if (mode === 'CLASSIC') return 'CLASSIC';
      if (mode === 'TIME_MODE') return 'TIME_MODE';
    }
    return 'CLASSIC';
  };
  const [selectedMode, setSelectedMode] = useState<'CLASSIC' | 'TIME_MODE'>(getInitialMode());
  const [stats, setStats] = useState({
    totalParticipants: 0,
    lastUpdated: ''
  });
  const [currentQuizId, setCurrentQuizId] = useState<string | null>(null);
  const { actions, context } = useMiniApp(); // ✅ FIX #9: Get user context

  // ✅ FIX #1, #3, #7: Add all dependencies, error handling, and AbortController support
  const fetchLeaderboard = useCallback(async (quizId?: string | null, signal?: AbortSignal) => {
    try {
      setLoading(true);
      setError(null); // Clear previous errors
      let url: string;
      
      // For CLASSIC mode (weekly quiz), always filter by current quizId
      if (selectedMode === 'CLASSIC') {
        const idToUse = quizId || currentWeeklyQuiz.id;
        url = `/api/leaderboard?mode=CLASSIC&quizId=${idToUse}`;
      } else {
        url = `/api/leaderboard?mode=${selectedMode}`;
      }
      
      const response = await fetch(url, { signal }); // ✅ FIX #7: Pass abort signal
      
      if (signal?.aborted) return; // Don't process if aborted
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch leaderboard`);
      }
      
      const data = await response.json();
      if (data.leaderboard) {
        setLeaderboard(data.leaderboard);
        setStats({
          totalParticipants: data.totalParticipants || 0,
          lastUpdated: data.lastUpdated || new Date().toISOString()
        });
      }
    } catch (error: any) {
      if (error.name === 'AbortError') return; // Ignore abort errors
      console.error('Leaderboard fetch error:', error);
      setError('Failed to load leaderboard. Please refresh the page.');
      setLeaderboard([]);
    } finally {
      setLoading(false);
    }
  }, [selectedMode, currentWeeklyQuiz.id]); // ✅ FIX #1: Add missing dependency

  // ✅ FIX #7: Abort previous fetch on mode change
  useEffect(() => {
    const controller = new AbortController();
    fetchLeaderboard(undefined, controller.signal);
    
    // Initialize quizId for CLASSIC mode
    if (selectedMode === 'CLASSIC') {
      setCurrentQuizId(currentWeeklyQuiz.id);
    }
    
    return () => controller.abort(); // Cancel fetch on unmount or mode change
  }, [fetchLeaderboard, selectedMode]);

  // ✅ FIX #2: Check only on page visibility change (not every 5 seconds)
  useEffect(() => {
    if (selectedMode === 'CLASSIC') {
      const handleVisibilityChange = () => {
        if (!document.hidden) {
          const newQuizId = currentWeeklyQuiz.id;
          if (newQuizId !== currentQuizId) {
            setCurrentQuizId(newQuizId);
            fetchLeaderboard(newQuizId);
          }
        }
      };
      
      document.addEventListener('visibilitychange', handleVisibilityChange);
      return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }
  }, [selectedMode, currentQuizId, fetchLeaderboard]);

  // ✅ FIX #4: Better mode switching with state preservation
  const handleModeSwitch = (newMode: 'CLASSIC' | 'TIME_MODE') => {
    setSelectedMode(newMode);
    setLeaderboard([]); // Clear old data immediately
    setLoading(true); // Show loading state
    setError(null); // Clear any errors
    
    // Update URL without reload
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('mode', newMode);
      window.history.pushState({}, '', url);
    }
  };

  const handleShare = async () => {
    try {
      await actions.composeCast({
        text: "🎉 I'm playing Quiz Trivia by @kushal-paliwal — fun, fast, and addictive.\nJump in and see how you rank 👇",
        embeds: ['https://quiz-trivia-mu.vercel.app/'],
      });
    } catch (err) {
      // Fallback to Warpcast compose URL
      const text = encodeURIComponent("🎉 I'm playing Quiz Trivia by @kushal-paliwal — fun, fast, and addictive.\nJump in and see how you rank 👇");
      const url = encodeURIComponent('https://quiz-trivia-mu.vercel.app/');
      const warpcastUrl = `https://warpcast.com/~/compose?text=${text}%20${url}`;
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
        </div>

        {/* Mode Selector */}
        <div className="flex justify-center mb-8">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-2 flex gap-2">
            {[
              { value: 'CLASSIC', label: 'Weekly Quiz', icon: '📅' },
              { value: 'TIME_MODE', label: 'Time Mode', icon: '⏱️' }
            ].map((mode) => (
              <button
                key={mode.value}
                onClick={() => handleModeSwitch(mode.value as any)} // ✅ FIX #4: Use handleModeSwitch
                className={`px-4 py-2 rounded-lg font-semibold transition-all duration-200 ${
                  selectedMode === mode.value
                    ? 'bg-white text-gray-800 shadow-lg'
                    : 'text-white hover:bg-white/20'
                }`}
              >
                <span className="mr-2">{mode.icon}</span>
                {mode.label}
              </button>
            ))}
          </div>
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
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              🏆 {selectedMode === 'CLASSIC' ? 'Weekly Quiz' : 'Time Mode'} Leaderboard
            </h2>
            <p className="text-gray-600">
              {selectedMode === 'CLASSIC' ? 'Weekly Quiz' : 'Time Mode'} Participants
            </p>
            {!loading && (
              <div className="mt-2 text-sm text-gray-500">
                {stats.totalParticipants || leaderboard.length} participants • Last updated: {new Date().toLocaleString()}
              </div>
            )}
          </div>

          {/* ✅ FIX #6: Better loading indicator during mode switch */}
          {loading ? (
            <div className="text-center py-8">
              <div className="spinner h-8 w-8 mx-auto mb-4"></div>
              <p className="text-gray-600">
                Loading {selectedMode === 'CLASSIC' ? 'Weekly Quiz' : 'Time Mode'} leaderboard...
              </p>
            </div>
          ) : error ? (
            // ✅ FIX #5: Show error state separately from empty state
            <div className="text-center py-8">
              <div className="text-red-500 text-4xl mb-4">⚠️</div>
              <p className="text-red-600 font-semibold mb-2">{error}</p>
              <button
                onClick={() => fetchLeaderboard()}
                className="mt-4 inline-block bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold py-2 px-6 rounded-lg hover:from-blue-600 hover:to-purple-700 transform hover:scale-105 transition-all duration-200"
              >
                🔄 Retry
              </button>
            </div>
          ) : leaderboard.length === 0 ? (
            // ✅ FIX #5: Better empty state message
            <div className="text-center py-8">
              <div className="text-gray-400 text-4xl mb-4">🏆</div>
              <p className="text-gray-500 mb-2">No participants yet for {selectedMode === 'CLASSIC' ? 'Weekly Quiz' : 'Time Mode'}!</p>
              <p className="text-gray-400 text-sm mb-4">Be the first to complete the quiz and claim the top spot.</p>
              <Link 
                href="/" 
                className="mt-4 inline-block bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold py-2 px-6 rounded-lg hover:from-blue-600 hover:to-purple-700 transform hover:scale-105 transition-all duration-200"
              >
                🚀 Take the Quiz
              </Link>
            </div>
          ) : (
            <div 
              className="space-y-3 max-h-[70vh] overflow-y-auto pr-2 leaderboard-scroll"
              style={{ 
                scrollbarWidth: 'thin', 
                scrollbarColor: '#94a3b8 #e2e8f0'
              }}
            >
              {leaderboard.map((player) => {
                const userFid = context?.user?.fid;
                const isCurrentUser = player.fid === userFid;
                
                return (
                  <div
                    key={player.fid}
                    className={`relative flex items-center justify-between p-4 rounded-lg border-2 ${
                      isCurrentUser
                        ? 'bg-blue-100 border-blue-500 ring-2 ring-blue-400' // ✅ FIX #9: Highlight user's entry
                        : player.rank && player.rank <= 3
                          ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-300'
                          : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    {isCurrentUser && (
                      <div className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
                        YOU
                      </div>
                    )}
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
              );
            })}
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-6 flex justify-center items-center gap-4">
            <button
              onClick={handleShare}
              className="bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold py-2 px-4 rounded-lg hover:from-purple-600 hover:to-pink-700 transform hover:scale-105 transition-all duration-200 flex items-center"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </button>
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
