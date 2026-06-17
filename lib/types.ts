export type BookingStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'FINISHED' | 'INVOICED' | 'CANCELLED';
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'void';
export type QuoteStatus = 'draft' | 'sent' | 'accepted';

export interface LineItem {
  description: string;
  qty: number;
  unit_price: number;
}

export interface Worker {
  id: string;
  name: string;
  email: string | null;
  google_calendar_id: string | null;
}

export interface Contact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
}

export interface ServiceType {
  id: string;
  name: string;
  duration_min: number;
  base_price: string | null;
}

export interface Quote {
  id: string;
  booking_id: string;
  status: QuoteStatus;
  line_items: LineItem[];
  total: number;
  notes: string | null;
  created_at: string;
}

export interface Invoice {
  id: string;
  booking_id: string;
  contact_id: string;
  status: InvoiceStatus;
  line_items: LineItem[];
  total: number;
  notes: string | null;
  due_date: string | null;
  sent_at: string | null;
  paid_at: string | null;
  created_at: string;
}

export interface Booking {
  id: string;
  contact_id: string;
  worker_id: string;
  service_type_id: string | null;
  start_time: string;
  end_time: string;
  status: BookingStatus;
  address: string | null;
  price: string | null;
  notes: string | null;
  google_event_id: string | null;
  google_meet_link: string | null;
  google_sync_status: 'pending' | 'synced' | 'failed';
  created_at: string;
  // relations (optional, depends on select)
  contacts?: Pick<Contact, 'name' | 'email' | 'phone'>;
  workers?: Pick<Worker, 'name' | 'email' | 'google_calendar_id'>;
  service_types?: Pick<ServiceType, 'name'>;
  quotes?: Quote[];
  invoices?: Invoice[];
}
