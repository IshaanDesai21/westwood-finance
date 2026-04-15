<script>
  import { onMount, onDestroy } from 'svelte';
  import { Chart, ArcElement, Tooltip, Legend, PieController } from 'chart.js';
  import { CATEGORY_COLORS } from '../utils.js';

  Chart.register(ArcElement, Tooltip, Legend, PieController);

  let { data = {} } = $props();
  
  // Explicitly track keys and values for reactivity
  let labels = $derived(Object.keys(data));
  let values = $derived(labels.map(l => data[l]));

  /** @type {any} */
  let canvas;
  /** @type {any} */
  let chart;

  $effect(() => {
    // Force tracking of labels and values
    const l = labels;
    const v = values;
    if (chart && l && v) {
      chart.data.labels = l;
      chart.data.datasets[0].data = v;
      chart.data.datasets[0].backgroundColor = l.map(lbl => (/** @type {Record<string, string>} */ (CATEGORY_COLORS))[lbl] || '#888');
      chart.update();
    }
  });

  onMount(() => {
    const labels = Object.keys(data);
    const values = Object.values(data);

    chart = new Chart(canvas, {
      type: 'pie',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: labels.map(l => (/** @type {Record<string, string>} */ (CATEGORY_COLORS))[l] || '#888'),
          borderColor: '#161616',
          borderWidth: 3,
        }],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: '#f0f0f0',
              font: { family: 'Inter', size: 12 },
              padding: 16,
              boxWidth: 14,
              borderRadius: 4,
            },
          },
          tooltip: {
            callbacks: {
              label: ctx => ` $${ctx.parsed.toFixed(2)}`,
            },
          },
        },
      },
    });
  });

  onDestroy(() => { if (chart) chart.destroy(); });
</script>

<canvas bind:this={canvas}></canvas>
