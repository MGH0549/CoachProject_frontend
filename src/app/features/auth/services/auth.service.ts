import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AuthenticationService } from '../../../core/api/services/authentication.service';
import { RegisterDto } from '../../../core/api/models/register-dto';
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(AuthenticationService);
  register(body: RegisterDto) {
    return firstValueFrom(this.api.authControllerRegister({ body }));
  }
  forgot(email: string) {
    return firstValueFrom(this.api.authControllerForgot({ body: { email } }));
  }
  reset(token: string, password: string) {
    return firstValueFrom(this.api.authControllerReset({ body: { token, password } }));
  }
}
