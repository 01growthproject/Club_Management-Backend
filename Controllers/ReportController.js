// Controllers/ReportController.js
// ✅ UPDATED: Supports new paxCounts format

import Entry from "../Models/Entry.model.js";

// ─── Helper: Date Range ───────────────────────────────────────
const getDateRange = (dateStr) => {
  const start = new Date(dateStr);
  start.setHours(0, 0, 0, 0);
  const end = new Date(dateStr);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

// ─── Helper: Build Summary ────────────────────────────────────
const buildSummary = (entries) => {
  let cash = 0,
    upi = 0,
    card = 0,
    totalAmount = 0;
  let withCover = 0,
    withoutCover = 0;
  let normal = 0,
    vip = 0,
    vvip = 0;

  // ✅ NEW: Track all 4 pax types separately
  let totalPax = 0;
  let totalStagMale = 0;
  let totalStagFemale = 0;
  let totalCouple = 0;

  entries.forEach((e) => {
    // ── Payment ──
    cash += e.cashAmount || 0;
    upi += e.upiAmount || 0;
    card += e.cardAmount || 0;
    totalAmount += e.totalAmount || 0;

    // ── Covers ──
    withCover += e.withCover || 0;
    withoutCover += e.withoutCover || 0;

    // ── Category ──
    const cat = (e.category || "").toLowerCase();
    if (cat === "normal") normal++;
    if (cat === "vip") vip++;
    if (cat === "vvip") vvip++;

    // ✅ NEW: Pax Calculation (supports both old and new format)
    if (e.paxCounts && typeof e.paxCounts === "object") {
      // New format: paxCounts object
      totalPax += e.paxCounts.Pax || e.paxCounts.pax || 0;
      totalStagMale += e.paxCounts["Stag Male"] || 0;
      totalStagFemale += e.paxCounts["Stag Female"] || 0;
      totalCouple += e.paxCounts.Couple || e.paxCounts.couple || 0;
    } else if (e.pax && e.paxCount) {
      // Old format: pax + paxCount (backward compatibility)
      const p = (e.pax || "").toLowerCase();
      const count = e.paxCount || 1;

      if (p === "pax") totalPax += count;
      if (p === "stag male") totalStagMale += count;
      if (p === "stag female") totalStagFemale += count;
      if (p === "couple") totalCouple += count;
    }
  });

  // ✅ Calculate total people (Couple × 2)
  const totalPeople =
    totalPax + totalStagMale + totalStagFemale + totalCouple * 2;

  return {
    entryCount: entries.length,
    payments: {
      cash,
      upi,
      card,
      grandTotal: totalAmount,
    },
    covers: {
      withCover,
      withoutCover,
    },
    categories: {
      normal,
      vip,
      vvip,
    },
    pax: {
      totalPeople: totalPeople, // ✅ Total individuals
      pax: totalPax, // ✅ Pax count
      stagMale: totalStagMale, // ✅ Male count
      stagFemale: totalStagFemale, // ✅ Female count
      couple: totalCouple, // ✅ Couple count (not × 2)
    },
  };
};

// ─── GET /api/reports/daily?date=2024-03-10 ──────────────────
const getDailyReport = async (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: "Date is required. Format: YYYY-MM-DD",
      });
    }

    const { start, end } = getDateRange(date);

    const entries = await Entry.find({
      createdAt: { $gte: start, $lte: end },
    }).lean();

    console.log(`📊 Daily Report: ${date}`);
    console.log(`📝 Found ${entries.length} entries`);

    const summary = buildSummary(entries);

    console.log("👥 Pax Summary:", summary.pax);
    console.log("💰 Payment Summary:", summary.payments);

    res.status(200).json({
      success: true,
      date,
      data: summary,
    });
  } catch (error) {
    console.error("❌ Daily Report Error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// ─── GET /api/reports/monthly?year=2024&month=3 ──────────────
const getMonthlyReport = async (req, res) => {
  try {
    const { year, month } = req.query;

    if (!year || !month) {
      return res.status(400).json({
        success: false,
        message: "Year and month are required",
      });
    }

    const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const end = new Date(year, month, 0, 23, 59, 59, 999);

    const entries = await Entry.find({
      createdAt: { $gte: start, $lte: end },
    }).lean();

    console.log(`📊 Monthly Report: ${month}/${year}`);
    console.log(`📝 Found ${entries.length} entries`);

    // Daily breakdown
    const dailyMap = {};
    entries.forEach((e) => {
      const day = new Date(e.createdAt).toISOString().split("T")[0];
      if (!dailyMap[day]) dailyMap[day] = [];
      dailyMap[day].push(e);
    });

    const dailyBreakdown = Object.entries(dailyMap)
      .sort(([a], [b]) => new Date(a) - new Date(b))
      .map(([date, dayEntries]) => ({
        date,
        ...buildSummary(dayEntries),
      }));

    const monthlySummary = buildSummary(entries);

    console.log("👥 Monthly Pax Summary:", monthlySummary.pax);

    res.status(200).json({
      success: true,
      year: Number(year),
      month: Number(month),
      data: {
        summary: monthlySummary,
        dailyBreakdown,
      },
    });
  } catch (error) {
    console.error("❌ Monthly Report Error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// ─── GET /api/reports/payment-summary ────────────────────────
// Owner dashboard — aaj ka quick summary
const getPaymentSummary = async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const { start, end } = getDateRange(today);

    const entries = await Entry.find({
      createdAt: { $gte: start, $lte: end },
    }).lean();

    const summary = buildSummary(entries);

    console.log("📊 Payment Summary (Today):", summary);

    res.status(200).json({
      success: true,
      date: today,
      data: summary,
    });
  } catch (error) {
    console.error("❌ Payment Summary Error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// ─── GET /api/reports/date-range?from=2024-03-01&to=2024-03-31
const getDateRangeReport = async (req, res) => {
  try {
    const { from, to } = req.query;

    if (!from || !to) {
      return res.status(400).json({
        success: false,
        message: "from and to dates are required. Format: YYYY-MM-DD",
      });
    }

    const start = new Date(from);
    start.setHours(0, 0, 0, 0);
    const end = new Date(to);
    end.setHours(23, 59, 59, 999);

    const entries = await Entry.find({
      createdAt: { $gte: start, $lte: end },
    }).lean();

    const summary = buildSummary(entries);

    res.status(200).json({
      success: true,
      from,
      to,
      data: summary,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

export {
  getDailyReport,
  getMonthlyReport,
  getPaymentSummary,
  getDateRangeReport,
};
