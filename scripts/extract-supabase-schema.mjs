// Extract Supabase DB schema
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ernwvzifnfjpkpazfumb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVybnd2emlmbmZqcGtwYXpmdW1iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODUyMTU4MCwiZXhwIjoyMDk0MDk3NTgwfQ.9cptLm6LzK6TVy5fRNJ75QkqMsoc0IWxb0MnKy39shM'
);

async function main() {
  // Get all user tables from information_schema
  const { data: tables, error: tableError } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `
  });

  if (tableError) {
    console.log('RPC exec_sql not available, trying direct approach...');
    // Fallback: try querying each known table
    return await fallbackExtract();
  }

  const tableNames = tables.map(t => t.table_name);
  console.log(`Found ${tableNames.length} tables:\n`);

  for (const tableName of tableNames) {
    const { data: columns, error: colError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = '${tableName}'
        ORDER BY ordinal_position;
      `
    });

    if (colError) {
      console.log(`  ERROR getting columns for ${tableName}: ${colError.message}`);
      continue;
    }

    console.log(`\n${tableName}:`);
    const colDefs = columns.map(c => {
      const nullable = c.is_nullable === 'YES' ? '' : ' NOT NULL';
      const def = c.column_default ? ` DEFAULT ${c.column_default}` : '';
      return `    ${c.column_name}: ${c.data_type}${nullable}${def}`;
    });
    colDefs.forEach(c => console.log(c));

    // Also get sample data
    const { data: sample } = await supabase.from(tableName).select('*').limit(1);
    if (sample && sample.length > 0) {
      const vals = Object.values(sample[0]).map(v => 
        v === null ? 'null' : 
        typeof v === 'string' ? `'${v.substring(0, 30)}'` : 
        v
      );
      console.log(`  → Sample: ${Object.keys(sample[0]).join(', ')}`);
    } else {
      console.log(`  → (empty)`);
    }
  }
}

async function fallbackExtract() {
  const tables = [
    'usuarios', 'areas', 'areacolaboradores', 'clientes', 'servicios',
    'serviciocolaboradores', 'tareas', 'tiempo_tracking',
    'tarea_notas', 'tareacomentarios',
    'servicio_comentarios', 'serviciocomentarios',
    'calificaciones', 'auditoria', 'anuncios', 'solicitudes_internas',
    'plantillas', 'plantilla_tareas',
    'serviciohistorial', 'servicio_accesorios',
    'accesos_cliente', 'evaluacionesdesempeno', 'instrucciones',
    'comunicaciones', 'notificaciones'
  ];

  for (const t of tables) {
    try {
      const { data, error } = await supabase.from(t).select('*').limit(1);
      if (error) {
        console.log(`\n${t}: ERROR - ${error.message}`);
        continue;
      }
      if (data && data.length > 0) {
        console.log(`\n${t}:`);
        Object.keys(data[0]).forEach(k => {
          const v = data[0][k];
          const type = v === null ? '?' : typeof v;
          console.log(`    ${k}: ${type}`);
        });
      } else {
        console.log(`\n${t}: (empty, no columns)`);
      }
    } catch(e) {
      console.log(`\n${t}: ERROR - ${e.message}`);
    }
  }
}

main().catch(console.error);
