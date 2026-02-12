/**
 * DBに保存されているMermaidコンテンツのsubgraph名を修正
 * 日本語subgraph名 → 英語ID + 日本語ラベル に変換
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Mermaidブロック内のsubgraph名を修正
 * subgraph 日本語名 → subgraph id ["日本語名"]
 */
function fixSubgraphNames(mermaidContent) {
  let result = mermaidContent;
  let counter = 1;

  // subgraph 日本語名 のパターンを検出して修正
  // subgraph の後にASCII以外の文字が来る場合
  result = result.replace(/subgraph\s+([^\n\[\]]+?)(\n|$)/g, (match, name, ending) => {
    const trimmedName = name.trim();

    // 既にID形式 ["..."] がある場合はスキップ
    if (trimmedName.includes('[') || trimmedName.includes('"')) {
      return match;
    }

    // ASCII英数字とアンダースコアのみで構成されている場合はスキップ
    if (/^[a-zA-Z0-9_]+$/.test(trimmedName)) {
      return match;
    }

    // 日本語や特殊文字を含む場合、ID + ラベル形式に変換
    const id = `sub${counter++}`;
    return `subgraph ${id} ["${trimmedName}"]${ending}`;
  });

  return result;
}

/**
 * コンテンツ全体からMermaidブロックを見つけて修正
 */
function fixContent(content) {
  if (!content) return content;

  const mermaidRegex = /(```\s*mermaid\s*\n?)([\s\S]*?)(```)/gi;

  return content.replace(mermaidRegex, (match, open, mermaidContent, close) => {
    const fixed = fixSubgraphNames(mermaidContent);
    return open + fixed + close;
  });
}

async function main() {
  console.log('========================================');
  console.log('Mermaid subgraph名修正スクリプト');
  console.log('========================================\n');

  const { data: contents, error } = await supabase
    .from('session_contents')
    .select('id, session_id, title, content')
    .ilike('content', '%subgraph%');

  if (error) {
    console.error('エラー:', error);
    return;
  }

  if (!contents || contents.length === 0) {
    console.log('subgraphを含むコンテンツが見つかりません');
    return;
  }

  console.log(`${contents.length}件のsubgraphコンテンツを発見\n`);

  let updatedCount = 0;

  for (const item of contents) {
    const originalContent = item.content;
    const fixedContent = fixContent(originalContent);

    if (originalContent !== fixedContent) {
      const { error: updateError } = await supabase
        .from('session_contents')
        .update({ content: fixedContent })
        .eq('id', item.id);

      if (updateError) {
        console.error(`❌ 更新失敗 (${item.id}):`, updateError);
      } else {
        console.log(`✅ 更新完了: ${item.title}`);

        // 変更箇所を表示
        const mermaidRegex = /```\s*mermaid\s*\n?([\s\S]*?)```/gi;
        let m;
        while ((m = mermaidRegex.exec(fixedContent)) !== null) {
          const lines = m[1].split('\n').filter(l => l.includes('subgraph'));
          if (lines.length > 0) {
            console.log('   修正後のsubgraph:', lines.join(', '));
          }
        }
        updatedCount++;
      }
    }
  }

  console.log(`\n完了: ${updatedCount}件更新`);
}

main().catch(console.error);
