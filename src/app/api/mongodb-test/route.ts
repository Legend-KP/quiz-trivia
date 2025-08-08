import { NextResponse } from 'next/server';
import { getLeaderboardCollection } from '../../../lib/mongodb';

export async function GET() {
  try {
    console.log('🧪 Testing MongoDB connection...');
    
    const collection = await getLeaderboardCollection();
    
    // Test inserting a document
    const testEntry = {
      fid: 123456,
      username: 'testuser',
      displayName: 'Test User',
      pfpUrl: 'https://picsum.photos/32/32?random=123',
      score: 5,
      time: '1:30',
      completedAt: Date.now()
    };
    
    console.log('📝 Inserting test document...');
    await collection.updateOne(
      { fid: testEntry.fid },
      { $set: testEntry },
      { upsert: true }
    );
    console.log('✅ Test document inserted successfully');
    
    // Test reading documents
    console.log('📖 Reading documents...');
    const documents = await collection.find({}).toArray();
    console.log(`📊 Found ${documents.length} documents`);
    
    // Test counting documents
    const count = await collection.countDocuments();
    console.log(`📈 Total document count: ${count}`);
    
    return NextResponse.json({
      success: true,
      message: 'MongoDB test successful',
      documentCount: count,
      documents: documents.slice(0, 3) // Return first 3 docs for inspection
    });
    
  } catch (error) {
    console.error('❌ MongoDB test failed:', error);
    return NextResponse.json({
      success: false,
      error: 'MongoDB test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 