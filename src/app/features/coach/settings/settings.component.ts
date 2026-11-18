import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MobileSignOutComponent } from '../../../shared/mobile-sign-out/mobile-sign-out.component';
@Component({
  selector: 'app-settings',
  imports: [RouterLink, MobileSignOutComponent],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css',
})
export class SettingsComponent {}
