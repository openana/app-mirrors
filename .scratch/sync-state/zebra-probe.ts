/* Zebra probe: where do renderItem shapes paint relative to the markLine and
   the grid splitLines? Reports paint order from the SSR SVG output. */
import * as echarts from 'echarts';

const t0 = Date.UTC(2026, 8, 30, 0, 0, 0);
const t1 = t0 + 36 * 3600 * 1000;
const tNow = t0 + 20 * 3600 * 1000;

const option = {
  animation: false,
  grid: { top: 10, bottom: 26, left: 110, right: 18 },
  xAxis: { type: 'time', min: t0, max: t1 },
  yAxis: { type: 'category', inverse: true, data: ['a', 'b', 'c'] },
  series: [
    {
      type: 'custom',
      encode: { x: [1, 2], y: 0 },
      data: [
        [0, t0 + 10 * 3600 * 1000, t0 + 11 * 3600 * 1000],
        [1, t0 + 12 * 3600 * 1000, t0 + 13 * 3600 * 1000],
        [2, t0 + 14 * 3600 * 1000, t0 + 15 * 3600 * 1000],
      ],
      renderItem: (_p: unknown, api: any) => {
        const i = Number(api.value(0));
        const rowH = api.size([0, 1])[1];
        const y = api.coord([t0, i])[1];
        const bandX0 = api.coord([t0, i])[0];
        const bandX1 = api.coord([t1, i])[0];
        const children: any[] = [];
        if (i % 2 === 1) {
          children.push({
            type: 'rect',
            silent: true,
            shape: { x: bandX0, y: y - rowH / 2, width: bandX1 - bandX0, height: rowH },
            style: { fill: '#f5f6f7' },
          });
        }
        const x0 = api.coord([api.value(1), i])[0];
        const x1 = api.coord([api.value(2), i])[0];
        children.push({
          type: 'rect',
          shape: { x: x0, y: y - 6, width: x1 - x0, height: 12 },
          style: { fill: '#1a7f37' },
        });
        return { type: 'group', children };
      },
      markLine: {
        silent: true,
        symbol: 'none',
        lineStyle: { color: '#5f6c76', type: 'dashed', width: 1 },
        label: { show: true, position: 'insideStartBottom', rotate: 0, formatter: 'now' },
        data: [{ xAxis: tNow }],
      },
    },
  ],
};

const chart = echarts.init(null, null, { renderer: 'svg', ssr: true, width: 800, height: 120 });
chart.setOption(option);
const svg = chart.renderToSVGString();
chart.dispose();

const firstRect = svg.indexOf('<rect');
const dash = svg.indexOf('stroke-dasharray');
const firstLine = svg.indexOf('<line');
console.log('element positions: firstRect=%d, markLineDash=%d, firstLine=%d', firstRect, dash, firstLine);
console.log(
  'paint order:',
  dash < firstRect
    ? 'markLine BELOW item shapes (bands would cover the now-line!)'
    : 'markLine ABOVE item shapes (bands are safe)',
);
console.log(
  'grid splitLines vs bands:',
  firstLine < firstRect ? 'splitLines below bands (bands cover grid guides)' : 'splitLines above bands',
);
