// supabase.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://yucrvisojkokunfaoiln.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_q9Xkj9pT4-mpSK-JrX0G_w_Mxygd0ti';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
console.log('✅ Supabase инициализирован');