'use client';

import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { Expense } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { Plus, Trash2, Receipt } from 'lucide-react';

const CATEGORIES = ['세탁비', '비품비', '수리비', '소모품', '인건비', '공과금', '식비', '기타'];

export default function ExpenseManager() {
  const { expenses, addExpense, deleteExpense, selectedDate, setSelectedDate } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    category: CATEGORIES[0],
    description: '',
    amount: '',
  });

  const dayExpenses = expenses.filter((e) => e.date === selectedDate);
  const totalExpense = dayExpenses.reduce((sum, e) => sum + e.amount, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.description || !form.amount) return;

    const expense: Expense = {
      id: Date.now().toString(36) + Math.random().toString(36).substring(2, 9),
      date: selectedDate,
      category: form.category,
      description: form.description,
      amount: parseInt(form.amount),
      created_at: new Date().toISOString(),
    };

    addExpense(expense);
    setForm({ category: CATEGORIES[0], description: '', amount: '' });
    setShowForm(false);
  };

  return (
    <div className="space-y-4">
      {/* Date Selector & Total */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm"
          />
          <div className="bg-red-50 rounded-lg px-4 py-2">
            <span className="text-xs text-red-500">일일 총 지출</span>
            <p className="text-lg font-bold text-red-600">{formatCurrency(totalExpense)}</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-gray-800 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-700"
        >
          <Plus size={16} /> 지출 추가
        </button>
      </div>

      {/* Add Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border p-4 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <label className="block">
              <span className="text-xs text-gray-500">카테고리</span>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-gray-500">내용</span>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
                placeholder="예: 시트 세탁 20장"
                required
              />
            </label>
            <label className="block">
              <span className="text-xs text-gray-500">금액</span>
              <input
                type="number"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
                placeholder="50000"
                required
              />
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">
              취소
            </button>
            <button type="submit" className="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm hover:bg-gray-700">
              등록
            </button>
          </div>
        </form>
      )}

      {/* Expense List */}
      <div className="bg-white rounded-xl border divide-y">
        {dayExpenses.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Receipt className="mx-auto mb-3" size={40} />
            <p>등록된 지출이 없습니다</p>
          </div>
        ) : (
          dayExpenses.map((expense) => (
            <div key={expense.id} className="flex items-center justify-between p-4 hover:bg-gray-50">
              <div className="flex items-center gap-3">
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full font-medium">
                  {expense.category}
                </span>
                <span className="text-sm text-gray-800">{expense.description}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-red-600">
                  -{formatCurrency(expense.amount)}
                </span>
                <button
                  onClick={() => deleteExpense(expense.id)}
                  className="p-1 text-gray-300 hover:text-red-500"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
