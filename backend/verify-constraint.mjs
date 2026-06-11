import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Try inserting a duplicate name should fail if constraint exists
const { error } = await supabase
  .from('areas')
  .insert({ area_nombre: 'Soporte Técnico' })
  .select();

if (error && (error.message?.includes('unique') || error.code === '23505')) {
  console.log('✅ UNIQUE constraint activo — duplicado rechazado');
} else if (error) {
  console.log('❌ Error inesperado:', error.message);
} else {
  console.log('⚠️  El insert funcionó — NO hay UNIQUE constraint');
  // Delete the test row
  await supabase.from('areas').delete().eq('area_nombre', 'Soporte Técnico').not('area_id', 'eq', 1);
}

process.exit(0);
