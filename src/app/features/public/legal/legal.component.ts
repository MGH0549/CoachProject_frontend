import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { BrandComponent } from '../../../shared/brand/brand.component';
@Component({
  selector: 'app-legal',
  imports: [RouterLink, BrandComponent],
  templateUrl: './legal.component.html',
  styleUrl: './legal.component.css',
})
export class LegalComponent {
  readonly terms = inject(ActivatedRoute).snapshot.data['terms'] === true;
}
