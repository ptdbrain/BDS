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
import { AuditTrail } from '@/components/AuditTrail';
import { ImportModal } from '@/components/ImportModal';
import { PersonalRevenueView } from '@/components/PersonalRevenueView';
import { VietQRModal } from '@/components/VietQRModal';

export default function Home() {
  const [currentRole, setCurrentRole] = useState<UserRole>('SALES');
  const [activeTab, setActiveTab] = useState<TabType>('inventory');

  // Application Data States
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [products, setProducts] = useState<any[]>([]);
  const [locks, setLocks] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [reportData, setReportData] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [activeLockModal, setActiveLockModal] = useState<any | null>(null);

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

  // Fetch Audit Logs
  const fetchAuditLogs = async () => {
    try {
      const res = await fetch('/api/v1/audit-logs');
      const data = await res.json();
      if (data.data) setAuditLogs(data.data);
    } catch (err) {
      console.error('Failed to fetch audit logs', err);
    }
  };

  // Refresh all state
  const refreshAllData = useCallback(() => {
    fetchProducts();
    fetchLocks();
    fetchCustomers();
    fetchContracts();
    fetchReportData();
    fetchAuditLogs();
  }, [fetchProducts]);

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    refreshAllData();
  }, [selectedProjectId, refreshAllData]);

  // Real-time polling sweep every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchProducts();
      fetchLocks();
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchProducts]);

  // Action: Lock product 30m
  const handleLockProduct = async (productId: string) => {
    try {
      const res = await fetch('/api/v1/locks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          salesEmployeeId: 'emp_sales_01',
          salesEmployeeName: 'Trần Văn Nam'
        })
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.detail || data.error || 'Khóa giữ căn thất bại');
        return;
      }

      refreshAllData();
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
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Action: Transition from Lock to Customer Intake
  const handleProceedToCustomer = (lock?: any) => {
    setActiveTab('customers');
  };

  const activeLocksCount = locks.filter(l => l.status === 'ACTIVE' || l.status === 'PAYMENT_PENDING').length;
  const pendingVerificationsCount = customers.filter(c => c.verificationStatus === 'PENDING_VERIFICATION').length;
  const pendingContractsCount = contracts.filter(c => c.status === 'PENDING_REVIEW').length;

  const handleRoleChange = (role: UserRole) => {
    setCurrentRole(role);
    if (role === 'PRODUCT_ADMIN') {
      if (activeTab === 'customers' || activeTab === 'transactions_revenue' || activeTab === 'contracts' || activeTab === 'audit') {
        setActiveTab('inventory');
      }
    } else if (role === 'SALES_ADMIN') {
      if (activeTab === 'transactions_revenue' || activeTab === 'audit' || activeTab === 'inventory' || activeTab === 'reports') {
        setActiveTab('locks');
      }
    } else if (role === 'SALES') {
      if (activeTab === 'locks' || activeTab === 'contracts' || activeTab === 'reports' || activeTab === 'audit') {
        setActiveTab('inventory');
      }
    }
  };

  const currentProject = projects.find(p => p.id === selectedProjectId);

  return (
    <div className="min-h-screen flex flex-col bg-[#080b11]">
      <Navbar
        currentRole={currentRole}
        onRoleChange={handleRoleChange}
        activeProjectName={currentProject?.name}
      />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          currentRole={currentRole}
          activeLocksCount={activeLocksCount}
          pendingVerificationsCount={pendingVerificationsCount}
          pendingContractsCount={pendingContractsCount}
        />

        <main className="flex-1 p-6 overflow-y-auto max-w-7xl mx-auto w-full">
          {activeTab === 'inventory' && (
            <InventoryMatrix
              products={products}
              projects={projects}
              currentRole={currentRole}
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
            />
          )}

          {activeTab === 'locks' && (
            <LockManager
              locks={locks}
              onRefresh={refreshAllData}
              onCancelLock={handleCancelLock}
              onProceedToCustomer={handleProceedToCustomer}
              currentRole={currentRole}
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
              onRefresh={refreshAllData}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsDashboard
              reportData={reportData}
              onRefresh={refreshAllData}
            />
          )}

          {activeTab === 'audit' && (
            <AuditTrail
              logs={auditLogs}
              onRefresh={refreshAllData}
            />
          )}
        </main>
      </div>

      {/* Instant VietQR Payment Modal */}
      {activeLockModal && (
        <VietQRModal
          lock={activeLockModal}
          isOpen={!!activeLockModal}
          onClose={() => setActiveLockModal(null)}
          onPaymentSuccess={() => {
            refreshAllData();
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
        }}
      />
    </div>
  );
}
