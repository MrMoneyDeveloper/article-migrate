import { Workspace } from "./workspace.jsx";
import { ie, v, ei, Lc, Sl } from "./vendor.js";
const cc = ["category", "section", "title", "body_html"],
  Qd = ["article_key", "status", "locale", "position", "labels"],
  fc = "en-us";
function Wd() {
  const client = ie.useRef(null);
  function requireClient() {
    const connected = Jl(client);
    if (!connected) throw new Error("Open Article Migrate inside Zendesk Support to export or migrate articles.");
    return connected;
  }
  return v.jsx(Workspace, {validate:Zd,plan:Gd,migrate:rows=>new Jd(requireClient()).migrate(rows),exportCsv:()=>new qd(requireClient()).exportCsv()});
}
function Zl({ tone: e, children: t }) {
  return v.jsx("div", { className: `alert ${e}`, children: t });
}
function Xl({ label: e, value: t }) {
  return v.jsxs("div", {
    className: "stat-chip",
    children: [
      v.jsx("span", { children: e }),
      v.jsx("strong", { children: t }),
    ],
  });
}
function Gl({ title: e, issues: t, tone: n }) {
  return v.jsxs("div", {
    className: `issue-box ${n}`,
    children: [
      v.jsx("h2", { children: e }),
      v.jsx("ul", {
        children: t.map((r, l) =>
          v.jsxs(
            "li",
            {
              children: [
                v.jsx("strong", { children: r.code }),
                v.jsx("span", { children: r.message }),
                r.row && v.jsxs("em", { children: ["row ", r.row] }),
              ],
            },
            `${r.code}-${l}`,
          ),
        ),
      }),
    ],
  });
}
function Kd(e, t, n, r) {
  return [
    { number: 1, label: "Choose CSV", state: e ? "complete" : "active" },
    {
      number: 2,
      label: "Validate",
      state: t ? (t.valid ? "complete" : "warning") : e ? "active" : "idle",
    },
    {
      number: 3,
      label: "Dry run",
      state:
        (n == null ? void 0 : n.status) === "DRY_RUN"
          ? "complete"
          : t != null && t.valid
            ? "active"
            : "idle",
    },
    {
      number: 4,
      label: "Migrate",
      state:
        (n == null ? void 0 : n.status) === "COMPLETED"
          ? "complete"
          : r
            ? "active"
            : "idle",
    },
  ];
}
function Jl(e) {
  var t;
  return (
    e.current ||
      (e.current =
        ((t = window.ZAFClient) == null ? void 0 : t.init()) ?? null),
    e.current
  );
}
function Zd(e) {
  const t = tp(e),
    n = [],
    r = [],
    l = new Set(t.headers);
  if (
    (cc.forEach((o) => {
      l.has(o) ||
        n.push({
          code: "REQUIRED_COLUMN_MISSING",
          message: `Required column "${o}" is missing.`,
        });
    }),
    n.length > 0)
  )
    return { valid: !1, errors: n, warnings: r, rows: [], preview: [] };
  t.rows.length === 0 &&
    n.push({
      code: "NO_ARTICLES",
      message: "Add at least one article to your CSV before validating.",
    });
  const i = t.rows.map((o, u) => ({
    key: o.article_key || fe(`${o.category}-${o.section}-${o.title}-${u + 2}`),
    category: o.category,
    section: o.section,
    title: o.title,
    bodyHtml: o.body_html,
    status: o.status === "published" ? "published" : "draft",
    locale: o.locale || fc,
    position: op(o.position),
    labels: ip(o.labels),
  }));
  return (
    i.forEach((o, u) => {
      const s = u + 2;
      (o.category ||
        n.push({
          code: "CATEGORY_REQUIRED",
          message: "Category is required.",
          row: s,
        }),
        o.section ||
          n.push({
            code: "SECTION_REQUIRED",
            message: "Section is required.",
            row: s,
          }),
        o.title ||
          n.push({
            code: "TITLE_REQUIRED",
            message: "Article title is required.",
            row: s,
          }),
        o.bodyHtml ||
          n.push({
            code: "BODY_REQUIRED",
            message: "Article body_html is required.",
            row: s,
          }),
        t.rows[u].status &&
          t.rows[u].status !== "draft" &&
          t.rows[u].status !== "published" &&
          r.push({
            code: "STATUS_DEFAULTED_TO_DRAFT",
            message: `Invalid status "${t.rows[u].status}" was defaulted to draft.`,
            row: s,
          }));
    }),
    { valid: n.length === 0, errors: n, warnings: r, rows: i, preview: Xd(i) }
  );
}
function Xd(e) {
  const t = new Map();
  return (
    e.forEach((n) => {
      const r = fe(n.category),
        l = `${r}/${fe(n.section)}`,
        i = t.get(r) ?? { key: r, name: n.category, sections: [] };
      let o = i.sections.find((u) => u.key === l);
      (o ||
        ((o = { key: l, name: n.section, articles: [] }), i.sections.push(o)),
        o.articles.push({
          key: n.key,
          title: n.title,
          status: n.status,
          locale: n.locale,
        }),
        t.set(r, i));
    }),
    Array.from(t.values())
  );
}
function Gd(e) {
  const t = [],
    n = new Set(),
    r = new Set();
  return (
    e.forEach((l) => {
      const i = fe(l.category),
        o = `${i}/${fe(l.section)}`;
      (n.has(i) ||
        (t.push({
          type: "category",
          key: i,
          name: l.category,
          status: "planned",
        }),
        n.add(i)),
        r.has(o) ||
          (t.push({
            type: "section",
            key: o,
            name: l.section,
            status: "planned",
          }),
          r.add(o)),
        t.push({
          type: "article",
          key: l.key,
          name: l.title,
          status: "planned",
        }));
    }),
    t
  );
}
class Jd {
  constructor(t) {
    Sl(this, "categoryMap", new Map());
    Sl(this, "sectionMap", new Map());
    this.client = t;
  }
  async migrate(t) {
    const n = [];
    for (const r of bd(t)) {
      const l = fe(r.name);
      try {
        const i = await this.client.request(
          bl({
            url: `/api/v2/help_center/${r.locale}/categories.json`,
            data: JSON.stringify({ category: { name: r.name } }),
          }),
        );
        (this.categoryMap.set(l, i.category.id),
          n.push({
            type: "category",
            key: l,
            name: r.name,
            status: "success",
            destinationId: i.category.id,
          }));
      } catch (i) {
        n.push({
          type: "category",
          key: l,
          name: r.name,
          status: "failed",
          error: Lr(i),
        });
      }
    }
    for (const r of ep(t)) {
      const l = this.categoryMap.get(fe(r.category)),
        i = `${fe(r.category)}/${fe(r.name)}`;
      if (!l) {
        n.push({
          type: "section",
          key: i,
          name: r.name,
          status: "failed",
          error: `Category "${r.category}" was not created.`,
        });
        continue;
      }
      try {
        const o = await this.client.request(
          bl({
            url: `/api/v2/help_center/${r.locale}/categories/${l}/sections.json`,
            data: JSON.stringify({ section: { name: r.name } }),
          }),
        );
        (this.sectionMap.set(i, o.section.id),
          n.push({
            type: "section",
            key: i,
            name: r.name,
            status: "success",
            destinationId: o.section.id,
          }));
      } catch (o) {
        n.push({
          type: "section",
          key: i,
          name: r.name,
          status: "failed",
          error: Lr(o),
        });
      }
    }
    for (const r of t) {
      const l = this.sectionMap.get(`${fe(r.category)}/${fe(r.section)}`);
      if (!l) {
        n.push({
          type: "article",
          key: r.key,
          name: r.title,
          status: "failed",
          error: `Section "${r.section}" was not created.`,
        });
        continue;
      }
      try {
        const i = await this.client.request(
          bl({
            url: `/api/v2/help_center/${r.locale}/sections/${l}/articles.json`,
            data: JSON.stringify({
              article: {
                title: r.title,
                body: r.bodyHtml,
                draft: r.status !== "published",
                position: r.position,
                label_names: r.labels,
              },
            }),
          }),
        );
        n.push({
          type: "article",
          key: r.key,
          name: r.title,
          status: "success",
          destinationId: i.article.id,
        });
      } catch (i) {
        n.push({
          type: "article",
          key: r.key,
          name: r.title,
          status: "failed",
          error: Lr(i),
        });
      }
    }
    return {
      status: n.some((r) => r.status === "failed")
        ? "COMPLETED_WITH_ERRORS"
        : "COMPLETED",
      items: n,
      errors: [],
    };
  }
}
class qd {
  constructor(t) {
    this.client = t;
  }
  async exportCsv() {
    const t = await ql(
        this.client,
        "/api/v2/help_center/categories.json",
        "categories",
      ),
      n = await ql(
        this.client,
        "/api/v2/help_center/sections.json",
        "sections",
      ),
      r = await ql(
        this.client,
        "/api/v2/help_center/articles.json",
        "articles",
      ),
      l = new Map(t.map((u) => [u.id, u])),
      i = new Map(n.map((u) => [u.id, u])),
      o = r.map((u) => {
        var h;
        const s = i.get(u.section_id),
          c = s ? l.get(s.category_id) : void 0;
        return {
          category: (c == null ? void 0 : c.name) ?? "",
          section: (s == null ? void 0 : s.name) ?? "",
          title: u.title,
          body_html: u.body ?? "",
          status: u.draft ? "draft" : "published",
          locale:
            u.locale ||
            (s == null ? void 0 : s.locale) ||
            (c == null ? void 0 : c.locale) ||
            fc,
          position: ((h = u.position) == null ? void 0 : h.toString()) ?? "",
          labels: (u.label_names ?? []).join(";"),
        };
      });
    return (
      
      {
        status: "EXPORTED",
        url: rp(o),
        filename: "article-migrate-export.csv",
        message: "Help Center CSV exported.",
        categories: t.length,
        sections: n.length,
        articles: r.length,
      }
    );
  }
}
async function ql(e, t, n) {
  const r = [];
  let l = t;
  for (; l;) {
    const i = await e.request({ url: l, type: "GET", dataType: "json" }),
      o = i[n],
      u = i.next_page;
    (Array.isArray(o) && r.push(...o),
      (l = typeof u == "string" && u ? u : void 0));
  }
  return r;
}
function bl(e) {
  return {
    url: e.url,
    type: "POST",
    contentType: "application/json",
    dataType: "json",
    data: e.data,
  };
}
function bd(e) {
  const t = new Map();
  return (
    e.forEach((n) => {
      const r = fe(n.category);
      t.has(r) || t.set(r, { name: n.category, locale: n.locale });
    }),
    Array.from(t.values())
  );
}
function ep(e) {
  const t = new Map();
  return (
    e.forEach((n) => {
      const r = `${fe(n.category)}/${fe(n.section)}`;
      t.has(r) ||
        t.set(r, { category: n.category, name: n.section, locale: n.locale });
    }),
    Array.from(t.values())
  );
}
function tp(e) {
  const t = np(e.replace(/^\uFEFF/, ""));
  if (t.length === 0) return { headers: [], rows: [] };
  const n = t[0].map((l) => l.trim()),
    r = t
      .slice(1)
      .filter((l) => l.some((i) => i.trim().length > 0))
      .map((l) => {
        const i = {};
        return (
          n.forEach((o, u) => {
            var s;
            i[o] = ((s = l[u]) == null ? void 0 : s.trim()) ?? "";
          }),
          i
        );
      });
  return { headers: n, rows: r };
}
function np(e) {
  const t = [];
  let n = [],
    r = "",
    l = !1;
  for (let i = 0; i < e.length; i += 1) {
    const o = e[i],
      u = e[i + 1];
    if (o === '"') {
      l && u === '"' ? ((r += '"'), (i += 1)) : (l = !l);
      continue;
    }
    if (o === "," && !l) {
      (n.push(r), (r = ""));
      continue;
    }
    if (
      (o ===
        `
` ||
        o === "\r") &&
      !l
    ) {
      (o === "\r" &&
        u ===
          `
` &&
        (i += 1),
        n.push(r),
        t.push(n),
        (n = []),
        (r = ""));
      continue;
    }
    r += o;
  }
  return ((r.length > 0 || n.length > 0) && (n.push(r), t.push(n)), t);
}
function rp(rows) {
  const headers=["category","section","title","body_html","status","locale","position","labels"];
  const csv=[headers.join(","),...rows.map(row=>headers.map(key=>lp(row[key]??"")).join(","))].join("\r\n");
  return URL.createObjectURL(new Blob(["\uFEFF",csv],{type:"text/csv;charset=utf-8"}));
}
function lp(e) {
  return /[",\r\n]/.test(e) ? `"${e.replace(/"/g, '""')}"` : e;
}
function ip(e = "") {
  return e
    .split(/[;|]/)
    .map((t) => t.trim())
    .filter(Boolean);
}
function op(e) {
  if (!e) return;
  const t = Number(e);
  return Number.isFinite(t) ? t : void 0;
}
function fe(e) {
  return e
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
function Lr(e) {
  if (e instanceof Error && e.message) return e.message;
  if (typeof e == "object" && e !== null) {
    const t = e,
      n = t.responseText,
      r = t.status,
      l = t.message;
    if (typeof n == "string" && n)
      return typeof r == "number" ? `${r}: ${n}` : n;
    if (typeof l == "string" && l) return l;
  }
  return "Zendesk API request failed. Confirm Guide is enabled and your Zendesk user is a Help Center manager.";
}
ei.createRoot(document.getElementById("root")).render(
  v.jsx(Lc.StrictMode, { children: v.jsx(Wd, {}) }),
);
