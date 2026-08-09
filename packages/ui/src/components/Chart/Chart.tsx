import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
} from 'recharts';
import { tokens } from '@nexgen/tokens';
import { Skeleton } from '../Skeleton/Skeleton.js';
import { EmptyState } from '../EmptyState/EmptyState.js';

export type ChartKind = 'line' | 'bar' | 'area' | 'donut';

export interface ChartSeries {
  key: string;
  label: string;
  /** Defaults to the palette below, cycling by series index — never a raw hex hardcoded at the call site. */
  color?: string;
}

export interface ChartProps {
  kind: ChartKind;
  data: Array<Record<string, string | number>>;
  series: ChartSeries[];
  /** The category/x-axis field name (ignored for `donut`). */
  categoryKey?: string;
  status?: 'loading' | 'success';
  height?: number;
  emptyLabel?: string;
}

/** DESIGN_SYSTEM.md §2 — Chart: a Recharts wrapper using `color.feedback.*`/`color.brand.*` tokens for series colors, never Recharts' own default palette. */
const SERIES_COLORS = [
  tokens.colors.light.brand.default,
  tokens.colors.light.feedback.success,
  tokens.colors.light.feedback.info,
  tokens.colors.light.feedback.warning,
  tokens.colors.light.feedback.danger,
];

function colorFor(series: ChartSeries, index: number): string {
  return series.color ?? SERIES_COLORS[index % SERIES_COLORS.length]!;
}

export function Chart({ kind, data, series, categoryKey = 'label', status = 'success', height = 280, emptyLabel }: ChartProps) {
  if (status === 'loading') {
    return <Skeleton shape="block" style={{ height }} className="w-full" />;
  }

  if (data.length === 0) {
    return <EmptyState title={emptyLabel ?? 'No data to display yet'} />;
  }

  const gridColor = tokens.colors.light.border.default;
  const textColor = tokens.colors.light.text.secondary;

  return (
    <ResponsiveContainer width="100%" height={height}>
      {kind === 'line' ? (
        <LineChart data={data}>
          <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
          <XAxis dataKey={categoryKey} stroke={textColor} fontSize={12} />
          <YAxis stroke={textColor} fontSize={12} />
          <RechartsTooltip />
          <Legend />
          {series.map((s, i) => (
            <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={colorFor(s, i)} strokeWidth={2} dot={false} />
          ))}
        </LineChart>
      ) : kind === 'bar' ? (
        <BarChart data={data}>
          <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
          <XAxis dataKey={categoryKey} stroke={textColor} fontSize={12} />
          <YAxis stroke={textColor} fontSize={12} />
          <RechartsTooltip />
          <Legend />
          {series.map((s, i) => (
            <Bar key={s.key} dataKey={s.key} name={s.label} fill={colorFor(s, i)} radius={[4, 4, 0, 0]} />
          ))}
        </BarChart>
      ) : kind === 'area' ? (
        <AreaChart data={data}>
          <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
          <XAxis dataKey={categoryKey} stroke={textColor} fontSize={12} />
          <YAxis stroke={textColor} fontSize={12} />
          <RechartsTooltip />
          <Legend />
          {series.map((s, i) => (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={colorFor(s, i)}
              fill={colorFor(s, i)}
              fillOpacity={0.15}
            />
          ))}
        </AreaChart>
      ) : (
        <PieChart>
          <RechartsTooltip />
          <Legend />
          <Pie data={data} dataKey={series[0]?.key ?? 'value'} nameKey={categoryKey} innerRadius="55%" outerRadius="80%">
            {data.map((_, i) => (
              // eslint-disable-next-line react/no-array-index-key -- donut segments are positionally, not identity, keyed
              <Cell key={i} fill={SERIES_COLORS[i % SERIES_COLORS.length]} />
            ))}
          </Pie>
        </PieChart>
      )}
    </ResponsiveContainer>
  );
}
