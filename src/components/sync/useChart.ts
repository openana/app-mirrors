import { useEffect, useRef } from 'react';
import * as echarts from 'echarts/core';
import { BarChart, CustomChart } from 'echarts/charts';
import { GridComponent, MarkLineComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import type { EChartsCoreOption } from 'echarts/core';

echarts.use([
  BarChart,
  CustomChart,
  GridComponent,
  MarkLineComponent,
  TooltipComponent,
  CanvasRenderer,
]);

type ChartInstance = ReturnType<typeof echarts.init>;

/**
 * Lifecycle hook for one echarts instance: init, themed setOption, resize,
 * dispose. The first render animates; later updates (60 s tick, SWR refetch)
 * swap options without animation (Q12).
 */
export function useChart(
  option: EChartsCoreOption | null,
  onClick?: (params: unknown) => void,
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<ChartInstance | null>(null);
  const firstRef = useRef(true);
  const clickRef = useRef(onClick);
  clickRef.current = onClick;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const chart = echarts.init(el);
    chartRef.current = chart;
    firstRef.current = true;
    const handler = (params: unknown) => clickRef.current?.(params);
    chart.on('click', handler);
    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(el);
    return () => {
      observer.disconnect();
      chart.off('click', handler);
      chart.dispose();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || option === null) return;
    const animate = firstRef.current;
    firstRef.current = false;
    chart.setOption({ ...option, animation: animate }, { notMerge: true });
  }, [option]);

  return containerRef;
}
