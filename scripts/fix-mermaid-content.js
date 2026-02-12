/**
 * DBに保存されているMermaidコンテンツから絵文字とリテラル\nを除去
 * 一度だけ実行する修正スクリプト
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Mermaidブロック内のコンテンツをサニタイズ
 */
function sanitizeMermaidBlock(mermaidContent) {
  let result = mermaidContent;

  // 絵文字を除去
  result = result.replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}]/gu, '');

  // リテラル \n（バックスラッシュ+n）を空白に変換
  const literalBackslashN = String.raw`\n`;

  // 各種ラベル形式で \n を空白に置換
  // ["..."]
  result = result.replace(/\["([^"]*)"\]/g, (match) => {
    const content = match.slice(2, -2).split(literalBackslashN).join(' ');
    return `["${content}"]`;
  });

  // [...]
  result = result.replace(/\[([^\[\]"]+)\]/g, (match) => {
    if (match.includes(literalBackslashN)) {
      const content = match.slice(1, -1).split(literalBackslashN).join(' ');
      return `[${content}]`;
    }
    return match;
  });

  // (...)
  result = result.replace(/\(([^()]+)\)/g, (match) => {
    if (match.includes(literalBackslashN)) {
      const content = match.slice(1, -1).split(literalBackslashN).join(' ');
      return `(${content})`;
    }
    return match;
  });

  // {...}
  result = result.replace(/\{([^{}]+)\}/g, (match) => {
    if (match.includes(literalBackslashN)) {
      const content = match.slice(1, -1).split(literalBackslashN).join(' ');
      return `{${content}}`;
    }
    return match;
  });

  // 余分なスペースを整理
  result = result.replace(/\[" +/g, '["');
  result = result.replace(/ +"\]/g, '"]');
  result = result.replace(/ {2,}/g, ' ');

  return result;
}

/**
 * コンテンツ全体からMermaidブロックを見つけてサニタイズ
 */
function sanitizeContent(content) {
  if (!content) return content;

  // Mermaidブロックを見つけて置換
  const mermaidRegex = /(```\s*mermaid\s*\n?)([\s\S]*?)(```)/gi;

  return content.replace(mermaidRegex, (match, open, mermaidContent, close) => {
    const sanitized = sanitizeMermaidBlock(mermaidContent);
    return open + sanitized + close;
  });
}

async function fixMermaidContent() {
  console.log('========================================');
  console.log('Mermaidコンテンツ修正スクリプト');
  console.log('========================================\n');

  // mermaidを含むコンテンツを検索
  const { data: contents, error } = await supabase
    .from('session_contents')
    .select('id, session_id, title, content')
    .ilike('content', '%mermaid%');

  if (error) {
    console.error('エラー:', error);
    return;
  }

  if (!contents || contents.length === 0) {
    console.log('mermaidを含むコンテンツが見つかりません');
    return;
  }

  console.log(`${contents.length}件のmermaidコンテンツを発見\n`);

  let updatedCount = 0;
  let skippedCount = 0;

  for (const item of contents) {
    const originalContent = item.content;
    const sanitizedContent = sanitizeContent(originalContent);

    if (originalContent !== sanitizedContent) {
      // 変更があった場合、DBを更新
      const { error: updateError } = await supabase
        .from('session_contents')
        .update({ content: sanitizedContent })
        .eq('id', item.id);

      if (updateError) {
        console.error(`❌ 更新失敗 (${item.id}):`, updateError);
      } else {
        console.log(`✅ 更新完了: ${item.title} (${item.id})`);
        updatedCount++;
      }
    } else {
      skippedCount++;
    }
  }

  console.log('\n========================================');
  console.log('完了');
  console.log(`更新: ${updatedCount}件`);
  console.log(`スキップ（変更なし）: ${skippedCount}件`);
  console.log('========================================');
}

fixMermaidContent().catch(console.error);
