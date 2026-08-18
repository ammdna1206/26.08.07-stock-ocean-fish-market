import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import type { HistoryPoint, StockQuote } from '../../../shared/types';

export function StockChart({ quote, history }: { quote: StockQuote; history: HistoryPoint[] }) {
  const chartRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!chartRef.current) return;
    const chart = echarts.init(chartRef.current, undefined, { renderer: 'canvas' });
    const points = history.length ? history : [{ tradeDate: quote.tradeDate, open: quote.open, high: quote.high, low: quote.low, close: quote.close, volume: quote.volume }];
    const zoomStart = points.length > 260 ? Math.max(0, 100 - (260 / points.length) * 100) : 0;
    chart.setOption({
      backgroundColor: 'transparent', grid: { left: 42, right: 16, top: 22, bottom: history.length > 90 ? 48 : 28 },
      tooltip: { trigger: 'axis', backgroundColor: 'rgba(2,20,48,.96)', borderColor: 'rgba(91,202,255,.45)', textStyle: { color: '#e5f8ff' } },
      xAxis: { type: 'category', data: points.map((point) => point.tradeDate), axisLine: { lineStyle: { color: '#3172a5' } }, axisLabel: { color: '#a4cce3', fontSize: 9, formatter: (value: string) => value.slice(2, 7) } },
      yAxis: { type: 'value', scale: true, splitLine: { lineStyle: { color: 'rgba(102,190,245,.14)' } }, axisLabel: { color: '#a4cce3', fontSize: 10 } },
      dataZoom: history.length > 90 ? [{ type: 'inside', start: zoomStart, end: 100 }, { type: 'slider', start: zoomStart, end: 100, height: 16, bottom: 4, borderColor: 'rgba(91,194,255,.18)', fillerColor: 'rgba(48,158,218,.18)', textStyle: { color: '#7faac4', fontSize: 8 } }] : [],
      series: [{ type: 'candlestick', data: points.map((point) => [point.open, point.close, point.low, point.high]), itemStyle: { color: '#ef655f', color0: '#37bd8b', borderColor: '#ff9b8d', borderColor0: '#55dcb0' } }],
    });
    const resize = () => chart.resize(); window.addEventListener('resize', resize);
    return () => { window.removeEventListener('resize', resize); chart.dispose(); };
  }, [history, quote]);
  return <div className="chart-wrap"><div ref={chartRef} className="stock-chart" /><div className="chart-caption">{history.length > 1 ? `官方日K線，共 ${history.length} 個交易日；可拖曳縮放` : '當日 OHLC'}</div></div>;
}

export function VolumeChart({ quote, history }: { quote: StockQuote; history: HistoryPoint[] }) {
  const chartRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!chartRef.current) return;
    const chart = echarts.init(chartRef.current);
    const points = history.length ? history : [{ tradeDate: quote.tradeDate, volume: quote.volume }];
    const zoomStart = points.length > 260 ? Math.max(0, 100 - (260 / points.length) * 100) : 0;
    chart.setOption({
      tooltip: { trigger: 'axis', valueFormatter: (value: unknown) => Number(value ?? 0).toLocaleString('zh-TW') },
      grid: { left: 42, right: 48, top: 18, bottom: history.length > 90 ? 46 : 25 },
      xAxis: { type: 'category', data: points.map((point) => point.tradeDate), axisLabel: { color: '#94bfdc', fontSize: 8, formatter: (value: string) => value.slice(2, 7) } },
      yAxis: [
        { type: 'value', axisLabel: { color: '#94bfdc', fontSize: 8 }, splitLine: { lineStyle: { color: 'rgba(102,190,245,.12)' } } },
        { type: 'value', axisLabel: { color: '#d7a96b', fontSize: 8 }, splitLine: { show: false } },
      ],
      dataZoom: history.length > 90 ? [{ type: 'inside', start: zoomStart, end: 100 }, { type: 'slider', start: zoomStart, end: 100, height: 14, bottom: 4, showDetail: false, borderColor: 'rgba(91,194,255,.18)', fillerColor: 'rgba(48,158,218,.18)' }] : [],
      series: [
        { name: '成交股數', type: 'bar', data: points.map((point) => point.volume), barMaxWidth: 10, itemStyle: { color: '#168bd0', borderRadius: [2, 2, 0, 0] } },
        { name: '成交金額', type: 'line', yAxisIndex: 1, data: points.map((point) => point.turnover ?? null), showSymbol: false, lineStyle: { color: '#e2a95d', width: 1 } },
      ],
    });
    const resize = () => chart.resize(); window.addEventListener('resize', resize);
    return () => { window.removeEventListener('resize', resize); chart.dispose(); };
  }, [history, quote]);
  return <div className="chart-wrap compact"><div ref={chartRef} className="stock-chart" /><div className="chart-caption">藍柱＝成交股數　金線＝成交金額</div></div>;
}
