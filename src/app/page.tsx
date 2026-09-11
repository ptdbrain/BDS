'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { UserRole } from '@/lib/types';
import { Navbar } from '@/components/Navbar';
import { Sidebar, TabType } from '@/components/Sidebar';
import { InventoryMatrix } from '@/components/InventoryMatrix';
import { LockManager } from '@/components/LockManager';
import { CustomerManager } from '@/components/CustomerManager';
import { ContractWorkflow } from '@/components/ContractWorkflow';
import { ReportsDashboard } from '@/components/ReportsDashboard';
import { ImportModal } from '@/components/ImportModal';
import { PersonalRevenueView } from '@/components/PersonalRevenueView';
import { VietQRModal } from '@/components/VietQRModal';
import { LoginScreen } from '@/components/LoginScreen';
import { SwitchAccountModal } from '@/components/SwitchAccountModal';
import { SSO_ACCOUNTS, SSOAccountConfig } from '@/lib/authConfig';
import { broadcastSync, onSync } from '@/lib/sync';
import { getNavigationTabsForRole } from '@/lib/rolePolicy';
import { readJsonResponse } from '@/lib/readJsonResponse';

export default function Home() {
  // Authentication & Role State
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [currentRole, setCurrentRole] = useState<UserRole>('SALES');
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);
  const [isSwitchSSOModalOpen, setIsSwitchSSOModalOpen] = useState<boolean>(false);

  const [activeTab, setActiveTab] = useState<TabType>('inventory');

  // Application Data States
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [products, setProducts] = useState<any[]>([]);
  const [locks, setLocks] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [reportData, setReportData] = useState<any>(null);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [activeLockModal, setActiveLockModal] = useState<any | null>(null);
  const [customerIntakeLock, setCustomerIntakeLock] = useState<any | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string>('');

  // Check stored auth on boot
  useEffect(() => {
    try {
      const stored = localStorage.getItem('ahs_auth_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && (parsed.employeeCode || parsed.id)) {
          setCurrentUser(parsed);
          setCurrentRole(parsed.role || 'SALES');
          if (parsed.role === 'SALES_ADMIN') {
            setActiveTab('locks');
          } else if (parsed.role === 'MANAGER') {
            setActiveTab('reports');
          } else {
            setActiveTab('inventory');
          }
        }
      }
    } catch (e) {
      console.error('Failed to parse stored user:', e);
    } finally {
      setIsAuthChecking(false);
    }
  }, []);

  // Fetch Projects
  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/v1/projects');
      const data = await readJsonResponse<{ data?: any[]; error?: string }>(res);
      if (!res.ok || data.error) throw new Error(data.error || `Không thể tải dự án (HTTP ${res.status}).`);
      if (data.data) {
        setProjects(data.data);
        if (data.data.length > 0 && !selectedProjectId) {
          setSelectedProjectId(data.data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch projects', err);
    }
  };

  // Fetch Products
  const fetchProducts = useCallback(async () => {
    if (!selectedProjectId) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/v1/products?projectId=${selectedProjectId}`);
      const data = await readJsonResponse<{ data?: any[]; error?: string }>(res);
      if (!res.ok || data.error) throw new Error(data.error || `Không thể tải quỹ căn (HTTP ${res.status}).`);
      if (data.data) {
        let mergedProducts = [...data.data];

        // Merge custom products from localStorage if this serverless container hasn't seen them yet
        try {
          const stored = localStorage.getItem('ahs_custom_products');
          if (stored) {
            const customProds = JSON.parse(stored);
            let hasChanged = false;
            if (Array.isArray(customProds)) {
              for (const cp of customProds) {
                if (cp.projectId === selectedProjectId) {
                  const existingIdx = mergedProducts.findIndex(p => p.id === cp.id || p.productCode === cp.productCode);
                  if (existingIdx >= 0) {
                    const serverProd = mergedProducts[existingIdx];
                    // If the server product is already SOLD or DEPOSITED, DB is the source of truth!
                    if (serverProd.status === 'SOLD' || serverProd.status === 'DEPOSITED' || serverProd.trangthai === 'Đã bán' || serverProd.trangthai === 'Đã cọc') {
                      if (cp.status !== serverProd.status || cp.trangthai !== serverProd.trangthai) {
                        cp.status = serverProd.status;
                        cp.trangthai = serverProd.trangthai;
                        hasChanged = true;
                      }
                    } else if (cp.status && cp.status !== 'AVAILABLE') {
                      mergedProducts[existingIdx].status = cp.status;
                      mergedProducts[existingIdx].trangthai = cp.trangthai;
                    }
                  } else {
                    mergedProducts.push(cp);
                  }
                }
              }
              if (hasChanged) {
                localStorage.setItem('ahs_custom_products', JSON.stringify(customProds));
              }
            }
          }
        } catch (e) {
          // ignore
        }

        setProducts(mergedProducts);
      }
    } catch (err) {
      console.error('Failed to fetch products', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedProjectId]);

  // Fetch Locks
  const fetchLocks = async () => {
    try {
      const res = await fetch('/api/v1/locks');
      const data = await readJsonResponse<{ data?: any[]; error?: string }>(res);
      if (!res.ok || data.error) throw new Error(data.error || `Không thể tải lượt lock (HTTP ${res.status}).`);
      if (data.data) setLocks(data.data);
    } catch (err) {
      console.error('Failed to fetch locks', err);
    }
  };

  // Fetch Bookings (Realtime Booking turns & 10m Matching Window)
  const fetchBookings = async () => {
    try {
      const res = await fetch('/api/v1/bookings');
      const data = await readJsonResponse<{ data?: any[]; error?: string }>(res);
      if (!res.ok || data.error) throw new Error(data.error || `Không thể tải lượt booking (HTTP ${res.status}).`);
      let serverBookings: any[] = data.data || [];

      // Reconcile with localStorage custom bookings for Vercel multi-container persistence
      try {
        const stored = localStorage.getItem('ahs_custom_bookings');
        if (stored) {
          const customList = JSON.parse(stored);
          if (Array.isArray(customList)) {
            const serverIds = new Set(serverBookings.map((b: any) => b.id || b.maLuotBooking));
            customList.forEach((cb: any) => {
              if (!serverIds.has(cb.id) && !serverIds.has(cb.maLuotBooking)) {
                serverBookings.unshift(cb);
              }
            });
          }
        }
      } catch (e) {}

      setBookings(serverBookings);
    } catch (err) {
      console.error('Failed to fetch bookings', err);
    }
  };

  // Fetch Customers
  const fetchCustomers = async () => {
    try {
      const params = new URLSearchParams();
      if (currentRole) params.set('role', currentRole);
      if (currentUser?.employeeCode) params.set('employeeCode', currentUser.employeeCode);
      if (currentRole === 'SALES' && currentUser?.id) params.set('salesEmployeeId', currentUser.id);
      const res = await fetch('/api/v1/customers?' + params.toString());
      const data = await readJsonResponse<{ data?: any[]; error?: string }>(res);
      if (!res.ok || data.error) throw new Error(data.error || `Không thể tải khách hàng (HTTP ${res.status}).`);
      if (data.data) setCustomers(data.data);
    } catch (err) {
      console.error('Failed to fetch customers', err);
    }
  };

  // Fetch Contracts
  const fetchContracts = async () => {
    try {
      const params = new URLSearchParams();
      if (currentRole) params.set('role', currentRole);
      if (currentUser?.employeeCode) params.set('employeeCode', currentUser.employeeCode);
      const res = await fetch('/api/v1/contracts?' + params.toString());
      const data = await readJsonResponse<{ data?: any[]; error?: string }>(res);
      if (!res.ok || data.error) throw new Error(data.error || `Không thể tải hợp đồng (HTTP ${res.status}).`);
      if (data.data) setContracts(data.data);
    } catch (err) {
      console.error('Failed to fetch contracts', err);
    }
  };

  // Fetch Report Data (với phân quyền role)
  const fetchReportData = async () => {
    if (currentRole === 'SALES_ADMIN') {
      setReportData(null);
      return;
    }
    try {
      const role = currentRole || 'SALES';
      const empCode = currentUser?.employeeCode || '';
      const params = new URLSearchParams();
      if (role) params.append('role', role);
      if (empCode) params.append('employeeCode', empCode);
      const res = await fetch(`/api/v1/reports/dashboard?${params.toString()}`);
      const data = await readJsonResponse<{ data?: any; error?: string }>(res);
      if (!res.ok || data.error) throw new Error(data.error || `Không thể tải báo cáo (HTTP ${res.status}).`);
      if (data.data) setReportData(data.data);
    } catch (err) {
      console.error('Failed to fetch report data', err);
    }
  };

  // Master refresh all states
  const refreshAllData = useCallback(() => {
    fetchProducts();
    fetchLocks();
    fetchBookings();
    fetchCustomers();
    fetchContracts();
    fetchReportData();
    setLastSyncTime(new Date().toLocaleTimeString('vi-VN'));
  }, [fetchProducts]);

  // Initial boot
  useEffect(() => {
    if (currentUser) {
      fetchProjects();
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      refreshAllData();
    }
  }, [selectedProjectId, refreshAllData, currentUser]);

  // Realtime Synchronization via BroadcastChannel & LocalStorage
  useEffect(() => {
    const unsubscribe = onSync((msg) => {
      refreshAllData();
    });
    return () => unsubscribe();
  }, [refreshAllData]);

  // Tab visibility / Window focus instant auto-refresh
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        refreshAllData();
      }
    };
    const handleFocus = () => {
      refreshAllData();
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleFocus);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleFocus);
    };
  }, [refreshAllData]);

  // Background Polling Sweep every 3 seconds
  useEffect(() => {
    if (!currentUser) return;
    const interval = setInterval(() => {
      refreshAllData();
    }, 3000);
    return () => clearInterval(interval);
  }, [refreshAllData, currentUser]);

  // Action: Lock product 30m
  const handleLockProduct = async (productId: string, productData?: any) => {
    try {
      const salesId = currentUser?.id || 'c9c46059-fd48-4132-b1ad-5fe1d2f3a1ea';
      const salesName = currentUser?.fullName || 'Nguyễn Minh Khôi';

      const targetProduct = productData || products.find(p => p.id === productId || p.productCode === productId);

      const res = await fetch('/api/v1/locks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          salesEmployeeId: salesId,
          salesEmployeeName: salesName,
          productData: targetProduct
        })
      });

      const data = await readJsonResponse<{ data?: any; detail?: string; error?: string }>(res);
      if (!res.ok || data.error) {
        alert(data.detail || data.error || 'Khóa giữ căn thất bại');
        return;
      }

      // Update custom product status in localStorage if applicable
      try {
        const stored = localStorage.getItem('ahs_custom_products');
        if (stored) {
          const list = JSON.parse(stored);
          const item = list.find((p: any) => p.id === productId || p.productCode === targetProduct?.productCode);
          if (item) {
            item.status = 'LOCKED';
            item.trangthai = 'Đang lock';
            localStorage.setItem('ahs_custom_products', JSON.stringify(list));
          }
        }
      } catch (e) {}

      refreshAllData();
      broadcastSync('LOCK_UPDATED');
      broadcastSync('PRODUCT_UPDATED');
      setActiveLockModal(data.data?.lock || data.data);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Action: Cancel lock
  const handleCancelLock = async (lockId: string) => {
    try {
      const res = await fetch(`/api/v1/locks/${lockId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Hủy giữ căn bởi Sales' })
      });
      if (res.ok) {
        refreshAllData();
        broadcastSync('LOCK_UPDATED');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Action: Transition from Lock to Customer Intake
  const handleProceedToCustomer = (lock?: any) => {
    if (lock) {
      setCustomerIntakeLock(lock);
    }
    setActiveTab('customers');
  };

  // Auth: Handle Login Success
  const handleLoginSuccess = (user: any) => {
    setCurrentUser(user);
    setCurrentRole(user.role);
    try {
      localStorage.setItem('ahs_auth_user', JSON.stringify(user));
    } catch (e) {}

    // Default tab based on role
    if (user.role === 'SALES_ADMIN') {
      setActiveTab('locks');
    } else if (user.role === 'PRODUCT_ADMIN') {
      setActiveTab('inventory');
    } else if (user.role === 'MANAGER') {
      setActiveTab('reports');
    } else {
      setActiveTab('inventory');
    }

    refreshAllData();
    broadcastSync('ALL_DATA_UPDATED');
  };

  // Auth: Handle Logout
  const handleLogout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem('ahs_auth_user');
    } catch (e) {}
  };

  // Auth: Handle Switch SSO Account
  const handleSwitchSSOAccount = async (account: SSOAccountConfig) => {
    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ssoCode: account.code })
        });
      const data = await readJsonResponse<{ data?: any; error?: string }>(res);
      if (!res.ok || data.error) throw new Error(data.error || `Không thể chuyển tài khoản (HTTP ${res.status}).`);
      if (data.data?.user) {
        handleLoginSuccess(data.data.user);
      }
    } catch (err) {
      console.error('Failed to switch SSO account:', err);
    }
  };

  // Role switch from dropdown
  const handleRoleChange = (role: UserRole) => {
    setCurrentRole(role);
    // Find matching SSO account for this role
    const matchedAccount = SSO_ACCOUNTS.find((a) => a.role === role);
    if (matchedAccount) {
      handleSwitchSSOAccount(matchedAccount);
    }
  };

  const handleTabChange = (tab: TabType) => {
    if (!getNavigationTabsForRole(currentRole).includes(tab)) return;
    setActiveTab(tab);
    refreshAllData();
  };

  // If loading auth state
  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-[#07090e] flex items-center justify-center">
        <div className="flex items-center space-x-3 text-slate-300">
          <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold">Đang khởi tạo hệ thống phân quyền...</span>
        </div>
      </div>
    );
  }

  // If user not logged in -> Display ultra-modern Login Screen with 5 SSO accounts
  if (!currentUser) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  const activeLocksCount = locks.filter(l => l.status === 'ACTIVE' || l.status === 'PAYMENT_PENDING').length;
  const pendingBookingsCount = bookings.filter(b => b.trangthaikhopcan === 'CHO_DUYET_COC').length;
  const pendingVerificationsCount = customers.filter(c => c.verificationStatus === 'PENDING_VERIFICATION').length;
  const pendingContractsCount = contracts.filter(c => c.status === 'PENDING_REVIEW').length;

  const currentProject = projects.find(p => p.id === selectedProjectId);

  return (
    <div className="min-h-screen flex flex-col bg-[#080b11]">
      <Navbar
        currentRole={currentRole}
        currentUser={currentUser}
        onRoleChange={handleRoleChange}
        onLogout={handleLogout}
        onOpenSSOModal={() => setIsSwitchSSOModalOpen(true)}
        activeProjectName={currentProject?.name}
      />

      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 flex min-h-0 overflow-hidden">
          <Sidebar
            activeTab={activeTab}
            onTabChange={handleTabChange}
            currentRole={currentRole}
            activeLocksCount={activeLocksCount}
            pendingVerificationsCount={pendingVerificationsCount}
            pendingContractsCount={pendingContractsCount}
            pendingBookingsCount={pendingBookingsCount}
          />

          <main className="flex-1 min-w-0 p-6 overflow-y-auto max-w-7xl mx-auto w-full">
          {activeTab === 'inventory' && (
            <InventoryMatrix
              products={products}
              projects={projects}
              currentRole={currentRole}
              currentUser={currentUser}
              contracts={contracts}
              selectedProjectId={selectedProjectId}
              onSelectProject={setSelectedProjectId}
              onLockProduct={handleLockProduct}
              onOpenImportModal={() => setIsImportModalOpen(true)}
              onRefresh={refreshAllData}
              isLoading={isLoading}
            />
          )}

          {activeTab === 'transactions_revenue' && (
            <PersonalRevenueView
              locks={locks}
              contracts={contracts}
              reportData={reportData}
              currentEmployee={currentUser}
            />
          )}

          {activeTab === 'locks' && (
            <LockManager
              locks={locks}
              bookings={bookings}
              projects={projects}
              onRefresh={refreshAllData}
              onCancelLock={handleCancelLock}
              onProceedToCustomer={handleProceedToCustomer}
              currentRole={currentRole}
              currentUser={currentUser}
            />
          )}

          {activeTab === 'customers' && (
            <CustomerManager
              customers={customers}
              currentRole={currentRole}
              currentUser={currentUser}
              onRefresh={refreshAllData}
              prefilledLock={customerIntakeLock}
              autoOpenForm={!!customerIntakeLock}
              onClearPrefilledLock={() => setCustomerIntakeLock(null)}
            />
          )}

          {activeTab === 'contracts' && (
            <ContractWorkflow
              contracts={contracts}
              products={products}
              customers={customers}
              currentRole={currentRole}
              currentUser={currentUser}
              onRefresh={refreshAllData}
            />
          )}

          {/* Tab 'my_contracts': NVKD xem và nhập thông tin hợp đồng của chính mình */}
          {activeTab === 'my_contracts' && (
            <ContractWorkflow
              contracts={contracts.filter((c: any) => {
                if (currentRole !== 'SALES') return true;
                const empCode = currentUser?.employeeCode;
                if (!empCode) return true;
                return (
                  c.salesEmployee?.employeeCode === empCode ||
                  c.salesEmployee?.maNV === empCode ||
                  c.salesEmployeeId === currentUser?.id
                );
              })}
              products={products}
              customers={customers}
              currentRole={currentRole}
              currentUser={currentUser}
              onRefresh={refreshAllData}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsDashboard
              reportData={reportData}
              onRefresh={refreshAllData}
              currentRole={currentRole}
              currentUser={currentUser}
            />
          )}
          </main>
        </div>

        {/* Global Enterprise Footer */}
        <footer className="mt-10 py-5 border-t border-slate-800/80 text-center text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-3 px-2">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-white tracking-wide">AHS PROPERTY</span>
            <span className="text-slate-600">•</span>
            <span className="font-medium text-slate-300">WEBSITE QUẢN LÝ SẢN PHẨM VÀ GIAO DỊCH</span>
          </div>
          <div className="text-slate-400 text-xs">
            Phụ trách xây dựng: <span className="text-amber-400 font-semibold">Nhân viên quản lý sản phẩm Hoàng Thị Hương Giang</span>
          </div>
        </footer>
      </div>

      {/* Switch Account SSO Modal */}
      <SwitchAccountModal
        isOpen={isSwitchSSOModalOpen}
        onClose={() => setIsSwitchSSOModalOpen(false)}
        currentEmployeeCode={currentUser?.employeeCode}
        onSwitchAccount={handleSwitchSSOAccount}
      />

      {/* Instant VietQR Payment Modal */}
      {activeLockModal && (
        <VietQRModal
          lock={activeLockModal}
          isOpen={!!activeLockModal}
          onClose={() => setActiveLockModal(null)}
          onPaymentSuccess={() => {
            refreshAllData();
            broadcastSync('ALL_DATA_UPDATED');
          }}
          onProceedToCustomer={(lockToUse) => {
            const finalLock = lockToUse || activeLockModal;
            setActiveLockModal(null);
            handleProceedToCustomer(finalLock);
          }}
        />
      )}

      {/* Bulk Import Modal */}
      <ImportModal
        projectId={selectedProjectId}
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => {
          setIsImportModalOpen(false);
          refreshAllData();
          broadcastSync('ALL_DATA_UPDATED');
        }}
      />
    </div>
  );
}
