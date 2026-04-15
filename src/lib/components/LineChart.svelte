<script>
  import { onMount, onDestroy } from 'svelte';
  import {
    Chart, LineElement, PointElement, LinearScale, CategoryScale,
    Tooltip, Legend, LineController, Filler,
  } from 'chart.js';
  import { formatMonth } from '../utils.js';

  Chart.register(LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend, LineController, Filler);

  let { data = [] } = $props();
  
  // Explicitly track derived data for reactivity
  let labels = $derived(data.map(d => formatMonth(d.month)));
  let values = $derived(data.map(d => d.amount));

  /** @type {any} */
  let canvas;
  /** @type {any} */
  let chart;

  $effect(() => {
    // Force tracking of dependencies
    const l = labels;
    const v = values;
    if (chart && l && v) {
      chart.data.labels = l;
      chart.data.datasets[0].data = v;
      chart.update();
    }
  });

  onMount(() => {
    chart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: data.map(d => formatMonth(d.month)),
        datasets: [{
          label: 'Monthly Spending',
          data: data.map(d => d.amount),
          borderColor: '#e07b30',
          backgroundColor: 'rgba(224,123,48,0.12)',
          borderWidth: 2.5,
          pointRadius: 4,
          pointBackgroundColor: '#e07b30',
          tension: 0.35,
          fill: true,
        }],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (/** @type {any} */ ctx) => ` $${ctx.parsed.y.toFixed(2)}`,
            },
          },
        },
        scales: {
          x: {
            ticks: { color: '#8a8a8a', font: { family: 'Inter', size: 11 } },
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
