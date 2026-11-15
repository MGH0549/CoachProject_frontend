import { pendingGuard } from './core/auth/pending.guard';
import { unsavedChangesGuard } from './core/routing/unsaved-changes.guard';
import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { roleGuard } from './core/auth/role.guard';
import { activeGuard } from './core/auth/active.guard';
export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'APEX Coaching | تدريب شخصي',
    loadComponent: () =>
      import('./features/public/landing/landing.component').then((m) => m.LandingComponent),
  },
  {
    path: 'privacy',
    title: 'سياسة الخصوصية',
    loadComponent: () =>
      import('./features/public/legal/legal.component').then((m) => m.LegalComponent),
    data: { terms: false },
  },
  {
    path: 'terms',
    title: 'شروط الاستخدام',
    loadComponent: () =>
      import('./features/public/legal/legal.component').then((m) => m.LegalComponent),
    data: { terms: true },
  },
  {
    path: 'auth/pending',
    canActivate: [authGuard, pendingGuard],
    title: 'حالة الحساب',
    loadComponent: () =>
      import('./features/auth/pending/pending.component').then((m) => m.PendingComponent),
  },
  {
    path: 'auth',
    loadComponent: () =>
      import('./features/auth/auth-layout.component').then((m) => m.AuthLayoutComponent),
    children: [
      {
        path: 'sign-in',
        title: 'تسجيل الدخول',
        loadComponent: () =>
          import('./features/auth/sign-in/sign-in.component').then((m) => m.SignInComponent),
      },
      {
        path: 'register',
        title: 'إنشاء حساب',
        loadComponent: () =>
          import('./features/auth/register/register.component').then((m) => m.RegisterComponent),
      },
      {
        path: 'forgot-password',
        title: 'استعادة كلمة المرور',
        loadComponent: () =>
          import('./features/auth/forgot-password/forgot-password.component').then(
            (m) => m.ForgotPasswordComponent,
          ),
      },
      {
        path: 'reset-password',
        title: 'كلمة مرور جديدة',
        loadComponent: () =>
          import('./features/auth/reset-password/reset-password.component').then(
            (m) => m.ResetPasswordComponent,
          ),
      },
    ],
  },
  {
    path: 'client',
    canActivate: [authGuard, roleGuard],
    data: { role: 'Client' },
    loadComponent: () =>
      import('./core/layout/app-shell.component').then((m) => m.AppShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'training' },
      {
        path: 'training',
        canActivate: [activeGuard],
        title: 'الخطة التدريبية',
        loadComponent: () =>
          import('./features/client/training/training.component').then((m) => m.TrainingComponent),
      },
      {
        path: 'diet',
        canActivate: [activeGuard],
        title: 'النظام الغذائي',
        loadComponent: () =>
          import('./features/client/diet/diet.component').then((m) => m.DietComponent),
      },
      {
        path: 'progress',
        canActivate: [activeGuard],
        title: 'التقدم',
        loadComponent: () =>
          import('./features/client/progress/progress.component').then((m) => m.ProgressComponent),
      },
      {
        path: 'profile',
        title: 'الملف الشخصي',
        loadComponent: () =>
          import('./features/client/profile/profile.component').then((m) => m.ProfileComponent),
      },
    ],
  },
  {
    path: 'coach',
    canActivate: [authGuard, roleGuard],
    data: { role: 'Coach' },
    loadComponent: () =>
      import('./core/layout/app-shell.component').then((m) => m.AppShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'clients' },
      {
        path: 'clients',
        title: 'العملاء',
        loadComponent: () =>
          import('./features/coach/clients/clients.component').then((m) => m.ClientsComponent),
      },
      {
        path: 'clients/:id',
        canDeactivate: [unsavedChangesGuard],
        title: 'خطة العميل',
        loadComponent: () =>
          import('./features/coach/plans/client-detail.component').then(
            (m) => m.ClientDetailComponent,
          ),
      },
      {
        path: 'library',
        title: 'مكتبة التمارين',
        loadComponent: () =>
          import('./features/coach/library/library.component').then((m) => m.LibraryComponent),
      },
      {
        path: 'templates',
        title: 'قوالب الخطط',
        loadComponent: () =>
          import('./features/coach/templates/templates.component').then(
            (m) => m.TemplatesComponent,
          ),
      },
      {
        path: 'templates/training/:id',
        canDeactivate: [unsavedChangesGuard],
        title: 'قالب تدريبي',
        loadComponent: () =>
          import('./features/coach/templates/template-editor.component').then(
            (m) => m.TemplateEditorComponent,
          ),
      },
      {
        path: 'templates/diet/:id',
        canDeactivate: [unsavedChangesGuard],
        title: 'قالب غذائي',
        data: { diet: true },
        loadComponent: () =>
          import('./features/coach/templates/template-editor.component').then(
            (m) => m.TemplateEditorComponent,
          ),
      },
      {
        path: 'settings',
        title: 'الإعدادات',
        loadComponent: () =>
          import('./features/coach/settings/settings.component').then((m) => m.SettingsComponent),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
