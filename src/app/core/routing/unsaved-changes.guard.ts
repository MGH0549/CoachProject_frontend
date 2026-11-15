import { CanDeactivateFn } from '@angular/router';
import { UnsavedChanges } from './unsaved-changes';
export const unsavedChangesGuard: CanDeactivateFn<UnsavedChanges> = (component) =>
  component.canLeave();
