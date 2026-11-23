# hisba (حِسبة)

Accounting and daily operations for fish-market commission brokers (الحلقة): the sale sheet, traders, suppliers, feed on credit, the safe, expenses, staff, shareholders, reports and settings. Arabic, right-to-left.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in dist/
```

## Stack

Vue 3 (`<script setup>`), Vite, vue-router, Tailwind v4, lucide icons.

## Where the data lives

All data is sample data held in memory in `src/data/*.js` (one reactive store, `demo.js`, plus one module per area: `sheet.js`, `traders.js`, `suppliers.js`, `feed.js`, `safe.js`, `expenses.js`, `staff.js`, `investors.js`, `reports.js`, `auth.js`, `audit.js`, `settings.js`). Pages only call these modules, so connecting a backend means replacing them, not the pages. Nothing is saved yet: a refresh resets everything.

## Trial sign-in

During the trial the sign-in screen shows each user's PIN on their key (`SHOW_PINS` in `src/views/LoginView.vue`). Turn it off before handing the app to a client.

| User | Role | PIN |
|---|---|---|
| الحاج محمود | صاحب الحلقة | 1111 |
| الحاج سعيد | شريك | 2222 |
| أحمد | محاسب | 1234 |
| مصطفى كمال | كاتب الميزان | 5555 |
