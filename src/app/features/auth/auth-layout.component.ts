import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { BrandComponent } from '../../shared/brand/brand.component';
@Component({
  selector: 'app-auth-layout',
  imports: [RouterOutlet, BrandComponent],
  templateUrl: './auth-layout.component.html',
  styleUrl: './auth-layout.component.css',
})
export class AuthLayoutComponent {}
