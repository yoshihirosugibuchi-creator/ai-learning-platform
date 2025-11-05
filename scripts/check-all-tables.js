const { supabaseAdmin } = require('../lib/supabase-admin.ts');

async function checkAllTables() {
  try {
    const { data: tables, error } = await supabaseAdmin
      .from('information_schema.tables')
      .select('table_name, table_schema')
      .eq('table_schema', 'public')
      .order('table_name');
    
    if (error) throw error;
    
    console.log('📊 公開スキーマの全テーブル数:', tables.length);
    console.log('');
    console.log('=== 全テーブル一覧 ===');
    tables.forEach((table, index) => {
      console.log((index + 1).toString().padStart(2) + ': ' + table.table_name);
    });
    
    console.log('');
    console.log('=== user_id列を持つテーブル ===');
    const userDataTables = [];
    
    for (const table of tables) {
      const { data: columns } = await supabaseAdmin
        .from('information_schema.columns')
        .select('column_name')
        .eq('table_schema', 'public')
        .eq('table_name', table.table_name)
        .eq('column_name', 'user_id');
      
      if (columns && columns.length > 0) {
        userDataTables.push(table.table_name);
      }
    }
    
    console.log('user_id列を持つテーブル数:', userDataTables.length);
    userDataTables.forEach((tableName, index) => {
      console.log((index + 1).toString().padStart(2) + ': ' + tableName);
    });
    
  } catch (error) {
    console.error('❌ エラー:', error.message);
  }
}

checkAllTables();
