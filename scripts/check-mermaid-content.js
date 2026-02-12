/**
 * Mermaidコンテンツのデバッグ用スクリプト
 * 実際のDBに保存されているコンテンツ形式を確認
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkMermaidContent() {
  console.log('========================================');
  console.log('Mermaidコンテンツ形式チェック');
  console.log('========================================\n');

  // mermaidを含むコンテンツを検索
  const { data: contents, error } = await supabase
    .from('session_contents')
    .select('id, session_id, content_type, title, content')
    .ilike('content', '%mermaid%')
    .limit(5);

  if (error) {
    console.error('エラー:', error);
    return;
  }

  if (!contents || contents.length === 0) {
    console.log('mermaidを含むコンテンツが見つかりません');
    return;
  }

  console.log(`${contents.length}件のmermaidコンテンツを発見\n`);

  for (const content of contents) {
    console.log('----------------------------------------');
    console.log('ID:', content.id);
    console.log('Session ID:', content.session_id);
    console.log('Title:', content.title);
    console.log('Type:', content.content_type);
    console.log('\n--- Content (raw) ---');
    console.log(JSON.stringify(content.content).substring(0, 500));
    console.log('\n--- Content (parsed) ---');
    console.log(content.content?.substring(0, 500));

    // 改行文字のチェック
    const hasRealNewlines = content.content?.includes('\n');
    const hasEscapedNewlines = content.content?.includes('\\n');
    console.log('\n--- 改行チェック ---');
    console.log('実際の改行 (\\n):', hasRealNewlines);
    console.log('エスケープ改行 (\\\\n):', hasEscapedNewlines);

    // mermaid部分を抽出
    const mermaidMatch = content.content?.match(/```\s*mermaid\s*([\s\S]*?)```/i);
    if (mermaidMatch) {
      console.log('\n--- Mermaid部分 (抽出) ---');
      console.log('Raw:', JSON.stringify(mermaidMatch[1].substring(0, 300)));
      console.log('Parsed:', mermaidMatch[1].substring(0, 300));
    }

    console.log('\n');
  }
}

checkMermaidContent().catch(console.error);
