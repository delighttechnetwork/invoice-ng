export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  price: number;
}

export type InvoiceStatus = "draft" | "pending" | "paid" | "overdue" | "cancelled";

export interface Invoice {
  id: string;
  invoiceNumber: string;
  clientId: string;
  clientDetails: {
    name: string;
    email: string;
    phone?: string;
    address?: string;
    company?: string;
  };
  issuerDetails: {
    name: string;
    email: string;
    phone?: string;
    address?: string;
  };
  date: string;
  dueDate: string;
  items: LineItem[];
  status: InvoiceStatus;
  taxRate: number;
  discount: number;
  notes?: string;
  paymentReference?: string;
  isRecurring?: boolean;
  frequency?: "weekly" | "monthly" | "yearly";
  history?: Array<{ timestamp: string; reference: string; status: InvoiceStatus; notes?: string }>;
}

export interface ClientNote {
  id: string;
  text: string;
  createdAt: string;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  company: string;
  notes: ClientNote[];
}

export interface BusinessProfile {
  name: string;
  email: string;
  phone: string;
  address: string;
  bankDetails: {
    bankName: string;
    accountNumber: string;
    accountName: string;
  };
  plan: string;
  logoSeed: string;
}
