import { InventoryItem, ArchiveItem, SystemAlert, CategoryOverview } from '../types/inventory';

export const INITIAL_INVENTORY_ITEMS: InventoryItem[] = [
  {
    id: 'item-1',
    code: '#APP-1044',
    name: 'Selvedge Raw Denim Jeans',
    subname: 'Iron Heart 21oz Heavyweight',
    category: 'Apparel',
    subCategory: 'Jeans & Denim',
    status: 'Active',
    statusLabel: 'Apparel',
    badgeType: 'neutral',
    value: 28000,
    boughtDate: 'Sep 2022',
    condition: 'Worn / Good',
    location: 'Closets',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDRIP7rldbiRpOaPJ96BRpzGMIy4XLYsDw6NqPcE300d1_UhkdHzKU59ScVwenNeSmu0eP80zp_Wac63827El5GdKmpEYtB48Apha8nc8FfJayM5iIXXgrKUrPc_Ig8bEd6Djt3sxnOyFCh8AtYSux7QI_4qnxniszfoi7NrJrvIol506USeMAxnk9--_9ZDZOp9j6nUwfmddK7IB6l2axQNSn8FrG5I0bR6rwOOoz68aFB9pI13dHD',
    imageAlt: 'Folded heavy indigo selvedge raw denim jeans',
    rfid: '0x89F4A'
  },
  {
    id: 'item-2',
    code: '#MED-3021',
    name: 'Amoxicillin Trihydrate',
    subname: 'Medicine > Antibiotic (500mg)',
    category: 'Medicine',
    subCategory: 'Antibiotic',
    status: 'Warning',
    statusLabel: '18 days left',
    badgeType: 'warning',
    value: 2400,
    boughtDate: 'Nov 2023',
    expiresDate: 'Dec 2024',
    dosage: '2x Daily',
    indication: 'Bacterial infections / Respiratory',
    location: 'Cabinet A-3',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBs2o2nv_zXTMaPSjO-EuS8m_Q6vhfuOWBgqumMTU-bWXwhYI7qvtZ-L4AEJT1DOWl-FQ6bFmEYq34XjIQgk5jIMK0dxxmmzM1dy9lxhFiWYfCbge9YzlfEwdz_uEsYB8GExDKehsvxMR6jg4y3-RXG8W4FVZUHAJt-8YoLSZI9a3PAq1bEA7UROI3LEkt1i1p6D4WjIMXAfiFqQIdYCTjhY548AzEvlM1BRoKx06bzIcbibSVLQAFv',
    imageAlt: 'Medical prescription blister pack of capsules Amoxicillin 500mg'
  },
  {
    id: 'item-3',
    code: '#4920194',
    name: 'Sony Alpha a7 IV Camera',
    subname: 'Electronics > Optics & Sensors',
    category: 'Electronics',
    subCategory: 'Optics & Sensors',
    status: 'Insured',
    statusLabel: 'Insured',
    badgeType: 'emerald',
    value: 210000,
    boughtDate: 'Jan 2023',
    serialNumber: '#4920194',
    carrier: 'State Farm Twin',
    location: 'Tech Vault Safe B',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCf19ANh9usrhcYShwTrfaXGdHlmg6dhm8ozFTeK_MGLO46yq2gIQZbNCFZUAWbBa2Aaq7YKal2cadM8hvu051rsJJFUdlJ2-BhnNlJwUIfagdYlt3_44ZFnaBRTFstKWiEvjF8Oztl6suDGq-5tDx7nzochGrfv5-STkVt9ue4-zYANaXT5BrSSq5yidKUS6ary7hHRLREGA5FdAYSa4UD9MNicVM-ameEwbU4-eHuuwzE-yzHeArF',
    imageAlt: 'Sony Alpha a7 IV camera body'
  },
  {
    id: 'item-4',
    code: '#FUR-8831',
    name: 'Herman Miller Aeron Chair',
    subname: 'Graphite Mineral Mesh, Size B',
    category: 'Furniture',
    subCategory: 'Office & Seating',
    status: 'Active',
    statusLabel: 'Furniture',
    badgeType: 'neutral',
    value: 125000,
    boughtDate: '2021',
    location: 'Home Office (Desk 01)',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA3ZPdTZmkpbmNOcTMZ8L6ZGT9Qjo7NyDd975aXuExZY7IFHy4bKLpzzsVoNzNS1ecmuRshtjv0cGZlszfl0ax4iV1Pdq8lSn8iH5kDnP5fQwWTUoV6mc0K2w5azK9h9T9aGQVaX-2WU8JKR4hBrooGMS6GxHRL1YAc2uBKZ8VgTBBbBdPEvYVM7Op6n_kwrMk3r3_pd50BcD9BBufxN4C7YIdgD6NyIb3rgQqoP_lU6kx4Js1iOb-7',
    imageAlt: 'Herman Miller Aeron graphite office chair'
  },
  {
    id: 'item-5',
    code: '#SN-9428',
    name: 'Sony WH-1000XM5',
    subname: 'Tech > Audio Equipment',
    category: 'Electronics',
    subCategory: 'Audio Equipment',
    status: 'Active',
    statusLabel: 'Twin Calibrated',
    badgeType: 'emerald',
    value: 29990,
    boughtDate: 'Nov 2023',
    firmware: 'v2.1.3',
    location: 'Workspace Audio Rack',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCG0_Q2wCCJWa6YZ3Ec6MG18iRSU0qHEalZw9gkVNtIAfrOme-2WTKS6a9GGYUlazUqNK6jNc4kyy-jq2kkulfZ3hIvMonZwvLgG74D_2i1tcHy0vWtpDOyuMbUJwH1sjvFAgVM4ZnVmnf76poHY2DgQpW5yaUNVeVKn32RJjenJJklPqmnLB9VIKTUGkP-ydxZLkqAEcL9PRgqFAt9xMImUygEL97wZh3cEt7nv61mXOAxiY3qtVAz',
    imageAlt: 'Sony WH-1000XM5 headphones'
  },
  {
    id: 'item-6',
    code: '#MED-4019',
    name: 'Cetirizine HCl 10mg',
    subname: 'Medicine > Antihistamine',
    category: 'Medicine',
    subCategory: 'Antihistamine',
    status: 'Active',
    statusLabel: 'Active Stock',
    badgeType: 'blue',
    value: 450,
    boughtDate: 'Jan 2024',
    expiresDate: '12/2025',
    batch: '#CTZ-8802',
    location: 'Bathroom First Aid',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDhmFITMUVAgKV68kfbNE_G8aYADHfUiYQEhkfPmsl4J7Vi4HtVmTwfQZ-NAbet6L-DiW0bnpYS1oMt3iP4I6LwPTO35ukFjspUFhJGSn3THgdCkt8tE69pGss0muQdrv37_kcNtBz5aCVyezPETfjijhHhbrjt6CV-Uz3Gl-6J2uYOpXqc6TBAaQubryp8B7jIHIf_X2jwgwxvU3e3XHmBUPBaOmDWmj3Pez7R4PThK9pglFEyzi-k',
    imageAlt: 'Cetirizine blister pack'
  }
];

export const INITIAL_RECENT_SCANS: InventoryItem[] = [
  {
    id: 'scan-1',
    code: '#CLO-8921',
    name: "Levi's 501 Original Denim",
    subname: 'Apparel > Jeans',
    category: 'Apparel',
    status: 'Active',
    statusLabel: 'Verified Ingest',
    badgeType: 'emerald',
    value: 7500,
    boughtDate: 'May 2023',
    rfid: '0x89F4A',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDWHUBGl2M9-gBuCCYBZnqsxB_AiM61oTa25A9MSMsQ9GpJlttrL5LTD1J0NbYCT-L8QwlpfVMLXC0irN-pTyORsK3hRk-SDrKRvyQSD7rylGYSo7T564bojyu9yb4R6XG8hxJ9_6uWvt3uQ2hqnBc0OuljBceq9-GwSmZGmmc5JeDQ6owrck7v-4Z54YYLPn3s4yYwSlPBMDpDa_g0Nn8aS3V5FefAsIvYm40qdWVkMGRqnHpnDWM9',
    imageAlt: "Levi's 501 Original Denim folded on concrete"
  },
  {
    id: 'scan-2',
    code: '#MED-4019',
    name: 'Cetirizine HCl 10mg',
    subname: 'Medicine > Antihistamine',
    category: 'Medicine',
    status: 'Active',
    statusLabel: 'Active Stock',
    badgeType: 'blue',
    value: 450,
    boughtDate: 'Exp. Date: 12/2025',
    batch: '#CTZ-8802',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDhmFITMUVAgKV68kfbNE_G8aYADHfUiYQEhkfPmsl4J7Vi4HtVmTwfQZ-NAbet6L-DiW0bnpYS1oMt3iP4I6LwPTO35ukFjspUFhJGSn3THgdCkt8tE69pGss0muQdrv37_kcNtBz5aCVyezPETfjijhHhbrjt6CV-Uz3Gl-6J2uYOpXqc6TBAaQubryp8B7jIHIf_X2jwgwxvU3e3XHmBUPBaOmDWmj3Pez7R4PThK9pglFEyzi-k',
    imageAlt: 'Cetirizine blister pack'
  },
  {
    id: 'scan-3',
    code: '#SN-9428',
    name: 'Sony WH-1000XM5',
    subname: 'Tech > Audio Equipment',
    category: 'Electronics',
    status: 'Active',
    statusLabel: 'Twin Calibrated',
    badgeType: 'emerald',
    value: 29990,
    boughtDate: 'Nov 2023',
    firmware: 'v2.1.3',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCG0_Q2wCCJWa6YZ3Ec6MG18iRSU0qHEalZw9gkVNtIAfrOme-2WTKS6a9GGYUlazUqNK6jNc4kyy-jq2kkulfZ3hIvMonZwvLgG74D_2i1tcHy0vWtpDOyuMbUJwH1sjvFAgVM4ZnVmnf76poHY2DgQpW5yaUNVeVKn32RJjenJJklPqmnLB9VIKTUGkP-ydxZLkqAEcL9PRgqFAt9xMImUygEL97wZh3cEt7nv61mXOAxiY3qtVAz',
    imageAlt: 'Sony WH-1000XM5 headphones'
  }
];

export const INITIAL_ARCHIVE_ITEMS: ArchiveItem[] = [
  {
    id: 'arch-1',
    code: '#MED-1102',
    name: 'Omega-3 Fish Oil 1200mg',
    category: 'Medicine',
    archivedReason: 'Shelf-Life Expiry (Batch #982A)',
    archivedDate: 'Nov 10, 2024',
    statusBadge: 'Expired',
    statusBadgeText: 'Expired',
    purchaseValue: 2900,
    purchaseDate: 'May 2022',
    secondaryLabel: 'PURCHASE VALUATION',
    secondaryValue: '₹2,900 INR',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDSafSHG0DvFxkogWprBey3F-hlOMmW4dbi0quxHTpdVN1mLbZT4nZ_zBwTvM5xkllQvBhigu5XBhooSLJ6K5drGk0O605-y7JUOipN4elUeu1imw1m2Ndbs0dEZKbik--np77lW99SiXlGj6eKSEnahVedIqY39IXe-Gy9JE4xjYaLB0ZRtGhRFJEqP52zcx6qMeK0vMWJI61kbInjIArBWnj3xHunG4d6S_L_dtJ_qS8Ctkh8gA4a',
    imageAlt: 'Omega-3 Fish Oil 1200mg bottle',
    historicalDetails: {
      originalMsrp: '₹2,900',
      carrierLock: 'N/A',
      batteryHealth: 'N/A',
      depreciation: '100% (Consumed / Expired)'
    }
  },
  {
    id: 'arch-2',
    code: '#F2LMK902',
    name: 'Apple iPhone 12 Pro 128GB',
    category: 'Electronics',
    archivedReason: 'Sold via Swappa on Oct 2, 2024 for ₹35,000',
    archivedDate: 'Oct 2, 2024',
    statusBadge: 'Sold',
    statusBadgeText: 'Sold (₹35,000)',
    purchaseValue: 82500,
    purchaseDate: 'Oct 24, 2020 (₹82,500 INR)',
    secondaryLabel: 'TRANSFER LEDGER',
    secondaryValue: 'Escrow Verified #SWP-9021',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBWIAlp8tB3XV-D0FRtYvCrjcvh3uvaMedelSSSluSPYTgoDvXn20z2J_AAf9MiyVb-bBZupudltGRkUrV82-P5npjGacV_Rgwx_0yVVYz40AfSRovpjUUY-iJhZJTnaNmc0vcybg063TJ96a1LSJL1Tzdohz8LsZDEyrE8hQrvObBiU7LHgNoXIyXxyDHVPYqGG-0Wxm3k5OHHvmt_76EunD45sIQ1aRYFwNgUVvHiD9eLmfzZ9KmM',
    imageAlt: 'Apple iPhone 12 Pro on industrial slate surface',
    historicalDetails: {
      originalMsrp: '₹82,500',
      carrierLock: 'Unlocked (Factory)',
      batteryHealth: '84% Capacity',
      depreciation: '-57.9% over 48mo',
      transactionRef: 'TXN-881920-OK'
    }
  },
  {
    id: 'arch-3',
    code: '#APP-0428',
    name: 'Patagonia Nano Puff Jacket',
    category: 'Apparel',
    archivedReason: 'Donated to Goodwill on Aug 15, 2024',
    archivedDate: 'Aug 15, 2024',
    statusBadge: 'Donated',
    statusBadgeText: 'Donated',
    purchaseValue: 16500,
    purchaseDate: 'Nov 2021',
    secondaryLabel: 'RECEIPT STATUS',
    secondaryValue: 'Attached',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDkRV8f08SBhpkFkTWMzfNfz9K6HdLz9Yhx1m0IF-U8GQoFp-RikXxysQDdqYz-pngQUyPsAoNvK2abpr7M41VgK4JiOHEw6HM9odIF0wF1SQb-K_IKWDyZdwmfSaAquV2RWLkxgdNVSF7p4mCnavnNmTLHtS65bvS4hEdLq8GGZ7PvIyLlPz6JwnN6oFBjFVzArEdgJju3W0SABJzfqz7Jle7_hibJGb8VySpOhEiVLyk9-rsZReU7',
    imageAlt: 'Black Patagonia Nano Puff jacket folded',
    historicalDetails: {
      originalMsrp: '₹16,500',
      carrierLock: 'N/A',
      batteryHealth: 'N/A',
      depreciation: 'Donation Tax Write-off: ₹9,000 Fair Mkt'
    }
  }
];

export const SYSTEM_ALERTS: SystemAlert[] = [
  {
    id: 'alert-1',
    title: 'Amoxicillin • Ibuprofen',
    badgeText: '< 30 Days',
    badgeType: 'amber',
    subtitle: 'Cabinet A-3 • Expiring 14 Oct & 22 Oct 2024',
    icon: 'medication',
    category: 'Medicine'
  },
  {
    id: 'alert-2',
    title: 'MacBook Pro 16" M2 Max',
    badgeText: 'Warranty Alert',
    badgeType: 'amber',
    subtitle: 'AppleCare+ tier expires in 12 days • Renewal pending',
    icon: 'verified_user',
    category: 'Electronics'
  }
];

export const CATEGORIES_OVERVIEW: CategoryOverview[] = [
  { id: 'cat-med', name: 'Medicine & Health', count: 48, flaggedText: '2 flagged', icon: 'health_and_safety' },
  { id: 'cat-app', name: 'Wardrobe & Apparel', count: 234, flaggedText: 'Organized by room', icon: 'apparel' },
  { id: 'cat-elec', name: 'Electronics & Tech', count: 89, flaggedText: '14 with telemetry', icon: 'devices' },
  { id: 'cat-furn', name: 'Home & Furniture', count: 142, flaggedText: 'Living & Workspace', icon: 'chair' },
  { id: 'cat-veh', name: 'Vehicles & Mobility', count: 6, flaggedText: 'Maintenance logs ok', icon: 'commute' },
  { id: 'cat-doc', name: 'Documents & Valuables', count: 35, flaggedText: 'Fireproof vault', icon: 'folder_special' }
];

export const DEFAULT_DOSSIER_DATA: InventoryItem = {
  id: 'dossier-lipitor',
  code: '#MED-9842',
  name: 'Lipitor (Atorvastatin)',
  subname: 'Auto-classified: Pharmaceuticals > Prescription',
  category: 'Medicine',
  subCategory: 'Cardiovascular / Statin',
  brand: 'Lipitor (Atorvastatin Calcium)',
  dosage: '20 mg Oral Tablet',
  expiresDate: '2026-10-18',
  prescribedUses: 'Lowers LDL cholesterol, prevents cardiovascular events',
  storageProtocol: 'Store at 20°C to 25°C (68°F to 77°F). Keep dry.',
  boughtDate: 'March 12, 2024',
  copay: 450,
  value: 450,
  assignedBin: 'Master Bathroom > Medicine Cabinet > Top Shelf',
  linkedRxRef: 'Rx #9402184-B',
  status: 'Active',
  statusLabel: 'Verified',
  badgeType: 'emerald',
  imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuACxQExgejlTtm8_nAb367mj-WfEbNikZ4_OyR_6url82R3Y-vTaTB0Mbqirl-2C2CzcKszxSxFfV-z-gA_MKbF_okiskTMhQSty-WSHbxYg6I2oN0PRPTTRvHT8aZi3oUnqGg10Ii3cjt7IhEcW6EI11uv-dSWSFM9SxIU5Lz_S4NHemD12nAokznVuqUdJSeCsveGHcnuGtt8ZdcRz7p0L76B7AtlI8tTGpWlj46CHyvqwLKLcGoz',
  imageAlt: 'Atorvastatin 20mg pill bottle on steel workbench'
};
