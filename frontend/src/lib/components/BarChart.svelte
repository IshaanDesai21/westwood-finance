<script>
  import { onMount, onDestroy } from 'svelte';
  import {
    Chart, BarElement, LinearScale, CategoryScale,
    Tooltip, Legend, BarController,
  } from 'chart.js';
  import { CATEGORY_COLORS } from '../utils.js';

  Chart.register(BarElement, LinearScale, CategoryScale, Tooltip, Legend, BarController);

  /** @type {{ data: { [category: string]: number } }} */
  let { data = {} } = $props();

  let canvas;
  let chart;

  $effect(() => {
    if (chart && data) {
      const labels = Object.keys(data);
      chart.data.labels = labels;
      chart.data.datasets[0].data = labels.map(l => data[l]);
      chart.data.datasets[0].backgroundColor = labels.map(l => CATEGORY_COLORS[l] || '#888');
      chart.update();
    }
  });

  onMount(() => {
    const labels = Object.keys(data);
    chart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Spending ($)',
          data: labels.map(l => data[l]),
          backgroundColor: labels.map(l => CATEGORY_COLORS[l] || '#888'),
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
              label: ctx => ` $${ctx.parsed.y.toFixed(2)}`,
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
