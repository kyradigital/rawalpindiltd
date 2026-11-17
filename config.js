// ============================================================
//  Site settings — shared by the website and the admin panel.
//  Fill in your Supabase details (Project Settings → API).
//  The anon/publishable key is safe to put here; never put the
//  service_role key in this file.
//  Until these are filled in, the site shows demo cars.
// ============================================================
window.SITE_CONFIG = {
  supabaseUrl: "YOUR_SUPABASE_URL",
  supabaseAnonKey: "YOUR_SUPABASE_ANON_KEY",

  brand: "Rawalpindi",
  brandSub: "K LTD",
  currency: "KSh",

  // Contact details (leave "" to hide)
  phone: "+254 719 485167",
  phone2: "",
  whatsapp: "254719485167",   // digits only with country code — powers the "Enquire" buttons
  email: "",
  address: "Moi Avenue, Mombasa",
  mapQuery: "Rawalpindi K LTD, Moi Avenue, Mombasa",  // what Google Maps searches for
  hours: "",        // e.g. "Mon – Sat · 9am – 6pm"
  facebook: "https://www.facebook.com/p/Rawalpindi-K-LTD-100085936252635/",
  instagram: "",    // full URL
};
