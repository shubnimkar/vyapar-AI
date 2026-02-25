'use client';

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { ChartData, Language } from '@/lib/types';
import { t } from '@/lib/translations';

interface ChartsProps {
  chartData: ChartData;
  language: Language;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function Charts({ chartData, language }: ChartsProps) {
  // Transform data for Recharts format
  const profitData = chartData.profitTrend
    ? chartData.profitTrend.labels.map((label, idx) => ({
        name: label,
        profit: chartData.profitTrend!.values[idx],
      }))
    : [];

  const productData = chartData.productSales
    ? chartData.productSales.labels.map((label, idx) => ({
        name: label,
        sales: chartData.productSales!.values[idx],
      }))
    : [];

  const expenseData = chartData.expenseBreakdown
    ? chartData.expenseBreakdown.labels.map((label, idx) => ({
        name: label,
        value: chartData.expenseBreakdown!.values[idx],
      }))
    : [];

  const inventoryData = chartData.inventoryValue
    ? chartData.inventoryValue.labels.map((label, idx) => ({
        name: label,
        value: chartData.inventoryValue!.values[idx],
      }))
    : [];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">
        {language === 'hi'
          ? 'दृश्य विश्लेषण'
          : language === 'mr'
          ? 'दृश्य विश्लेषण'
          : 'Visual Analysis'}
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profit Trend */}
        {profitData.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              {language === 'hi'
                ? '📈 लाभ रुझान'
                : language === 'mr'
                ? '📈 नफा ट्रेंड'
                : '📈 Profit Trend'}
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={profitData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => `₹${value}`} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="profit"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  name={language === 'hi' ? 'लाभ' : language === 'mr' ? 'नफा' : 'Profit'}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Product Sales */}
        {productData.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              {language === 'hi'
                ? '📊 उत्पाद बिक्री'
                : language === 'mr'
                ? '📊 उत्पादन विक्री'
                : '📊 Product Sales'}
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={productData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip formatter={(value) => `₹${value}`} />
                <Legend />
                <Bar
                  dataKey="sales"
                  fill="#10B981"
                  name={language === 'hi' ? 'बिक्री' : language === 'mr' ? 'विक्री' : 'Sales'}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Expense Breakdown */}
        {expenseData.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              {language === 'hi'
                ? '💰 खर्च विभाजन'
                : language === 'mr'
                ? '💰 खर्च विभाजन'
                : '💰 Expense Breakdown'}
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={expenseData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {expenseData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `₹${value}`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Inventory Value */}
        {inventoryData.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              {language === 'hi'
                ? '📦 इन्वेंटरी मूल्य'
                : language === 'mr'
                ? '📦 इन्व्हेंटरी मूल्य'
                : '📦 Inventory Value'}
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={inventoryData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} />
                <Tooltip formatter={(value) => `₹${value}`} />
                <Legend />
                <Bar
                  dataKey="value"
                  fill="#F59E0B"
                  name={language === 'hi' ? 'मूल्य' : language === 'mr' ? 'मूल्य' : 'Value'}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
