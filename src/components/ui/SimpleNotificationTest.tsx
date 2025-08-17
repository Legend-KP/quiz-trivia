import React, { useState } from 'react';
import { Button } from './Button';

export function SimpleNotificationTest() {
  const [fid, setFid] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const sendNotification = async () => {
    if (!fid || !title || !body) {
      setResult('Please fill in all fields');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/send-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fid: Number(fid),
          title,
          body,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResult('✅ Notification sent successfully!');
        setTitle('');
        setBody('');
      } else {
        setResult(`❌ Error: ${data.error}`);
      }
    } catch (_error) {
      setResult('❌ Failed to send notification');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 space-y-4">
      <h2 className="text-xl font-semibold">Test Manual Notifications</h2>
      
      <div>
        <label className="block text-sm font-medium mb-1">User FID:</label>
        <input
          type="number"
          value={fid}
          onChange={(e) => setFid(e.target.value)}
          placeholder="Enter FID (e.g., 12345)"
          className="w-full p-2 border rounded"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Title:</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Notification title"
          className="w-full p-2 border rounded"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Message:</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Notification message"
          rows={3}
          className="w-full p-2 border rounded"
        />
      </div>

      <Button
        onClick={sendNotification}
        disabled={loading || !fid || !title || !body}
        className="w-full"
      >
        {loading ? 'Sending...' : 'Send Notification'}
      </Button>

      {result && (
        <div className={`p-3 rounded text-sm ${
          result.includes('✅') 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {result}
        </div>
      )}
    </div>
  );
}
