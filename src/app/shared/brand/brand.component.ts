import { Component, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ThemeToggleComponent } from '../theme-toggle/theme-toggle.component';

@Component({
  selector: 'app-brand',
  imports: [RouterLink, ThemeToggleComponent],
  templateUrl: './brand.component.html',
  styleUrl: './brand.component.css',
})
export class BrandComponent {
  readonly compact = input(false);
  readonly logoPhoto = 'images/brand/logo.png';
  readonly logoUnavailable = signal(false);
}
