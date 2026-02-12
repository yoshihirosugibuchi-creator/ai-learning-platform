require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  // auth.usersの全ユーザー
  const { data: authData } = await supabase.auth.admin.listUsers({ perPage: 100 });
  const authUsers = authData?.users || [];

  // usersテーブルの全ユーザー
  const { data: appUsers } = await supabase.from('users').select('id, email');
  const appIds = new Set(appUsers?.map(u => u.id) || []);

  console.log('auth.users:', authUsers.length, '人');
  console.log('usersテーブル:', appUsers?.length || 0, '人');

  // 同期されていないユーザーを検出
  const missingUsers = authUsers.filter(u => !appIds.has(u.id));

  if (missingUsers.length > 0) {
    console.log('\n❌ usersテーブルに未登録のユーザー:');
    missingUsers.forEach(u => {
      console.log('  -', u.email, '| ID:', u.id);
    });

    // 手動で同期
    console.log('\n同期を実行します...');
    for (const user of missingUsers) {
      const { error } = await supabase
        .from('users')
        .insert({
          id: user.id,
          email: user.email,
          name: user.user_metadata?.name || user.email.split('@')[0],
          role: 'user',
          created_at: user.created_at
        });

      if (error) {
        console.log('  ❌', user.email, '- エラー:', error.message);
      } else {
        console.log('  ✅', user.email, '- 同期完了');
      }
    }
  } else {
    console.log('\n✅ 全てのauth.usersがusersテーブルに登録されています');
  }
}

main().catch(console.error);
