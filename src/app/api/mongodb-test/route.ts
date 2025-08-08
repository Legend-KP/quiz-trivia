import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

const uri = 'mongodb+srv://kushal5paliwal:YctdHl3XZoCEMLwg@cluster0.alffzye.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

export async function GET() {
  try {
    console.log('🧪 Testing MongoDB connection...');
    console.log('🔗 Connection URI:', uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')); // Hide credentials
    
    // Test basic connection
    const client = new MongoClient(uri);
    console.log('📡 Creating MongoDB client...');
    
    await client.connect();
    console.log('✅ MongoDB client connected successfully');
    
    const db = client.db('quiz_trivia');
    console.log('📊 Connected to database: quiz_trivia');
    
    const collection = db.collection('leaderboard');
    console.log('📋 Connected to collection: leaderboard');
    
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
    
    await client.close();
    console.log('🔌 MongoDB client closed');
    
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
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
} 