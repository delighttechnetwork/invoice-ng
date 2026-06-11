import { Client, BusinessProfile, Invoice } from "./types";

export const NIGERIAN_BANKS = [
  "Access Bank",
  "Zenith Bank",
  "Guaranty Trust Bank (GTB)",
  "United Bank for Africa (UBA)",
  "First Bank of Nigeria",
  "Ecobank",
  "Union Bank",
  "Fidelity Bank",
  "Wema Bank",
  "Stanbic IBTC",
  "Sterling Bank",
  "Moneypoint MFB",
  "OPay",
  "Kuda Bank"
];

export const defaultClients: Client[] = [];

export const defaultBusinessProfile: BusinessProfile = {
  name: "",
  email: "",
  phone: "",
  address: "",
  bankDetails: {
    bankName: "",
    accountNumber: "",
    accountName: ""
  },
  plan: "Pro Growth",
  logoSeed: "APEX"
};

export const defaultInvoices: Invoice[] = [];

