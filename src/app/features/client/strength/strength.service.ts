import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../../../core/config/api-base-url.token';
import { TrainingService } from '../training/training.service';
import { SessionService } from '../../../core/auth/session.service';
import {
  LiftOverview,
  StrengthInput,
  StrengthSession,
  StrengthSnapshot,
  planLifts,
} from './strength.models';

@Injectable({ providedIn: 'root' })
export class StrengthService {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL) + '/v1/me/strength';
  private readonly training = inject(TrainingService);
  private readonly session = inject(SessionService);
  async history(exerciseId: string): Promise<StrengthSession[]> {
    const items: StrengthSession[] = [];
    for (let page = 1; ; page++) {
      if (!this.session.isActive()) return [];
      const result = await firstValueFrom(
        this.http.get<{ items: StrengthSession[]; total: number }>(
          `${this.base}/exercises/${encodeURIComponent(exerciseId)}`,
          { params: { page, pageSize: 100 } },
        ),
      );
      items.push(...result.items);
      if (items.length >= result.total || !result.items.length) return items;
    }
  }
  async snapshot(): Promise<StrengthSnapshot> {
    const [plan, overview] = await Promise.all([
      this.training.load().catch((error: unknown) => {
        if (error instanceof HttpErrorResponse && error.status === 404) return null;
        throw error;
      }),
      firstValueFrom(this.http.get<{ items: LiftOverview[] }>(`${this.base}/overview`)),
    ]);
    const sessions: StrengthSession[] = [];
    const logged = overview.items.filter((lift) => lift.latestRecordedAt !== null);
    for (let i = 0; i < logged.length; i += 4) {
      const histories = await Promise.all(
        logged.slice(i, i + 4).map((lift) => this.history(lift.exerciseId)),
      );
      sessions.push(...histories.flat());
    }
    return { lifts: planLifts(plan), overview: overview.items, sessions };
  }
  async save(body: StrengthInput, id?: string): Promise<StrengthSession> {
    const result = await firstValueFrom(
      id
        ? this.http.put<StrengthSession>(`${this.base}/${encodeURIComponent(id)}`, {
            sets: body.sets,
            note: body.note,
          })
        : this.http.post<StrengthSession>(this.base, body),
    );
    return result;
  }
  async delete(id: string): Promise<void> {
    await firstValueFrom(this.http.delete(`${this.base}/${encodeURIComponent(id)}`));
  }
}
