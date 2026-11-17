# Rawalpindi K LTD — Website + Admin

```
rawal/
├── index.html          ← public website (loader, banner, inventory, contact)
├── car.html            ← single car page (gallery, specs, WhatsApp enquiry)
├── assets/banner10.png ← banner image
├── assets/logo10.png   ← logo (loader, nav, footer)
├── config.js           ← Supabase keys + brand + contact details
├── assets/css, assets/js
├── admin/              ← local admin panel (do NOT upload when hosting)
└── supabase/schema.sql ← database setup, run once
```

## 1. Set up Supabase (one time)

1. Create a project at https://supabase.com.
2. **SQL Editor → New query** → paste everything in `supabase/schema.sql` → **Run**.
3. Add yourself as admin (same SQL editor):
   ```sql
   insert into public.admins (email) values ('your@email.com');
   ```
4. **Authentication → Users → Add user** → create a user with that same email + a password
   (tick "Auto confirm"). 
5. **Authentication → Sign In / Providers** → turn **off** "Allow new users to sign up"
   (only you should have an account).
6. **Project Settings → API** → copy the **Project URL** and the **anon / publishable key**
   into `config.js`.

## 2. Add your images

- Banner: the site shows `assets/banner10.jpg` on computers and `assets/banner-mobile.jpg` on phones (compressed copies of your PNGs, so pages load fast). To change a banner, replace that .jpg.
- Logo: `assets/logo10-sm.png` (loader, nav, footer) and `assets/hero-logo.png` (over the banner).

## 3. Add cars

Open `admin/index.html` in your browser (double-click it), sign in, then **+ Add car**.
Drop in photos (first one is the cover, drag to reorder), fill in the specs, save.
Change status (Available / Reserved / Sold) straight from the list.

## 4. Contact details

Edit `phone`, `whatsapp`, `email`, `address`, `hours` and `instagram` in `config.js`.
`whatsapp` powers every "Enquire" button (digits only with country code, e.g. `254700000000`).

## Hosting

Upload everything **except** the `admin/` folder (and `supabase/`) to any static host
(Netlify, Vercel, cPanel, GitHub Pages). Even if the admin were uploaded by mistake it is
protected — only emails in the `admins` table can change anything.
