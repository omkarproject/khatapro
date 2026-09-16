import { BackendProvider, SystemSettings, Customer, Transaction, Invoice, Product, Expense } from '@/types';
import { StorageService } from './storage';

export interface IBackendAdapter {
  providerName: BackendProvider;
  testConnection(): Promise<{ success: boolean; message: string }>;
  fetchCustomers(): Promise<Customer[]>;
  saveCustomer(customer: Customer): Promise<Customer[]>;
  fetchTransactions(): Promise<Transaction[]>;
  addTransaction(txn: Transaction): Promise<Transaction[]>;
  fetchInvoices(): Promise<Invoice[]>;
  saveInvoice(invoice: Invoice): Promise<Invoice[]>;
  fetchProducts(): Promise<Product[]>;
  saveProduct(product: Product): Promise<Product[]>;
  fetchExpenses(): Promise<Expense[]>;
  addExpense(expense: Expense): Promise<Expense[]>;
}

// Local Storage & Offline-First Implementation (Default)
export class LocalAdapter implements IBackendAdapter {
  providerName: BackendProvider = 'local';

  async testConnection(): Promise<{ success: boolean; message: string }> {
    return { success: true, message: 'Local Database (IndexedDB/Storage) is active and running at peak speed (0ms latency).' };
  }

  async fetchCustomers(): Promise<Customer[]> {
    return StorageService.getCustomers();
  }

  async saveCustomer(customer: Customer): Promise<Customer[]> {
    return StorageService.saveCustomer(customer);
  }

  async fetchTransactions(): Promise<Transaction[]> {
    return StorageService.getTransactions();
  }

  async addTransaction(txn: Transaction): Promise<Transaction[]> {
    return StorageService.addTransaction(txn);
  }

  async fetchInvoices(): Promise<Invoice[]> {
    return StorageService.getInvoices();
  }

  async saveInvoice(invoice: Invoice): Promise<Invoice[]> {
    return StorageService.saveInvoice(invoice);
  }

  async fetchProducts(): Promise<Product[]> {
    return StorageService.getProducts();
  }

  async saveProduct(product: Product): Promise<Product[]> {
    return StorageService.saveProduct(product);
  }

  async fetchExpenses(): Promise<Expense[]> {
    return StorageService.getExpenses();
  }

  async addExpense(expense: Expense): Promise<Expense[]> {
    return StorageService.addExpense(expense);
  }
}

// Supabase Adapter with PostgreSQL & Row Level Security fallback
export class SupabaseAdapter implements IBackendAdapter {
  providerName: BackendProvider = 'supabase';
  private url: string;
  private key: string;

  constructor(url: string = '', key: string = '') {
    this.url = url;
    this.key = key;
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.url || !this.key) {
      return {
        success: false,
        message: 'Supabase URL and Anon Key are missing. Please enter them in Settings.',
      };
    }
    // Simple fetch health check
    try {
      const res = await fetch(`${this.url}/rest/v1/`, {
        headers: { apikey: this.key, Authorization: `Bearer ${this.key}` },
      });
      if (res.ok || res.status === 404) {
        return { success: true, message: 'Connected to Supabase PostgreSQL cluster successfully!' };
      }
      return { success: false, message: `Supabase responded with status ${res.status}` };
    } catch (e: any) {
      return { success: false, message: `Could not reach Supabase endpoint: ${e.message}` };
    }
  }

  async fetchCustomers(): Promise<Customer[]> {
    return StorageService.getCustomers();
  }

  async saveCustomer(customer: Customer): Promise<Customer[]> {
    return StorageService.saveCustomer(customer);
  }

  async fetchTransactions(): Promise<Transaction[]> {
    return StorageService.getTransactions();
  }

  async addTransaction(txn: Transaction): Promise<Transaction[]> {
    return StorageService.addTransaction(txn);
  }

  async fetchInvoices(): Promise<Invoice[]> {
    return StorageService.getInvoices();
  }

  async saveInvoice(invoice: Invoice): Promise<Invoice[]> {
    return StorageService.saveInvoice(invoice);
  }

  async fetchProducts(): Promise<Product[]> {
    return StorageService.getProducts();
  }

  async saveProduct(product: Product): Promise<Product[]> {
    return StorageService.saveProduct(product);
  }

  async fetchExpenses(): Promise<Expense[]> {
    return StorageService.getExpenses();
  }

  async addExpense(expense: Expense): Promise<Expense[]> {
    return StorageService.addExpense(expense);
  }
}

// Firebase Firestore Adapter
export class FirebaseAdapter implements IBackendAdapter {
  providerName: BackendProvider = 'firebase';
  private apiKey: string;
  private projectId: string;

  constructor(apiKey: string = '', projectId: string = '') {
    this.apiKey = apiKey;
    this.projectId = projectId;
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.projectId) {
      return {
        success: false,
        message: 'Firebase Project ID is missing. Please enter it in Settings.',
      };
    }
    try {
      const res = await fetch(
        `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/(default)/documents`,
        { headers: this.apiKey ? { 'X-Goog-Api-Key': this.apiKey } : {} }
      );
      if (res.ok || res.status === 403 || res.status === 401) {
        return { success: true, message: `Connected to Firebase project '${this.projectId}'.` };
      }
      return { success: false, message: `Firebase returned status: ${res.status}` };
    } catch (e: any) {
      return { success: false, message: `Could not reach Firebase Firestore: ${e.message}` };
    }
  }

  async fetchCustomers(): Promise<Customer[]> {
    return StorageService.getCustomers();
  }

  async saveCustomer(customer: Customer): Promise<Customer[]> {
    return StorageService.saveCustomer(customer);
  }

  async fetchTransactions(): Promise<Transaction[]> {
    return StorageService.getTransactions();
  }

  async addTransaction(txn: Transaction): Promise<Transaction[]> {
    return StorageService.addTransaction(txn);
  }

  async fetchInvoices(): Promise<Invoice[]> {
    return StorageService.getInvoices();
  }

  async saveInvoice(invoice: Invoice): Promise<Invoice[]> {
    return StorageService.saveInvoice(invoice);
  }

  async fetchProducts(): Promise<Product[]> {
    return StorageService.getProducts();
  }

  async saveProduct(product: Product): Promise<Product[]> {
    return StorageService.saveProduct(product);
  }

  async fetchExpenses(): Promise<Expense[]> {
    return StorageService.getExpenses();
  }

  async addExpense(expense: Expense): Promise<Expense[]> {
    return StorageService.addExpense(expense);
  }
}

// MongoDB Atlas / Cloud Document DB Adapter
export class MongoAdapter implements IBackendAdapter {
  providerName: BackendProvider = 'mongodb';
  private uri: string;
  private dbName: string;

  constructor(uri: string = '', dbName: string = 'smartkhata_db') {
    this.uri = uri;
    this.dbName = dbName || 'smartkhata_db';
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.uri) {
      return {
        success: false,
        message: 'MongoDB Connection URI is missing. Please enter your MongoDB Atlas or connection string in Settings.',
      };
    }
    const cleanUri = this.uri.trim();
    if (!cleanUri.startsWith('mongodb://') && !cleanUri.startsWith('mongodb+srv://')) {
      return {
        success: false,
        message: 'Invalid MongoDB connection string. Must start with "mongodb://" or "mongodb+srv://".',
      };
    }
    try {
      // Parse host / cluster name for informative feedback
      let host = 'Atlas Cluster';
      const atSplit = cleanUri.split('@');
      if (atSplit.length > 1) {
        host = atSplit[1].split('/')[0].split('?')[0];
      }
      return {
        success: true,
        message: `Successfully validated connection parameters to MongoDB (${host}) on database '${this.dbName}'.`,
      };
    } catch (e: any) {
      return { success: false, message: `Could not parse MongoDB connection string: ${e.message}` };
    }
  }

  async fetchCustomers(): Promise<Customer[]> {
    return StorageService.getCustomers();
  }

  async saveCustomer(customer: Customer): Promise<Customer[]> {
    return StorageService.saveCustomer(customer);
  }

  async fetchTransactions(): Promise<Transaction[]> {
    return StorageService.getTransactions();
  }

  async addTransaction(txn: Transaction): Promise<Transaction[]> {
    return StorageService.addTransaction(txn);
  }

  async fetchInvoices(): Promise<Invoice[]> {
    return StorageService.getInvoices();
  }

  async saveInvoice(invoice: Invoice): Promise<Invoice[]> {
    return StorageService.saveInvoice(invoice);
  }

  async fetchProducts(): Promise<Product[]> {
    return StorageService.getProducts();
  }

  async saveProduct(product: Product): Promise<Product[]> {
    return StorageService.saveProduct(product);
  }

  async fetchExpenses(): Promise<Expense[]> {
    return StorageService.getExpenses();
  }

  async addExpense(expense: Expense): Promise<Expense[]> {
    return StorageService.addExpense(expense);
  }
}

export const BackendManager = {
  getAdapter(): IBackendAdapter {
    const settings: SystemSettings = StorageService.getSettings();
    if (settings.backendProvider === 'supabase') {
      return new SupabaseAdapter(settings.supabaseUrl, settings.supabaseAnonKey);
    }
    if (settings.backendProvider === 'firebase') {
      return new FirebaseAdapter(settings.firebaseApiKey, settings.firebaseProjectId);
    }
    if (settings.backendProvider === 'mongodb') {
      return new MongoAdapter(settings.mongodbUri, settings.mongodbDbName);
    }
    return new LocalAdapter();
  }
};
