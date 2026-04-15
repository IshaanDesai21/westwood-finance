<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import {
    Chart, BarElement, LinearScale, CategoryScale,
    Tooltip, Legend, BarController,
    type ChartItem,
  } from 'chart.js';
  import { CATEGORY_COLORS } from '../utils.js';

  Chart.register(BarElement, LinearScale, CategoryScale, Tooltip, Legend, BarController);

  let { data = {} }: { data: Record<string, number> } = $props();
  
  let canvas: HTMLCanvasElement;
  
  // Explicitly track keys and values for reactivity
  let labels = $derived(Object.keys(data));
  let values = $derived(labels.map(l => data[l]));
  let chart: Chart | null = null;

  $effect(() => {
    // Explicitly track dependencies for Svelte 5
    const l = labels;
    const v = values;
    if (chart && l && v) {
      chart.data.labels = l;
      chart.data.datasets[0].data = v;
      chart.data.datasets[0].backgroundColor = l.map(lbl => (CATEGORY_COLORS as Record<string, string>)[lbl] || '#888');
      chart.update();
    }
  });

  onMount(() => {
    const labels = Object.keys(data);
    chart = new Chart(canvas as ChartItem, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Spending ($)',
          data: labels.map(l => data[l]),
          backgroundColor: labels.map(l => (CATEGORY_COLORS as Record<string, string>)[l] || '#888'),
          borderRadius: 6,
          borderSkipped: false,
        }],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => ` $${((ctx.parsed.y ?? 0)).toFixed(2)}`,
            },
          },
        },
        scales: {
          x: {
            ticks: { color: '#8a8a8a', font: { family: 'Inter', size: 12 } },
            grid: { color: '#2e2e2e' },
          },
          y: {
            ticks: {
              color: '#8a8a8a',
              font: { family: 'Inter', size: 11 },
              callback: v => `$${v}`,
            },
            grid: { color: '#2e2e2e' },
            beginAtZero: true,
          },
        },
      },
    });
  });

  onDestroy(() => { if (chart) chart.destroy(); });
</script>

<canvas bind:this={canvas}></canvas>
