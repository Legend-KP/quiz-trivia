"use client";

import React, { useState } from 'react';

export default function TestOGPage() {
  const [fid, setFid] = useState('12345');
  const [ogImageUrl, setOgImageUrl] = useState('');

  const generateOGImage = () => {
    const url = `${window.location.origin}/api/opengraph-image?fid=${fid}`;
    setOgImageUrl(url);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">OG Image Test</h1>
        
        <div className="bg-white rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Test OG Image Generation</h2>
          
          <div className="flex gap-4 mb-4">
            <input
              type="text"
              value={fid}
              onChange={(e) => setFid(e.target.value)}
              placeholder="Enter FID"
              className="border border-gray-300 rounded px-3 py-2 flex-1"
            />
            <button
              onClick={generateOGImage}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Generate OG Image
            </button>
          </div>

          {ogImageUrl && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">OG Image URL:</h3>
                <input
                  type="text"
                  value={ogImageUrl}
                  readOnly
                  className="border border-gray-300 rounded px-3 py-2 w-full bg-gray-50"
                />
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">Preview:</h3>
                <div className="border border-gray-300 rounded overflow-hidden">
                  <img 
                    src={ogImageUrl} 
                    alt="OG Image Preview" 
                    className="w-full max-w-2xl"
                    onError={(e) => {
                      console.error('Failed to load OG image');
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Share URL:</h3>
                <input
                  type="text"
                  value={`${window.location.origin}/share/${fid}`}
                  readOnly
                  className="border border-gray-300 rounded px-3 py-2 w-full bg-gray-50"
                />
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Instructions</h2>
          <ol className="list-decimal list-inside space-y-2 text-gray-700">
            <li>Enter a FID (Farcaster ID) in the input field</li>
            <li>Click "Generate OG Image" to create the dynamic image</li>
            <li>The image should show user profile, score, and participant avatars</li>
            <li>Check the browser console for debugging information</li>
            <li>Test the share URL to see how it appears when shared</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
