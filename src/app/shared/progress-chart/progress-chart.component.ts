import { Component, computed, input } from '@angular/core';
@Component({
  selector: 'app-progress-chart',
  templateUrl: './progress-chart.component.html',
  styleUrl: './progress-chart.component.css',
})
export class ProgressChartComponent {
  readonly values = input.required<number[]>();
  readonly label = input('الوزن بالكيلوجرام');
  readonly points = computed(() => {
    const values = this.values();
    if (!values.length) return '';
    const min = Math.min(...values),
      max = Math.max(...values),
      range = max - min || 1;
    return values
      .map(
        (value, index) =>
          `${20 + (index / (values.length - 1 || 1)) * 560},${190 - ((value - min) / range) * 160}`,
      )
      .join(' ');
  });
}
