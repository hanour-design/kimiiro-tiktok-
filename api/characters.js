import { supabase } from './_lib/supabase.js';
import { handleCors } from './_lib/cors.js';

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  if (req.method === 'GET') {
    return handleGet(req, res);
  }
  if (req.method === 'POST') {
    return handlePost(req, res);
  }
  if (req.method === 'PUT') {
    return handlePut(req, res);
  }
  if (req.method === 'DELETE') {
    return handleDelete(req, res);
  }
  res.status(405).json({ error: 'Method not allowed' });
}

async function handleGet(req, res) {
  try {
    const { id, status } = req.query;

    if (id) {
      const { data, error } = await supabase
        .from('characters')
        .select('*')
        .eq('id', id)
        .single();
      if (error) return res.status(404).json({ error: 'Not found' });
      return res.json(data);
    }

    let query = supabase
      .from('characters')
      .select('*')
      .order('created_at');

    if (status && status !== 'all' && status !== '') {
      query = query.eq('status', status);
    }

    const { data: chars, error: charErr } = await query;
    if (charErr) throw charErr;

    const { data: records, error: recErr } = await supabase
      .from('follower_records')
      .select('*')
      .order('record_date', { ascending: false });
    if (recErr) throw recErr;

    const recordsByChar = {};
    for (const r of records) {
      if (!recordsByChar[r.character_id]) recordsByChar[r.character_id] = [];
      recordsByChar[r.character_id].push(r);
    }

    const result = chars.map(c => {
      const charRecords = recordsByChar[c.id] || [];
      const latest = charRecords[0];
      const prev = charRecords[1];
      const first = charRecords[charRecords.length - 1];

      const latestFollowers = latest ? latest.follower_count : 0;
      const prevFollowers = prev ? prev.follower_count : 0;
      const firstFollowers = first ? first.follower_count : 0;
      const change = latestFollowers - prevFollowers;
      const changeRate = prevFollowers > 0 ? ((change / prevFollowers) * 100).toFixed(1) : '0';

      return {
        ...c,
        latest_followers: latestFollowers,
        prev_followers: prevFollowers,
        first_followers: firstFollowers,
        latest_record_date: latest ? latest.record_date : '',
        change,
        change_rate: changeRate,
        total_gained: latestFollowers - firstFollowers,
      };
    }).sort((a, b) => b.latest_followers - a.latest_followers);

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function handlePost(req, res) {
  try {
    const data = req.body;
    if (!data.name || !data.tiktok_id) {
      return res.status(400).json({ error: 'キャラクター名とTikTokアカウントIDは必須です' });
    }
    if (!String(data.tiktok_id).startsWith('@')) {
      return res.status(400).json({ error: 'TikTokアカウントIDは@で始めてください' });
    }

    const { data: created, error } = await supabase
      .from('characters')
      .insert({
        name: data.name,
        tiktok_id: data.tiktok_id,
        tiktok_display_name: data.tiktok_display_name || '',
        purpose: data.purpose || 'メインアカウント',
        status: data.status || '運用中',
        start_date: data.start_date || null,
        note: data.note || '',
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({ error: 'このTikTokアカウントIDは既に登録されています' });
      }
      throw error;
    }

    res.json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function handlePut(req, res) {
  try {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'id is required' });

    const data = req.body;
    const update = {};
    if (data.name !== undefined) update.name = data.name;
    if (data.tiktok_id !== undefined) update.tiktok_id = data.tiktok_id;
    if (data.tiktok_display_name !== undefined) update.tiktok_display_name = data.tiktok_display_name;
    if (data.purpose !== undefined) update.purpose = data.purpose;
    if (data.status !== undefined) update.status = data.status;
    if (data.start_date !== undefined) update.start_date = data.start_date || null;
    if (data.note !== undefined) update.note = data.note;

    const { error } = await supabase
      .from('characters')
      .update(update)
      .eq('id', id);
    if (error) throw error;

    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function handleDelete(req, res) {
  try {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'id is required' });

    const { error } = await supabase
      .from('characters')
      .delete()
      .eq('id', id);
    if (error) throw error;

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
