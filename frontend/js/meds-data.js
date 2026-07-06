const CITIES = {
  "Addis Ababa": ["Addis Ketema", "Akaky Kaliti", "Arada", "Bole", "Gullele", "Kirkos", "Kolfe Keranio", "Lemi Kura", "Lideta", "Nifas Silk-Lafto", "Yeka"],
  "Adama": ["Abageda", "Boku", "Dembela", "Denbala Michael", "Lugo"],
  "Bahir Dar": ["Belay Zeleke", "Fasilo", "Gish Abay", "Shum Abo", "Tana"],
  "Hawassa": ["Addis Ketema", "Bahil Adarash", "Hayek Dar", "Menaharia", "Misrak", "Tabor"],
  "Dire Dawa": ["Gende Kore", "Kezira", "Megala", "Sabian"],
  "Mekelle": ["Adi Haki", "Ayder", "Hadnet", "Hawelti", "Kedamay Weyane", "Semien"],
  "Gondar": ["Arada", "Azezo", "Fasil", "Maraki", "Zobel"],
  "Jimma": ["Bore", "Ginjo", "Hermata", "Mendera Kochi"]
};

const MEDICINES = [
  { id: 1,  name: "Paracetamol 500mg",        generic: "Acetaminophen",        form: "tablet",    rx: false, base: 40 },
  { id: 2,  name: "Aspirin 300mg",            generic: "Acetylsalicylic acid", form: "tablet",    rx: false, base: 35 },
  { id: 3,  name: "Ibuprofen 400mg",          generic: "Ibuprofen",            form: "tablet",    rx: false, base: 60 },
  { id: 4,  name: "Diclofenac 50mg",          generic: "Diclofenac sodium",    form: "tablet",    rx: false, base: 70 },
  { id: 5,  name: "Cetirizine 10mg",          generic: "Cetirizine HCl",       form: "tablet",    rx: false, base: 55 },
  { id: 6,  name: "Loratadine 10mg",          generic: "Loratadine",           form: "tablet",    rx: false, base: 65 },
  { id: 7,  name: "Omeprazole 20mg",          generic: "Omeprazole",           form: "capsule",   rx: false, base: 140 },
  { id: 8,  name: "ORS Sachet",               generic: "Oral rehydration salts", form: "syrup",   rx: false, base: 25 },
  { id: 9,  name: "Vitamin C 500mg",          generic: "Ascorbic acid",        form: "tablet",    rx: false, base: 90 },
  { id: 10, name: "Albendazole 400mg",        generic: "Albendazole",          form: "tablet",    rx: false, base: 50 },
  { id: 11, name: "Hydrocortisone Cream 1%",  generic: "Hydrocortisone",       form: "cream",     rx: false, base: 120 },
  { id: 12, name: "Paracetamol Syrup 120mg/5ml", generic: "Acetaminophen",     form: "syrup",     rx: false, base: 85 },
  { id: 13, name: "Cough Syrup",              generic: "Dextromethorphan",     form: "syrup",     rx: false, base: 110 },
  { id: 14, name: "Eye Drops (Artificial Tears)", generic: "Carboxymethylcellulose", form: "drops", rx: false, base: 130 },
  { id: 15, name: "Amoxicillin 500mg",        generic: "Amoxicillin",          form: "capsule",   rx: true,  base: 180 },
  { id: 16, name: "Augmentin 625mg",          generic: "Amoxicillin + Clavulanate", form: "tablet", rx: true, base: 420 },
  { id: 17, name: "Azithromycin 500mg",       generic: "Azithromycin",         form: "tablet",    rx: true,  base: 260 },
  { id: 18, name: "Ciprofloxacin 500mg",      generic: "Ciprofloxacin",        form: "tablet",    rx: true,  base: 190 },
  { id: 19, name: "Doxycycline 100mg",        generic: "Doxycycline",          form: "capsule",   rx: true,  base: 150 },
  { id: 20, name: "Metformin 850mg",          generic: "Metformin HCl",        form: "tablet",    rx: true,  base: 220 },
  { id: 21, name: "Amlodipine 5mg",           generic: "Amlodipine besylate",  form: "tablet",    rx: true,  base: 175 },
  { id: 22, name: "Enalapril 10mg",           generic: "Enalapril maleate",    form: "tablet",    rx: true,  base: 160 },
  { id: 23, name: "Atorvastatin 20mg",        generic: "Atorvastatin",         form: "tablet",    rx: true,  base: 310 },
  { id: 24, name: "Salbutamol Inhaler",       generic: "Albuterol",            form: "inhaler",   rx: true,  base: 350 },
  { id: 25, name: "Beclomethasone Inhaler",   generic: "Beclomethasone",       form: "inhaler",   rx: true,  base: 480 },
  { id: 26, name: "Insulin (Actrapid)",       generic: "Human insulin",        form: "injection", rx: true,  base: 850 },
  { id: 27, name: "Ceftriaxone 1g Injection", generic: "Ceftriaxone",          form: "injection", rx: true,  base: 240 },
  { id: 28, name: "Tramadol 50mg",            generic: "Tramadol HCl",         form: "capsule",   rx: true,  base: 130 },
  { id: 29, name: "Diazepam 5mg",             generic: "Diazepam",             form: "tablet",    rx: true,  base: 95 },
  { id: 30, name: "Fluticasone Nasal Spray",  generic: "Fluticasone propionate", form: "spray",   rx: true,  base: 520 }
];

const PHARMACIES = [
  { id: 1,  name: "Kenema Pharmacy Bole",      city: "Addis Ababa", subcity: "Bole",          area: "near Edna Mall" },
  { id: 2,  name: "Gishen Pharmacy",           city: "Addis Ababa", subcity: "Arada",         area: "Piassa, Churchill Ave" },
  { id: 3,  name: "Zewditu Pharmacy",          city: "Addis Ababa", subcity: "Kirkos",        area: "Kazanchis" },
  { id: 4,  name: "Lideta Community Pharmacy", city: "Addis Ababa", subcity: "Lideta",        area: "Mexico Square" },
  { id: 5,  name: "Yeka Hills Pharmacy",       city: "Addis Ababa", subcity: "Yeka",          area: "Megenagna" },
  { id: 6,  name: "Kolfe Family Pharmacy",     city: "Addis Ababa", subcity: "Kolfe Keranio", area: "Total Soset Kuter Mazoria" },
  { id: 7,  name: "Kality Gate Pharmacy",      city: "Addis Ababa", subcity: "Akaky Kaliti",  area: "Kality bus terminal" },
  { id: 8,  name: "Rift Valley Pharmacy",      city: "Adama",       subcity: "Dembela",       area: "Main Street" },
  { id: 9,  name: "Boku Medhin Pharmacy",      city: "Adama",       subcity: "Boku",          area: "Boku roundabout" },
  { id: 10, name: "Tana Pharmacy",             city: "Bahir Dar",   subcity: "Tana",          area: "lakeside, Kebele 04" },
  { id: 11, name: "Blue Nile Pharmacy",        city: "Bahir Dar",   subcity: "Belay Zeleke",  area: "St. George roundabout" },
  { id: 12, name: "Hawassa Central Pharmacy",  city: "Hawassa",     subcity: "Menaharia",     area: "Piazza area" },
  { id: 13, name: "Tabor View Pharmacy",       city: "Hawassa",     subcity: "Tabor",         area: "Tabor hill road" },
  { id: 14, name: "Sabian Pharmacy",           city: "Dire Dawa",   subcity: "Sabian",        area: "Sabian main road" },
  { id: 15, name: "Kezira Pharmacy",           city: "Dire Dawa",   subcity: "Kezira",        area: "old town market" },
  { id: 16, name: "Ayder Pharmacy",            city: "Mekelle",     subcity: "Ayder",         area: "near Ayder Referral Hospital" },
  { id: 17, name: "Hawelti Pharmacy",          city: "Mekelle",     subcity: "Hawelti",       area: "Hawelti monument square" },
  { id: 18, name: "Fasil Pharmacy",            city: "Gondar",      subcity: "Fasil",         area: "near Fasil Ghebbi" },
  { id: 19, name: "Maraki Pharmacy",           city: "Gondar",      subcity: "Maraki",        area: "university road" },
  { id: 20, name: "Jimma Gibe Pharmacy",       city: "Jimma",       subcity: "Hermata",       area: "Hermata Merkato" }
];

function buildDemoInventory() {
  const rows = [];
  MEDICINES.forEach(function (m) {
    PHARMACIES.forEach(function (p) {
      const h = (m.id * 73 + p.id * 31) % 97;
      if (h < 38) {
        rows.push({
          medicine: m,
          pharmacy: p,
          price: Math.round(m.base * (0.85 + ((h * 7) % 30) / 100)),
          stock: 5 + ((m.id * 13 + p.id * 17) % 140)
        });
      }
    });
  });
  return rows;
}
