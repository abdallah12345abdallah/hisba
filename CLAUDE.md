# حِسبة (Hisba) — notes for working on this project

Read this whole file before changing anything. It holds what the project is, how the owner wants us to work, the design
system and every approved design decision, and the traps already hit. Keep it up to date when a decision changes.

---

## 1. What Hisba is

An IGMA product (owner: Amr Adel, Egypt + KSA) sold to **fish-market commission brokers** (وكالة بالحلقة). Multi-agency:
each client is one agency. Arabic, right-to-left, Egyptian/Levantine market vocabulary.

Business rules (from the client meeting):
- The broker sells a farm's fish to traders and takes a **commission %** per supplier (3/4/5%). **Two invoices**: a
  **purchase invoice** to the farm per manifest (gross sales − commission = net) and a **sales invoice** to each trader for
  the day (everything he bought from every manifest, cash part, credit part, balance before/after). Everything in **kg**,
  sold by the **box** (`KG_PER_BOX = 25`); box counts use −/+ **and** can be typed. No stock: all is sold the same day.
- **العشا is an expense, not income**: entered in ج when a manifest is approved and recorded under the expense category
  «العشا» (out of the drawer); reopening the manifest removes it until it is approved again. It is not on the farm invoice.
- **Prices**: each fish grade has the day's price; **each trader can have his own price per grade** (`t.prices`), used
  automatically on the sheet and editable per sale (with «ثبّته سعر إله»).
- **Collection** of credit: per trader cycle (يومي / أسبوعي / كل أسبوعين / شهري, `t.cycle`); late = owes and the oldest
  unpaid invoice is older than his cycle → «متأخر» pill + dashboard to-do. (Client did not say the usual cycle; default weekly.)
- **Sale sheet** (شيت البيع / بيان): a truck arrives with boxes per grade (بلطي سوبر/1/2/3/4, شر، بوري، طبار…). Boxes are
  sold to traders; when every box is sold the manifest is **approved** → locked, invoice numbered, farm credited, invoice
  printed / sent on WhatsApp. Reopening an approved manifest needs a reason and is logged.
- **Traders** mostly buy on credit with a credit limit; one shared «عميل نقدي» pays cash into the drawer.
- **Suppliers (farms)** also take **feed on credit** at factory price; settled on set dates (1/7, 1/12, 1/1) with a markup
  via a debit note (إشعار إضافة), deducted from sales or paid cash. Cash advances to farms are **interest-free**.
- **Safe**: three wallets (الدرج cash, فودافون كاش, البنك). Every money move from every page lands here. Daily close counts
  the drawer by Egyptian notes.
- **Staff**: monthly salaries (owner and partner included) and day workers paid by attendance; advances deducted on pay.
- **Shareholders**: yearly profit split on 1/1 — management share (default 25%, editable) divided between **any number of
  management partners, each with his own %** (sum 100, `SPLIT.partners`); the rest over capital weighted by the months the
  money worked (a shareholder who joins mid-year gets his months only); per-shareholder terms 100% or 50/50 (half goes to
  management). Paid cash or reinvested.
- No taxes. Staff roles: صاحب الحلقة، شريك، محاسب، كاتب الميزان. **Traders and farms also use the system**: each one signs in
  with phone + a 4-digit code (or opens his private link + code) and sees **only his own** statement and invoices.
- **The market's internet drops**: the app must keep working offline (service worker + "مش متصل" badge + pending count;
  the real offline queue/sync is for the backend team — see `src/data/sync.js`).

**Backend**: not built here. The backend team takes the project after the frontend and wires real data. Do **not** add
persistence/back-end on your own; all data is sample data in memory (`src/data/*.js`). A refresh resets everything
(except the sign-in session in localStorage). Offer an API/data handoff doc if useful, don't push it.

---

## 2. How to work with the owner (important)

- **Reply in Levantine Arabic, singular, short and clear.** Code, comments and this file stay in English.
- **New or different design → show options online first.** Publish 2–4 working options as an Artifact page (standalone
  HTML in the session scratchpad, `dir="rtl"`, real-looking data, interactive where it matters), then wait for the pick
  («1», «2»…). Never build a new page/pattern before the pick. If a reply is a typo, read it sensibly («ض» = 1) and say so.
- **Same-pattern work can be built directly** (owner allowed it): figure cards + search + dropdown filter + table/cards
  toggle + own detail page + all actions in modals + success card. Add your own creativity, still within the pattern.
- **One step at a time.** The owner iterates fast with small screenshots and one-line notes («شيله», «صغره», «حسن تصميمه»).
  Apply exactly that, don't redesign around it. When asked «اش رايك / اش بتقترح»: give one clear recommendation (+ maybe
  1–2 alternatives) and wait if it changes the design.
- **Every action on a page must fully work**: add/edit/delete/import/export/WhatsApp/print with forms, validation and
  confirmations. No «لسا ما انبنت» placeholders.
- **Use the skills** (frontend-design, design-taste-frontend, ui-ux-pro-max, dataviz, design-motion-principles…) for design
  work without asking. Aim modern and creative, never basic or "AI-looking".
- **No screenshots / no Playwright checks.** The owner watches the dev server live (`npx vite --port 5190 --strictPort`,
  usually already running). Edit and let HMR show it.
- **Check the build after a change, including warnings**, building into the scratchpad, never into the project:
  `npx vite build --outDir <scratchpad>/buildcheck --emptyOutDir 2>&1 | grep -E "rror|built|warn|plugin"`
  (Vue template mistakes show only as `[plugin vite:vue]` warnings, not errors.)
- **Keep the repo light**: delete files nothing uses (components, images, CSS rules); scratch output goes to the scratchpad.
- **Proactive ideas are welcome**: short, prioritized, with a recommendation.
- Git: remote `https://github.com/abdallah12345abdallah/hisba.git`, branch `main`. Commit/push only when asked.

---

## 3. Stack and structure

Vue 3 (`<script setup>`, JS — no TypeScript), Vite 7, vue-router 4, Tailwind v4 (loaded via `@tailwindcss/vite`, but the
app styles are hand-written CSS in `style.css` + scoped styles), `lucide-vue-next` icons, `@fontsource-variable/noto-kufi-arabic`,
`@fontsource/share-tech-mono` (scale/receipt digits; imported only where used), `read-excel-file` (lazy, trader import).

```
src/main.js            mounts after router.isReady() (so a refresh opens on the same page)
src/App.vue            route.meta.bare → page without the shell (login, share links); else AppShell + keyed RouterView
src/router.js          every route has meta.perm; beforeEach guard: signed-out → /login?next=, no perm → homeFor() + info toast
src/style.css          tokens + global components (cards, buttons, tabs, tables, toasts, scrollbars, print)
src/components/AppShell.vue   sidebar (pages filtered by can()), user + logout; "solo" mode (one page only) → no sidebar, slim top bar
src/components/AppIcon.vue    our icon names → Lucide. Add new icons HERE, never inline SVG paths
src/components/ui/     shared: SoftButton, AppModal, ConfirmDialog, FilledInput, AmountField, SearchPill, SelectMenu,
                       StatusPill, ToggleSwitch, PagerBar, EmptyState, CountNum, SuccessDialog, ToastHost
src/components/<area>/ dialogs and parts per page (sheet, traders, suppliers, feed, safe, expenses, staff, investors, reports, settings, dashboard)
src/composables/       useToast (toast()), useCountUp
src/utils/grades.js    grade colours (GRADE_COLORS, gradeColor(i))
src/data/              the in-memory store and the business logic (pages only call these)
src/views/             one file per page
```

### Data modules (`src/data`)
- `demo.js` — the reactive store: AGENCY (reactive, editable in Settings), USER (reactive, set from session), PRICES,
  TRADERS, MANIFESTS (approved = totals only; drafts = grades + lines with getters), TOTALS, WALLETS, CASHBOOK,
  SUPPLIERS, FEED/FEED_TYPES, DAYS/MONTH (30-day commission series), `fmt()`. Totals are always getters, never typed in.
- `sheet.js` — addLine/removeLine/restoreLine (credit lines move trader debt), approve (lock, invoice number, credit farm,
  audit), canReopen/reopen (reason, reverses farm credit), invoiceRows/invoiceText/whatsappInvoice.
- `traders.js`, `suppliers.js`, `feed.js`, `safe.js` (addMove/removeMove, closeDay, SOURCES), `expenses.js` (CATS with
  budgets + auto-guess words, RECURRING), `staff.js` (attendance, dueOf, paySalary, giveAdvance), `investors.js`
  (weighted capital, split(), distribute), `reports.js` (**single source of the year's profit**: Jan–Oct seeded, Nov live;
  investors read `yearNets()`), `auth.js` (USERS with 4-digit PIN, ROLES + perms, SESSION, can(), signIn with 5-try / 30s
  lock, homeFor), `audit.js` (AUDIT log + `log(kind,title,detail,link)`), `settings.js` (SETTINGS defaults, grade/category
  editing, saveSplit), `portal.js` (traders'/farms' own access: PORTAL in localStorage, portalSignIn(phone, code),
  unlockWithCode, 5-try lock), `sync.js` (SYNC online/pending, `markChange()` called from addMove / addLine / removeLine / log).
- `traders.js` also holds: CYCLES/isLate/lateBy, ownPrices/setTraderPrice(s), the sales invoice (saleInvoice, buyersToday,
  saleInvoiceText, whatsappSaleInvoice) and the account link/code (traderShareUrl, renewTraderToken, resetTraderCode).
  `priceFor(trader, grade)` lives in `demo.js`.
- Cross-page effects are wired: sales → trader debt + drawer cash; approve → farm credit; trader payments / farm payouts /
  feed cash / expenses / salaries / capital / profits → safe moves (with a link back from the safe row).
- Sensitive changes are logged to the audit (approve, reopen, line edits on reopened manifests, price changes, safe deletes,
  settings, users/permissions).

### Routes
`/login` (bare) · `/` dashboard · `/sheet/:id?` · `/traders`, `/traders/:name` · `/suppliers`, `/suppliers/:id` ·
`/feed`, `/feed/settlements`, `/feed/:name` · `/safe`, `/safe/closes` · `/expenses` · `/staff`, `/staff/:id` ·
`/investors`, `/investors/:id` · `/reports` · `/audit` · `/settings` · own pages (bare, public, behind a 4-digit code
`CodeGate`): `/s/:token` farm, `/t/:token` trader · `/i/:token` shareholder page (no code). A trader/farm signed in on the
device who opens `/login` goes straight back to his page («خروج» signs him out).

Trial trader/farm codes = the last 4 digits of their phone (e.g. الحاج محمود 0100 234 5678 → 5678).

Trial users (PINs shown on the login keys while `SHOW_PINS = true` in `LoginView.vue` — **set false before client handover**):
الحاج محمود صاحب الحلقة 1111 · الحاج سعيد شريك 2222 · أحمد محاسب 1234 · مصطفى كمال كاتب الميزان 5555.

---

## 4. Design system (approved — follow it everywhere)

**Identity**
- Palette «زجاج البحر»: primary `#0e7490` (ink `#0b5870`, pale `#dbeff5`), coral `#f97362`/`#ff7a5c`, mint `#a7f3d0`,
  deep `#0b3b45`, ink `#10221f`. Semantic: positive `#247b50`/bg `#dcf5e6`, negative `#c4242a`/bg `#ffecea`,
  warning `#8a5a00`/bg `#fff4dc`. Tokens live in `style.css :root` — use them, don't invent colours.
- Ground: teal gradient with soft teal/coral blobs; content sits in one light glass **bubble** (`--bubble` + blur). The
  active sidebar item merges into the bubble with concave corners.
- Font: **Noto Kufi Arabic** everywhere; **Share Tech Mono** only for scale/receipt digits.
- Logo: `public/logo-full.webp` = white calligraphy «حسبة» + coral brush fish whose tail underlines it, tiny coral kasra
  under ح. It is white → on light screens put it on a teal badge. Favicon/icons = the coral fish alone.
- **Light, not dark.** The owner dislikes dark cards/heroes. Keep big summary cards light (white / soft tints).

**Layout rules**
- Main sidebar pages have **no back button**; detail pages have a breadcrumb.
- Page header (`.dhead`): title + one short line, actions on the side.
- **Summaries and charts go above long tables**, never below.
- **Card grids: at most 4 per row.**
- **Detail = its own page**, not a drawer or dialog. **Edits happen in modals**, not inline.
- **Tabs**: always the sheet's glass track `.mtabs` (sliding white thumb measured from the active button with
  offsetLeft/offsetWidth — `translateX` breaks in RTL; each tab = title + small live sub line). Switching swaps only the content.
- **Tables**: rows are white cards (`border-spacing: 0 6px`), the holding card uses the lighter `.tblcard` background,
  **10 rows per page by default** with `PagerBar` (sizes 10/20/50). Every list row has a visible «كشف الحساب» button and an
  edit icon. Big screens default to table; ≤720px always cards (view toggle hidden).
- **Figure cards** ("soft colour fields"): tinted gradient, corner circle, icon, value, thin bar, sub line; clickable = filter.
- Search = pill, filter = `SelectMenu` dropdown after it (opens upward when no room).
- Every scroll area uses the styled slim scrollbar (global rule; Firefox-only fallback) — never default arrows.

**Components / feedback**
- Buttons: solid primary; light buttons are pale teal **with a thin teal border** (stronger on hover); text **always centred**,
  also in stretched buttons; disabled = grey with a faint border.
- Icons: only through `AppIcon` (Lucide, stroke 1.9, 16–21px, clear contrast; action icons visible at rest).
- Success: **every success = the big centred success card, no undo button** (`toast(title, text, { amount })`). Frequent
  routine actions (each sale on the sheet) use the small island: `{ quiet: true }`. Info/negative toasts may carry an action
  (e.g. undo after delete).
- Deletes ask in `ConfirmDialog`; deleting is blocked (disabled + tooltip) when the record is in use.
- Motion: purposeful (count-up figures, bars that fill, small pops), always with a `prefers-reduced-motion` fallback.

---

## 5. Pages — current approved state

- **Login** (`LoginView`, bare; under the keypad a «تاجر أو مورد؟» button → `PortalSignIn` phone + code): two columns on teal "water" (swells + bubbles). One side the **scale**: steel pan
  ("MAX 300kg · d=50g"), dark bezel with LEDs ZERO/NET/STABLE/LOCK, green LCD (the digit just typed shows briefly then «*»,
  empty «-»), PLU key per user (2 columns, initial avatar, trial PIN pill), keypad with orange «تارا» clear + backspace,
  keyboard input, lock state amber, success shows OK/WELCOME. Other side: logo, «بتبيع، وحِسبة بتحسب.» and a tilted thermal
  **invoice that writes itself** line by line (cycles 3 sample farms). No numbers from the agency before sign-in.
- **Dashboard** «خط اليوم»: header (date chip, greeting, سند قبض/صرف, تسكير اليوم, بيان جديد — all real); white sentence card
  (count-up commission/gross + pills) with the **day line** 04:00→15:00 (trucks at arrival time, labels alternate, open
  sheets amber + link, live «هلأ» marker); 4 number cards; «بدها منك» (to-dos gathered from all pages, clickable) + today's
  prices (editable via `FishPricesDialog`, logged). The page-icon dock was removed (owner: not needed).
- **Sale sheet**: header = title + supplier line + **manifest tabs in the header** (min-width 180px). Under it one plain
  **summary line (no card, not sticky)**: small progress ring, sold/boxes, big net (count-up), gross − commission, then the
  buttons المعتمدة / حفظ مسودة / الاعتماد. Then the board «اسحب البوكس»: one card split into السمك (tinted column,
  header with «اسحب لعند التاجر» hint) and التجار (coral header). Crates = grade-tinted cards with a mini box pile, grip,
  a small plain chevron on the edge pointing to the traders; sold-out crate = slim «✓ خلص» row last. Traders = drop cards
  with animated dashed edge, debt line + bar, tray of mini boxes. Drag with pointer + ghost (tap-tap fallback); quantity
  popover with −/+ **and a typeable number** (Enter sells). One-time-per-session hint bubble on the first crate. Below:
  «البيعات» table (trader, grade dot, boxes·kg, price, آجل/نقدي pill, amount, delete) + total row + pager.
  Approval → `InvoiceNote` (paper invoice, print window, WhatsApp) ; `ApprovedDialog` lists locked manifests (reopen with
  reason, only for owner/partner); reopened manifest shows an amber band.
- **Traders / Suppliers / Feed / Safe / Expenses / Staff / Shareholders**: the standard pattern above, each with its own
  detail page and full actions. Specials: trader page has «فاتورة اليوم», «أسعاره» (TraderPricesDialog) and «حسابه على
  حِسبة» (link + code, send/renew); the sheet's sales table has «فواتير التجار» (SaleInvoicesDialog); suppliers have a
  share link + code; feed has settlements archive + debit notes;
  safe has the "يومية الدرج" running-balance tree + day close by notes; expenses header = one meter (spent vs budget with
  "المفروض لليوم" pace marker) + the most urgent fixed expense + `RecurringDialog`; staff has today's roll call (one row per
  worker: name + three small ✓ ½ ✗ buttons) and a Saturday-start attendance calendar; owner/partner page shows a salary ring;
  shareholders have the **profit simulator** slider (split bar + legend, table follows it) and a share page.
- **Reports**: `.mtabs` with live sub lines; profit (hero, waterfall, «وين راحت الفلوس» donut, monthly area line), sales
  (KPI sparklines, month heatmap calendar, ranked suppliers, grade donut), debts (aging blocks, debtor cards with conic
  limit rings), safe (in/out butterfly, closes timeline), costs (donut, budget tiles, staff by role). Export + print +
  link to the audit log. The profit hero is still dark — switch to light if asked.
- **Audit** (`/audit`): read-only timeline by day, kind counters, search/filter, export.
- **Settings** (`/settings`, `.mtabs`): الوكالة (name/place/phone/logo/invoice footer + live preview), أصناف السمك (rename
  carries into sheets, reorder, add, delete only unused), الموردين والتجار defaults, بنود المصاريف (icon picker, budget,
  auto-guess words), توزيع الأرباح, المستخدمين (owner only: users, PIN reset, on/off, permissions matrix). Each section saves
  on its own via the sticky `SaveBar` (shows only when dirty) and is logged.

---

## 6. Traps already hit (don't repeat)

- **Never name a class like a Tailwind utility** (`ring`, `shadow`, `outline`, `border`, `truncate`, `hidden`…): Tailwind is
  loaded and e.g. `.ring` adds a box-shadow square. Use names like `soldring`, `limring`, `sring`.
- Rings/progress circles: pure CSS `conic-gradient` (+ radial mask), not rotated SVG.
- `window` is not available inside Vue templates → call a function from `<script setup>`.
- When inserting a `<style>` block by script, don't match the first `</template>` (it may be an inner `<template v-for>`).
- Shell: `node -e` with template literals `${}` breaks under bash; write a `.cjs` script to the scratchpad or use Edit.
- RTL: thumbs/indicators measured in JS; `inset-inline-*` for positions; chevron "next" (ChevronLeft) points to the
  traders side.
- Global class names clash easily (`.aging`, `.cal` were taken) — prefix page-specific classes.
- Popups: one `window.open` per click (WhatsApp first; printing gets a nudge).
- WhatsApp numbers: `https://wa.me/20<number without leading 0>?text=`.
- Exports are CSV with a BOM (`'﻿'`) so Excel reads Arabic.

---

## 7. Open items (agreed order, ask before starting)

1. Bluetooth thermal printer for the invoice (PDF stays as fallback).
2. Dark/alternate logo for the white share pages; iOS icon on a teal square.
3. Before handover: `SHOW_PINS = false` in `LoginView.vue`.
4. Optional: API / data handoff document for the backend team (entities, fields, rules, endpoints, where to wire in `src/data`).
5. Deferred by the client: cross-agency market price index.

Design references (private Artifact pages on the owner's account) exist for every approved pick; ask the owner for a link
if you need to see an original option page.
