'use client';

import { useState } from 'react';
import {
  useAuthStore,
  ALL_MENU_KEYS,
  MENU_LABELS,
  ROLE_LABELS,
  type UserRole,
  type MenuKey,
  type UserAccount,
} from '@/store/useAuthStore';
import { cn } from '@/lib/utils';
import { Shield, Check, Lock, UserPlus, Trash2, Eye, EyeOff, Save, Users, Key } from 'lucide-react';
import { showToast } from './Toast';

type SettingsTab = 'permissions' | 'accounts';

export default function PermissionSettings() {
  const {
    permissions, updatePermissions,
    accounts, updateAccount, addAccount, removeAccount,
    role: currentRole,
  } = useAuthStore();
  const [activeTab, setActiveTab] = useState<SettingsTab>('permissions');

  if (currentRole !== 'admin') return null;

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => setActiveTab('permissions')}
          className={cn(
            'flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-colors',
            activeTab === 'permissions' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          )}
        >
          <Shield size={14} /> 메뉴 권한
        </button>
        <button
          onClick={() => setActiveTab('accounts')}
          className={cn(
            'flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-colors',
            activeTab === 'accounts' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          )}
        >
          <Key size={14} /> 계정 관리
        </button>
      </div>

      {activeTab === 'permissions' && <PermissionsPanel permissions={permissions} updatePermissions={updatePermissions} />}
      {activeTab === 'accounts' && (
        <AccountsPanel
          accounts={accounts}
          updateAccount={updateAccount}
          addAccount={addAccount}
          removeAccount={removeAccount}
        />
      )}
    </div>
  );
}

// ─── 권한 매트릭스 ───
function PermissionsPanel({
  permissions,
  updatePermissions,
}: {
  permissions: Record<UserRole, MenuKey[]>;
  updatePermissions: (role: UserRole, menus: MenuKey[]) => void;
}) {
  const roles: UserRole[] = ['admin', 'housekeeper', 'frontdesk'];

  const toggle = (role: UserRole, menu: MenuKey) => {
    // admin의 settings는 토글 불가
    if (role === 'admin' && menu === 'settings') return;

    const current = permissions[role] || [];
    const next = current.includes(menu)
      ? current.filter((m) => m !== menu)
      : [...current, menu];
    updatePermissions(role, next);
  };

  const toggleAll = (role: UserRole, checked: boolean) => {
    if (checked) {
      updatePermissions(role, [...ALL_MENU_KEYS]);
    } else {
      // admin은 settings 유지
      updatePermissions(role, role === 'admin' ? ['settings'] : []);
    }
  };

  return (
    <div className="bg-white rounded-xl border">
      <div className="p-4 border-b">
        <h3 className="font-semibold text-gray-700 flex items-center gap-2">
          <Shield size={16} /> 역할별 메뉴 접근 권한
        </h3>
        <p className="text-xs text-gray-400 mt-1">각 역할이 접근할 수 있는 메뉴를 설정합니다. 변경 즉시 적용됩니다.</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left py-3 px-4 font-medium text-gray-600 w-40">메뉴</th>
              {roles.map((role) => (
                <th key={role} className="py-3 px-3 font-medium text-gray-600 text-center min-w-[100px]">
                  <div className="flex flex-col items-center gap-1">
                    <span className={cn(
                      'text-xs px-2 py-0.5 rounded-full',
                      role === 'admin' && 'bg-red-100 text-red-700',
                      role === 'housekeeper' && 'bg-yellow-100 text-yellow-700',
                      role === 'frontdesk' && 'bg-blue-100 text-blue-700',
                    )}>
                      {ROLE_LABELS[role]}
                    </span>
                    {/* 전체 선택/해제 */}
                    <button
                      onClick={() => {
                        const allChecked = ALL_MENU_KEYS.every((m) => permissions[role]?.includes(m));
                        toggleAll(role, !allChecked);
                        showToast({
                          type: 'success',
                          title: '권한 변경',
                          message: `${ROLE_LABELS[role]}: ${!allChecked ? '전체 선택' : '전체 해제'}`,
                        });
                      }}
                      className="text-[10px] text-gray-400 hover:text-gray-600"
                    >
                      전체
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ALL_MENU_KEYS.map((menu) => (
              <tr key={menu} className="border-b last:border-0 hover:bg-gray-50/50">
                <td className="py-2.5 px-4 text-gray-700 font-medium">{MENU_LABELS[menu]}</td>
                {roles.map((role) => {
                  const enabled = permissions[role]?.includes(menu) ?? false;
                  const locked = role === 'admin' && menu === 'settings';
                  return (
                    <td key={role} className="py-2.5 px-3 text-center">
                      {locked ? (
                        <div className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100">
                          <Lock size={14} className="text-gray-400" />
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            toggle(role, menu);
                            showToast({
                              type: 'info',
                              title: '권한 변경',
                              message: `${ROLE_LABELS[role]}: ${MENU_LABELS[menu]} ${!enabled ? '허용' : '차단'}`,
                            });
                          }}
                          className={cn(
                            'inline-flex items-center justify-center w-8 h-8 rounded-lg transition-all',
                            enabled
                              ? 'bg-green-100 text-green-600 hover:bg-green-200'
                              : 'bg-gray-100 text-gray-300 hover:bg-gray-200 hover:text-gray-500'
                          )}
                        >
                          {enabled ? <Check size={16} /> : <span className="text-lg leading-none">&ndash;</span>}
                        </button>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── 계정 관리 ───
function AccountsPanel({
  accounts,
  updateAccount,
  addAccount,
  removeAccount,
}: {
  accounts: UserAccount[];
  updateAccount: (idx: number, account: UserAccount) => void;
  addAccount: (account: UserAccount) => void;
  removeAccount: (idx: number) => void;
}) {
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [showPw, setShowPw] = useState<number | null>(null);
  const [form, setForm] = useState<UserAccount>({ id: '', pw: '', name: '', role: 'frontdesk' });
  const [isAdding, setIsAdding] = useState(false);

  const startEdit = (idx: number) => {
    setEditIdx(idx);
    setForm({ ...accounts[idx] });
    setIsAdding(false);
  };

  const startAdd = () => {
    setIsAdding(true);
    setEditIdx(null);
    setForm({ id: '', pw: '', name: '', role: 'frontdesk' });
  };

  const saveEdit = () => {
    if (!form.id || !form.pw || !form.name) {
      showToast({ type: 'error', title: '입력 오류', message: '모든 필드를 입력해주세요.' });
      return;
    }
    if (editIdx !== null) {
      updateAccount(editIdx, form);
      showToast({ type: 'success', title: '계정 수정', message: `${form.name} 계정이 수정되었습니다.` });
      setEditIdx(null);
    }
  };

  const saveAdd = () => {
    if (!form.id || !form.pw || !form.name) {
      showToast({ type: 'error', title: '입력 오류', message: '모든 필드를 입력해주세요.' });
      return;
    }
    const duplicate = accounts.find((a) => a.id === form.id);
    if (duplicate) {
      showToast({ type: 'error', title: '중복 아이디', message: '이미 존재하는 아이디입니다.' });
      return;
    }
    addAccount(form);
    showToast({ type: 'success', title: '계정 추가', message: `${form.name} 계정이 추가되었습니다.` });
    setIsAdding(false);
    setForm({ id: '', pw: '', name: '', role: 'frontdesk' });
  };

  const handleRemove = (idx: number) => {
    if (accounts[idx].role === 'admin' && accounts.filter((a) => a.role === 'admin').length <= 1) {
      showToast({ type: 'error', title: '삭제 불가', message: '관리자 계정은 최소 1개 필요합니다.' });
      return;
    }
    const name = accounts[idx].name;
    removeAccount(idx);
    showToast({ type: 'success', title: '계정 삭제', message: `${name} 계정이 삭제되었습니다.` });
    if (editIdx === idx) setEditIdx(null);
  };

  const roles: UserRole[] = ['admin', 'housekeeper', 'frontdesk'];

  return (
    <div className="bg-white rounded-xl border">
      <div className="p-4 border-b flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-700 flex items-center gap-2">
            <Users size={16} /> 계정 관리
          </h3>
          <p className="text-xs text-gray-400 mt-1">로그인 계정을 추가/수정/삭제합니다.</p>
        </div>
        <button
          onClick={startAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-pink-600 text-white rounded-lg text-xs font-medium hover:bg-pink-700"
        >
          <UserPlus size={14} /> 계정 추가
        </button>
      </div>

      <div className="divide-y">
        {accounts.map((account, idx) => {
          const editing = editIdx === idx;
          return (
            <div key={idx} className="p-4">
              {editing ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <label className="block">
                      <span className="text-xs text-gray-500">아이디</span>
                      <input
                        type="text"
                        value={form.id}
                        onChange={(e) => setForm({ ...form, id: e.target.value })}
                        className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs text-gray-500">비밀번호</span>
                      <input
                        type="text"
                        value={form.pw}
                        onChange={(e) => setForm({ ...form, pw: e.target.value })}
                        className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs text-gray-500">이름</span>
                      <input
                        type="text"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs text-gray-500">역할</span>
                      <select
                        value={form.role}
                        onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
                        className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
                      >
                        {roles.map((r) => (
                          <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setEditIdx(null)} className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg">취소</button>
                    <button
                      onClick={saveEdit}
                      className="flex items-center gap-1 px-4 py-2 bg-pink-600 text-white rounded-lg text-sm font-medium hover:bg-pink-700"
                    >
                      <Save size={14} /> 저장
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{account.name}</p>
                      <p className="text-xs text-gray-400">ID: {account.id}</p>
                    </div>
                    <span className={cn(
                      'text-xs px-2 py-0.5 rounded-full font-medium',
                      account.role === 'admin' && 'bg-red-100 text-red-700',
                      account.role === 'housekeeper' && 'bg-yellow-100 text-yellow-700',
                      account.role === 'frontdesk' && 'bg-blue-100 text-blue-700',
                    )}>
                      {ROLE_LABELS[account.role]}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowPw(showPw === idx ? null : idx)}
                      className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                      title="비밀번호 보기"
                    >
                      {showPw === idx ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                    {showPw === idx && (
                      <span className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded">{account.pw}</span>
                    )}
                    <button
                      onClick={() => startEdit(idx)}
                      className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => handleRemove(idx)}
                      className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* 계정 추가 폼 */}
        {isAdding && (
          <div className="p-4 bg-pink-50/50">
            <p className="text-xs font-medium text-pink-600 mb-3">새 계정 추가</p>
            <div className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <label className="block">
                  <span className="text-xs text-gray-500">아이디</span>
                  <input
                    type="text"
                    value={form.id}
                    onChange={(e) => setForm({ ...form, id: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
                    placeholder="login_id"
                    autoFocus
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-gray-500">비밀번호</span>
                  <input
                    type="text"
                    value={form.pw}
                    onChange={(e) => setForm({ ...form, pw: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
                    placeholder="password"
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-gray-500">이름</span>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
                    placeholder="홍길동"
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-gray-500">역할</span>
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
                    className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
                  >
                    {roles.map((r) => (
                      <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setIsAdding(false)} className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg">취소</button>
                <button
                  onClick={saveAdd}
                  className="flex items-center gap-1 px-4 py-2 bg-pink-600 text-white rounded-lg text-sm font-medium hover:bg-pink-700"
                >
                  <UserPlus size={14} /> 추가
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
