import ExcelJS from "exceljs";

function formatPaxCell(entry) {
  if (entry.paxCounts && typeof entry.paxCounts === "object") {
    const o = entry.paxCounts;
    return `Pax:${o.Pax ?? o.pax ?? 0} SM:${o["Stag Male"] ?? 0} SF:${o["Stag Female"] ?? 0} C:${o.Couple ?? o.couple ?? 0}`;
  }
  if (entry.pax) return `${entry.pax} ×${entry.paxCount ?? 1}`;
  return "";
}

function formatDateTime(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

function formatDateOnly(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * @param {object} opts
 * @param {string} opts.reportTitle
 * @param {string} opts.periodLabel
 * @param {object} opts.summary - from buildSummary
 * @param {object[]} opts.entries
 * @param {object[]|null} opts.dailyBreakdown - array of { date, entryCount, payments: { grandTotal, cash, upi, card }, pax: { totalPeople } }
 */
export async function buildReportWorkbook({
  reportTitle,
  periodLabel,
  summary,
  entries,
  dailyBreakdown,
}) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Jaguar Club";
  wb.created = new Date();

  const sum = wb.addWorksheet("Summary", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  sum.columns = [{ width: 28 }, { width: 22 }];

  sum.addRow([reportTitle]).font = { bold: true, size: 14 };
  sum.addRow([`Period: ${periodLabel}`]).font = { bold: true };
  sum.addRow([]);

  const pairs = [
    ["Total entries", summary.entryCount ?? 0],
    ["Total revenue (₹)", summary.payments?.grandTotal ?? 0],
    ["Cash (₹)", summary.payments?.cash ?? 0],
    ["UPI (₹)", summary.payments?.upi ?? 0],
    ["Card (₹)", summary.payments?.card ?? 0],
    ["Guests (headcount)", summary.pax?.totalPeople ?? 0],
    ["Pax count", summary.pax?.pax ?? 0],
    ["Stag male", summary.pax?.stagMale ?? 0],
    ["Stag female", summary.pax?.stagFemale ?? 0],
    ["Couple (pairs)", summary.pax?.couple ?? 0],
    ["With cover", summary.covers?.withCover ?? 0],
    ["Without cover", summary.covers?.withoutCover ?? 0],
    ["Category — Normal", summary.categories?.normal ?? 0],
    ["Category — VIP", summary.categories?.vip ?? 0],
    ["Category — VVIP", summary.categories?.vvip ?? 0],
  ];

  const header = sum.addRow(["Metric", "Value"]);
  header.font = { bold: true };
  header.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1A1A2E" },
  };
  header.getCell(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.getCell(2).font = { bold: true, color: { argb: "FFFFFFFF" } };

  pairs.forEach(([k, v]) => sum.addRow([k, v]));

  if (dailyBreakdown?.length) {
    const daySheet = wb.addWorksheet("Daily breakdown", {
      views: [{ state: "frozen", ySplit: 1 }],
    });
    const dh = daySheet.addRow([
      "Date",
      "Entries",
      "Revenue ₹",
      "Guests",
      "Cash ₹",
      "UPI ₹",
      "Card ₹",
    ]);
    dh.font = { bold: true };
    dh.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1A1A2E" },
    };
    dh.eachCell((c) => {
      c.font = { bold: true, color: { argb: "FFFFFFFF" } };
    });
    dailyBreakdown.forEach((row) => {
      daySheet.addRow([
        row.date,
        row.entryCount ?? 0,
        row.payments?.grandTotal ?? 0,
        row.pax?.totalPeople ?? 0,
        row.payments?.cash ?? 0,
        row.payments?.upi ?? 0,
        row.payments?.card ?? 0,
      ]);
    });
    daySheet.columns = [
      { width: 14 },
      { width: 10 },
      { width: 14 },
      { width: 10 },
      { width: 12 },
      { width: 12 },
      { width: 12 },
    ];
  }

  const ent = wb.addWorksheet("Entries", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  const entHeaders = [
    "Sr No",
    "Created",
    "Name",
    "Surname",
    "Contact",
    "Email",
    "DOB",
    "Entry time",
    "Category",
    "Cash ₹",
    "UPI ₹",
    "Card ₹",
    "Total ₹",
    "Pax breakdown",
    "With cover",
    "Without cover",
    "Ref by",
    "Table",
    "Remarks",
  ];

  const er = ent.addRow(entHeaders);
  er.font = { bold: true };
  er.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1A1A2E" },
  };
  er.eachCell((c) => {
    c.font = { bold: true, color: { argb: "FFFFFFFF" } };
  });

  const sorted = [...entries].sort((a, b) => (a.srNo ?? 0) - (b.srNo ?? 0));

  sorted.forEach((e) => {
    ent.addRow([
      e.srNo ?? "",
      formatDateTime(e.createdAt),
      e.name ?? "",
      e.surname ?? "",
      e.contactNo ?? "",
      e.email ?? "",
      e.dob ?? "",
      e.entryTime ?? "",
      e.category ?? "",
      e.cashAmount ?? 0,
      e.upiAmount ?? 0,
      e.cardAmount ?? 0,
      e.totalAmount ?? 0,
      formatPaxCell(e),
      e.withCover ?? 0,
      e.withoutCover ?? 0,
      e.reffBy ?? "",
      e.tableNo ?? "",
      e.remarks ?? "",
    ]);
  });

  ent.columns = [
    { width: 8 },
    { width: 20 },
    { width: 14 },
    { width: 14 },
    { width: 14 },
    { width: 24 },
    { width: 12 },
    { width: 10 },
    { width: 10 },
    { width: 10 },
    { width: 10 },
    { width: 10 },
    { width: 10 },
    { width: 36 },
    { width: 10 },
    { width: 12 },
    { width: 14 },
    { width: 8 },
    { width: 36 },
  ];

  return wb;
}

export function sanitizeFilename(name) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_");
}

export { formatDateOnly };
