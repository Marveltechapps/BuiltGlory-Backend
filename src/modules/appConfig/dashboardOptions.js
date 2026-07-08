export const DEFAULT_DASHBOARD_OPTIONS = {
  visits: {
    rescheduleReasons: [
      "Buyer request",
      "Admin schedule conflict",
      "Property not ready",
      "Other"
    ],
    cancelReasons: ["Buyer cancelled", "Admin cancelled", "Property sold", "Other"],
    physicalChecklist: [
      "Called buyer to confirm",
      "Sent visit confirmation WhatsApp",
      "Property keys/access arranged",
      "Property cleaned and ready",
      "Seller informed (if applicable)",
      "Directions sent to buyer"
    ]
  },
  legalDocuments: {
    categoryIdsByPropertyType: {
      apartment: ["registration", "revenue", "approvals", "tax_utility", "family_succession", "loan_encumbrance", "court_records", "kyc"],
      villa: ["registration", "revenue", "approvals", "tax_utility", "family_succession", "loan_encumbrance", "court_records", "environmental", "kyc"],
      house: ["registration", "revenue", "approvals", "tax_utility", "family_succession", "loan_encumbrance", "court_records", "kyc"],
      penthouse: ["registration", "revenue", "approvals", "tax_utility", "family_succession", "loan_encumbrance", "court_records", "kyc"],
      studio: ["registration", "revenue", "approvals", "tax_utility", "loan_encumbrance", "court_records", "kyc"],
      plot: ["registration", "revenue", "approvals", "tax_utility", "loan_encumbrance", "court_records", "govt_acquisition", "kyc"],
      land: ["registration", "revenue", "tax_utility", "loan_encumbrance", "court_records", "govt_acquisition", "marshy", "mountain", "kyc"],
      commercial: ["registration", "revenue", "approvals", "tax_utility", "loan_encumbrance", "court_records", "environmental", "kyc"]
    },
    categories: [
      { id: "registration", title: "1. Registration Records", documents: [
        { id: "parent_doc", name: "Parent Document" },
        { id: "chain_of_title", name: "Chain of Title Documents" },
        { id: "sale_deed", name: "Sale Deed" },
        { id: "partition_deed", name: "Partition Deed" },
        { id: "settlement_deed", name: "Settlement Deed" },
        { id: "gift_deed", name: "Gift Deed" },
        { id: "will_probate", name: "Will & Probate" },
        { id: "mortgage_deed", name: "Mortgage Deed" },
        { id: "release_deed", name: "Release Deed" },
        { id: "poa", name: "Power of Attorney (PoA)" },
        { id: "court_decree", name: "Court Decree / Court Sale Order" },
        { id: "auction_cert", name: "Auction Sale Certificate" },
        { id: "ec", name: "Encumbrance Certificate (EC)" }
      ] },
      { id: "revenue", title: "2. Revenue Records", documents: [
        { id: "chitta", name: "Chitta" },
        { id: "patta", name: "Patta" },
        { id: "a_register", name: "A-Register Extract" },
        { id: "fmb_sketch", name: "FMB Sketch" },
        { id: "tslr", name: "Town Survey Land Register (TSLR)" },
        { id: "patta_transfer", name: "Patta Transfer History" },
        { id: "natham", name: "Natham / Poramboke Conversion Order" }
      ] },
      { id: "approvals", title: "3. Approvals & Planning", documents: [
        { id: "dtcp", name: "DTCP Approval" },
        { id: "cmda", name: "CMDA Approval" },
        { id: "layout_approval", name: "Layout Approval" },
        { id: "building_plan", name: "Building Plan Approval" },
        { id: "land_use_cert", name: "Land Use Certificate" },
        { id: "noc_housing", name: "NOC (Housing Board / Local Body)" }
      ] },
      { id: "tax_utility", title: "4. Tax & Utility Records", documents: [
        { id: "property_tax", name: "Property Tax Receipts" },
        { id: "water_tax", name: "Water Tax / No-Dues Certificate" },
        { id: "electricity_noc", name: "Electricity No-Dues" }
      ] },
      { id: "family_succession", title: "5. Family & Succession Records", documents: [
        { id: "family_tree", name: "Family Tree / Family Record" },
        { id: "heirship_cert", name: "Legal Heirship Certificate" },
        { id: "death_cert", name: "Death Certificate" },
        { id: "divorce_decree", name: "Divorce Decree" },
        { id: "marriage_cert", name: "Marriage Certificate" },
        { id: "family_settlement", name: "Family Settlement Agreement" },
        { id: "succession_records", name: "Religion-specific Succession Records" }
      ] },
      { id: "loan_encumbrance", title: "6. Loan & Encumbrance", documents: [
        { id: "cersai", name: "CERSAI Search Report" },
        { id: "sarfaesi", name: "SARFAESI Notice Check" },
        { id: "bank_noc", name: "Bank NOC / Loan Closure Letter" }
      ] },
      { id: "court_records", title: "7. Court Records", documents: [
        { id: "hc_search", name: "High Court Search Report" },
        { id: "dc_search", name: "District Court Search Report" },
        { id: "ccc_search", name: "City Civil Court Search Report" },
        { id: "sc_search", name: "Supreme Court Search Report" },
        { id: "lok_adalat", name: "Lok Adalat / Arbitration Award" },
        { id: "injunction", name: "Injunction / Stay Order Check" },
        { id: "partition_suit", name: "Partition Suit Decree" },
        { id: "succession_cert", name: "Succession Certificate" },
        { id: "letters_admin", name: "Letters of Administration" },
        { id: "probate", name: "Probate Order" },
        { id: "court_auction", name: "Court Auction Sale Certificate" },
        { id: "insolvency", name: "Insolvency / Bankruptcy Search" }
      ] },
      { id: "govt_acquisition", title: "8. Government Acquisition & Restriction Records", documents: [
        { id: "la_notice", name: "Land Acquisition Notice (Sec 4 / Sec 6)" },
        { id: "award_comp", name: "Award Passed / Compensation Order" },
        { id: "gazette", name: "Government Acquisition Gazette Notification" },
        { id: "nh_sh", name: "NH / SH Road Widening Notification" },
        { id: "metro_notice", name: "Metro / CMRL Acquisition Notice" },
        { id: "railway_notice", name: "Railway Acquisition Notice" }
      ] },
      { id: "crz", title: "9. CRZ Records", documents: [
        { id: "crz_cert", name: "CRZ Classification Certificate" },
        { id: "crz_noc", name: "CRZ Clearance / NOC" },
        { id: "htl_ltl", name: "HTL / LTL Demarcation" },
        { id: "czmp", name: "Coastal Zone Management Plan Reference" }
      ] },
      { id: "environmental", title: "10. Environmental Protection Records", documents: [
        { id: "env_clearance", name: "Environmental Clearance Certificate" },
        { id: "pcb_noc", name: "Pollution Control Board NOC" },
        { id: "forest_clearance", name: "Forest Department Clearance" },
        { id: "green_belt", name: "Green Belt / Buffer Zone Check" },
        { id: "epa_compliance", name: "EPA Notification Compliance" }
      ] },
      { id: "marshy", title: "11. Marshy & Water Body Records", documents: [
        { id: "marshy_class", name: "Marshy / Low-lying Land Classification" },
        { id: "poramboke_check", name: "Poramboke Water Body Check" },
        { id: "lake_buffer", name: "Lake / Pond / Canal Buffer Zone Clearance" },
        { id: "revenue_class", name: "Revenue Classification (Wet Land / Dry Land)" }
      ] },
      { id: "mountain", title: "12. Mountain & Hill Protection Records", documents: [
        { id: "hada", name: "Hill Area Development Authority Clearance (HADA)" },
        { id: "esz", name: "Eco-sensitive Zone (ESZ) Clearance" },
        { id: "western_ghats", name: "Western Ghats Protection Zone Check" },
        { id: "forest_boundary", name: "Forest Boundary Demarcation" }
      ] },
      { id: "kyc", title: "13. Identity & KYC", documents: [
        { id: "seller_id", name: "Seller Identity Proof" },
        { id: "buyer_id", name: "Buyer Identity Proof" },
        { id: "pan_both", name: "PAN Card (Both Parties)" },
        { id: "aadhar_both", name: "Aadhaar (Both Parties)" }
      ] }
    ],
    saleCategories: [
      { id: "sale_agreement_docs", title: "1. Sale Agreement & Title", documents: [
        { id: "sale_agreement", name: "Sale Agreement" },
        { id: "title_deed", name: "Title Deed" },
        { id: "ec_buyer", name: "Encumbrance Certificate" },
        { id: "noc_buyer", name: "NOC" }
      ] },
      { id: "registration_buyer", title: "2. Registration & Transfer", documents: [
        { id: "registration_docs", name: "Registration Documents" },
        { id: "khata_transfer", name: "Khata Transfer" },
        { id: "possession_letter", name: "Possession Letter" }
      ] },
      { id: "tax_compliance", title: "3. Tax & Compliance", documents: [
        { id: "property_tax_receipt", name: "Property Tax Receipt" },
        { id: "maintenance_noc", name: "Maintenance / Society NOC" },
        { id: "builder_handover", name: "Builder Handover Documents" }
      ] },
      { id: "utility_handover", title: "4. Utility & Handover", documents: [
        { id: "electricity_transfer", name: "Electricity Transfer" },
        { id: "water_connection", name: "Water Connection Transfer" },
        { id: "keys_handover", name: "Keys Handover Acknowledgement" }
      ] }
    ]
  },
  properties: {
    options: {
      yesNo: ["Yes", "No"],
      yesNoPartial: ["Yes", "No", "Partially"],
      facing: ["North", "South", "East", "West"],
      furnishing: ["Full", "Semi", "Unfurnished"],
      apartmentBhk: ["1 BHK", "2 BHK", "3 BHK", "4 BHK", "5 BHK"],
      residentialBhk: ["2 BHK", "3 BHK", "4 BHK", "5 BHK"],
      apartmentParking: ["Covered", "Stilt", "Open"],
      ocCcStatus: ["Received", "Applied", "No"],
      plotApproval: ["CMDA", "DTCP", "TNHB", "Panchayat"],
      plotTitle: ["Freehold", "Patta", "Leasehold"],
      commercialSubType: ["Shop", "Office", "Showroom", "Clinic"],
      commercialParking: ["Dedicated", "Shared", "None"],
      interiorStyle: ["Modern", "Classic", "Contemporary"],
      budgetRange: ["Budget", "Standard", "Premium", "Luxury"]
    },
    importSheets: [
      { label: "Plot", type: "plot" },
      { label: "Apartment", type: "apartment" },
      { label: "Residential", type: "residential" },
      { label: "Commercial", type: "commercial" },
      { label: "Organic Home", type: "organic_home" },
      { label: "3D Printing Home", type: "3d_printing" },
      { label: "Fractional Ownership", type: "fractional" },
      { label: "CEO Mansion", type: "ceo_mansion" },
      { label: "Holiday Home", type: "holiday_home" },
      { label: "Land & Landbank", type: "land" },
      { label: "Farm House", type: "farmhouse" },
      { label: "NRI Services", type: "nri" },
      { label: "Interior", type: "interior" }
    ]
  }
};

const IMPORT_SHEET_TYPE_BY_LABEL = Object.fromEntries(
  DEFAULT_DASHBOARD_OPTIONS.properties.importSheets.map((sheet) => [sheet.label, sheet.type])
);

export const sanitizeImportSheets = (sheets) => {
  if (!Array.isArray(sheets) || !sheets.length) return DEFAULT_DASHBOARD_OPTIONS.properties.importSheets;
  return sheets
    .map((sheet) => {
      const label = String(sheet?.label || "").trim();
      if (!label) return null;
      const expectedType = IMPORT_SHEET_TYPE_BY_LABEL[label];
      const type = expectedType || String(sheet?.type || "").trim();
      if (!type) return null;
      return { label, type };
    })
    .filter(Boolean);
};
