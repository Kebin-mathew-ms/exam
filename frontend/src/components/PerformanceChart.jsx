import React from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts'

export default function PerformanceChart({ data = [] }) {
  return (
    <div className="w-full h-64 bg-card border rounded-xl p-4 shadow-xs select-none">
      <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider mb-4">
        Grade Distribution Rate
      </h4>
      <div className="w-full h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
            <XAxis dataKey="range" tick={{ fontSize: 10 }} stroke="#94A3B8" />
            <YAxis tick={{ fontSize: 10 }} stroke="#94A3B8" allowDecimals={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                borderRadius: '8px',
                border: '1px solid #E2E8F0',
                fontSize: '12px'
              }}
            />
            <Bar dataKey="count" fill="#4F46E5" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
