import { Component, computed, input } from '@angular/core';
import { iconPaths } from './icon-paths';
@Component({
  selector: 'app-icon',
  templateUrl: './icon.component.html',
  styleUrl: './icon.component.css',
})
export class IconComponent {
  readonly name = input.required<string>();
  readonly paths = computed(() => iconPaths[this.name()] || iconPaths['training']);
}
