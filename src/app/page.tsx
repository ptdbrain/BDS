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
      const data = await res.json();
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
      const data = await res.json();
      if (data.data) {
        setProducts(data.data);
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
      const data = await res.json();
      if (data.data) setLocks(data.data);
    } catch (err) {
      console.error('Failed to fetch locks', err);
    }
  };

  // Fetch Bookings (Realtime Booking turns & 10m Matching Window)
  const fetchBookings = async () => {
    try {
      const res = await fetch('/api/v1/bookings');
      const data = await res.json();
      if (data.data) setBookings(data.data);
    } catch (err) {
      console.error('Failed to fetch bookings', err);
    }
  };

  // Fetch Customers
  const fetchCustomers = async () => {
    try {
      const res = await fetch('/api/v1/customers');
      const data = await res.json();
      if (data.data) setCustomers(data.data);
    } catch (err) {
      console.error('Failed to fetch customers', err);
    }
  };

  // Fetch Contracts
  const fetchContracts = async () => {
    try {
      const res = await fetch('/api/v1/contracts');
      const data = await res.json();
      if (data.data) setContracts(data.data);
    } catch (err) {
      console.error('Failed to fetch contracts', err);
    }
  };

  // Fetch Report Data
  const fetchReportData = async () => {
    try {
      const res = await fetch('/api/v1/reports/dashboard');
      const data = await res.json();
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
  const handleLockProduct = async (productId: string) => {
    try {
      const salesId = currentUser?.id || 'c9c46059-fd48-4132-b1ad-5fe1d2f3a1ea';
      const salesName = currentUser?.fullName || 'Nguyễn Minh Khôi';

      const res = await fetch('/api/v1/locks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          salesEmployeeId: salesId,
          salesEmployeeName: salesName
        })
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.detail || data.error || 'Khóa giữ căn thất bại');
        return;
      }

      refreshAllData();
      broadcastSync('LOCK_UPDATED');
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
      const data = await res.json();
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
  const pendingBookingsCount = bookings.filter(b => b.trangthaikhopcan === 'CHO_DUYET_COC' || b.trangthaikhopcan === 'CHO_KHOP').length;
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

      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          activeTab={activeTab}
          onTabChange={handleTabChange}
          currentRole={currentRole}
          activeLocksCount={activeLocksCount}
          pendingVerificationsCount={pendingVerificationsCount}
          pendingContractsCount={pendingContractsCount}
          pendingBookingsCount={pendingBookingsCount}
        />

        <main className="flex-1 p-6 overflow-y-auto max-w-7xl mx-auto w-full">
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
              onRefresh={refreshAllData}
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

          {activeTab === 'reports' && (
            <ReportsDashboard
              reportData={reportData}
              onRefresh={refreshAllData}
            />
          )}
        </main>
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
          onProceedToCustomer={() => {
            setActiveLockModal(null);
            setActiveTab('customers');
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
