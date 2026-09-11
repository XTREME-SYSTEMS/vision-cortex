import { createClientFromRequest, requireAdminOrWebhook, secrets } from '../../runtime/index';

// ============================================================================
// PROCESS PAYROLL — Calculates performance-based earnings from TimeClockEntry
// data and logs the final figures to Google Sheets.
//
// Performance-based earnings:
//   Base Pay (from task registry)
//   + Speed Bonus (20% if completed faster than estimated)
//   + Priority Bonus (15% for critical/high priority tasks)
//   + Quality Bonus (25% for agents with 10+ completed tasks)
//   = Total Earnings
// ============================================================================

const SHEETS_API = 'https://sheets.googleapis.com/v4';
const PAYROLL_SHEET_NAME = 'Vision Cortex Payroll';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);

    // Auth: admin user OR workflow/cron context
    const authorizationError = await requireAdminOrWebhook(req);
    if (authorizationError) return authorizationError;

    const body = await req.json().catch(() => ({}));
    const action = body.action || 'process';
    const sr = base44.asServiceRole.entities;

    // ─── PROCESS: Calculate earnings and log to Google Sheets ───
    if (action === 'process') {
      const pending = await sr.TimeClockEntry.filter({ payment_status: 'pending' }, '-created_date', 100).catch(() => []);
      const unpaid = await sr.TimeClockEntry.filter({ payment_status: 'unpaid' }, '-created_date', 100).catch(() => []);
      const allPending = [...pending, ...unpaid].filter(e => e.status === 'completed');

      if (allPending.length === 0) {
        return Response.json({ ok: true, action: 'process', processed: 0, message: 'No pending payments to process.' });
      }

      // Get agent profiles for quality bonus calculation
      const agents = await sr.AgentProfile.list('-order', 100).catch(() => []);
      const agentMap = {};
      for (const a of agents) agentMap[a.name] = a;

      // Get task registry for priority/estimated duration
      const taskRegs = await sr.SystemTaskRegistry.list('-created_date', 200).catch(() => []);
      const regMap = {};
      for (const r of taskRegs) regMap[r.task_type] = r;

      // Get Google Sheets connection
      let sheetsConn;
      try {
        sheetsConn = await base44.asServiceRole.connectors.getConnection('googlesheets');
      } catch {
        return Response.json({ error: 'Google Sheets not connected' }, { status: 400 });
      }

      // Find or create the payroll spreadsheet
      const spreadsheetId = await findOrCreateSpreadsheet(base44, sheetsConn.accessToken);

      // Calculate earnings for each entry
      const payrollRecords = [];
      const sheetRows = [];
      const now = new Date().toISOString();

      for (const entry of allPending) {
        const basePay = entry.payment_amount || 0;
        const agent = agentMap[entry.agent_name];
        const taskReg = regMap[entry.task_type];

        let speedBonus = 0;
        let priorityBonus = 0;
        let qualityBonus = 0;

        // Speed bonus: completed faster than estimated
        if (taskReg?.estimated_duration_minutes && entry.duration_minutes) {
          if (entry.duration_minutes < taskReg.estimated_duration_minutes) {
            speedBonus = Math.round(basePay * 0.2 * 100) / 100;
          }
        }

        // Priority bonus: critical or high priority tasks
        if (taskReg?.priority === 'critical' || taskReg?.priority === 'high') {
          priorityBonus = Math.round(basePay * 0.15 * 100) / 100;
        }

        // Quality bonus: experienced agents (10+ completed tasks)
        if (agent && (agent.tasks_completed || 0) > 10) {
          qualityBonus = Math.round(basePay * 0.25 * 100) / 100;
        }

        const totalEarnings = Math.round((basePay + speedBonus + priorityBonus + qualityBonus) * 100) / 100;

        payrollRecords.push({
          entry_id: entry.id,
          agent_name: entry.agent_name,
          task_type: entry.task_type,
          duration_minutes: entry.duration_minutes || 0,
          base_pay: basePay,
          speed_bonus: speedBonus,
          priority_bonus: priorityBonus,
          quality_bonus: qualityBonus,
          total_earnings: totalEarnings
        });

        sheetRows.push([
          now, entry.agent_name, entry.agent_codename || '', entry.task_type,
          entry.duration_minutes || 0, basePay, speedBonus, priorityBonus, qualityBonus,
          totalEarnings, 'paid'
        ]);
      }

      // Append to Google Sheets
      if (sheetRows.length > 0 && spreadsheetId) {
        await appendToSheet(sheetsConn.accessToken, spreadsheetId, 'Payroll!A:K', sheetRows);
      }

      // Mark entries as paid, create AgentPayment records, update agent balances
      let totalPaid = 0;
      for (const record of payrollRecords) {
        await sr.TimeClockEntry.update(record.entry_id, { payment_status: 'paid' });
        totalPaid += record.total_earnings;

        try {
          await sr.AgentPayment.create({
            agent_name: record.agent_name,
            amount: record.total_earnings,
            currency: 'INF',
            payment_type: 'task_completion',
            task_type: record.task_type,
            timeclock_entry_id: record.entry_id,
            status: 'paid',
            paid_at: now,
            description: `Base: ${record.base_pay} + Speed: ${record.speed_bonus} + Priority: ${record.priority_bonus} + Quality: ${record.quality_bonus}`
          });
        } catch (e) {}

        const agent = agentMap[record.agent_name];
        if (agent) {
          try {
            await sr.AgentProfile.update(agent.id, {
              inf_balance: (agent.inf_balance || 0) + record.total_earnings,
              inf_earned_total: (agent.inf_earned_total || 0) + record.total_earnings,
            });
          } catch (e) {}
        }
      }

      return Response.json({
        ok: true,
        action: 'process',
        entries_processed: payrollRecords.length,
        total_inf_paid: Math.round(totalPaid * 100) / 100,
        spreadsheet_id: spreadsheetId,
        payroll: payrollRecords
      });
    }

    // ─── STATUS: Get payroll summary ───
    if (action === 'status') {
      const completed = await sr.TimeClockEntry.filter({ status: 'completed' }, '-created_date', 200).catch(() => []);
      const paid = completed.filter(c => c.payment_status === 'paid');
      const pendingPay = completed.filter(c => c.payment_status === 'pending' || c.payment_status === 'unpaid');

      return Response.json({
        ok: true,
        action: 'status',
        total_entries: completed.length,
        paid_entries: paid.length,
        pending_entries: pendingPay.length,
        total_paid: paid.reduce((s, c) => s + (c.payment_amount || 0), 0),
        total_pending: pendingPay.reduce((s, c) => s + (c.payment_amount || 0), 0)
      });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// ─── HELPER: Find or create the payroll spreadsheet ───
async function findOrCreateSpreadsheet(base44, sheetsToken) {
  // Try to find existing spreadsheet via Google Drive
  try {
    const driveConn = await base44.asServiceRole.connectors.getConnection('googledrive');
    const driveRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(`name='${PAYROLL_SHEET_NAME}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`)}&fields=files(id,name)`,
      { headers: { 'Authorization': `Bearer ${driveConn.accessToken}` } }
    );
    if (driveRes.ok) {
      const driveData = await driveRes.json();
      if (driveData.files?.length > 0) return driveData.files[0].id;
    }
  } catch (e) {}

  // Create new spreadsheet with headers
  const createRes = await fetch(`${SHEETS_API}/spreadsheets`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${sheetsToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      properties: { title: PAYROLL_SHEET_NAME },
      sheets: [{ properties: { title: 'Payroll' } }]
    })
  });
  if (!createRes.ok) return null;
  const data = await createRes.json();
  const spreadsheetId = data.spreadsheetId;

  // Add headers
  await appendToSheet(sheetsToken, spreadsheetId, 'Payroll!A1:K1', [[
    'Date', 'Agent', 'Codename', 'Task Type', 'Duration (min)',
    'Base Pay', 'Speed Bonus', 'Priority Bonus', 'Quality Bonus', 'Total Earnings', 'Status'
  ]]);

  return spreadsheetId;
}

// ─── HELPER: Append rows to a sheet ───
async function appendToSheet(accessToken, spreadsheetId, range, rows) {
  await fetch(`${SHEETS_API}/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=RAW`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ values: rows })
  });
}