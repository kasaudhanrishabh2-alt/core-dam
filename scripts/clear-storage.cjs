const { createClient } = require('../node_modules/@supabase/supabase-js/dist/index.cjs');

const supabase = createClient(
  'https://rialhjugosaqlothgufb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpYWxoanVnb3NhcWxvdGhndWZiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjMzMjQxMywiZXhwIjoyMDkxOTA4NDEzfQ.lveaep205BHhz6TwwlVtwrHUwjRnFQYwK6f9TIUJf0g'
);

async function run() {
  // List all files in the assets bucket
  const { data: files, error } = await supabase.storage.from('assets').list('', { limit: 1000 });
  if (error) { console.log('Storage list error:', error.message); return; }

  // Collect all files recursively (files are stored in user-id subfolders)
  const allPaths = [];
  for (const item of files || []) {
    if (item.id) {
      // It's a file
      allPaths.push(item.name);
    } else {
      // It's a folder — list contents
      const { data: sub } = await supabase.storage.from('assets').list(item.name, { limit: 1000 });
      for (const f of sub || []) {
        allPaths.push(`${item.name}/${f.name}`);
      }
    }
  }

  console.log('Files in storage:', allPaths.length);
  if (allPaths.length === 0) { console.log('✓ Storage already empty'); return; }

  // Delete in batches of 100
  let deleted = 0;
  for (let i = 0; i < allPaths.length; i += 100) {
    const batch = allPaths.slice(i, i + 100);
    const { error: delErr } = await supabase.storage.from('assets').remove(batch);
    if (delErr) console.log('Delete error:', delErr.message);
    else deleted += batch.length;
  }
  console.log('Deleted', deleted, 'files from storage ✓');
}

run().catch(console.error);
