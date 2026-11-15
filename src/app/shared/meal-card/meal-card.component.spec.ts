import { TestBed } from '@angular/core/testing';
import { MealCardComponent } from './meal-card.component';
describe('Meal choices', () => {
  it('disables all options when the coach locks a meal', async () => {
    await TestBed.configureTestingModule({ imports: [MealCardComponent] }).compileComponents();
    const fixture = TestBed.createComponent(MealCardComponent);
    fixture.componentRef.setInput('meal', {
      id: 'meal',
      name: 'الإفطار',
      order: 0,
      time: '07:30',
      selection: { optionId: 'one', locked: true },
      options: [
        { id: 'one', name: 'شوفان', calories: 300, protein: 20, carbs: 30, fat: 10, items: [] },
        { id: 'two', name: 'بيض', calories: 320, protein: 25, carbs: 25, fat: 8, items: [] },
      ],
    });
    fixture.componentRef.setInput('locked', true);
    fixture.detectChanges();
    const buttons = [...fixture.nativeElement.querySelectorAll('button')] as HTMLButtonElement[];
    expect(buttons).toHaveLength(2);
    expect(buttons.every((button) => button.disabled)).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('مقفل بواسطة المدرب');
  });
});
