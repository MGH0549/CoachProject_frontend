import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { API_BASE_URL } from '../../../core/config/api-base-url.token';
import { SessionService } from '../../../core/auth/session.service';
import { TrainingService } from '../training/training.service';
import { StrengthService } from './strength.service';
import { StrengthSession } from './strength.models';

describe('Strength API integration contract', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'http://localhost:3000/api' },
        { provide: SessionService, useValue: { isActive: () => true } },
        { provide: TrainingService, useValue: {} },
      ],
    }),
  );
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  it('fetches all history pages so All and personal bests are not truncated at 100 sessions', async () => {
    const promise = TestBed.inject(StrengthService).history('bench');
    const http = TestBed.inject(HttpTestingController);
    const first = http.expectOne(
      'http://localhost:3000/api/v1/me/strength/exercises/bench?page=1&pageSize=100',
    );
    first.flush({ items: Array.from({ length: 100 }, (_, i) => ({ id: String(i) })), total: 101 });
    await new Promise((resolve) => setTimeout(resolve, 0));
    http
      .expectOne('http://localhost:3000/api/v1/me/strength/exercises/bench?page=2&pageSize=100')
      .flush({ items: [{ id: '100' }], total: 101 });
    expect(await promise).toHaveLength(101);
  });
  it('edits only sets and note; the original exercise and timestamp stay fixed on the backend', async () => {
    const input = {
      planExerciseId: 'placement',
      alternativeId: null,
      sets: [{ setNumber: 1, weightKg: 92.5, repetitions: 8 }],
      note: null,
    };
    const promise = TestBed.inject(StrengthService).save(input, 'session');
    const req = TestBed.inject(HttpTestingController).expectOne(
      'http://localhost:3000/api/v1/me/strength/session',
    );
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ sets: input.sets, note: null });
    req.flush({ id: 'session', sets: input.sets } as StrengthSession);
    expect((await promise).id).toBe('session');
  });
});
