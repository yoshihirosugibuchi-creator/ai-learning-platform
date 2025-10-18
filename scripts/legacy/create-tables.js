const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? 'Set' : 'Missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createKnowledgeCardsTables() {
  try {
    console.log('🚀 Creating knowledge cards tables...');
    
    // First, test basic connection
    const { data: testData, error: testError } = await supabase
      .from('categories')
      .select('category_id')
      .limit(1);
      
    if (testError) {
      console.error('❌ Connection test failed:', testError);
      return;
    }
    
    console.log('✅ Connection verified');
    
    // Insert master card data directly using Supabase client
    const knowledgeCards = [
      {
        theme_id: 'so_what_why_so',
        title: 'So What?/Why So?',
        summary: '情報の本質を見抜き、deeper insightを得るための質問技術',
        key_points: ['So What? - それで何が言えるのか？', 'Why So? - なぜそうなるのか？', '論理の飛躍を防ぐ検証プロセス'],
        icon: '❓',
        color: '#F59E0B',
        category: '論理的思考・分析',
        difficulty: 'intermediate',
        display_order: 10,
        reward_xp: 50
      },
      {
        theme_id: 'conclusion_first',
        title: '結論ファースト',
        summary: 'まず結論、その後に根拠という情報構造でコミュニケーションの効率を上げる手法',
        key_points: ['PREP法（Point・Reason・Example・Point）の活用', '聞き手の理解負荷を軽減', '説得力のあるプレゼンテーション'],
        icon: '🎯',
        color: '#3B82F6',
        category: '論理的思考・分析',
        difficulty: 'basic',
        display_order: 20,
        reward_xp: 30
      },
      {
        theme_id: 'mece_thinking',
        title: 'MECE思考',
        summary: '複雑な問題を「漏れなく重複なく」整理して全体像を把握する思考技術',
        key_points: ['Mutually Exclusive（重複なく）', 'Collectively Exhaustive（漏れなく）', '問題の全体像把握と優先順位付け'],
        icon: '📊',
        color: '#10B981',
        category: '論理的思考・分析',
        difficulty: 'basic',
        display_order: 30,
        reward_xp: 30
      },
      {
        theme_id: 'logical_tree',
        title: 'ロジックツリー',
        summary: '問題を階層的に分解し、根本原因を特定する構造化思考ツール',
        key_points: ['イシューツリーとソリューションツリーの使い分け', 'Why型とHow型の論理展開', '原因分析と対策立案の体系化'],
        icon: '🌳',
        color: '#8B5CF6',
        category: '論理的思考・分析',
        difficulty: 'intermediate',
        display_order: 40,
        reward_xp: 40
      },
      {
        theme_id: 'market_analysis',
        title: '3C分析',
        summary: '市場分析の基本フレームワークで競合優位性を見つける手法',
        key_points: ['Customer（市場・顧客）', 'Competitor（競合）', 'Company（自社）', '戦略的ポジショニング'],
        icon: '📈',
        color: '#EC4899',
        category: '戦略・分析',
        difficulty: 'intermediate',
        display_order: 50,
        reward_xp: 40
      },
      {
        theme_id: 'ai_basic_concepts',
        title: 'AI基本概念',
        summary: 'ビジネスで活用するAIの基本知識と実践ポイント',
        key_points: ['機械学習とディープラーニング', 'ビジネス適用の考え方', 'AI導入の成功要因'],
        icon: '🤖',
        color: '#6366F1',
        category: 'AI・デジタル活用',
        difficulty: 'basic',
        display_order: 60,
        reward_xp: 35
      }
    ];
    
    console.log('📋 Checking if knowledge_cards table exists...');
    
    // Try to check existing data first
    const { data: existingCards, error: selectError } = await supabase
      .from('knowledge_cards')
      .select('theme_id')
      .limit(1);
    
    if (selectError) {
      console.log('⚠️ Table doesn\'t exist or can\'t be accessed:', selectError.message);
      console.log('💡 Please create the knowledge_cards table manually in Supabase dashboard');
      console.log(`
CREATE TABLE knowledge_cards (
  theme_id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  summary TEXT,
  key_points JSONB,
  icon TEXT DEFAULT '🎯',
  color TEXT DEFAULT '#3B82F6',
  category TEXT,
  difficulty TEXT DEFAULT 'beginner',
  display_order INTEGER DEFAULT 0,
  reward_xp INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE user_knowledge_collection_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  theme_id TEXT NOT NULL,
  count INTEGER DEFAULT 1,
  first_obtained_at TIMESTAMP DEFAULT NOW(),
  last_obtained_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT uk_user_knowledge_collection_v2_user_theme UNIQUE (user_id, theme_id)
);
      `);
      return;
    }
    
    console.log(`✅ Table exists with ${existingCards?.length || 0} existing cards`);
    
    // Insert or update card data
    for (const card of knowledgeCards) {
      console.log(`📤 Upserting card: ${card.theme_id}`);
      
      const { error: upsertError } = await supabase
        .from('knowledge_cards')
        .upsert(card, { onConflict: 'theme_id' });
      
      if (upsertError) {
        console.error(`❌ Error upserting ${card.theme_id}:`, upsertError);
      } else {
        console.log(`✅ Successfully upserted: ${card.theme_id}`);
      }
    }
    
    // Verify the data
    const { data: finalCards, error: finalError } = await supabase
      .from('knowledge_cards')
      .select('theme_id, title, category')
      .order('display_order');
      
    if (finalError) {
      console.error('❌ Verification error:', finalError);
    } else {
      console.log(`✅ Final verification: ${finalCards?.length || 0} cards in database`);
      finalCards?.forEach(card => {
        console.log(`  - ${card.theme_id}: ${card.title} (${card.category})`);
      });
    }
    
    console.log('🎉 Knowledge cards setup completed!');
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
  }
}

createKnowledgeCardsTables();