/**
 * delete-account — Palette
 *
 * Apple rejects apps that let you create an account but not delete one
 * (App Store review guideline 5.1.1(v)). Runs with the service role, which
 * the client never sees; the client only ever calls this function.
 *
 * The client is responsible for the confirmation UX (typing "DELETE") —
 * this function trusts that a caller with a valid JWT means it.
 */

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const auth = req.headers.get('Authorization');
    if (!auth) return json({ error: 'unauthorized' }, 401);

    // Verify the caller's identity using the anon key + their JWT, then
    // perform the deletion using the service role — never trust a
    // client-supplied user id.
    const supabaseAsCaller = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: { user } } = await supabaseAsCaller.auth.getUser();
    if (!user) return json({ error: 'unauthorized' }, 401);

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Best-effort: an avatar left behind is not worth failing the deletion.
    await supabaseAdmin.storage.from('avatars').remove([`${user.id}/avatar.jpg`]).catch(() => undefined);

    // Cascades logs, lists, list_items, curations, curation_items, follows,
    // reports, blocks, asks, ask_answers, notifications, user_path_progress,
    // user_badges, profiles — every foreign key in the schema references
    // auth.users(id) on delete cascade, so this one call is the whole erasure.
    const { error } = await supabaseAdmin.auth.admin.deleteUser(user.id);
    if (error) throw error;

    return new Response(null, { status: 204, headers: CORS });
  } catch (err) {
    console.error(err);
    return json({ error: 'delete_failed' }, 500);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}
