/**
 * キミイロ TikTok成長ダッシュボード - Google Apps Script API
 *
 * スプレッドシートをデータベースとして使用し、
 * フロントエンド（GitHub Pages）からのリクエストを処理する。
 *
 * 【セットアップ手順】
 * 1. Google スプレッドシートを新規作成
 * 2. シート名を「Characters」と「Records」に変更（2シート必要）
 * 3. 拡張機能 > Apps Script を開く
 * 4. このコードを貼り付け
 * 5. デプロイ > 新しいデプロイ > ウェブアプリ
 *    - 実行ユーザー: 自分
 *    - アクセス: 全員
 * 6. デプロイURLをフロントエンドの設定に入力
 */

// ─── シート初期化 ───

function initSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  let charSheet = ss.getSheetByName('Characters');
  if (!charSheet) {
    charSheet = ss.insertSheet('Characters');
  }
  if (charSheet.getLastRow() === 0) {
    charSheet.appendRow([
      'id', 'name', 'tiktok_id', 'tiktok_display_name',
      'purpose', 'status', 'start_date', 'created_at', 'note'
    ]);
  }

  let recSheet = ss.getSheetByName('Records');
  if (!recSheet) {
    recSheet = ss.insertSheet('Records');
  }
  if (recSheet.getLastRow() === 0) {
    recSheet.appendRow([
      'id', 'character_id', 'record_date', 'follower_count', 'note', 'created_at'
    ]);
  }
}

// ─── ユーティリティ ───

function generateId() {
  return Utilities.getUuid();
}

function getSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(name);
}

function sheetToArray(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const headers = data[0];
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    return obj;
  });
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ─── GET リクエスト処理 ───

function doGet(e) {
  const action = e.parameter.action || 'stats';

  try {
    switch (action) {
      case 'dashboard':
        return jsonResponse(getDashboard(e.parameter.status));
      case 'characters':
        return jsonResponse(getCharacters(e.parameter.status));
      case 'character':
        return jsonResponse(getCharacter(e.parameter.id));
      case 'records':
        return jsonResponse(getRecords(e.parameter.character_id, e.parameter.limit));
      case 'stats':
        return jsonResponse(getStats());
      case 'rankings':
        return jsonResponse(getRankings(e.parameter.period));
      case 'export':
        return exportCsv();
      default:
        return jsonResponse({ error: 'Unknown action' });
    }
  } catch (err) {
    return jsonResponse({ error: err.message });
  }
}

// ─── POST リクエスト処理 ───

function doPost(e) {
  const body = JSON.parse(e.postData.contents);
  const action = body.action;

  try {
    switch (action) {
      case 'createCharacter':
        return jsonResponse(createCharacter(body.data));
      case 'updateCharacter':
        return jsonResponse(updateCharacter(body.id, body.data));
      case 'deleteCharacter':
        return jsonResponse(deleteCharacter(body.id));
      case 'createRecord':
        return jsonResponse(createRecord(body.data));
      case 'seed':
        return jsonResponse(seedData());
      default:
        return jsonResponse({ error: 'Unknown action' });
    }
  } catch (err) {
    return jsonResponse({ error: err.message });
  }
}

// ─── Dashboard (stats + characters を1回のシート読み込みで返す) ───

function getDashboard() {
  const chars = sheetToArray(getSheet('Characters'));
  const records = sheetToArray(getSheet('Records'));

  // Build record lookup by character_id (1回だけ走査)
  const recordsByChar = {};
  records.forEach(r => {
    if (!recordsByChar[r.character_id]) recordsByChar[r.character_id] = [];
    recordsByChar[r.character_id].push(r);
  });
  // Sort each group once
  for (const key in recordsByChar) {
    recordsByChar[key].sort((a, b) => String(b.record_date).localeCompare(String(a.record_date)));
  }

  let totalFollowers = 0;
  let weeklyGain = 0;
  const activeAccounts = chars.filter(c => c.status === '運用中').length;

  const characters = chars.map(c => {
    const charRecords = recordsByChar[c.id] || [];
    const latest = charRecords[0];
    const prev = charRecords[1];
    const first = charRecords[charRecords.length - 1];

    const latestFollowers = latest ? Number(latest.follower_count) : 0;
    const prevFollowers = prev ? Number(prev.follower_count) : 0;
    const firstFollowers = first ? Number(first.follower_count) : 0;
    const change = latestFollowers - prevFollowers;
    const changeRate = prevFollowers > 0 ? ((change / prevFollowers) * 100).toFixed(1) : '0';

    totalFollowers += latestFollowers;
    if (latest && prev) weeklyGain += change;

    return {
      ...c,
      latest_followers: latestFollowers,
      prev_followers: prevFollowers,
      first_followers: firstFollowers,
      latest_record_date: latest ? latest.record_date : '',
      change: change,
      change_rate: changeRate,
      total_gained: latestFollowers - firstFollowers,
    };
  }).sort((a, b) => b.latest_followers - a.latest_followers);

  return {
    stats: {
      totalAccounts: chars.length,
      activeAccounts: activeAccounts,
      totalFollowers: totalFollowers,
      weeklyGain: weeklyGain,
    },
    characters: characters,
  };
}

// ─── Characters ───

function getCharacters(statusFilter) {
  const chars = sheetToArray(getSheet('Characters'));
  const records = sheetToArray(getSheet('Records'));

  let filtered = chars;
  if (statusFilter && statusFilter !== 'all') {
    filtered = chars.filter(c => c.status === statusFilter);
  }

  return filtered.map(c => {
    const charRecords = records
      .filter(r => r.character_id === c.id)
      .sort((a, b) => String(b.record_date).localeCompare(String(a.record_date)));

    const latest = charRecords[0];
    const prev = charRecords[1];
    const first = charRecords[charRecords.length - 1];

    const latestFollowers = latest ? Number(latest.follower_count) : 0;
    const prevFollowers = prev ? Number(prev.follower_count) : 0;
    const firstFollowers = first ? Number(first.follower_count) : 0;
    const change = latestFollowers - prevFollowers;
    const changeRate = prevFollowers > 0
      ? ((change / prevFollowers) * 100).toFixed(1)
      : '0';

    return {
      ...c,
      latest_followers: latestFollowers,
      prev_followers: prevFollowers,
      first_followers: firstFollowers,
      latest_record_date: latest ? latest.record_date : '',
      change: change,
      change_rate: changeRate,
      total_gained: latestFollowers - firstFollowers,
    };
  }).sort((a, b) => b.latest_followers - a.latest_followers);
}

function getCharacter(id) {
  const chars = sheetToArray(getSheet('Characters'));
  return chars.find(c => c.id === id) || { error: 'Not found' };
}

function createCharacter(data) {
  if (!data.name || !data.tiktok_id) {
    throw new Error('キャラクター名とTikTokアカウントIDは必須です');
  }
  if (!String(data.tiktok_id).startsWith('@')) {
    throw new Error('TikTokアカウントIDは@で始めてください');
  }

  const chars = sheetToArray(getSheet('Characters'));
  if (chars.some(c => c.tiktok_id === data.tiktok_id)) {
    throw new Error('このTikTokアカウントIDは既に登録されています');
  }

  const id = generateId();
  const now = new Date().toISOString();
  const sheet = getSheet('Characters');
  sheet.appendRow([
    id,
    data.name,
    data.tiktok_id,
    data.tiktok_display_name || '',
    data.purpose || 'メインアカウント',
    data.status || '運用中',
    data.start_date || '',
    now,
    data.note || ''
  ]);

  return { id, name: data.name, tiktok_id: data.tiktok_id, status: data.status || '運用中' };
}

function updateCharacter(id, data) {
  const sheet = getSheet('Characters');
  const allData = sheet.getDataRange().getValues();
  const headers = allData[0];
  const idCol = headers.indexOf('id');

  for (let i = 1; i < allData.length; i++) {
    if (allData[i][idCol] === id) {
      const row = i + 1;
      if (data.name) sheet.getRange(row, headers.indexOf('name') + 1).setValue(data.name);
      if (data.tiktok_id) sheet.getRange(row, headers.indexOf('tiktok_id') + 1).setValue(data.tiktok_id);
      if (data.tiktok_display_name !== undefined) sheet.getRange(row, headers.indexOf('tiktok_display_name') + 1).setValue(data.tiktok_display_name);
      if (data.purpose) sheet.getRange(row, headers.indexOf('purpose') + 1).setValue(data.purpose);
      if (data.status) sheet.getRange(row, headers.indexOf('status') + 1).setValue(data.status);
      if (data.start_date) sheet.getRange(row, headers.indexOf('start_date') + 1).setValue(data.start_date);
      if (data.note !== undefined) sheet.getRange(row, headers.indexOf('note') + 1).setValue(data.note);
      return { success: true, id };
    }
  }
  throw new Error('Character not found');
}

function deleteCharacter(id) {
  const sheet = getSheet('Characters');
  const allData = sheet.getDataRange().getValues();
  const idCol = allData[0].indexOf('id');

  for (let i = allData.length - 1; i >= 1; i--) {
    if (allData[i][idCol] === id) {
      sheet.deleteRow(i + 1);
      break;
    }
  }

  // Delete related records
  const recSheet = getSheet('Records');
  const recData = recSheet.getDataRange().getValues();
  const charIdCol = recData[0].indexOf('character_id');
  for (let i = recData.length - 1; i >= 1; i--) {
    if (recData[i][charIdCol] === id) {
      recSheet.deleteRow(i + 1);
    }
  }

  return { success: true };
}

// ─── Records ───

function getRecords(characterId, limit) {
  const records = sheetToArray(getSheet('Records'))
    .filter(r => r.character_id === characterId)
    .sort((a, b) => String(b.record_date).localeCompare(String(a.record_date)));

  const result = (limit ? records.slice(0, Number(limit)) : records).map((r, i, arr) => {
    const prev = arr[i + 1];
    const fc = Number(r.follower_count);
    const pfc = prev ? Number(prev.follower_count) : 0;
    const change = prev ? fc - pfc : 0;
    const changeRate = pfc > 0 ? ((change / pfc) * 100).toFixed(1) : '0';
    return {
      ...r,
      follower_count: fc,
      change,
      change_rate: changeRate,
    };
  });

  return result;
}

function createRecord(data) {
  if (!data.character_id || !data.record_date || data.follower_count === undefined) {
    throw new Error('character_id, record_date, follower_count は必須です');
  }

  const count = Number(data.follower_count);
  if (isNaN(count) || count < 0) {
    throw new Error('フォロワー数は0以上の整数を入力してください');
  }

  const sheet = getSheet('Records');
  const allRecords = sheetToArray(sheet);

  // Check for duplicate (same character + same date) → update
  const allData = sheet.getDataRange().getValues();
  const headers = allData[0];
  const charIdCol = headers.indexOf('character_id');
  const dateCol = headers.indexOf('record_date');
  const countCol = headers.indexOf('follower_count');
  const noteCol = headers.indexOf('note');

  for (let i = 1; i < allData.length; i++) {
    if (allData[i][charIdCol] === data.character_id &&
        String(allData[i][dateCol]) === String(data.record_date)) {
      sheet.getRange(i + 1, countCol + 1).setValue(count);
      sheet.getRange(i + 1, noteCol + 1).setValue(data.note || '');
      return { success: true, updated: true };
    }
  }

  const id = generateId();
  const now = new Date().toISOString();
  sheet.appendRow([id, data.character_id, data.record_date, count, data.note || '', now]);
  return { success: true, id };
}

// ─── Stats ───

function getStats() {
  const chars = sheetToArray(getSheet('Characters'));
  const records = sheetToArray(getSheet('Records'));

  const totalAccounts = chars.length;
  const activeAccounts = chars.filter(c => c.status === '運用中').length;

  let totalFollowers = 0;
  let weeklyGain = 0;

  chars.forEach(c => {
    const charRecords = records
      .filter(r => r.character_id === c.id)
      .sort((a, b) => String(b.record_date).localeCompare(String(a.record_date)));

    const latest = charRecords[0];
    const prev = charRecords[1];
    totalFollowers += latest ? Number(latest.follower_count) : 0;
    if (latest && prev) {
      weeklyGain += Number(latest.follower_count) - Number(prev.follower_count);
    }
  });

  return { totalAccounts, activeAccounts, totalFollowers, weeklyGain };
}

// ─── Rankings ───

function getRankings(period) {
  const chars = sheetToArray(getSheet('Characters'));
  const records = sheetToArray(getSheet('Records'));

  const rankings = chars.map(c => {
    const charRecords = records
      .filter(r => r.character_id === c.id)
      .sort((a, b) => String(b.record_date).localeCompare(String(a.record_date)));

    if (charRecords.length < 2) {
      return { ...c, gain: 0, gain_rate: 0 };
    }

    const latest = charRecords[0];
    let startRecord;

    if (period === 'week') {
      startRecord = charRecords[1];
    } else if (period === 'month') {
      startRecord = charRecords[4] || charRecords[charRecords.length - 1];
    } else {
      startRecord = charRecords[charRecords.length - 1];
    }

    const gain = Number(latest.follower_count) - Number(startRecord.follower_count);
    const gainRate = Number(startRecord.follower_count) > 0
      ? ((gain / Number(startRecord.follower_count)) * 100).toFixed(1)
      : 0;

    return { ...c, gain, gain_rate: parseFloat(gainRate) };
  });

  rankings.sort((a, b) => b.gain - a.gain);
  return rankings;
}

// ─── CSV Export ───

function exportCsv() {
  const chars = sheetToArray(getSheet('Characters'));
  const records = sheetToArray(getSheet('Records'))
    .sort((a, b) => String(b.record_date).localeCompare(String(a.record_date)));

  let csv = 'キャラクター名,TikTokID,記録日,フォロワー数,メモ\n';
  records.forEach(r => {
    const char = chars.find(c => c.id === r.character_id);
    if (char) {
      csv += `${char.name},${char.tiktok_id},${r.record_date},${r.follower_count},${r.note}\n`;
    }
  });

  return ContentService
    .createTextOutput('\uFEFF' + csv)
    .setMimeType(ContentService.MimeType.CSV)
    .downloadAs('kimiiro-tiktok-data.csv');
}

// ─── サンプルデータ投入 ───

function seedData() {
  initSheets();
  const chars = sheetToArray(getSheet('Characters'));
  if (chars.length > 0) {
    return { message: 'データは既に存在します' };
  }

  const charSheet = getSheet('Characters');
  const recSheet = getSheet('Records');

  const characters = [
    { id: generateId(), name: 'とりぴー', tiktok_id: '@toripii_official', tiktok_display_name: 'とりぴー【公式】', purpose: 'メインアカウント', status: '運用中', start_date: '2024-11-01', note: 'メインIP' },
    { id: generateId(), name: '爆モテゴリラ', tiktok_id: '@bakumote_gorilla', tiktok_display_name: '爆モテゴリラ', purpose: 'メインアカウント', status: '運用中', start_date: '2024-12-01', note: 'セカンドIP' },
    { id: generateId(), name: 'とりぴーサブ', tiktok_id: '@toripii_sub', tiktok_display_name: 'とりぴーサブ', purpose: 'サブアカウント', status: '運用中', start_date: '2025-02-01', note: 'サブアカウント' },
    { id: generateId(), name: 'キミイロちゃん', tiktok_id: '@kimiiro_chan', tiktok_display_name: 'キミイロちゃん', purpose: 'メインアカウント', status: '準備中', start_date: '2026-01-15', note: '新規キャラクター' },
    { id: generateId(), name: 'モフモフ先生', tiktok_id: '@mofumofu_sensei', tiktok_display_name: 'モフモフ先生', purpose: 'メインアカウント', status: '運用中', start_date: '2025-04-01', note: '教育系コンテンツ' },
  ];

  characters.forEach(c => {
    charSheet.appendRow([c.id, c.name, c.tiktok_id, c.tiktok_display_name, c.purpose, c.status, c.start_date, new Date().toISOString(), c.note]);
  });

  function addWeeklyData(charId, startDate, startFollowers, minGrowth, maxGrowth, weeks) {
    let followers = startFollowers;
    const start = new Date(startDate);
    for (let w = 0; w <= weeks; w++) {
      const d = new Date(start);
      d.setDate(d.getDate() + w * 7);
      const dateStr = Utilities.formatDate(d, 'Asia/Tokyo', 'yyyy-MM-dd');
      recSheet.appendRow([generateId(), charId, dateStr, followers, '', new Date().toISOString()]);
      followers += Math.floor(Math.random() * (maxGrowth - minGrowth) + minGrowth);
    }
  }

  addWeeklyData(characters[0].id, '2024-11-01', 0, 500, 900, 70);
  addWeeklyData(characters[1].id, '2024-12-01', 0, 450, 800, 65);
  addWeeklyData(characters[2].id, '2025-02-01', 0, 150, 350, 56);
  addWeeklyData(characters[4].id, '2025-04-01', 0, 100, 250, 48);

  return { message: 'サンプルデータを投入しました' };
}
