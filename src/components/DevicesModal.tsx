'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { DeviceSession } from '@/types';
import {
  Laptop,
  Smartphone,
  Tablet,
  Monitor,
  Globe,
  Clock,
  LogOut,
  AlertTriangle,
  RotateCw,
  Check,
  Copy,
  X,
  ShieldAlert,
  HardDriveDownload,
  Info,
} from 'lucide-react';
import { getOrCreateDeviceId, detectDeviceMetadata, formatLastActive } from '@/lib/deviceUtils';

interface DevicesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DevicesModal({ isOpen, onClose }: DevicesModalProps) {
  const { currentUser, logout, addToast, refreshActiveDevicesCount } = useApp();
  const [devices, setDevices] = useState<DeviceSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [copiedIp, setCopiedIp] = useState<string | null>(null);
  const [showConfirmLogoutAll, setShowConfirmLogoutAll] = useState(false);

  const currentDeviceId = typeof window !== 'undefined' ? getOrCreateDeviceId() : '';
  const currentUserId = currentUser?.id;
  const devicesRef = React.useRef<DeviceSession[]>([]);
  devicesRef.current = devices;

  const fetchDevices = useCallback(async (quiet = false) => {
    if (!currentUserId) return;
    const hasDevices = devicesRef.current.length > 0;
    if (!quiet && !hasDevices) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    try {
      // 1. Send heartbeat / register current device first
      const meta = detectDeviceMetadata();
      await fetch('/api/auth/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'heartbeat',
          deviceId: meta.deviceId,
          deviceName: meta.deviceName,
          deviceType: meta.deviceType,
          browser: meta.browser,
          os: meta.os,
        }),
      }).catch(() => null);

      // 2. Fetch list of active devices
      const res = await fetch(`/api/auth/devices?deviceId=${encodeURIComponent(meta.deviceId)}&userId=${encodeURIComponent(currentUserId)}`);
      const data = await res.json();

      if (data.success && Array.isArray(data.devices)) {
        // Mark current device explicitly
        const enriched: DeviceSession[] = data.devices.map((d: DeviceSession) => ({
          ...d,
          isCurrent: d.id === meta.deviceId,
        }));

        // Ensure current device is at least present in the list
        if (!enriched.some(d => d.isCurrent)) {
          enriched.unshift({
            id: meta.deviceId,
            userId: currentUserId,
            deviceName: meta.deviceName,
            deviceType: meta.deviceType,
            browser: meta.browser,
            os: meta.os,
            ip: data.clientIp || '127.0.0.1',
            lastActive: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            isCurrent: true,
            isRevoked: false,
          });
        }

        // Sort so current device is at the very top, followed by most recently active
        enriched.sort((a, b) => {
          if (a.isCurrent) return -1;
          if (b.isCurrent) return 1;
          return new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime();
        });

        setDevices(enriched);
        refreshActiveDevicesCount();
      }
    } catch (err) {
      console.error('Failed to load active devices:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [currentUserId, refreshActiveDevicesCount]);

  useEffect(() => {
    if (isOpen && currentUserId) {
      fetchDevices(devicesRef.current.length > 0);
    }
  }, [isOpen, currentUserId, fetchDevices]);

  if (!isOpen) return null;

  // Single device logout
  const handleLogoutDevice = async (device: DeviceSession) => {
    if (device.isCurrent) {
      if (window.confirm('Are you sure you want to log out from this current device?')) {
        onClose();
        logout();
      }
      return;
    }

    if (!window.confirm(`Log out device "${device.deviceName}"? This will terminate its active session.`)) {
      return;
    }

    setActionInProgress(device.id);
    try {
      const res = await fetch('/api/auth/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'logout_device',
          deviceId: device.id,
        }),
      });

      const json = await res.json();
      if (json.success) {
        addToast('Device Logged Out', `${device.deviceName} has been logged out successfully.`, 'success');
        setDevices(prev => prev.filter(d => d.id !== device.id));
        refreshActiveDevicesCount();
      } else {
        addToast('Error', json.message || 'Could not log out device.', 'error');
      }
    } catch {
      addToast('Network Error', 'Failed to communicate with authentication server.', 'error');
    } finally {
      setActionInProgress(null);
    }
  };

  // Logout other devices (keep current session)
  const handleLogoutOtherDevices = async () => {
    if (!window.confirm('Log out from all OTHER devices? Your current session on this device will stay active.')) {
      return;
    }

    setActionInProgress('logout_others');
    try {
      const res = await fetch('/api/auth/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'logout_all',
          keepCurrent: true,
          deviceId: currentDeviceId,
        }),
      });

      const json = await res.json();
      if (json.success) {
        addToast('All Other Devices Logged Out', 'All other login sessions have been terminated.', 'success');
        setDevices(prev => prev.filter(d => d.isCurrent));
        refreshActiveDevicesCount();
      } else {
        addToast('Error', json.message || 'Failed to logout other devices.', 'error');
      }
    } catch {
      addToast('Network Error', 'Failed to communicate with authentication server.', 'error');
    } finally {
      setActionInProgress(null);
    }
  };

  // Logout ALL devices (including current)
  const handleLogoutAllDevices = async () => {
    setActionInProgress('logout_all');
    try {
      await fetch('/api/auth/devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'logout_all',
          keepCurrent: false,
        }),
      }).catch(() => null);

      addToast('All Devices Logged Out', 'You have been signed out from all devices.', 'info');
      onClose();
      logout();
    } catch {
      onClose();
      logout();
    }
  };

  const copyIpToClipboard = (ip: string) => {
    if (!ip) return;
    navigator.clipboard.writeText(ip);
    setCopiedIp(ip);
    setTimeout(() => setCopiedIp(null), 2000);
    addToast('IP Copied', `IP ${ip} copied to clipboard`, 'info');
  };

  const getDeviceIcon = (type: string, isCurrent?: boolean) => {
    if (type === 'mobile') {
      return <Smartphone className={`w-5 h-5 ${isCurrent ? 'text-emerald-400' : 'text-cyan-400'}`} />;
    }
    if (type === 'tablet') {
      return <Tablet className={`w-5 h-5 ${isCurrent ? 'text-emerald-400' : 'text-purple-400'}`} />;
    }
    return <Laptop className={`w-5 h-5 ${isCurrent ? 'text-emerald-400' : 'text-indigo-400'}`} />;
  };

  const otherDevicesCount = devices.filter(d => !d.isCurrent).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-indigo-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-inner">
              <Laptop className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Active Devices & Login Sessions
                </h2>
              </div>
              <p className="text-xs text-slate-400">
                Manage all devices where your account is currently signed in.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Bar / Stats Strip */}
        <div className="px-6 py-3.5 bg-slate-950/60 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              {devices.length} {devices.length === 1 ? 'Device Online' : 'Devices Online'}
            </span>
            <button
              type="button"
              onClick={() => fetchDevices(true)}
              disabled={isRefreshing}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors text-xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
              title="Refresh device list"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
              <span className="text-[11px] hidden sm:inline">Refresh</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {otherDevicesCount > 0 && (
              <button
                type="button"
                onClick={handleLogoutOtherDevices}
                disabled={actionInProgress !== null}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <LogOut className="w-3.5 h-3.5 text-amber-400" />
                <span>Logout Other Devices</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowConfirmLogoutAll(true)}
              disabled={actionInProgress !== null}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout All Devices</span>
            </button>
          </div>
        </div>

        {/* Confirmation Modal for Logout All Devices */}
        {showConfirmLogoutAll && (
          <div className="p-4 mx-6 my-3 rounded-2xl bg-rose-950/40 border border-rose-500/30 flex items-start justify-between gap-3 animate-in fade-in duration-150">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 mt-0.5">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-rose-200">
                  Logout from ALL devices (including this one)?
                </h4>
                <p className="text-[11px] text-rose-300/80 mt-0.5">
                  You will be logged out everywhere and redirected to the login screen immediately.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowConfirmLogoutAll(false)}
                className="px-2.5 py-1 rounded-lg text-xs font-medium text-slate-400 hover:text-white bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowConfirmLogoutAll(false);
                  handleLogoutAllDevices();
                }}
                className="px-3 py-1 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-sm"
              >
                Confirm Logout All
              </button>
            </div>
          </div>
        )}

        {/* Device List Body */}
        <div className="p-6 overflow-y-auto space-y-3.5 flex-1">
          {isLoading && devices.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-3">
              <RotateCw className="w-6 h-6 animate-spin text-cyan-400" />
              <p className="text-xs">Scanning active device sessions...</p>
            </div>
          ) : devices.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              No active devices found.
            </div>
          ) : (
            devices.map((device) => {
              const isCurrent = Boolean(device.isCurrent);
              const isWorking = actionInProgress === device.id;

              return (
                <div
                  key={device.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    isCurrent
                      ? 'bg-gradient-to-r from-emerald-950/20 via-slate-900 to-slate-900 border-emerald-500/30 shadow-sm'
                      : 'bg-slate-950/40 border-slate-800/90 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    {/* Left: Device Icon & Name */}
                    <div className="flex items-start gap-3.5">
                      <div
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${
                          isCurrent
                            ? 'bg-emerald-500/10 border-emerald-500/30'
                            : 'bg-slate-800/80 border-slate-700/60'
                        }`}
                      >
                        {getDeviceIcon(device.deviceType, isCurrent)}
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-bold text-white tracking-tight">
                            {device.deviceName}
                          </h3>
                          {isCurrent && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              This Device (Current)
                            </span>
                          )}
                        </div>

                        {/* Device Info Badges & Details */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400 pt-0.5">
                          {/* IP Address */}
                          <div className="flex items-center gap-1.5">
                            <Globe className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                            <span className="font-mono text-slate-300">{device.ip || '127.0.0.1'}</span>
                            <button
                              type="button"
                              onClick={() => copyIpToClipboard(device.ip || '127.0.0.1')}
                              className="text-slate-500 hover:text-slate-300 p-0.5"
                              title="Copy IP"
                            >
                              {copiedIp === (device.ip || '127.0.0.1') ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>

                          {/* Last Active Time */}
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                            <span>
                              {isCurrent ? (
                                <span className="text-emerald-400 font-semibold">Active now</span>
                              ) : (
                                formatLastActive(device.lastActive)
                              )}
                            </span>
                          </div>

                          {/* OS & Browser */}
                          {(device.os || device.browser) && (
                            <div className="flex items-center gap-1.5 text-slate-500">
                              <span>•</span>
                              <span>{[device.os, device.browser].filter(Boolean).join(' • ')}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Logout Action */}
                    <div className="shrink-0">
                      <button
                        type="button"
                        onClick={() => handleLogoutDevice(device)}
                        disabled={isWorking}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                          isCurrent
                            ? 'bg-slate-800 hover:bg-rose-950/40 text-slate-300 hover:text-rose-400 border border-slate-700 hover:border-rose-500/30'
                            : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 hover:border-rose-500/40'
                        }`}
                        title={isCurrent ? 'Logout current device' : 'Logout remote device'}
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>{isWorking ? 'Logging out...' : isCurrent ? 'Sign Out' : 'Logout'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between text-xs text-slate-500">
          <span>SmartKhata Session Guardian</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-white transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
