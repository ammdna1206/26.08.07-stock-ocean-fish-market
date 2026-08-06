import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import type { HistoryPoint, StockQuote } from '../../../shared/types';

export function StockChart({ quote, history }: { quote: StockQuote; history: HistoryPoint[] }) {
  const chartRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!chartRef.current) return;
    const chart = echarts.init(chartRef.current, undefined, { renderer: 'canvas' });
    const points = history.length ? history : [{ tradeDate: quote.tradeDate, open: quote.open, high: quote.high, low: quote.low, close: quote.close, volume: quote.volume }];
    chart.setOption({
      backgroundColor: 'transparent', grid: { left: 38, right: 16, top: 22, bottom: 28 },
      tooltip: { trigger: 'axis', backgroundColor: 'rgba(2,20,48,.96)', borderColor: 'rgba(91,202,255,.45)', textStyle: { color: '#e5f8ff' } },
      xAxis: { type: 'category', data: points.map((point) => point.tradeDate.slice(5)), axisLine: { lineStyle: { color: '#3172a5' } }, axisLabel: { color: '#a4cce3', fontSize: 10 } },
      yAxis: { type: 'value', scale: true, splitLine: { lineStyle: { color: 'rgba(102,190,245,.14)' } }, axisLabel: { color: '#a4cce3', fontSize: 10 } },
      series: [{ type: history.length > 1 ? 'line' : 'candlestick', data: history.length > 1 ? points.map((point) => point.close) : points.map((point) => [point.open, point.close, point.low, point.high]), smooth: true, showSymbol: false, lineStyle: { color: '#55cfff', width: 2 }, itemStyle: { color: '#ef655f', color0: '#37bd8b', borderColor: '#ff9b8d', borderColor0: '#55dcb0' }, areaStyle: history.length > 1 ? { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(85,207,255,.3)' }, { offset: 1, color: 'rgba(85,207,255,0)' }]) } : undefined }],
    });
    const resize = () => chart.resize(); window.addEventListener('resize', resize);
    return () => { window.removeEventListener('resize', resize); chart.dispose(); };
  }, [history, quote]);
  return <div className="chart-wrap"><div ref={chartRef} className="stock-chart" /><div className="chart-caption">{history.length > 1 ? `近 ${history.length} 個交易日走勢` : '當日 OHLC'}</div></div>;
}

export function VolumeChart({ quote, history }: { quote: StockQuote; history: HistoryPoint[] }) {
  const chartRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!chartRef.current) return;
    const chart = echarts.init(chartRef.current);
    const points = history.length ? history : [{ tradeDate: quote.tradeDate, volume: quote.volume }];
    chart.setOption({ grid: { left: 38, right: 16, top: 10, bottom: 25 }, xAxis: { type: 'category', data: points.map((point) => point.tradeDate.slice(5)), axisLabel: { color: '#94bfdc', fontSize: 9 } }, yAxis: { type: 'value', axisLabel: { color: '#94bfdc', fontSize: 9 }, splitLine: { lineStyle: { color: 'rgba(102,190,245,.12)' } } }, series: [{ type: 'bar', data: points.map((point) => point.volume), barMaxWidth: 13, itemStyle: { color: '#168bd0', borderRadius: [3, 3, 0, 0] } }] });
    const resize = () => chart.resize(); window.addEventListener('resize', resize);
    return () => { window.removeEventListener('resize', resize); chart.dispose(); };
  }, [history, quote]);
  return <div className="chart-wrap compact"><div ref={chartRef} className="stock-chart" /><div className="chart-caption">成交量</div></div>;
}
