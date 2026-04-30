const { createClient } = require('../node_modules/@supabase/supabase-js/dist/index.cjs');

const supabase = createClient(
  'https://rialhjugosaqlothgufb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpYWxoanVnb3NhcWxvdGhndWZiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjMzMjQxMywiZXhwIjoyMDkxOTA4NDEzfQ.lveaep205BHhz6TwwlVtwrHUwjRnFQYwK6f9TIUJf0g'
);

async function run() {
  const tables = ['assets','insights','share_links','ai_queries','link_events','sf_attribution'];

  // snapshot before
  console.log('BEFORE:');
  for (const t of tables) {
    const { count } = await supabase.from(t).select('*', { count: 'exact', head: true });
    console.log(' ', t.padEnd(18), count ?? 0);
  }

  // delete in dependency order (children first)
  const deleteOrder = ['link_events','sf_attribution','share_links','ai_queries','insights','assets'];
  console.log('\nDELETING:');
  for (const table of deleteOrder) {
    const { error, count } = await supabase
      .from(table)
      .delete({ count: 'exact' })
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (error) {
      // fallback for integer-id tables
      const { error: e2, count: c2 } = await supabase
        .from(table).delete({ count: 'exact' }).gt('id', 0);
      if (e2) console.log(' ', table.padEnd(18), 'skip —', e2.message);
      else    console.log(' ', table.padEnd(18), 'deleted', c2 ?? 0, 'rows');
    } else {
      console.log(' ', table.padEnd(18), 'deleted', count ?? 0, 'rows');
    }
  }

  // verify
  const { count } = await supabase.from('assets').select('*', { count: 'exact', head: true });
  console.log('\nAFTER — assets remaining:', count ?? 0, (count === 0 || count === null) ? '✓ clean slate' : '⚠ rows remain');
}

run().catch(console.error);
