import { School, FiscalYear, User, StudentLevel, RevenueItem, BudgetAllocation, LearnerActivity, Project, BudgetTransaction, Strategy } from '../types';

export interface GasConfig {
  webAppUrl: string;
  autoSync: boolean;
  lastSyncTime?: string;
  status: 'disconnected' | 'connected' | 'error';
  errorMessage?: string;
  spreadsheetUrl?: string;
}

const GAS_CONFIG_STORAGE_KEY = 'school_plan_gas_config';

export function getStoredGasConfig(): GasConfig {
  try {
    const raw = localStorage.getItem(GAS_CONFIG_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Error loading GAS config:', e);
  }
  return {
    webAppUrl: '',
    autoSync: false,
    status: 'disconnected',
  };
}

export function saveStoredGasConfig(config: GasConfig): void {
  try {
    localStorage.setItem(GAS_CONFIG_STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.error('Error saving GAS config:', e);
  }
}

export interface GasPingResponse {
  success: boolean;
  status?: string;
  message?: string;
  spreadsheetTitle?: string;
  spreadsheetUrl?: string;
  error?: string;
}

/**
 * Ping GAS Web App to check connection status
 */
export async function pingGasWebApp(webAppUrl: string): Promise<GasPingResponse> {
  const cleanUrl = webAppUrl.trim();
  if (!cleanUrl) {
    return { success: false, error: 'กรุณาระบุ URL ของ Google Apps Script Web App' };
  }

  try {
    // Also use our backend proxy if CORS prevents direct browser fetch
    const proxyUrl = `/api/gas/proxy?url=${encodeURIComponent(cleanUrl + (cleanUrl.includes('?') ? '&' : '?') + 'action=ping')}`;
    const res = await fetch(proxyUrl);
    if (!res.ok) {
      throw new Error(`HTTP error ${res.status}: ${res.statusText}`);
    }
    const data = await res.json();
    return data;
  } catch (err: any) {
    // Try direct fetch if proxy fails
    try {
      const directRes = await fetch(cleanUrl + (cleanUrl.includes('?') ? '&' : '?') + 'action=ping', {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });
      if (directRes.ok) {
        return await directRes.json();
      }
    } catch (directErr) {
      // Ignore
    }
    return { success: false, error: err.message || 'ไม่สามารถติดต่อ Google Apps Script Web App ได้' };
  }
}

/**
 * Push entire app state to Google Sheets via GAS
 */
export async function pushDataToGoogleSheets(
  webAppUrl: string,
  payload: {
    school: School;
    fiscalYears: FiscalYear[];
    users: User[];
    students: StudentLevel[];
    revenues: RevenueItem[];
    allocations: BudgetAllocation[];
    activities: LearnerActivity[];
    projects: Project[];
    transactions: BudgetTransaction[];
    strategies: Strategy[];
  }
): Promise<{ success: boolean; message?: string; error?: string }> {
  const cleanUrl = webAppUrl.trim();
  if (!cleanUrl) {
    return { success: false, error: 'กรุณาระบุ URL ของ Google Apps Script Web App' };
  }

  try {
    const postBody = {
      action: 'push_all',
      data: payload,
    };

    const proxyRes = await fetch('/api/gas/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: cleanUrl,
        payload: postBody,
      }),
    });

    if (proxyRes.ok) {
      const resJson = await proxyRes.json();
      return resJson;
    } else {
      throw new Error(`Proxy error: ${proxyRes.statusText}`);
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'ไม่สามารถส่งข้อมูลไปยัง Google Sheets ได้' };
  }
}

/**
 * Initialize all database sheets in Google Spreadsheet
 */
export async function initGoogleSheetsDatabase(webAppUrl: string): Promise<{ success: boolean; message?: string; spreadsheetUrl?: string; error?: string }> {
  const cleanUrl = webAppUrl.trim();
  if (!cleanUrl) {
    return { success: false, error: 'กรุณาระบุ URL ของ Google Apps Script Web App' };
  }

  try {
    const proxyRes = await fetch('/api/gas/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: cleanUrl,
        payload: { action: 'init_database' },
      }),
    });

    if (proxyRes.ok) {
      return await proxyRes.json();
    }
    throw new Error('ไม่สามารถสร้าง Sheets ได้');
  } catch (err: any) {
    return { success: false, error: err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ' };
  }
}
